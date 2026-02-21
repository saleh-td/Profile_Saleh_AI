from __future__ import annotations

from collections import defaultdict, deque
import logging
import re
from textwrap import dedent

from fastapi import APIRouter, HTTPException, status
import httpx

from app.schemas.chat import ChatRequest, ChatResponse
from app.core.config import settings

router = APIRouter(tags=["chat"])

logger = logging.getLogger(__name__)


SESSION_MEMORY_MAX_TURNS = 6
SESSION_HISTORY: dict[str, deque[tuple[str, str]]] = defaultdict(
    lambda: deque(maxlen=SESSION_MEMORY_MAX_TURNS)
)
SUPPORTED_LANGS = {"fr", "en"}


def _resolve_response_lang(message: str, locale_hint: str | None) -> str:
    hint = (locale_hint or "").strip().lower()
    text = (message or "").strip().lower()
    english_markers = [
        "hello",
        "hi",
        "hey",
        "who are you",
        "who r you",
        "what do you do",
        "tell me",
        "about",
        "projects",
        "project",
        "career",
        "background",
        "education",
        "can you",
        "please",
    ]
    french_markers = [
        "bonjour",
        "salut",
        "parle",
        "projet",
        "parcours",
        "études",
        "realisations",
        "réalisations",
        "scolaire",
    ]
    en_score = sum(1 for token in english_markers if token in text)
    fr_score = sum(1 for token in french_markers if token in text)

    # Priority: when user clearly writes in EN/FR, follow message language,
    # even if frontend locale is different.
    if en_score > fr_score and en_score > 0:
        return "en"
    if fr_score > en_score and fr_score > 0:
        return "fr"

    # Fallback to UI locale when message language is ambiguous.
    if hint.startswith("en"):
        return "en"
    if hint.startswith("fr"):
        return "fr"
    return "fr"


def _normalize_session_id(raw: str | None) -> str | None:
    text = (raw or "").strip()
    if not text:
        return None
    text = re.sub(r"[^a-zA-Z0-9_-]", "", text)
    return text[:64] if text else None


def _remember_user_turn(session_id: str | None, message: str) -> None:
    if not session_id:
        return
    SESSION_HISTORY[session_id].append(("user", message.strip()))


def _remember_ai_turn(session_id: str | None, message: str) -> None:
    if not session_id:
        return
    SESSION_HISTORY[session_id].append(("ai", message.strip()))


def _recent_user_messages(session_id: str | None) -> list[str]:
    if not session_id:
        return []
    return [m for role, m in SESSION_HISTORY.get(session_id, []) if role == "user"]


def _normalize_text(message: str) -> str:
    text = (message or "").strip().lower()
    text = text.replace("’", "'")
    text = re.sub(r"[^a-z0-9àâçéèêëîïôûùüÿñæœ\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _is_greeting(message: str) -> bool:
    text = _normalize_text(message)
    if not text:
        return False

    greetings = {
        "salut",
        "bonjour",
        "bonsoir",
        "coucou",
        "yo",
        "hey",
        "hello",
        "hi",
        "slt",
    }

    # Accept single greeting or greeting + tiny filler like "salut !".
    parts = [p for p in text.split(" ") if p]
    if not parts:
        return False
    if len(parts) == 1 and parts[0] in greetings:
        return True
    if len(parts) == 2 and parts[0] in greetings and parts[1] in {"!", "?"}:
        return True

    # Also accept forms like "salut assistant".
    if parts[0] in greetings and len(parts) <= 3:
        return True

    return False


def _greeting_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Hello, I am the AI assistant for Saleh Minawi's portfolio.\n"
            "I can present his background, his deep learning projects, his AI architecture approach, or his work on CI/CD log analysis systems."
        )
    return (
        "Bonjour, je suis l’assistant IA du portfolio de Saleh Minawi.\n"
        "Je peux vous présenter son parcours, ses projets en deep learning, son approche architecture IA ou ses travaux autour des systèmes d’analyse de logs CI/CD."
    )


def _is_saleh_intro_question(message: str) -> bool:
    text = _normalize_text(message)
    return text in {
        "parle moi de saleh minawi",
        "parle moi un peu de saleh minawi",
        "parle moi de saleh",
        "parle moi un peu de saleh",
        "qui est saleh minawi",
        "qui est saleh",
        "presente moi saleh minawi",
        "présente moi saleh minawi",
    }


def _is_identity_question(message: str) -> bool:
    text = _normalize_text(message)
    return text in {
        "who are you",
        "who r you",
        "who are u",
        "what are you",
        "qui es tu",
        "qui es tu ?",
        "qui etes vous",
        "qui êtes vous",
        "tu es qui",
    }


def _identity_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "I am the AI assistant for Saleh Minawi's portfolio.\n"
            "I can explain his background, his AI projects, and his approach to building production-ready AI systems."
        )
    return (
        "Je suis l’assistant IA du portfolio de Saleh Minawi.\n"
        "Je peux vous expliquer son parcours, ses projets IA et son approche pour concevoir des systèmes IA prêts pour la production."
    )


