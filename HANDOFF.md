# Contexte projet — portfolio Saleh Minawi

Document de passation. À donner tel quel à un agent qui reprend le projet sans
avoir suivi les sessions précédentes.

**Dernière mise à jour :** 15 août 2026
**Statut :** refonte visuelle et repositionnement livrés, alignés sur les CV
du 15 août 2026. Voir §5 pour les arbitrages restants.

---

## 1. Ce qu'est le projet

Portfolio professionnel de Saleh Minawi, développeur backend orienté systèmes IA.
Monorepo, front et back séparés.

| Couche       | Stack                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | Next.js 16.1.6 (App Router, Turbopack), React 19.2, TypeScript, CSS Modules |
| Backend      | FastAPI 0.115, Python 3.12, httpx. Aucune base de données                 |
| LLM          | Groq API, `llama-3.1-8b-instant`, appel HTTP direct (pas de SDK)          |
| Contenu      | 100 % statique : JSON pour les projets, dictionnaires i18n, catalogue Python en dur |
| i18n         | FR/EN maison via `[locale]` + `proxy.ts` (ex-`middleware.ts`, renommé en Next 16) |
| Déploiement  | Front sur **Vercel** (`profile-saleh-ai.vercel.app`), back sur **Koyeb**  |

**Flux de la conversation :**
navigateur → `/api/chat` (route handler Next, sert de BFF) → FastAPI `/chat` → Groq.
Le navigateur n'appelle jamais le backend directement, et la clé Groq ne quitte
jamais le serveur. C'est une bonne architecture, à conserver.

**Contraintes d'environnement locales (déjà rencontrées) :**

- Node 18 est le défaut de la machine, mais Next 16 exige ≥ 20.9.
  Utiliser `export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"`.
- `docker-compose.dev.yml` monte le front en root et laisse des fichiers root
  dans `frontend/.next/`, ce qui bloque `next dev` avec `EACCES`.
  Correctif : `docker run --rm -v "$PWD/.next:/x" alpine:3 chown -R 1000:1000 /x`.
- Le venv Python est à la racine du dossier parent : `/home/minawi/Bureau/Project_AI/.venv`.

---

## 2. Pages

| Route                              | Contenu                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `/[locale]`                        | Home « dossier » : colonne d'identité fixe + expérience, projets, stack |
| `/[locale]/projets`                | 3 projets réels, champs optionnels si non documentés |
| `/[locale]/approche-architecture`  | 7 étapes de méthode, du besoin métier au déploiement        |
| `/[locale]/chat`                   | Assistant IA conversationnel                                 |
| `/[locale]/contact`                | E-mail en action principale, LinkedIn, GitHub, CV en modal   |

---

## 3. Ce qui a été fait (session du 15 août 2026)

### Audit préalable

Le portfolio était en thème sombre « cyberpunk » avec quatre défauts majeurs :
télémétrie entièrement fictive dans le chat, positionnement « recherche
d'alternance » partout, deux pages orphelines non liées dans la navigation, et
un header qui se chevauchait sur mobile. Aucune fuite de secret n'a été trouvée
(`.env` correctement ignoré par git, bundle client propre).

### Refonte visuelle livrée

Direction validée par l'utilisateur : **fond clair, accent unique « Forêt »
`#1F4D36`, Inter seule, maquette « dossier ».**

- `frontend/src/app/globals.css` — tous les design tokens. **Source unique.**
  Aucune couleur ne doit être écrite en dur ailleurs.
- `DESIGN.md` à la racine — palette avec ratios de contraste, échelle typo,
  mode d'emploi des composants, procédure d'ajout d'une page. **À lire avant de
  toucher au CSS.**
- Composants centralisés : `Button`/`ButtonLink`, `Card`, `Section`/`Page`/`PageHeader`,
  `Badge`. Ne pas créer de variante ad hoc à côté — unifier.
- Inter auto-hébergée via `next/font` (plus de CDN Google bloquant).
- Header responsive, navigation complète (les pages Projets et Approche étaient
  inaccessibles avant).
- Chat sobre : suppression du terminal vert, du boot factice, de la scanline CRT
  et des 11 animations infinies. `prefers-reduced-motion` respecté partout.

### Crédibilité

Supprimé : `MEMORY: 4.5GB`, `LATENCY: 25ms`, `TOKEN_GEN`, `TEMP: 0.7`,
`CTX_WIN: 4096`, `MODEL: SALEH_ARCH_v1.2` (modèle inexistant), panneau `SOURCES`
suggérant un RAG absent, `LATENCY: 24ms // LOCATION: FR_PARIS`, `© 2025`,
`ARCHITECT_ID_091`. Toutes ces valeurs étaient des `Math.random()` ou des
constantes inventées.

**Règle à tenir :** une métrique affichée doit être mesurée. Sinon elle ne
s'affiche pas.

### Code supprimé

`ChatTester`, `BackendStatus`, `ButtonLink` (ancienne version), `ContactActions`,
`Container` et leurs CSS — tous importés nulle part.

### Vérifications passées

