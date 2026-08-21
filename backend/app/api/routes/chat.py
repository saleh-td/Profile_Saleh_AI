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
FOLLOW_UP_MEMORY_MAX_ITEMS = 5
FOLLOW_UP_HISTORY: dict[str, deque[str]] = defaultdict(
    lambda: deque(maxlen=FOLLOW_UP_MEMORY_MAX_ITEMS)
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


def _recent_follow_ups(session_id: str | None) -> list[str]:
    if not session_id:
        return []
    return list(FOLLOW_UP_HISTORY.get(session_id, []))


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
            "I can tell you about his experience, his projects, his availability, or how he approaches building an AI system."
        )
    return (
        "Bonjour, je suis l’assistant IA du portfolio de Saleh Minawi.\n"
        "Je peux vous parler de son expérience, de ses projets, de sa disponibilité, ou de sa façon de concevoir un système IA."
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
            "Saleh Minawi is a backend and AI developer based in Lyon.\n\n"
            "Since 2026 he has worked as a freelance developer, in partnership with SY Solutions; "
            "before that, from September 2022 to August 2025, he built AI systems at Go2cam "
            "International, a CAD/CAM software vendor. He is available immediately for a permanent "
            "or fixed-term role.\n\n"
            "What he builds: RAG document search, vector databases, language models exposed through REST "
            "APIs, and automated data pipelines. He designs systems meant to be operated: stable API "
            "contracts, traceable answers, and deployment handled from the start."
        )
    return (
        "Saleh Minawi est développeur backend et IA, basé à Lyon.\n\n"
        "Depuis 2026, il travaille en freelance, en partenariat avec SY Solutions ; auparavant, de "
        "septembre 2022 à août 2025, il construit des systèmes IA chez Go2cam International, éditeur "
        "de logiciels CAO/FAO. Il est disponible immédiatement pour un poste en CDI ou CDD.\n\n"
        "Ce qu'il construit : de la recherche documentaire par RAG, des bases vectorielles, des modèles "
        "de langage exposés par API REST, et des pipelines de données automatisés. Il conçoit des systèmes "
        "faits pour être exploités : contrats d'API stables, réponses traçables, et déploiement pensé dès "
        "le départ."
    )


def _is_work_experience_question(message: str) -> bool:
    text = _normalize_text(message)

    # Robust pattern for variants like:
    # "il a travailler ou avant", "où il a travaillé", "where did he work before"
    if re.search(r"\btravaill\w*\b", text) and re.search(r"\b(ou|où|avant|before)\b", text):
        return True

    markers = [
        "il a travaille ou",
        "il à travaille ou",
        "il a travailler ou",
        "il à travailler ou",
        "ou il a travaille",
        "où il a travaille",
        "ou il a travailler",
        "où il a travailler",
        "ou est ce qu il a travaille",
        "ou est ce qu il a travailler",
        "experience professionnelle",
        "expérience professionnelle",
        "alternance",
        "go2cam",
        "where did he work",
        "where has he worked",
        "work experience",
    ]
    return any(marker in text for marker in markers)