def _saleh_intro_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Saleh Minawi is a backend developer specialized in AI architecture.\n\n"
            "He is moving toward a Master's in AI Architecture (2026 intake), with a strong technical approach based on:\n"
            "- mathematical foundations of machine learning\n"
            "- internal understanding of backpropagation\n"
            "- building MLP and CNN models with PyTorch\n"
            "- CI log analysis with LLMs to automate error understanding\n\n"
            "His goal is to design robust AI systems that can be integrated into production, especially in DevOps and CI/CD environments."
        )
    return (
        "Saleh Minawi est un développeur backend spécialisé en architecture IA.\n\n"
        "Il s’oriente vers un Master Architecte en Intelligence Artificielle (rentrée 2026) avec une approche technique solide basée sur :\n"
        "- les fondements mathématiques du machine learning\n"
        "- la compréhension interne de la backpropagation\n"
        "- la construction de modèles MLP et CNN avec PyTorch\n"
        "- l’analyse de logs CI via LLM pour automatiser la compréhension d’erreurs\n\n"
        "Son objectif est de concevoir des systèmes IA robustes et intégrables en production, notamment dans des environnements DevOps et CI/CD."
    )


def _is_parcours_question(message: str) -> bool:
    text = _normalize_text(message)
    parcours_markers = {
        "parle moi de son parcours",
        "parle moi un peu de son parcours",
        "quel est son parcours",
        "c'est quoi son parcours",
        "c est quoi son parcours",
        "son parcours",
    }
    if text in parcours_markers:
        return True
    return ("parcours" in text) and ("scolaire" not in text)


def _parcours_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "He first strengthened his foundations in computer science and applied mathematics, with a focus on algorithms and backend system design.\n\n"
            "Then he deliberately approached AI through fundamentals:\n"
            "- derivatives and optimization\n"
            "- gradient descent\n"
            "- linear and logistic regression\n"
            "- implementation of a first fully connected network in PyTorch\n"
            "- detailed understanding of backpropagation\n\n"
            "He then progressed to:\n"
            "- multi-layer neural networks (MLP)\n"
            "- convolutional neural networks (CNN)\n"
            "- first NLP experiments\n"
            "- end-to-end AI project structuring\n\n"
            "In parallel, he moved toward a systems-oriented approach:\n"
            "- AI integration in backend environments\n"
            "- automated CI/CD log analysis using LLMs\n"
            "- design of scalable hybrid architectures (specific → multi-systems)\n\n"
            "His goal is clear: become an AI Architect by designing robust, understandable, and production-ready systems."
        )
    return (
        "Il a d’abord consolidé ses bases en informatique et en mathématiques appliquées, avec un focus sur l’algorithmique et la structuration des systèmes backend.\n\n"
        "Ensuite, il a volontairement abordé l’intelligence artificielle par les fondements :\n"
        "- dérivées et optimisation\n"
        "- descente de gradient\n"
        "- régression linéaire et logistique\n"
        "- implémentation d’un premier réseau fully connected en PyTorch\n"
        "- compréhension détaillée de la backpropagation\n\n"
        "Il a ensuite évolué vers :\n"
        "- réseaux de neurones multi-couches (MLP)\n"
        "- réseaux convolutifs (CNN)\n"
        "- premières expérimentations en NLP\n"
        "- structuration de projets IA de bout en bout\n\n"
        "Parallèlement, il s’est orienté vers une approche plus système :\n"
        "- intégration d’IA dans des environnements backend\n"
        "- analyse automatisée de logs CI/CD via LLM\n"
        "- conception d’architectures hybrides évolutives (spécifique → multi-systèmes)\n\n"
        "Son objectif est clair : devenir Architecte IA en concevant des systèmes robustes, compréhensibles et intégrables en production."
    )


def _is_technical_path_question(message: str) -> bool:
    text = _normalize_text(message)
    has_parcours_like = bool(re.search(r"\bparcour\w*\b", text))
    has_tech_marker = any(token in text for token in ["tech", "technique", "techniq", "technical"])
    explicit_forms = {
        "sur son parcour technique",
        "sur son parcours technique",
        "parcours technique",
        "parcour technique",
        "technical background",
        "technical path",
    }
    return text in explicit_forms or (has_parcours_like and has_tech_marker)


def _technical_path_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Technical path of Saleh (high-level view):\n"
            "- Math and optimization foundations: derivatives, chain rule, gradient descent behavior, and loss curve visualization.\n"
            "- ML foundations: linear/logistic regression implemented and analyzed to understand convergence and hyperparameter impact.\n"
            "- Deep learning engineering: first fully connected network (MLP) and CNN models with PyTorch, with practical training/debug workflow.\n"
            "- Early NLP steps: tokenization, embeddings, and text classification experiments.\n"
            "- Systems approach: backend integration, CI/CD log analysis with LLMs, and production-oriented architecture decisions.\n"
            "If you want, I can now zoom in only on his gradient descent work with a concrete step-by-step example."
        )
    return (
        "Parcours technique de Saleh (vue d'ensemble):\n"
        "- Fondations math/optimisation: dérivées, règle de la chaîne, comportement de la descente de gradient, visualisation des courbes de coût.\n"
        "- Bases ML: régression linéaire/logistique implémentées et analysées pour comprendre convergence et impact des hyperparamètres.\n"
        "- Ingénierie deep learning: premier réseau fully connected (MLP) puis CNN en PyTorch, avec workflow d'entraînement et de debug.\n"
        "- Premiers travaux NLP: tokenisation, embeddings, classification de texte.\n"
        "- Approche système: intégration backend, analyse de logs CI/CD via LLM, et décisions d'architecture orientées production.\n"
        "Si vous voulez, je peux maintenant zoomer uniquement sur sa descente de gradient avec un exemple concret étape par étape."
    )


def _is_gradient_focus_question(message: str) -> bool:
    text = _normalize_text(message)
    markers = [
        "descente de gradient",
        "gradient descent",
        "gradiant",
        "gradient",
        "optimisation",
    ]
    if any(token in text for token in markers):
        return True
    # Handle natural follow-ups after assistant asks about gradient.
    return bool(re.search(r"\boui\b.*\b(parle|explique|detail|détail|zoom)\b", text)) and "gradient" in text