`tsc --noEmit`, `eslint src`, `next build`, plus contrôle visuel réel en
1440×900 et 390×844 sur les cinq pages.

---

## 4. Le chat — comment il marche vraiment

Tout est dans `backend/app/api/routes/chat.py` (~1320 lignes).

**Ce n'est pas un chatbot LLM classique.** C'est un routeur d'intentions à base
de regex, avec un LLM en filet de sécurité :

1. `_detect_intent()` score le message sur 10 intentions par mots-clés.
2. Si une intention gagne → **réponse écrite à la main, jamais générée**.
3. Score 0 partout → **et seulement là** → appel Groq.

L'historique de conversation **n'est jamais envoyé au LLM**. `SESSION_HISTORY`
ne sert qu'à la logique regex locale. Chaque appel Groq est sans mémoire.

Le prompt système est assemblé par `_build_system_prompt()` :
règle de langue + `SYSTEM_PROMPT_BASE` + `PROFILE_FACTS` + `_projects_block()`
+ règle de langue répétée.

### Corrections déjà appliquées au chat

- Ajout du bloc `PROFILE_FACTS` : le modèle affirmait auparavant que Saleh avait
  « peut-être peu d'expérience en production », faute de données dans le prompt.
- Règle de langue placée **en tête et en fin** de prompt : avec `locale=en`, le
  modèle répondait en français parce que tout le prompt est rédigé en français.
- Relance générique remplacée : elle enchaînait sur la descente de gradient et
  WaveNet après n'importe quelle question, y compris une question de recrutement.

### Contenu scolaire — supprimé le 15 août 2026

Les réponses sur la descente de gradient, la régression logistique et le
« parcours technique », ainsi que le projet « IA Training – Deep Learning
Foundations », ont été retirés : c'était du travail d'apprentissage présenté
comme une compétence, et ça desservait le CV. Le fichier est passé de 1490 à
1321 lignes. **Ne pas les réintroduire.**

Les intentions `gradient_focus`, `logistic_focus` et `technical_path` n'existent
plus. `_parcours_answer` a été réécrit en version professionnelle.

### Ce qui ne va toujours pas

- **Aucun rate limiting.** Un `429` Groq apparaît après ~10 requêtes rapides.
  `/chat` est public sur Koyeb, sans authentification ni cache.
- **Fuite mémoire lente.** `SESSION_HISTORY` et `FOLLOW_UP_HISTORY` sont des
  dicts non bornés en nombre de sessions, et incohérents dès qu'il y a plus
  d'une instance.
- **Le modèle hallucine** dès qu'il sort des faits fournis (il avait inventé
  MongoDB, GitLab CI, SSL/TLS, protection SQL Injection). `llama-3.1-8b-instant`
  est faible pour cet usage.

---

## 5. Profil de Saleh

Source de vérité : les deux CV dans `frontend/public/`, lus le 15 août 2026.

| Élément       | Valeur                                                          |
| ------------- | --------------------------------------------------------------- |
| Titre         | Développeur backend & IA                                          |
| Expérience    | 3 ans                                                             |
| Statut        | Freelance depuis 2026, en partenariat avec **SY Solutions** (Lyon) |
| Recherche     | CDI ou CDD, disponible immédiatement, Lyon ou télétravail          |
| Europe        | Citoyen UE — aucun permis de travail requis, ouvert à la mobilité |
| Basé à        | Saint-Genis-les-Ollières (69290), Lyon                            |
| Langues       | Français natif, anglais B2                                        |
| E-mail        | sminawi24@gmail.com                                               |
| GitHub        | github.com/saleh-td                                               |
| LinkedIn      | linkedin.com/in/saleh-minawi-62331123b                            |

### Les deux CV

Ce ne sont **pas** deux traductions du même document :

- `CV_Saleh_Minawi_CDI.pdf` — français, marché lyonnais, cible CDI/CDD.
- `Saleh_Minawi_CV_Europe.pdf` — anglais, marché européen, plus détaillé,
  contient des métriques absentes de la version française.

`config/profile.ts` sert le bon fichier selon la langue via `getCvPath(locale)`.
**Ne jamais réintroduire un chemin `/cv.pdf` en dur** : ce fichier n'existe plus.

### Expérience

**Freelance — en partenariat avec SY Solutions, Lyon — depuis 2026**
Missions de développement au forfait : backend et intégration IA (Python,
FastAPI, API REST). Prospection et qualification de clients auprès de startups
early-stage et d'incubateurs lyonnais.