def _work_experience_answer(lang: str = "fr") -> str:
    if lang == "en":
        return (
            "In 2026 he moved to freelance work as a backend and AI developer, in partnership with SY Solutions in Lyon.\n\n"
            "Before that, at Go2cam International (Lyon, September 2022 to August 2025), a CAD/CAM software vendor:\n"
            "- designed and deployed a RAG system for internal document search, cutting research time by roughly 50%\n"
            "- exposed an in-house LLM through REST APIs consumed by several business applications\n"
            "- built and operated vector databases (Qdrant, ChromaDB, PostgreSQL with pgvector)\n"
            "- developed predictive machine learning models for demand forecasting\n"
            "- rebuilt the internal Django portal (authentication, workflows, REST APIs)\n"
            "- automated data pipelines and maintained services in production"
        )

    return (
        "En 2026, il passe en freelance comme développeur backend et IA, en partenariat avec SY Solutions à Lyon.\n\n"
        "Avant cela, chez Go2cam International (Lyon, septembre 2022 à août 2025), éditeur de logiciels CAO/FAO :\n"
        "- conception et déploiement d'un système RAG pour la recherche documentaire interne, réduisant le temps de recherche d'environ 50 %\n"
        "- LLM interne exposé par API REST et consommé par plusieurs applications métier\n"
        "- mise en place et exploitation de bases vectorielles (Qdrant, ChromaDB, PostgreSQL avec pgvector)\n"
        "- développement de modèles de machine learning prédictifs pour la prévision de demande\n"
        "- refonte du portail interne Django (authentification, workflows, API REST)\n"
        "- automatisation et optimisation des pipelines de données et IA"
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
    """
    Un seul fil, pas une énumération de postes.

    Les faits sont datés plutôt que comptés en durée : « septembre 2022 à
    août 2025 » reste vrai indéfiniment, « trois ans d'expérience » se périme
    silencieusement si la page n'est pas remise à jour.
    """
    if lang == "en":
        return (
            "Saleh's career follows a single line: design AI systems, then take them all the way "
            "to production and keep them running.\n\n"
            "Since 2026 he has worked as a freelance developer: fixed-scope engagements in "
            "partnership with SY Solutions, on backend development and AI integration in Python "
            "and FastAPI.\n\n"
            "He built that chain between September 2022 and August 2025, at Go2cam International "
            "in Lyon, a CAD/CAM software vendor: he designed and deployed a RAG system for internal "
            "documentation search, and research time dropped by roughly 50%. He then exposed an "
            "in-house language model through REST APIs for several business applications, built the "
            "vector databases feeding them, and rebuilt the internal Django portal.\n\n"
            "The thread is constant: start from a real business need, build, and stay accountable "
            "for the result once it runs in production."
        )
    return (
        "Le parcours de Saleh suit une seule ligne : concevoir des systèmes IA, puis les amener "
        "jusqu'à la production et les y maintenir.\n\n"
        "Depuis 2026, il travaille en freelance : missions au forfait en partenariat avec SY "
        "Solutions, sur du backend et de l'intégration IA en Python et FastAPI.\n\n"
        "Cette chaîne, il l'a construite entre septembre 2022 et août 2025, chez Go2cam "
        "International à Lyon, éditeur de logiciels CAO/FAO : il y conçoit et déploie un système "
        "RAG pour la recherche documentaire interne, et le temps de recherche baisse d'environ "
        "50 %. Il expose ensuite un LLM interne par API REST pour plusieurs applications métier, "
        "met en place les bases vectorielles qui les alimentent, et refond le portail interne "
        "Django.\n\n"
        "Le fil est constant : partir d'un besoin métier réel, construire, et rester responsable du "
        "résultat une fois en production."
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
            "Saleh holds a Bachelor's degree in Application Design and Development, specialising in data science and algorithms, from Afip Formation in Villeurbanne (2023-2025, RNCP level 6).\n\n"
            "He previously completed a diploma in Mathematics and Computer Science at IUT La Doua, Villeurbanne (2022-2023).\n\n"
            "He studied while already working in the field, which is why his professional experience overlaps with the years of his degree."
        )
    return (
        "Saleh est titulaire d'un Bachelor Concepteur Développeur d'Applications, spécialité science des données et algorithmique, obtenu à Afip Formation à Villeurbanne (2023-2025, niveau RNCP 6).\n\n"
        "Il a auparavant suivi un DUT Mathématiques Informatique à l'IUT La Doua, Villeurbanne (2022-2023).\n\n"
        "Il s'est formé tout en travaillant déjà dans le domaine, ce qui explique que son expérience professionnelle recouvre les années de ses études."
    )


def _is_positive_feedback(message: str) -> bool:
    text = _normalize_text(message)
    if not text:
        return False

    # Avoid misclassifying actionable requests (e.g. "j'aimerais un exemple") as feedback.
    if any(token in text for token in [
        "j aimerais",
        "j'aimerais",
        "je veux",
        "je voudrais",
        "peux tu",
        "pouvez vous",
        "explique",
        "detail",
        "détail",
        "exemple",
        "comment",
        "pourquoi",
        "quel",
        "quelle",
        "qu est ce",
        "qu'est ce",
    ]):
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

    # This intent should only trigger for short acknowledgement messages,
    # and only on word-level matches (avoid "j'aime" matching "j'aimerais").
    words = set(text.split())
    has_marker = False
    for marker in markers:
        marker_words = marker.split()
        if len(marker_words) == 1:
            if marker_words[0] in words:
                has_marker = True
                break
        else:
            if marker in text:
                has_marker = True
                break

    return len(text.split()) <= 8 and has_marker


def _is_example_request(message: str) -> bool:
    text = _normalize_text(message)
    if not text:
        return False

    example_markers = [
        "exemple",
        "cas concret",
        "concret",
        "probleme approche resultat",
        "problème approche résultat",
        "donne moi un exemple",
        "donne moi un cas",
        "show me an example",
        "concrete example",
    ]

    if any(marker in text for marker in example_markers):
        return True

    # Follow-up style requests after a previous project answer.
    if any(token in text for token in ["oui", "ok", "yes"]) and any(
        token in text for token in ["detail", "détail", "approfond", "more", "plus"]
    ):
        return True

    return False


def _pick_project_from_recent_context(session_id: str | None) -> dict[str, str] | None:
    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-5:])
    if not recent:
        return None

    idx = _extract_project_index(recent)
    if idx in {1, 2, 3, 4}:
        return PROJECTS_CATALOG[idx - 1]

    project_keywords = {
        0: ["rag", "documentaire", "recherche", "qdrant", "pgvector", "vectoriel", "embedding", "llm interne", "chatbot"],
        1: ["migration", "donnees", "données", "redis", "dashboard", "revendeur", "nettoyage"],
        2: ["ourtiguet", "laboratoire", "huile", "formulation", "recette", "stock", "plante"],
        3: ["veille", "emploi", "jobsearch", "ollama", "qwen", "himalayas", "eures", "adzuna", "vue"],
    }
    for index, keywords in project_keywords.items():
        if any(token in recent for token in keywords):
            return PROJECTS_CATALOG[index]

    return None