def _gradient_focus_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Saleh's gradient descent work (concrete view):\n"
            "- He starts with f(x)=2x^2-3x+4 and computes numerical slope with h=0.0001.\n"
            "- Numerical checks: derivative at x=-1 is about -6.9998, and at x=2 is about 5.0002.\n"
            "- He then derives f'(x)=4x-3 and runs iterative updates from x=2.0 with alpha=0.01 over 250 iterations.\n"
            "- Observed result: approximate minimum x≈0.76 (close to analytical optimum x=0.75).\n"
            "- Chain-rule phase: with derivative 6x-3, same loop converges near x≈0.50.\n"
            "- Multi-variable optimization: updates a,b,c with partial derivatives; observed values a≈0.30, b≈0, c≈-11.5 after iterations.\n"
            "- Interpretation: because c has a constant positive gradient in his setup, c keeps decreasing with more iterations.\n"
            "Outcome: he built intuition from math to code, then reused it in linear/logistic regression and PyTorch training workflows."
        )
    return (
        "Descente de gradient de Saleh (version concrète):\n"
        "- Il part d'une fonction simple f(x)=2x^2-3x+4 et estime la dérivée numériquement avec h=0.0001.\n"
        "- Vérifications numériques: dérivée en x=-1 ≈ -6.9998 et en x=2 ≈ 5.0002.\n"
        "- Ensuite il pose la dérivée analytique f'(x)=4x-3 et lance une boucle d'optimisation depuis x=2.0, alpha=0.01, 250 itérations.\n"
        "- Résultat observé: minimum approché x≈0.76 (proche de l'optimum théorique x=0.75).\n"
        "- Partie règle de la chaîne: avec la dérivée 6x-3, la boucle converge vers x≈0.50.\n"
        "- Optimisation multi-variables: mise à jour de a,b,c avec dérivées partielles; valeurs observées a≈0.30, b≈0, c≈-11.5 après itérations.\n"
        "- Interprétation: dans son setup, c a un gradient constant positif, donc c continue de diminuer si on itère davantage.\n"
        "Résultat: il relie les maths, l'implémentation et l'interprétation terrain, puis réutilise cette base dans la régression et l'entraînement PyTorch."
    )


def _is_logistic_regression_question(message: str) -> bool:
    text = _normalize_text(message)
    markers = [
        "regression logistique",
        "régression logistique",
        "logistic regression",
        "neurone artificiel",
        "artificial neuron",
        "sigmoid",
        "sigmoide",
        "sigmoïde",
        "admis",
        "w0",
        "w1",
        "w2",
        "log vraisemblance",
    ]
    return any(token in text for token in markers)


def _logistic_regression_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Saleh's logistic regression work (concrete):\n"
            "- He starts from the artificial neuron formula: weighted sum + bias, then sigmoid activation for binary probability output.\n"
            "- Practical use case: predict university admission from 3 normalized inputs (exam, average grade, motivation), with labels 0/1.\n"
            "- He implements the model from scratch: parameters w0,w1,w2,b, negative log-likelihood loss, and gradient updates:\n"
            "  dL/dw0=(pred-y)*x0, dL/dw1=(pred-y)*x1, dL/dw2=(pred-y)*x2, dL/db=(pred-y).\n"
            "- Before training, predictions are uncertain (~60% and ~59%).\n"
            "- Training setup: learning_rate=0.01, long run up to 40,000 epochs, with loss decreasing from ~0.01468 to ~0.00728.\n"
            "- Learned parameters observed: w0=19.4643, w1=-3.2723, w2=-8.2449, b=-4.9032.\n"
            "- After training, test predictions become coherent: ~93% admission for (0.8,0.7,0.7) and ~0% for (0.4,0.5,0.9).\n"
            "Outcome: he connected the math (sigmoid + chain rule + NLL) to a fully working training loop with interpretable model behavior."
        )

    return (
        "Régression logistique de Saleh (version concrète):\n"
        "- Il part du neurone artificiel: somme pondérée + biais, puis activation sigmoïde pour obtenir une probabilité binaire.\n"
        "- Cas pratique: prédire l'admission d'un étudiant à partir de 3 entrées normalisées (examen, moyenne, motivation), avec labels 0/1.\n"
        "- Implémentation from scratch: paramètres w0,w1,w2,b, loss de log-vraisemblance négative, et dérivées:\n"
        "  dL/dw0=(pred-y)*x0, dL/dw1=(pred-y)*x1, dL/dw2=(pred-y)*x2, dL/db=(pred-y).\n"
        "- Avant entraînement, les prédictions sont incertaines (~60% et ~59%).\n"
        "- Configuration d'entraînement: learning_rate=0.01, montée en itérations jusqu'à 40 000 epochs, avec une loss qui diminue de ~0.01468 à ~0.00728.\n"
        "- Paramètres appris observés: w0=19.4643, w1=-3.2723, w2=-8.2449, b=-4.9032.\n"
        "- Après entraînement, prédictions cohérentes: ~93% d'admission pour (0.8,0.7,0.7) et ~0% pour (0.4,0.5,0.9).\n"
        "Résultat: il relie les fondements mathématiques (sigmoïde, chaîne, NLL) à une boucle d'entraînement complète et interprétable."
    )


def _is_parcours_scolaire_question(message: str) -> bool:
    text = _normalize_text(message)
    markers = {
        "son parcours scolaire",
        "parcours scolaire",
        "parle moi de son parcours scolaire",
        "quel est son parcours scolaire",
        "etudes de saleh",
        "études de saleh",
    }
    if text in markers:
        return True
    return ("parcours" in text and "scolaire" in text) or ("etudes" in text) or ("études" in text)