**Go2cam International, Lyon — septembre 2022 à août 2025**
Éditeur de logiciels CAO/FAO. Développeur backend & IA.
Système RAG de recherche documentaire (**−50 % de temps de recherche**), LLM
interne exposé par API REST, bases vectorielles (Qdrant, ChromaDB, pgvector),
modèles ML prédictifs de prévision de demande (**jusqu'à 87 % de précision**),
chatbot d'assistance, refonte du portail Django, automatisation des pipelines.

### Formation

- Bachelor Concepteur Développeur d'Applications, spécialité science des données
  et algorithmique — Afip Formation, Villeurbanne, 2023-2025 (RNCP niveau 6)
- DUT Mathématiques Informatique — IUT La Doua, Villeurbanne, 2022-2023

### Points à faire trancher par Saleh

1. **Alternance.** Il a dit chercher « un CDI ou de l'alternance », mais
   **aucun des deux CV ne mentionne l'alternance** : le CV FR dit « disponible
   immédiatement pour un poste en CDI ou CDD ». Le site suit les CV. Si
   l'alternance est réellement une cible, il faut l'ajouter aux CV d'abord.
2. **Go2cam.** Il a demandé de le déprioriser, mais Go2cam **ouvre ses deux CV**
   et porte toutes ses métriques vérifiables. Choix retenu : le freelance passe
   en premier dans l'ordre d'affichage, Go2cam devient la seconde entrée. Il
   n'est pas supprimé — ce serait retirer la seule preuve datée du portfolio.
3. **Divergences entre les deux CV.** La version EN mentionne MongoDB, PyTorch,
   TensorFlow, scikit-learn, Transformers, XGBoost, MLflow, Airflow et ChromaDB,
   absents de la version FR. Les deux devraient dire la même chose sur les mêmes
   compétences.
4. **Chevauchement études / expérience.** Go2cam démarre en septembre 2022 et le
   DUT court de 2022 à 2023, le Bachelor de 2023 à 2025 : les trois ans
   d'expérience recouvrent la période d'études. C'est cohérent avec un parcours
   en alternance, mais les CV le présentent comme de l'expérience professionnelle
   sèche. Un recruteur attentif posera la question — mieux vaut une réponse prête.

---

## 6. Consignes de l'utilisateur sur le chat

Formulées explicitement le 15 août 2026 :

- **Trop de détail technique inutile.** Le chat ne doit plus parler de descente
  de gradient, de maîtrise de tel ou tel concept, ni d'exercices d'apprentissage.
- Ces sujets **ne servent pas son CV** et ne correspondent pas à ce qu'un
  recruteur ou un client cherche.

Un prompt détaillé pour le comportement du chat devait accompagner le message —
**il n'est pas arrivé.** Le demander avant de refondre le comportement
conversationnel.

---

## 7. Ce qui reste à faire

### Bloqué — en attente de l'utilisateur

1. **Le prompt chat détaillé** annoncé mais jamais transmis. Le comportement
   conversationnel n'a donc pas été refondu au-delà du nettoyage du contenu.
2. **Les arbitrages du §5** : alternance absente des deux CV, place de Go2cam,
   divergences FR/EN sur les compétences, chevauchement études/expérience.
3. **Des liens et des captures pour les projets.** Les fiches sont maintenant
   réelles et chiffrées, mais rien n'est cliquable. Le pipeline de veille emploi
   est un projet personnel : s'il est sur GitHub, le lien vaut plus que trois
   paragraphes de description.

### Fait le 15 août 2026, après réception des CV

- Liens CV réparés et dépendants de la langue (`getCvPath`). Les anciens PDF
  avaient été supprimés, `/cv.pdf` pointait dans le vide sur tout le site.
- `PROFILE_FACTS`, dictionnaires FR/EN et catalogue backend réécrits depuis les CV.
- Home : deux expériences au lieu d'une, freelance en premier.
- Projets : les trois fiches génériques et invérifiables remplacées par les
  projets réels, avec leurs métriques. Champs `choices` et `constraints` rendus
  optionnels — un champ non documenté ne s'affiche pas plutôt que d'être inventé.
- Backend et frontend enfin alignés sur les mêmes trois projets.

**Vérifié :** `tsc --noEmit`, `eslint src`, `next build`, import Python du module
`chat`. **Non vérifié :** le rendu visuel et le comportement du chat à
l'exécution pour ce lot — à faire avant tout déploiement.

### Priorisé

**P1 — fiabilité du chat**
- Rate limiting et cache sur `/chat`.
- Envoyer réellement l'historique au modèle.
- Passer à un modèle plus solide que `llama-3.1-8b-instant`.
- Borner `SESSION_HISTORY`.

**P2 — hygiène**
- `.nvmrc` et champ `engines` (Next 16 exige Node ≥ 20.9).
- `user:` dans `docker-compose.dev.yml` pour ne plus créer de fichiers root.
- `bg.jpg` et `IMG_8197.jpg` (230 Ko chacun, fichiers identiques) traînent encore
  dans `public/` alors que plus aucune page ne les utilise.

---

## 8. Règles de travail établies

- **Ne jamais afficher de métrique inventée.** C'est ce qui décrédibilisait le
  plus l'ancienne version.
- **`DESIGN.md` fait autorité** sur le visuel. Si le code diverge, c'est le code
  qui est en tort.
- **Tokens uniquement.** Aucune couleur ni taille en dur dans un composant.
- **Vérifier le rendu réel**, pas seulement le build : le header cassé sur mobile
  et la home coupée sous la ligne de flottaison ne se voyaient pas autrement.
- **Le design ne remplace pas le contenu manquant.** Une belle page qui ne prouve
  rien reste une page qui ne prouve rien.