def _project_example_answer(project: dict[str, str], lang: str = "fr") -> str:
    """Reformule un projet en problème → approche → résultat."""
    if lang == "en":
        return (
            f"{project['name']}\n"
            f"Problem: {project['context']}\n"
            f"Approach: {project['architecture']}\n"
            f"Result: {project['result']}"
        )

    return (
        f"{project['name']}\n"
        f"Problème : {project['context']}\n"
        f"Approche : {project['architecture']}\n"
        f"Résultat : {project['result']}"
    )


def _positive_feedback_answer(session_id: str | None, lang: str = "fr") -> str:
    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-4:])

    if any(token in recent for token in ["parcours", "saleh", "profil", "experience", "expérience"]):
        if lang == "en":
            return (
                "Glad this is useful.\n"
                "Would you like more detail on one of his projects, or on his availability?"
            )
        return (
            "Avec plaisir.\n"
            "Voulez-vous plus de détails sur l'un de ses projets, ou sur sa disponibilité ?"
        )

    if any(token in recent for token in ["projet", "project", "realisation", "réalisation", "rag", "llm"]):
        if lang == "en":
            return (
                "Great.\n"
                "Would you like me to detail the RAG document search system, the in-house LLM\n"
                "exposed through an API, or the automated job intelligence pipeline?"
            )
        return (
            "Ravi que ça vous intéresse.\n"
            "Souhaitez-vous que je détaille le système RAG de recherche documentaire, le LLM interne\n"
            "exposé par API, ou le pipeline automatisé de veille emploi ?"
        )

    if lang == "en":
        return (
            "With pleasure.\n"
            "Would you like me to cover his experience, his projects, or his availability?"
        )
    return (
        "Avec plaisir.\n"
        "Voulez-vous que je vous présente son expérience, ses projets, ou sa disponibilité ?"
    )