def _parcours_scolaire_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Saleh has an academic path focused on computer science and artificial intelligence.\n\n"
            "He first completed a Bachelor's degree in application development with specialization in algorithms and data science, where he built strong foundations in programming, applied mathematics, and optimization.\n\n"
            "He is currently preparing for a Master's in AI Architecture (2026 intake), with a clear objective: design and integrate complete AI systems, from model development to production deployment.\n\n"
            "His trajectory logically evolves from software development toward advanced AI systems architecture."
        )
    return (
        "Saleh a un parcours orienté informatique et intelligence artificielle.\n\n"
        "Il a d’abord suivi un Bachelor en développement d’applications avec une spécialisation en algorithmique et data science, où il a construit des bases solides en programmation, mathématiques appliquées et optimisation.\n\n"
        "Il prépare actuellement un Master Architecte en Intelligence Artificielle (rentrée 2026), avec un objectif clair : concevoir et intégrer des systèmes IA complets, du modèle jusqu’à la mise en production.\n\n"
        "Son parcours évolue logiquement du développement logiciel vers l’architecture avancée de systèmes IA."
    )


def _is_positive_feedback(message: str) -> bool:
    text = _normalize_text(message)
    if not text:
        return False

    markers = [
        "interessant",
        "intéressant",
        "interess",
        "intéress",
        "super",
        "top",
        "merci",
        "genial",
        "génial",
        "cool",
        "parfait",
        "j aime",
        "j'aime",
        "tres bien",
        "très bien",
        "tout ca",
        "tout ça",
        "c est interessant",
        "c'est intéressant",
    ]

    # This intent should only trigger for short acknowledgement messages.
    return len(text.split()) <= 8 and any(token in text for token in markers)


def _positive_feedback_answer(session_id: str | None, lang: str = "fr") -> str:
    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-4:])

    if any(token in recent for token in ["parcours", "saleh", "profil"]):
        if lang == "en":
            return (
                "Glad this is useful.\n"
                "Would you like a more technical version of his journey,\n"
                "or should I switch to concrete projects one by one?"
            )
        return (
            "Avec plaisir.\n"
            "Vous voulez que je continue sur son parcours avec une version encore plus technique,\n"
            "ou que je bascule sur ses réalisations concrètes projet par projet ?"
        )

    if any(token in recent for token in ["projet", "project", "realisation", "réalisation", "teamcity", "wavenet", "pytorch"]):
        if lang == "en":
            return (
                "Great.\n"
                "Would you like me to detail project 1 (IA Training), project 2 (CI/CD log analysis),\n"
                "or project 3 (Ourtiguet Naturel)?"
            )
        return (
            "Ravi que ça vous intéresse.\n"
            "Souhaitez-vous que je détaille le projet 1 (IA Training), le projet 2 (analyse de logs CI/CD),\n"
            "ou le projet 3 (Ourtiguet Naturel) ?"
        )

    if lang == "en":
        return (
            "With pleasure.\n"
            "Would you like me to present his background, his projects,\n"
            "or his technical deep learning approach?"
        )
    return (
        "Avec plaisir.\n"
        "Voulez-vous que je vous présente son parcours, ses réalisations,\n"
        "ou son approche technique en deep learning ?"
    )


PROJECTS_CATALOG = [
    {
    "name": "IA Training – Deep Learning Foundations",
    "context": "Projet personnel structuré comme un parcours progressif pour maîtriser les fondements mathématiques et techniques du machine learning puis du deep learning, avec une approche orientée compréhension des mécanismes internes plutôt que simple utilisation de librairies.",
    "architecture": "1) Reprise des bases mathématiques : dérivées, gradients, règle de la chaîne, implémentation manuelle de la descente de gradient et visualisation des fonctions de coût (MSE, log-loss) avec Matplotlib. 2) Implémentation from scratch de régression linéaire et logistique en NumPy pour comprendre l'optimisation et la convergence. 3) Construction d’un réseau de neurones fully connected (MLP) en PyTorch : forward pass, fonctions d’activation (ReLU, Sigmoid), backpropagation, choix d’optimiseur (SGD, Adam), régularisation et early stopping. 4) Réseaux convolutifs (CNN) pour classification d’images : couches Conv2D, pooling, normalisation, analyse des cartes d’activation. 5) Premières expérimentations en NLP : tokenisation, embeddings, classification de texte simple, compréhension des pipelines séquentiels et de la représentation vectorielle du langage.",
    "result": "Maîtrise opérationnelle des concepts d’optimisation, compréhension concrète de la backpropagation, capacité à construire et entraîner des architectures MLP et CNN avec PyTorch, lecture et interprétation de courbes de loss/accuracy, et compréhension des bases nécessaires pour évoluer vers des architectures plus avancées (RNN, modèles génératifs ou architectures inspirées de WaveNet)."
    },
    {
        "name": "Extension IA – Analyse des builds échoués",
        "context": "Module d'assistance LLM intégré pour diagnostiquer rapidement les échecs de build TeamCity.",
        "architecture": "Collecte des logs via API TeamCity → structuration du contexte → envoi au LLM → résumé technique + cause probable + classification (compilation/test/dépendance) + suggestion de correction.",
        "result": "Diagnostic accéléré grâce à une reformulation claire des erreurs, avec une base technique généralisable à d'autres CI/CD (GitHub Actions, GitLab CI, Jenkins).",
    },
    {
        "name": "Ourtiguet Naturel – Laboratoire intelligent d’huiles essentielles",
        "context": "Projet de formation pour un laboratoire interne où l'IA assiste la création des recettes et le contrôle des dosages.",
        "architecture": "Frontend React + backend Django, intégration OpenAI avec RAG et base vectorielle Quadrant, CI/CD avec GitHub Runner sur serveur local, stack Docker + Redis + Nginx, sauvegardes locales chiffrées automatisées via scripts Python.",
        "result": "Assistant métier opérationnel en environnement interne, avec automatisation, confidentialité renforcée et couverture complète du cycle dev → IA → déploiement.",
    },
]


