# Design system

Conventions visuelles du portfolio. Ce fichier fait autorité : si le code et ce
document divergent, c'est le code qui est en tort.

**Source unique des tokens :** `frontend/src/app/globals.css`.
Aucune valeur de couleur, de taille de police ou d'espacement ne doit être écrite
en dur dans un composant. Si tu écris `#1f4d36` ou `14px` ailleurs que dans
`globals.css`, c'est un bug.

---

## Principes

1. **Thème clair unique.** Pas de thème sombre, pas de bascule. Le fond est
   toujours `--color-bg`.
2. **Un seul accent.** `--color-accent` sert aux CTA, aux liens de contenu et aux
   rares marqueurs. Jamais en aplat large, jamais deux accents sur un écran.
   **Deux exceptions isolées et documentées** : les couleurs de marque de
   `TechIcon`, et l'accent secondaire terracotta (`--color-secondary`) sur le
   badge de type d'engagement et le survol des cartes projet — voir « Les deux
   exceptions » dans la section Composants. Rien d'autre ne doit y toucher.
3. **Une seule famille typographique.** Inter, trois graisses. Pas de police
   secondaire décorative.
4. **Aucune animation permanente.** Les seules transitions sont des retours
   d'interaction, et elles se coupent sous `prefers-reduced-motion`.
5. **Pas d'indicateur inventé.** Une métrique affichée doit être mesurée. Une
   latence affichée doit être la vraie latence, sinon elle n'a rien à faire là.

---

## Couleur

### Neutres

Les gris sont chauds : ils partagent la teinte du fond. Un gris neutre pur sur
un fond beige jure immédiatement.

| Token                 | Valeur    | Usage                                          |
| --------------------- | --------- | ---------------------------------------------- |
| `--color-bg`          | `#FAF8F5` | Fond de page, partout                          |
| `--color-surface`     | `#FFFFFF` | Cartes, panneaux, champs de saisie             |
| `--color-fg`          | `#1A1A1A` | Titres et corps de texte — 16,8:1 (AAA)        |
| `--color-muted`       | `#6B6560` | Texte secondaire, labels — 5,5:1 (AA)          |
| `--color-line`        | `#E3DED7` | Bordures de cartes, séparateurs                |
| `--color-line-strong` | `#CFC7BC` | Bordure des boutons secondaires et des champs  |

### Accent — « Forêt »

| Token                  | Valeur    | Usage                                          |
| ---------------------- | --------- | ----------------------------------------------- |
| `--color-accent`       | `#1F4D36` | CTA principal, liens de contenu — 9,2:1 (AAA)  |
| `--color-accent-hover` | `#163825` | Survol du CTA principal                        |
| `--color-accent-wash`  | `#EDF1EE` | Fond des badges `tone="accent"`                |
| `--color-on-accent`    | `#FAF8F5` | Texte posé sur l'accent                        |

### Accent secondaire — « Terracotta »

Deux usages seulement — voir « Les deux exceptions » plus bas. Jamais un
troisième sans repasser par cette page.

| Token                     | Valeur    | Usage                                                             |
| -------------------------- | --------- | ------------------------------------------------------------------ |
| `--color-secondary`       | `#A8461F` | Badge `tone="secondary"`, filet de survol de carte — 5,56:1 (AA)  |
| `--color-secondary-hover` | `#863818` | Réservé, non utilisé actuellement                                 |
| `--color-secondary-wash`  | `#F7EBE5` | Fond des badges `tone="secondary"`                                |

### Sémantique

`--color-danger` et `--color-danger-wash` signalent un **état**, jamais une
intention décorative. Ils ne remplacent pas l'accent et ne s'utilisent pas pour
attirer l'œil.

### Règle de contraste

Tout texte doit atteindre 4,5:1 minimum sur son fond. Les couples ci-dessus sont
vérifiés. Une nouvelle association se vérifie avant d'être commitée.

---

## Typographie

**Inter**, auto-hébergée par `next/font/google` dans `app/layout.tsx` — aucune
requête vers un CDN tiers au chargement. Exposée via `--font-inter`, consommée
via `--font-sans`.

Trois graisses, pas une de plus :