# Doit rester aligné sur frontend/src/content/projects/*.json : c'est le même
# contenu présenté à deux endroits, et une divergence se voit immédiatement.
PROJECTS_CATALOG = [
    {
        "name": "Plateforme IA interne : recherche documentaire et LLM exposé par API",
        "context": "Chez Go2cam International, de 2022 à 2025. Les équipes perdaient du temps à chercher dans une documentation technique dense, répartie sur plusieurs sources internes, et chaque application réimplémentait son propre accès au modèle.",
        "architecture": "Pipeline d'ingestion et de normalisation, découpage et embeddings, stockage en base vectorielle (Qdrant, ChromaDB, PostgreSQL avec pgvector). Recherche sémantique et LLM interne exposés par une même API REST, point d'entrée unique consommé par plusieurs applications métier. Un chatbot d'assistance a été construit par-dessus.",
        "result": "Temps de recherche documentaire réduit d'environ 50 %, réponses rattachées à leur source donc vérifiables, et un contrat d'API stable qui permet de changer de modèle sans toucher aux applications clientes.",
    },
    {
        "name": "Migration et valorisation d'un patrimoine de données",
        "context": "Chez Go2cam International, de 2022 à 2025. Trois bases de production alimentées depuis 2008, plusieurs millions d'enregistrements, inexploitables en l'état : formats hétérogènes, doublons, historique jamais nettoyé. Projet mené en binôme.",
        "architecture": "Nettoyage et normalisation des trois bases, migration vers une cible unifiée, puis restitution par des tableaux de bord construits pour chaque profil de revendeur. Un mécanisme d'orchestration en Python et Redis fait tourner plusieurs scripts indépendants en parallèle, synchronisés lors de la récupération des données. Exécution en bac à sable avant toute écriture réelle, et garde-fou bloquant les traitements hors des bornes attendues.",
        "result": "Trois bases historiques nettoyées, migrées et rendues exploitables. L'affichage des données, qui dépassait dix secondes par page, est revenu à un temps de réponse normal. Les tableaux de bord sont devenus utilisables au quotidien.",
    },
    {
        "name": "Ourtiguet Naturel : gestion de laboratoire",
        "context": "Application métier pour un laboratoire de cosmétique naturelle, code non public. Suivre ce qui entre dans chaque produit : plantes, matières premières et actifs, puis les formulations et recettes qui les combinent, jusqu'à la production, avec le suivi des stocks et les alertes associées.",
        "architecture": "Backend Django et Django REST Framework exposant l'API métier, consommée par un frontend React construit avec Vite. PostgreSQL pour les données, Redis pour le cache et les sessions. Conteneurisation et orchestration par Docker Compose, avec intégration et déploiement continus sur GitHub Actions.",
        "result": "Application complète et fonctionnelle, du modèle de données à l'interface web : matières premières, formulations et stocks réunis dans un seul outil, servi par une API documentée.",
    },
    {
        "name": "jobsearch-platform : plateforme de recherche d'emploi",
        "context": "Projet personnel (2026), dépôt public sur github.com/saleh-td/jobsearch-platform. Agréger et trier automatiquement des offres d'emploi dispersées sur plusieurs plateformes, sans dépendre d'une API de LLM payante.",
        "architecture": "Agrégation de trois sources (EURES, Adzuna et Himalayas), puis scoring automatique de pertinence par un LLM exécuté en local (Qwen 2.5 7B via Ollama, sur GPU). Interface de consultation en Vue 3, l'ensemble orchestré par Docker Compose.",
        "result": "Chaîne complète et autonome, de la collecte au tri. Le code est public et exécutable en une commande.",
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
    if any(token in recent for token in ["approfond", "detail", "technique", "architecture"]):
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
    return (
        f"{project['name']}\n"
        f"Contexte détaillé: {project['context']}\n"
        f"Architecture détaillée: {project['architecture']}\n"
        f"Impact concret: {project['result']}\n"
        "Si vous voulez, je peux décomposer ce projet en 3 parties: problème initial, choix d'architecture, résultats opérationnels."
    )


def _is_project_selector(message: str) -> bool:
    text = (message or "").strip().lower()
    if text in {"1", "2", "3", "4", "projet 1", "projet 2", "projet 3", "projet 4", "project 1", "project 2", "project 3", "project 4"}:
        return True

    normalized = _normalize_text(text)
    if any(token in normalized for token in ["premier", "deuxieme", "deuxième", "troisieme", "troisième"]):
        return True

    if re.search(r"\b(?:projet|project)\s*([1234])\b", normalized):
        return True

    # Accept natural references like "parle de la 1".
    if re.search(r"\b(?:la|le|du|de|d|celui)\s*([1234])\b", normalized):
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
    if "quatrieme" in text or "quatrième" in text:
        return 4

    explicit = re.search(r"\b(?:projet|project)\s*([1234])\b", text)
    if explicit:
        return int(explicit.group(1))

    natural = re.search(r"\b(?:la|le|du|de|d|celui)\s*([1234])\b", text)
    if natural:
        return int(natural.group(1))

    standalone = re.search(r"\b([1234])\b", text)
    if standalone and len(text.split()) <= 4:
        return int(standalone.group(1))

    return None


def _pick_project(message: str) -> dict[str, str]:
    text = message.lower()

    selected_index = _extract_project_index(text)
    if selected_index in {1, 2, 3, 4}:
        return PROJECTS_CATALOG[selected_index - 1]

    if text.strip() in {"1", "projet 1", "project 1"}:
        return PROJECTS_CATALOG[0]
    if text.strip() in {"2", "projet 2", "project 2"}:
        return PROJECTS_CATALOG[1]
    if text.strip() in {"3", "projet 3", "project 3"}:
        return PROJECTS_CATALOG[2]
    if text.strip() in {"4", "projet 4", "project 4"}:
        return PROJECTS_CATALOG[3]

    if any(token in text for token in [
        "rag",
        "documentaire",
        "documentation",
        "recherche",
        "qdrant",
        "pgvector",
        "chromadb",
        "vectoriel",
        "vectorielle",
        "vector",
        "embedding",
        "semantique",
        "sémantique",
        "llm interne",
        "chatbot",
        "api rest",
    ]):
        return PROJECTS_CATALOG[0]
    if any(token in text for token in [
        "migration",
        "migrer",
        "donnees",
        "données",
        "data",
        "redis",
        "tableau de bord",
        "dashboard",
        "revendeur",
        "nettoyage",
        "sql",
    ]):
        return PROJECTS_CATALOG[1]
    if any(token in text for token in [
        "ourtiguet",
        "laboratoire",
        "huile",
        "cosmetique",
        "cosmétique",
        "plante",
        "formulation",
        "recette",
        "stock",
        "matiere premiere",
        "matière première",
        "vite",
    ]):
        return PROJECTS_CATALOG[2]
    if any(token in text for token in [
        "veille",
        "emploi",
        "offres",
        "jobsearch",
        "ollama",
        "qwen",
        "himalayas",
        "eures",
        "adzuna",
        "vue 3",
        "automatisation",
    ]):
        return PROJECTS_CATALOG[3]

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
            "rag",
            "documentaire",
            "qdrant",
            "pgvector",
            "vector",
            "llm interne",
            "chatbot",
            "portail",
            "django",
            "veille",
            "emploi",
            "jobsearch",
            "ollama",
        ]
    )
    return not any_keywords