def _projects_block() -> str:
    lines = ["PROJETS AUTORISÉS (source unique):"]
    for i, project in enumerate(PROJECTS_CATALOG, start=1):
        lines.append(f"{i}) {project['name']}")
        lines.append(f"   - Contexte: {project['context']}")
        lines.append(f"   - Architecture: {project['architecture']}")
        lines.append(f"   - Résultat: {project['result']}")
    return "\n".join(lines)


def _sanitize_llm_text(text: str) -> str:
    # The frontend displays text as-is (no Markdown rendering).
    # We therefore sanitize common Markdown markers so users don't see "**" everywhere.
    cleaned = (text or "").strip()
    if not cleaned:
        return cleaned

    # Remove fenced code blocks markers but keep the content.
    cleaned = re.sub(r"```[a-zA-Z0-9_-]*\n?", "", cleaned)
    cleaned = cleaned.replace("```", "")

    # Remove headings markers.
    cleaned = re.sub(r"(?m)^\s{0,3}#{1,6}\s+", "", cleaned)

    # Convert Markdown list markers that use '*' into '-' to avoid star spam.
    cleaned = re.sub(r"(?m)^\s*\*\s+", "- ", cleaned)
    cleaned = re.sub(r"(?m)^\s*\+\s+", "- ", cleaned)

    # Strip emphasis markers while preserving text.
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.+?)__", r"\1", cleaned)
    cleaned = re.sub(r"\*(.+?)\*", r"\1", cleaned)
    cleaned = re.sub(r"_(.+?)_", r"\1", cleaned)

    # Normalize whitespace.
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _is_project_question(message: str) -> bool:
    text = message.lower()
    return any(token in text for token in ["projet", "project", "réalisation", "realisation"])


def _project_detail_level(message: str, session_id: str | None) -> str:
    text = _normalize_text(message)
    if any(token in text for token in ["resumé", "résumé", "court", "bref", "rapidement"]):
        return "short"
    if any(token in text for token in ["detail", "détail", "approfond", "technique", "en profondeur"]):
        return "deep"

    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-3:])
    if any(token in recent for token in ["approfond", "detail", "technique", "deep learning"]):
        return "deep"
    return "standard"


def _project_answer_short(project: dict[str, str]) -> str:
    return (
        f"{project['name']}\n"
        f"Contexte: {project['context']}\n"
        f"Ce qu'il a construit: {project['architecture']}\n"
        f"Ce que ça apporte: {project['result']}"
    )


def _project_answer_deep(project: dict[str, str]) -> str:
    if project["name"].startswith("IA Training"):
        return (
            "IA Training – Deep Learning Foundations\n"
            "Contexte: projet fondateur de son parcours IA, conçu pour comprendre les mécanismes internes des modèles et pas seulement utiliser des librairies.\n"
            "Approche mathématique: dérivées, règle de la chaîne, descente de gradient, visualisation des fonctions de coût et des tangentes avec Matplotlib.\n"
            "Machine learning de base: implémentations from scratch (NumPy) de régression linéaire et logistique pour analyser convergence, learning rate et epochs.\n"
            "Deep learning avec PyTorch: premier réseau fully connected (MLP), activations, backpropagation, choix d'optimiseurs (SGD/Adam), régularisation et early stopping.\n"
            "Vision par ordinateur: CNN avec couches convolution/pooling, lecture des cartes d'activation et interprétation des performances.\n"
            "NLP: premières expérimentations sur tokenisation, embeddings et classification de texte, avec transition progressive vers des architectures plus avancées comme WaveNet.\n"
            "Résultat: il sait expliquer de bout en bout comment un modèle apprend, pourquoi il converge (ou non), et comment structurer un pipeline d'entraînement robuste."
        )

    return (
        f"{project['name']}\n"
        f"Contexte détaillé: {project['context']}\n"
        f"Architecture détaillée: {project['architecture']}\n"
        f"Impact concret: {project['result']}\n"
        "Si vous voulez, je peux décomposer ce projet en 3 parties: problème initial, choix d'architecture, résultats opérationnels."
    )


def _is_project_selector(message: str) -> bool:
    text = (message or "").strip().lower()
    if text in {"1", "2", "3", "projet 1", "projet 2", "projet 3", "project 1", "project 2", "project 3"}:
        return True

    normalized = _normalize_text(text)
    if any(token in normalized for token in ["premier", "deuxieme", "deuxième", "troisieme", "troisième"]):
        return True

    if re.search(r"\b(?:projet|project)\s*([123])\b", normalized):
        return True

    # Accept natural references like "parle de la 1".
    if re.search(r"\b(?:la|le|du|de|d|celui)\s*([123])\b", normalized):
        return True

    return False


def _extract_project_index(message: str) -> int | None:
    text = _normalize_text(message)

    if "premier" in text:
        return 1
    if "deuxieme" in text or "deuxième" in text:
        return 2
    if "troisieme" in text or "troisième" in text:
        return 3

    explicit = re.search(r"\b(?:projet|project)\s*([123])\b", text)
    if explicit:
        return int(explicit.group(1))

    natural = re.search(r"\b(?:la|le|du|de|d|celui)\s*([123])\b", text)
    if natural:
        return int(natural.group(1))

    standalone = re.search(r"\b([123])\b", text)
    if standalone and len(text.split()) <= 4:
        return int(standalone.group(1))

    return None