| Token               | Valeur | Usage                              |
| ------------------- | ------ | ---------------------------------- |
| `--weight-regular`  | 400    | Corps de texte                     |
| `--weight-medium`   | 500    | Boutons, labels, valeurs en avant  |
| `--weight-semibold` | 600    | Tous les titres                    |

### Échelle

| Token             | Taille          | Usage                             |
| ----------------- | --------------- | --------------------------------- |
| `--text-display`  | 36 → 56px       | Réservé, non utilisé actuellement |
| `--text-h1`       | 30 → 40px       | Titre de page                     |
| `--text-h2`       | 24px            | Titre de section, nom de projet   |
| `--text-h3`       | 18px            | Titre d'entrée, poste             |
| `--text-lede`     | 18px            | Chapô sous un titre de page       |
| `--text-body`     | 16px            | Corps de texte                    |
| `--text-sm`       | 14px            | Descriptions, listes, boutons     |
| `--text-xs`       | 13px            | Métadonnées, mentions             |
| `--text-label`    | 11px            | Labels en capitales               |

`--text-display`, `--text-h1` et `--text-h2` sont fluides (`clamp`) : ne pas
ajouter de surcharge en media query par-dessus.

### Règles

- Le corps de texte reste autour de **65 caractères** par ligne (`--measure`).
- Les titres portent `text-wrap: balance` — c'est déjà appliqué globalement.
- **Pas de police monospace pour la mise en forme.** Les labels sont en Inter
  500, capitales, `--tracking-label`. Utiliser la classe `.label`.
- Les colonnes de chiffres (dates, durées) prennent la classe `.tabular`.
- `--font-mono` existe mais est réservé à du vrai code affiché.

---

## Espacement et forme

Échelle de 4px. Ne pas inventer de valeur intermédiaire.

`--space-2xs` 4 · `--space-xs` 8 · `--space-sm` 12 · `--space-md` 16 ·
`--space-lg` 24 · `--space-xl` 40 · `--space-2xl` 64 · `--space-3xl` 96

- `--radius` : **2px**, partout. Pas de carte à coins très arrondis.
- `--page-max` : 1120px.
- Espacer avec `gap` sur un conteneur flex ou grid, **pas** avec des marges par
  élément — elles fusionnent et se doublent silencieusement.

---

## Composants

Tous dans `frontend/src/components/`. **Avant de créer un composant, vérifier
qu'un équivalent n'existe pas déjà.** Si un style diffère, on unifie ; on
n'ajoute pas une variante à côté.

### `Button` / `ButtonLink`

```tsx
import { Button, ButtonLink } from "@/components/Button";

<Button onClick={save}>Enregistrer</Button>
<Button variant="secondary" size="sm">Annuler</Button>
<ButtonLink href="/fr/contact" block>Me contacter</ButtonLink>
```

| Prop      | Valeurs                             | Défaut      |
| --------- | ----------------------------------- | ----------- |
| `variant` | `primary` · `secondary` · `ghost`   | `primary`   |
| `size`    | `md` · `sm`                         | `md`        |
| `block`   | booléen — occupe toute la largeur   | `false`     |

`Button` déclenche une action, `ButtonLink` navigue. `ButtonLink` détecte seul
les URL externes (`http`, `mailto`, `tel`) et rend un `<a>` natif.

**Un seul `primary` visible par écran.**

### `Card`

```tsx
import { Card, CardTitle, CardBody, CardTags } from "@/components/Card";

<Card href="https://github.com/saleh-td">
  <CardTitle>GitHub</CardTitle>
  <CardBody>Code source de mes projets.</CardBody>
</Card>
```

Une seule apparence : surface blanche, filet 1px, rayon 2px. Pas de variante
d'ombre, pas de bandeau d'accent latéral. `href` rend la carte entièrement
cliquable. `plain` retire fond et bordure pour les listes séparées par un filet.

### `Section` / `Page` / `PageHeader`

```tsx
import { Page, PageHeader, Section } from "@/components/Section";

<Page>
  <PageHeader title="Projets" lede="Contexte, architecture, contraintes." />
  <Section label="Expérience">…</Section>
</Page>
```