def _projects_menu_answer(lang: str = "fr") -> str:
    # Keep it short and natural; no Markdown.
    if lang == "en":
        return (
            "Saleh has worked on several AI systems. Which one would you like me to detail?\n"
            "1) Internal AI platform: RAG search and an LLM exposed through a REST API\n"
            "2) Migrating a legacy data estate: three databases, Python and Redis\n"
            "3) Ourtiguet Naturel: laboratory management (Django REST, React, PostgreSQL)\n"
            "4) jobsearch-platform: job search platform (Ollama, Vue 3, Docker Compose)\n"
            "You can reply with: 'project 2' or 'RAG'."
        )
    return (
        "Saleh a travaillé sur plusieurs systèmes IA. Lequel voulez-vous que je détaille ?\n"
        "1) Plateforme IA interne : recherche documentaire RAG et LLM exposé par API\n"
        "2) Migration d'un patrimoine de données : trois bases, Python et Redis\n"
        "3) Ourtiguet Naturel : gestion de laboratoire (Django REST, React, PostgreSQL)\n"
        "4) jobsearch-platform : plateforme de recherche d'emploi (Ollama, Vue 3, Docker Compose)\n"
        "Répondez par exemple : « projet 2 » ou « RAG »."
    )


def _conversation_follow_up(lang: str = "fr") -> str:
    # La relance doit rester dans le registre de la personne qui pose la
    # question : un recruteur veut la suite du parcours ou un projet, pas un
    # exercice de maths.
    if lang == "en":
        return (
            "Would you like more detail on his work at Go2cam, or on one of his projects?"
        )
    return (
        "Souhaitez-vous plus de détails sur son travail chez Go2cam, ou sur l'un de ses projets ?"
    )


def _extract_topics(text: str) -> set[str]:
    normalized = _normalize_text(text)
    topics: set[str] = set()

    mapping = {
        "rag": ["rag", "documentaire", "vectoriel", "embedding"],
        "llm": ["llm", "chatbot", "api"],
        "pipeline": ["jobsearch", "veille", "emploi", "ollama"],
        "project": ["projet", "project"],
        "example": ["exemple", "cas concret", "concret", "example"],
        "availability": ["disponible", "disponibilite", "mission", "cdi", "poste", "available"],
    }

    for topic, markers in mapping.items():
        if any(marker in normalized for marker in markers):
            topics.add(topic)

    return topics


def _looks_like_direct_request(message: str) -> bool:
    text = _normalize_text(message)
    direct_markers = [
        "je veux",
        "j aimerais",
        "j'aimerais",
        "parle",
        "explique",
        "detail",
        "détail",
        "qu est ce",
        "qu'est ce",
        "comment",
        "pourquoi",
        "what",
        "how",
        "why",
        "tell me",
    ]
    return any(marker in text for marker in direct_markers)


def _append_follow_up(
    text: str,
    lang: str = "fr",
    session_id: str | None = None,
    user_message: str | None = None,
) -> str:
    base = (text or "").strip()
    if not base:
        return _conversation_follow_up(lang)

    # If the response already contains a clear question or next-step CTA,
    # avoid stacking another generic follow-up and creating repetitive output.
    if "?" in base:
        return base
    if any(token in base.lower() for token in ["si tu veux", "if you want", "voulez", "would you like"]):
        return base

    follow_up = _conversation_follow_up(lang)
    if follow_up in base:
        return base

    # Adaptive behavior: avoid repeating the same follow-up in recent turns.
    recent_follow_ups = _recent_follow_ups(session_id)
    if follow_up in recent_follow_ups:
        return base

    # Adaptive behavior: if user asked a direct topic question and follow-up repeats
    # the same topic family, don't append generic suggestion.
    user_topics = _extract_topics(user_message or "")
    follow_up_topics = _extract_topics(follow_up)
    overlap = user_topics.intersection(follow_up_topics)
    if overlap and _looks_like_direct_request(user_message or ""):
        return base

    if session_id:
        FOLLOW_UP_HISTORY[session_id].append(follow_up)
    return f"{base}\n\n{follow_up}"