def _pick_project(message: str) -> dict[str, str]:
    text = message.lower()

    selected_index = _extract_project_index(text)
    if selected_index in {1, 2, 3}:
        return PROJECTS_CATALOG[selected_index - 1]

    if text.strip() in {"1", "projet 1", "project 1"}:
        return PROJECTS_CATALOG[0]
    if text.strip() in {"2", "projet 2", "project 2"}:
        return PROJECTS_CATALOG[1]
    if text.strip() in {"3", "projet 3", "project 3"}:
        return PROJECTS_CATALOG[2]

    if any(token in text for token in [
        "ia training",
        "training",
        "régression",
        "regression",
        "linéaire",
        "lineaire",
        "logistique",
        "sigmoid",
        "classification",
        "standardscaler",
    ]):
        return PROJECTS_CATALOG[0]
    if any(token in text for token in [
        "teamcity",
        "build",
        "logs",
        "log",
        "ci",
        "cd",
        "github actions",
        "gitlab ci",
        "jenkins",
        "compilation",
        "dépendance",
        "dependance",
        "test",
    ]):
        return PROJECTS_CATALOG[1]
    if any(token in text for token in [
        "ourtiguet",
        "huiles essentielles",
        "laboratoire",
        "dosage",
        "recette",
        "django",
        "react",
        "quadrant",
        "vectorielle",
        "rag",
        "openai",
        "runner",
        "github runner",
        "redis",
        "nginx",
        "sauvegarde",
        "chiffr",
    ]):
        return PROJECTS_CATALOG[2]

    # Default to first project when user asks generically.
    return PROJECTS_CATALOG[0]


def _is_generic_projects_request(message: str) -> bool:
    text = message.lower().strip()
    if not _is_project_question(text):
        return False
    generic_markers = [
        "ses projets",
        "ses projet",
        "de ses projets",
        "de ses projet",
        "tes projets",
        "tes projet",
        "vos projets",
        "vos projet",
        "les projets",
        "les projet",
        "parle moi de ses projets",
        "parle-moi de ses projets",
        "parle moi de tes projets",
        "parle-moi de tes projets",
    ]
    if any(m in text for m in generic_markers):
        return True

    # If the user says "projet" but doesn't provide any discriminant keywords,
    # treat it as generic and ask which one to detail.
    any_keywords = any(
        token in text
        for token in [
            "1",
            "2",
            "3",
            "ia training",
            "teamcity",
            "ourtiguet",
            "django",
            "react",
            "rag",
            "vector",
            "quadrant",
            "build",
            "logs",
            "ci",
            "cd",
            "régression",
            "regression",
        ]
    )
    return not any_keywords


def _projects_menu_answer(lang: str = "fr") -> str:
    # Keep it short and natural; no Markdown.
    if lang == "en":
        return (
            "Saleh worked on several AI projects. Which one would you like me to detail?\n"
            "1) IA Training — deep learning foundations (linear/logistic regression, MLP/CNN)\n"
            "2) AI Extension — failed build analysis (TeamCity / CI/CD logs)\n"
            "3) Ourtiguet Naturel — domain AI assistant (Django/React, RAG, vectors)\n"
            "You can reply with: 'project 2' or 'TeamCity'."
        )
    return (
        "Saleh a travaillé sur plusieurs projets IA. Lequel veux-tu que je détaille ?\n"
        "1) IA Training — apprentissage des bases (régression linéaire/logistique)\n"
        "2) Extension IA — analyse de builds échoués (TeamCity / logs CI/CD)\n"
        "3) Ourtiguet Naturel — assistant IA métier (Django/React, RAG, vecteurs)\n"
        "Réponds par exemple: 'projet 2' ou 'TeamCity'."
    )


def _conversation_follow_up(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "Would you like to dive deeper into Saleh's gradient descent work, his first PyTorch neural network, or his progression toward WaveNet?"
        )
    return (
        "Voulez-vous approfondir la descente de gradient de Saleh, son premier réseau de neurones PyTorch, ou sa progression vers WaveNet ?"
    )


def _append_follow_up(text: str, lang: str = "fr") -> str:
    base = (text or "").strip()
    if not base:
        return _conversation_follow_up(lang)
    follow_up = _conversation_follow_up(lang)
    if follow_up in base:
        return base
    return f"{base}\n\n{follow_up}"


def _scope_guardrail_text(lang: str) -> str:
    if lang == "en":
        return "This space is dedicated only to AI architecture and AI project discussions."
    return "Cet espace est dédié uniquement aux échanges autour de l’architecture et des projets IA."


def _is_scope_guardrail_response(text: str, lang: str) -> bool:
    normalized = (text or "").strip()
    return normalized.startswith(_scope_guardrail_text(lang))


def _project_answer(project: dict[str, str]) -> str:
    return _project_answer_with_level(project=project, detail_level="standard", lang="fr")