- `Page` — largeur maximale et gouttières. Remplace l'ancien `Container`.
- `PageHeader` — titre `h1` et chapô.
- `Section` — bloc de contenu ; `label` affiche un en-tête en capitales
  au-dessus d'un filet.

### `Badge`

```tsx
import { Badge } from "@/components/Badge";

<Badge tone="accent">RAG</Badge>
<Badge tone="secondary">Mission professionnelle</Badge>
<Badge>FastAPI</Badge>
```

| Ton         | Rôle                                                              |
| ----------- | ------------------------------------------------------------------ |
| `accent`    | **La** techno structurante d'un projet — une seule par carte.      |
| `secondary` | Terracotta. Qualificatif transversal, jamais une technologie — voir « Les deux exceptions » ci-dessous. |
| `neutral`   | Tout le reste. Valeur par défaut.                                  |

### `TechIcon` et `StackGrid`

```tsx
import { getTechColor, getTechIcon, hasTechIcon } from "@/components/TechIcon";
import { StackGrid } from "@/components/StackGrid";

const Icon = getTechIcon("Python");   // → SiPython, ou undefined
const color = getTechColor("Python"); // → "#3776AB", couleur de marque officielle

<StackGrid items={project.stack} />
```

Logos officiels (via `react-icons/si`) **uniquement pour les technologies qui
ont une vraie marque**, rendus dans leur **couleur de marque réelle** (hex
vérifié via le paquet `simple-icons`, jamais une valeur devinée). Un terme
sans entrée dans `TechIcon` (RAG, LLM, API REST, XGBoost…) **ne reçoit jamais
d'icône générique de remplacement** : il retombe en `Badge` texte.

`StackGrid` fait ce partage automatiquement (`hasTechIcon()`) et rend les deux
registres : grille de logos, puis rangée de badges pour le reste. Composant
partagé — ne pas dupliquer cette logique dans une page, l'utiliser partout où
une liste de stack doit s'afficher (home, projets, futures pages).

### Les deux exceptions à « un seul accent »

Le site en compte deux, distinctes et non cumulables :

1. **`TechIcon`** — une couleur de marque différente par technologie, confinée
   à la tuile de son logo. Fond et bordure de la tuile restent neutres.
2. **`--color-secondary` (terracotta, `#A8461F`)** — une seule teinte, à deux
   usages précis et à ça seulement : le badge `Badge tone="secondary"` pour un
   qualificatif transversal (type d'engagement : mission professionnelle vs
   projet personnel), et le filet de gauche qui apparaît au survol d'une carte
   projet (`--color-secondary` sur `border-left`, jamais permanent).

Nulle part ailleurs — texte courant, CTA, liens, focus clavier — une de ces
deux exceptions ne doit apparaître. Le vert Forêt reste l'accent de tout le
reste du site.

### `Highlight`

```tsx
import { Highlight } from "@/components/Highlight";

<p><Highlight>{"Temps de recherche réduit d'environ 50 %."}</Highlight></p>
```

Met en évidence les métriques chiffrées (`50 %`, `87 %`) déjà présentes dans
un texte vérifié — découpage de texte pur, aucun HTML injecté, donc aucun
risque d'injection. N'invente jamais de chiffre : à réserver aux phrases qui
contiennent déjà une métrique sourcée. Ne pas étendre le motif au-delà des
nombres suivis de `%` sans une bonne raison — plus le motif est large, plus
le risque de faux positifs sur du texte normal augmente.

### `MotionProvider`

Posé une seule fois dans `app/layout.tsx`, autour de `{children}`. Enveloppe
tout le site dans `<MotionConfig reducedMotion="user">` : chaque animation
framer-motion, où qu'elle soit ajoutée par la suite, respecte automatiquement
`prefers-reduced-motion` sans qu'il faille revérifier le media query
composant par composant.

### `components/motion.ts`

**Source unique des valeurs d'animation.** Toute page qui anime importe d'ici
et ne redéclare rien. Cette règle vient d'une dérive réelle : les variants
avaient fini redéclarés dans six fichiers, avec six échelonnements différents
(0,04 · 0,05 · 0,06 · 0,08 · 0,08 · 0,09), trois durées et deux marges de
déclenchement. Aucune de ces différences n'avait été décidée.