def _scope_guardrail_text(lang: str) -> str:
    if lang == "en":
        return "This space is dedicated only to AI architecture and AI project discussions."
    return "Cet espace est dédié uniquement aux échanges autour de l’architecture et des projets IA."


def _is_scope_guardrail_response(text: str, lang: str) -> bool:
    normalized = (text or "").strip()
    return normalized.startswith(_scope_guardrail_text(lang))


def _project_translated_fields(project: dict[str, str], lang: str) -> dict[str, str]:
    if lang != "en":
        return project

    translated = {
        "Plateforme IA interne : recherche documentaire et LLM exposé par API": {
            "name": "Internal AI platform: document search and LLM exposed through an API",
            "context": "At Go2cam International, from 2022 to 2025. Teams were losing time searching dense technical documentation spread across several internal sources, and each application reimplemented its own access to the model.",
            "architecture": "Ingestion and normalisation pipeline, chunking and embeddings, storage in a vector database (Qdrant, ChromaDB, PostgreSQL with pgvector). Semantic search and the in-house LLM exposed through one REST API, a single entry point consumed by several business applications. A support chatbot was built on top of it.",
            "result": "Internal research time cut by roughly 50%, answers tied back to their source so they stay verifiable, and a stable API contract that allows the model to be swapped without touching client applications.",
        },
        "Migration et valorisation d'un patrimoine de données": {
            "name": "Migrating and unlocking a legacy data estate",
            "context": "At Go2cam International, from 2022 to 2025. Three production databases fed since 2008, several million records, unusable as they stood: heterogeneous formats, duplicates, history never cleaned. Delivered as a two-person project.",
            "architecture": "Cleaning and normalisation of the three databases, migration to a unified target, then results surfaced through dashboards built for each reseller profile. A Python and Redis orchestration mechanism runs several independent scripts in parallel, synchronised when pulling data. Sandboxed execution before any real write, and a guardrail blocking jobs that fall outside expected bounds.",
            "result": "Three legacy databases cleaned, migrated and made usable. Data views that took more than ten seconds a page came back to normal response times. The dashboards became usable day to day.",
        },
        "Ourtiguet Naturel : gestion de laboratoire": {
            "name": "Ourtiguet Naturel: laboratory management",
            "context": "Business application for a natural cosmetics laboratory, private codebase. Tracking what goes into every product: plants, raw materials and active ingredients, then the formulations and recipes combining them, through to production, with stock levels and their alerts.",
            "architecture": "A Django and Django REST Framework backend exposes the business API, consumed by a React frontend built with Vite. PostgreSQL for data, Redis for cache and sessions. Containerised and orchestrated with Docker Compose, with continuous integration and deployment on GitHub Actions.",
            "result": "A complete, working application from data model to web interface: raw materials, formulations and stock brought together in one tool, served by a documented API.",
        },
        "jobsearch-platform : plateforme de recherche d'emploi": {
            "name": "jobsearch-platform: job search platform",
            "context": "Personal project (2026), public repository at github.com/saleh-td/jobsearch-platform. Automating a job search end to end, without depending on a paid LLM API.",
            "architecture": "An n8n pipeline queries EURES, Adzuna and Himalayas daily, then has each posting scored from 0 to 10 by a locally hosted LLM (Qwen 2.5 7B via Ollama, on GPU). Alongside it, a Vue 3 and Flask application authenticated with JWT serves as catalogue, application preparation and tracking register. Two separate PostgreSQL instances: a volatile catalogue and a persistent register.",
            "result": "A complete, autonomous chain from collection through to application tracking. Five services orchestrated with Docker Compose, public code.",
        },
    }

    return translated.get(project["name"], project)


def _project_answer_with_level(project: dict[str, str], detail_level: str, lang: str = "fr") -> str:
    project_data = _project_translated_fields(project, lang)

    if detail_level == "short":
        return _project_answer_short(project_data)
    if detail_level == "deep":
        return _project_answer_deep(project_data)

    if lang == "en":
        return (
            f"{project_data['name']}\n"
            f"Context: {project_data['context']}\n"
            f"What he built: {project_data['architecture']}\n"
            f"Impact: {project_data['result']}\n"
            "If you want, I can also break this down as problem, approach and result."
        )

    return (
        f"{project_data['name']}\n"
        f"Contexte : {project_data['context']}\n"
        f"Ce qu'il a construit : {project_data['architecture']}\n"
        f"Ce que ça apporte : {project_data['result']}\n"
        "Si vous voulez, je peux aussi le décomposer en problème, approche et résultat."
    )