def _project_translated_fields(project: dict[str, str], lang: str) -> dict[str, str]:
    if lang != "en":
        return project

    translated = {
        "IA Training – Deep Learning Foundations": {
            "name": "IA Training – Deep Learning Foundations",
            "context": "Personal project built as a progressive learning path to master machine learning and deep learning foundations through internal understanding of model behavior.",
            "architecture": "From math fundamentals and gradient descent to NumPy implementations of linear/logistic regression, then PyTorch MLP/CNN models and first NLP experiments.",
            "result": "Strong understanding of optimization, backpropagation, and practical model training workflows for production-oriented AI systems.",
        },
        "Extension IA – Analyse des builds échoués": {
            "name": "AI Extension – Failed Build Analysis",
            "context": "LLM-powered assistant module to diagnose TeamCity build failures faster.",
            "architecture": "Collect logs from TeamCity API, structure context, send to LLM, then produce technical summary, probable root cause, error category, and fix suggestions.",
            "result": "Faster troubleshooting with reusable architecture for CI/CD ecosystems such as GitHub Actions, GitLab CI, and Jenkins.",
        },
        "Ourtiguet Naturel – Laboratoire intelligent d’huiles essentielles": {
            "name": "Ourtiguet Naturel – Intelligent Essential Oils Lab",
            "context": "Training project where AI assists recipe creation and dosage control for an internal lab environment.",
            "architecture": "React frontend, Django backend, OpenAI + RAG + vector database, local CI/CD runner, Docker stack with Redis/Nginx, and encrypted local backups.",
            "result": "Operational internal assistant with automation, confidentiality, and full dev-to-deployment AI lifecycle coverage.",
        },
    }

    return translated.get(project["name"], project)


def _project_answer_with_level(project: dict[str, str], detail_level: str, lang: str = "fr") -> str:
    project_data = _project_translated_fields(project, lang)

    if detail_level == "short":
        return _project_answer_short(project_data)
    if detail_level == "deep" and lang == "en" and project_data["name"].startswith("IA Training"):
        return (
            "IA Training – Deep Learning Foundations\n"
            "Context: foundational project built to understand how models learn internally, not only how to use libraries.\n"
            "Math layer: derivatives, chain rule, gradient descent, and loss/tangent visualization with Matplotlib.\n"
            "ML base: from-scratch NumPy implementations of linear and logistic regression to study convergence, learning rate, and epochs.\n"
            "Deep learning with PyTorch: first fully connected network (MLP), activations, backpropagation, optimizer choices (SGD/Adam), regularization, and early stopping.\n"
            "Computer vision: CNN experiments with convolution/pooling layers and activation-map interpretation.\n"
            "NLP: first experiments in tokenization, embeddings, and text classification, with progression toward advanced architectures like WaveNet.\n"
            "Outcome: practical ability to explain and build robust end-to-end AI training pipelines."
        )
    if detail_level == "deep":
        return _project_answer_deep(project)

    if lang == "en":
        return (
            f"{project_data['name']}\n"
            f"Context: {project_data['context']}\n"
            f"What he built: {project_data['architecture']}\n"
            f"Impact: {project_data['result']}\n"
            "If you want, I can also provide a concrete breakdown (problem → approach → result) for this project."
        )

    if project_data["name"] == "IA Training":
        return (
            "IA Training\n"
            "Contexte: projet fondateur de son parcours IA, commencé pour comprendre les mathématiques de l'apprentissage et aller jusqu'aux premiers réseaux de neurones.\n"
            "Ce qu'il a appris étape par étape:\n"
            "- Descente de gradient à partir de dérivées simples, avec visualisation des courbes et tangentes (Matplotlib).\n"
            "- Régression linéaire et logistique, avec impact du learning rate, des epochs et du scaling.\n"
            "- Premier réseau fully connected en PyTorch, puis réseaux convolutifs (CNN) et compréhension des couches.\n"
            "- Premières bases NLP et ouverture vers des architectures plus avancées comme WaveNet.\n"
            "Ce que ça apporte: une base concrète et structurée pour concevoir, entraîner et expliquer un modèle IA de bout en bout."
        )

    # Natural, human-ish, still deterministic.
    return (
        f"{project['name']}\n"
        f"Contexte: {project['context']}\n"
        f"Ce qu'il a construit: {project['architecture']}\n"
        f"Ce que ça apporte: {project['result']}\n"
        "Si tu veux, je peux aussi te donner un exemple concret (problème → approche → résultat) sur ce projet."
    )


def _detect_intent(message: str, session_id: str | None) -> str:
    text = _normalize_text(message)
    scores = {
        "greeting": 0,
        "identity": 0,
        "saleh_intro": 0,
        "parcours_scolaire": 0,
        "parcours": 0,
        "technical_path": 0,
        "gradient_focus": 0,
        "logistic_focus": 0,
        "positive_feedback": 0,
        "projects": 0,
        "project_selector": 0,
        "llm": 0,
    }

    if _is_greeting(text):
        scores["greeting"] += 10
    if _is_identity_question(text):
        scores["identity"] += 10
    if _is_saleh_intro_question(text):
        scores["saleh_intro"] += 10
    if _is_parcours_scolaire_question(text):
        scores["parcours_scolaire"] += 10
    if _is_parcours_question(text):
        scores["parcours"] += 8
    if _is_technical_path_question(text):
        scores["technical_path"] += 10
    if _is_gradient_focus_question(text):
        scores["gradient_focus"] += 12
    if _is_logistic_regression_question(text):
        scores["logistic_focus"] += 13
    if _is_positive_feedback(text):
        scores["positive_feedback"] += 9
    if _is_project_question(text):
        scores["projects"] += 7
    if _is_project_selector(text):
        scores["project_selector"] += 10

    if _extract_project_index(text) in {1, 2, 3}:
        scores["project_selector"] += 6

    if any(token in text for token in ["gradient", "pytorch", "wavenet", "cnn", "mlp", "deep learning"]):
        scores["projects"] += 4
    if any(token in text for token in ["sigmoid", "sigmoide", "sigmoïde", "logistique", "logistic", "admis", "nll"]):
        scores["logistic_focus"] += 4
    if any(token in text for token in ["gradient", "gradiant", "descente"]):
        scores["gradient_focus"] += 3

    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-2:])
    if recent and any(token in recent for token in ["projet", "project"]):
        if _extract_project_index(text) in {1, 2, 3}:
            scores["project_selector"] += 8
        if any(token in text for token in ["approfond", "detail", "plus", "encore", "explique"]):
            scores["projects"] += 4

    best_intent = max(scores, key=scores.get)
    if scores[best_intent] == 0:
        return "llm"
    return best_intent