| Export | Valeur | Emploi |
| ------ | ------ | ------ |
| `fadeUp` | fondu + 12px | Révélation d'un bloc, entrée comme défilement |
| `stagger` | 70 ms | Cascade d'une liste courte, 2 à 6 éléments |
| `staggerDense` | 30 ms | Cascade d'une grille dense, 15 éléments et plus |
| `REVEAL` | 0,4 s | Durée de toute révélation |
| `REVEAL_VIEWPORT` | `once: true`, marge −72px | Déclenchement au défilement |

Deux échelonnements et pas un seul : la stack compte jusqu'à vingt-cinq
tuiles, où 70 ms demanderaient près de deux secondes avant la dernière. Un
délai propre (`delay`) reste permis par-dessus `REVEAL`, c'est un choix de
mise en scène, pas une valeur concurrente.

Convention pour toute nouvelle animation :

- **Entrée de page** (hero, premier écran) : `variants={fadeUp}` avec
  `initial="hidden" animate="shown"`, `transform`/`opacity` uniquement.
- **Révélée au scroll** (tout ce qui est sous la ligne de flottaison) :
  `whileInView` avec `viewport={REVEAL_VIEWPORT}`. `once: true` n'est pas
  négociable : sans lui le contenu se ré-anime à chaque passage et on ne peut
  plus remonter relire un paragraphe sans qu'il clignote.
- **Micro-interaction** (survol/clic) : en CSS pur si possible (`transition`
  sur `transform`/`color`/`border-color`), framer-motion seulement si l'état
  est piloté par React. Jamais de propriété qui déclenche un reflow
  (`width`, `height`, `top`, `left`, `margin`) dans une transition.

Le principe 4 tient de nouveau sans exception : **plus rien ne bouge sans
qu'on agisse.** Les points du schéma de pipeline et la dérive de la stack ont
existé un temps, puis ont été retirés — un mouvement permanent finit par
peser, et il attirait l'œil sur le décor plutôt que sur le contenu.

Deux animations sortent encore du cadre commun, toutes deux justifiées et
documentées sur place : l'arrivée de la fiche mise en avant
(`useSpotlightArrival`), jouée une fois à la navigation, et la pastille du
chat, qui ne pulse que pendant une attente réelle et cesse dès la réponse
reçue.

---

## Classes utilitaires

Volontairement peu nombreuses, définies dans `globals.css`. Tout le reste passe
par un composant ou un CSS Module.

| Classe      | Rôle                                                        |
| ----------- | ----------------------------------------------------------- |
| `.label`    | Petites capitales espacées — métadonnées, eyebrows          |
| `.tabular`  | Chiffres alignés en colonne                                 |
| `.link`     | Lien de contenu souligné, en accent                         |
| `.srOnly`   | Masqué à l'écran, lu par les lecteurs d'écran               |

---

## Accessibilité

- Le focus clavier est visible partout (`:focus-visible`, contour en accent).
  **Ne jamais poser `outline: none` sans état de remplacement.**
- Toute animation se coupe sous `prefers-reduced-motion` — la règle CSS pure
  est dans `globals.css`, la règle framer-motion vient de `MotionProvider`
  (voir plus haut). Ne pas contourner l'une ou l'autre avec `!important`.
- Les champs de formulaire ont un `<label>`, au besoin en `.srOnly`.
- Les zones qui se mettent à jour seules portent `aria-live` (voir le chat).

---

## Ajouter une page

1. Envelopper dans `<Page>`.
2. Ouvrir par `<PageHeader title lede />`.
3. Découper en `<Section label>`.
4. Créer un CSS Module local **uniquement** pour la mise en page — la couleur et
   la typographie viennent des tokens.
5. Ajouter le lien dans `components/Header.tsx` et les libellés dans les deux
   dictionnaires `src/i18n/dictionaries/`.

Une page ajoutée sans lien dans le header est une page que personne ne verra :
c'est exactement ce qui était arrivé à `/projets` et `/approche-architecture`.