def _detect_intent(message: str, session_id: str | None) -> str:
    text = _normalize_text(message)
    scores = {
        "greeting": 0,
        "identity": 0,
        "saleh_intro": 0,
        "work_experience": 0,
        "parcours_scolaire": 0,
        "parcours": 0,
        "positive_feedback": 0,
        "example_request": 0,
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
    if _is_work_experience_question(text):
        scores["work_experience"] += 12
    if _is_parcours_scolaire_question(text):
        scores["parcours_scolaire"] += 10
    if _is_parcours_question(text):
        scores["parcours"] += 8
    if _is_positive_feedback(text):
        scores["positive_feedback"] += 9
    if _is_example_request(text):
        scores["example_request"] += 11
    if _is_project_question(text):
        scores["projects"] += 7
    if _is_project_selector(text):
        scores["project_selector"] += 10

    if _extract_project_index(text) in {1, 2, 3, 4}:
        scores["project_selector"] += 6

    if any(token in text for token in ["rag", "llm", "vectoriel", "vector", "pipeline", "embedding"]) and any(
        token in text for token in ["projet", "project", "saleh", "son"]
    ):
        scores["projects"] += 4

    recent = " ".join(_normalize_text(m) for m in _recent_user_messages(session_id)[-2:])
    if recent and any(token in recent for token in ["projet", "project"]):
        if _extract_project_index(text) in {1, 2, 3, 4}:
            scores["project_selector"] += 8
        if any(token in text for token in ["approfond", "detail", "plus", "encore", "explique"]):
            scores["projects"] += 4
        if _is_example_request(text):
            scores["example_request"] += 6

    best_intent = max(scores, key=scores.get)
    if scores[best_intent] == 0:
        return "llm"
    return best_intent


# Source de vérité du profil, alignée sur les deux CV publiés dans
# frontend/public. Toute mise à jour du CV doit être répercutée ici.
PROFILE_FACTS = dedent("""
PROFIL VÉRIFIÉ (source unique, ne rien ajouter à cette liste) :
- Saleh Minawi, développeur backend & IA. Basé à Lyon, France.
- Autonome sur tout le cycle : conception, développement, déploiement, maintenance.

RÈGLE DE FORMULATION (obligatoire) :
- Décris ce qui a été fait et QUAND, jamais depuis combien de temps.
- Interdit : « 3 ans d'expérience », « trois ans », « depuis X années ».
- À la place, cite les périodes : « de septembre 2022 à août 2025 », « en 2026 ».
- Le parcours est UNE trajectoire continue, pas deux expériences séparées :
  la même chaîne portée d'abord en entreprise, puis en autonomie.

TRAJECTOIRE (2026 à aujourd'hui) :
- Développeur backend & IA en freelance, en partenariat avec SY Solutions (Lyon).
  Missions de développement au forfait : backend et intégration IA en Python,
  FastAPI, API REST. Prospection et qualification de clients auprès de startups
  early-stage et d'incubateurs.
- Disponible immédiatement pour un poste en CDI ou CDD, sur Lyon ou en télétravail.
- Citoyen de l'Union européenne : aucun permis de travail requis en Europe.

TRAJECTOIRE (septembre 2022 à août 2025), Go2cam International (Lyon),
éditeur de logiciels CAO/FAO, comme développeur backend & IA :
- système RAG pour la recherche documentaire interne, qui a réduit le temps de
  recherche d'environ 50 %
- bases vectorielles : Qdrant, ChromaDB, PostgreSQL avec pgvector
- LLM interne exposé par API REST et consommé par plusieurs applications métier
- migration de trois bases de production alimentées depuis 2008, plusieurs
  millions d'enregistrements : nettoyage, normalisation, puis restitution par
  des tableaux de bord adaptés à chaque revendeur. Orchestration en Python et
  Redis, exécution en bac à sable et garde-fou avant toute écriture réelle.
  Projet mené en binôme
- modèles de machine learning prédictifs pour la prévision de demande, jusqu'à
  87 % de précision sur le jeu de test
- chatbot d'assistance utilisateur pour les questions techniques de premier niveau
- refonte du portail interne Django (authentification, workflows, API REST)
- automatisation des pipelines de données et déploiement en production

STACK :
- IA & data : RAG, intégration et déploiement de LLM, embeddings, fine-tuning,
  machine learning (classification, régression), deep learning
- Frameworks ML : PyTorch, TensorFlow, scikit-learn, XGBoost
- MLOps : MLflow, Airflow, Docker, Kubernetes, CI/CD, n8n
- Backend : Python, FastAPI, Django, API REST, PostgreSQL, MongoDB, SQL
- Bases vectorielles : Qdrant, ChromaDB, pgvector
- Frontend : JavaScript, React, Vue 3, Next.js
- Langues : français natif, anglais B2

FORMATION :
- Bachelor Concepteur Développeur d'Applications, spécialité science des données
  et algorithmique, Afip Formation, Villeurbanne, 2023-2025 (Bac+3/4, RNCP 6)
- DUT Mathématiques Informatique, IUT La Doua, Villeurbanne, 2022-2023

CONTACT : pour toute question de disponibilité précise, de tarif, de contrat ou
de recrutement, invite à écrire à sminawi24@gmail.com.
""").strip()


SYSTEM_PROMPT_BASE = dedent("""
Tu es l’assistant IA du portfolio de Saleh Minawi.

Ton rôle est de répondre aux questions sur :
- Son parcours, son expérience professionnelle et ses compétences (section PROFIL VÉRIFIÉ)
- Sa disponibilité et le type de missions ou de postes qui l'intéressent
- Sa manière de structurer un projet IA
- Les projets fournis dans la section PROJETS AUTORISÉS
- Des questions techniques IA (architecture IA, RAG, LLM)

Règle de vérité (la plus importante) :
- Toutes tes affirmations sur Saleh doivent venir de PROFIL VÉRIFIÉ ou de
  PROJETS AUTORISÉS. Ce sont les seules sources.
- N'invente jamais une technologie, un client, un chiffre ou une compétence qui
  n'y figure pas. Si l'information manque, dis simplement que tu ne l'as pas et
  renvoie vers sminawi24@gmail.com.
- Ne minimise jamais son expérience. Il travaille en entreprise depuis
  septembre 2022 : ne dis jamais le contraire, ni qu'il serait débutant, ni que
  son parcours serait uniquement scolaire ou académique.

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
- Exagérer son niveau, ni le sous-estimer
- Dire qu’il est Architecte IA
- Inventer des projets, des clients, ou des résultats non fournis
- Réutiliser des formulations vagues de type "etc." ou des listes interminables

Si la question n'a aucun rapport avec Saleh, son travail ou l'IA :
Réponds : "Cet espace est dédié aux échanges autour du parcours de Saleh et de ses projets IA."
""").strip()


def _build_system_prompt(lang: str) -> str:
    # La règle de langue est placée en tête et répétée en fin de prompt :
    # un modèle de petite taille suit mal une consigne isolée au milieu d'un
    # prompt entièrement rédigé dans l'autre langue.
    if lang == "en":
        language_rule = (
            "LANGUAGE: Answer only in English, regardless of the language of these "
            "instructions. Never answer in French."
        )
    else:
        language_rule = "LANGUE : réponds uniquement en français."

    return "\n\n".join(
        [
            language_rule,
            SYSTEM_PROMPT_BASE,
            PROFILE_FACTS,
            _projects_block(),
            language_rule,
        ]
    )


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

    if detected_intent == "work_experience":
        response_text = _work_experience_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "parcours_scolaire":
        response_text = _parcours_scolaire_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "parcours":
        response_text = _parcours_answer(response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "example_request":
        if _is_project_question(message) or _is_project_selector(message):
            project = _pick_project(message)
        else:
            project = _pick_project_from_recent_context(session_id)

        if project is None:
            response_text = _projects_menu_answer(response_lang)
            _remember_ai_turn(session_id, response_text)
            return ChatResponse(response=response_text)

        response_text = _append_follow_up(
            _project_example_answer(project, response_lang),
            response_lang,
            session_id=session_id,
            user_message=message,
        )
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    if detected_intent == "positive_feedback":
        response_text = _positive_feedback_answer(session_id, response_lang)
        _remember_ai_turn(session_id, response_text)
        return ChatResponse(response=response_text)

    # Hard guardrail: project answers are deterministic from approved catalog.
    if detected_intent in {"projects", "project_selector"}:
        if _is_generic_projects_request(message):
            response_text = _append_follow_up(
                _projects_menu_answer(response_lang),
                response_lang,
                session_id=session_id,
                user_message=message,
            )
            _remember_ai_turn(session_id, response_text)
            return ChatResponse(response=response_text)
        project = _pick_project(message)
        detail_level = _project_detail_level(message, session_id)
        response_text = _append_follow_up(
            _project_answer_with_level(project=project, detail_level=detail_level, lang=response_lang)
            ,
            response_lang,
            session_id=session_id,
            user_message=message,
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
            else _append_follow_up(
                content,
                response_lang,
                session_id=session_id,
                user_message=message,
            )
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