SYSTEM_PROMPT_BASE = dedent("""
Tu es l’assistant IA du portfolio de Saleh Minawi.

Ton rôle est strictement limité à :
- Présenter Saleh brièvement (Développeur backend orienté systèmes IA)
- Expliquer sa manière de structurer un projet IA
- Décrire uniquement les projets fournis dans la section PROJETS AUTORISÉS
- Répondre à des questions techniques IA (Architecture IA, RAG, LLM)

Règles de format (obligatoires) :
- Réponds uniquement en texte brut (pas de Markdown).
    Interdit: "**", "*", "#", "```".
- Ton naturel, comme un humain: phrases courtes, vocabulaire simple, pas de jargon inutile.
- Maximum ~10 lignes par réponse standard.
- Si tu fais une liste, utilise "- " (tiret) et pas "*".
- Si la question porte sur les projets:
    - ne détailler qu’un seul projet à la fois
    - si la demande est ambiguë ("ses projets") demande lequel choisir

Format pour une réponse projet (obligatoire) :
<nom du projet>
Contexte: <1 ligne>
Ce qu'il a construit: <1 ligne>
Ce que ça apporte: <1 ligne>

Tu ne dois jamais :
- Exagérer son niveau
- Dire qu’il est Architecte IA
- Inventer des projets, des clients, ou des résultats non fournis
- Répondre hors sujet (hors IA)
- Réutiliser des formulations vagues de type "etc." ou des listes interminables

Si une question sort du cadre IA :
Réponds : "Cet espace est dédié uniquement aux échanges autour de l’architecture et des projets IA."
""").strip()


def _build_system_prompt(lang: str) -> str:
    language_rule = (
        "LANGUAGE RULE: You must answer only in English."
        if lang == "en"
        else "LANGUAGE RULE: Tu dois répondre uniquement en français."
    )
    return f"{SYSTEM_PROMPT_BASE}\n\n{language_rule}\n\n{_projects_block()}"


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat(payload: ChatRequest) -> ChatResponse:
    message = (payload.message or "").strip()
    session_id = _normalize_session_id(payload.session_id)
    response_lang = _resolve_response_lang(message=message, locale_hint=payload.locale)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message is required",
        )
    if len(message) > settings.CHAT_MAX_MESSAGE_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"message too long (max {settings.CHAT_MAX_MESSAGE_CHARS} chars)",
        )

    _remember_user_turn(session_id, message)

    detected_intent = _detect_intent(message, session_id)

    # Deterministic greeting: don't start with a long bio.
    if detected_intent == "greeting":
        response_text = _greeting_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "identity":
        response_text = _identity_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "saleh_intro":
        response_text = _saleh_intro_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "parcours_scolaire":
        response_text = _parcours_scolaire_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    # Keep parcours intentionally long and detailed.
    if detected_intent == "parcours":
        response_text = _parcours_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "technical_path":
        response_text = _technical_path_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "gradient_focus":
        response_text = _append_follow_up(_gradient_focus_answer(response_lang), response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "logistic_focus":
        response_text = _logistic_regression_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "positive_feedback":
        response_text = _positive_feedback_answer(session_id, response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    # Hard guardrail: project answers are deterministic from approved catalog.
    if detected_intent in {"projects", "project_selector"}:
        if _is_generic_projects_request(message):
            response_text = _append_follow_up(_projects_menu_answer(response_lang), response_lang)
            _remember_ai_turn(session_id, response_text)
            return ChatResponse(response=response_text)
        project = _pick_project(message)
        detail_level = _project_detail_level(message, session_id)
        response_text = _append_follow_up(
            _project_answer_with_level(project=project, detail_level=detail_level, lang=response_lang)
            ,
            response_lang,
        )
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY is not configured",
        )
    try:
        with httpx.Client(timeout=settings.GROQ_TIMEOUT_SECONDS) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "temperature": settings.GROQ_TEMPERATURE,
                    "max_tokens": settings.GROQ_MAX_TOKENS,
                    "messages": [
                        {"role": "system", "content": _build_system_prompt(response_lang)},
                        {"role": "user", "content": message},
                    ],
                },
            )

        if response.status_code in (401, 403):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service authentication failed",
            )
        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM model not available",
            )
        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="LLM service quota/rate limit exceeded",
            )
        if response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM service unavailable",
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM request failed",
            )

        payload = response.json()
        choices = payload.get("choices") or []
        first = choices[0] if choices else {}
        msg = first.get("message") or {}
        content = (msg.get("content") or "").strip()
        content = _sanitize_llm_text(content)
        if not content:
            content = _scope_guardrail_text(response_lang)
        response_text = (
            content
            if _is_scope_guardrail_response(content, response_lang)
            else _append_follow_up(content, response_lang)
        )
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        status_code = getattr(e, "status_code", None)
        logger.exception("Groq error: %s", e)
        if status_code in (401, 403):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service authentication failed",
            )
        if status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM model not available",
            )
        if status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="LLM service quota/rate limit exceeded",
            )
        if status_code in (500, 502, 503, 504):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM service unavailable",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected server error",
        )
