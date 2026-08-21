# CV

Les deux CV sont **générés**, pas édités à la main.

```bash
python cv/build.py          # versions du site (publiques)
python cv/build.py --full   # versions candidature (coordonnées complètes)
```

| Commande | Sortie | Coordonnées |
| -------- | ------ | ----------- |
| `build.py` | `frontend/public/` — servi par le site via `getCvPath()` | E-mail, ville, liens |
| `build.py --full` | `cv/out/` — **hors dépôt** (`.gitignore`) | + téléphone, adresse précise |

Les PDF du site sont publics et indexables par les moteurs de recherche : le
téléphone et l'adresse précise n'y figurent pas.

Ces deux valeurs ne sont pas non plus dans `content.json`. Le dépôt est
public, et une donnée entrée dans l'historique git y reste même après
suppression du fichier. Elles vivent dans `cv/data.local.json`, **hors
dépôt**, que `build.py` ne lit qu'avec `--full`.

Ce fichier est à recréer sur chaque machine, sous cette forme :

```json
{
  "fr": { "contactPrivate": ["<téléphone>", "<commune (code postal)>"] },
  "en": { "contactPrivate": ["<téléphone au format international>"] }
}
```

Sans lui, `build.py` fonctionne normalement et `--full` s'arrête avec un
message explicite. `cv/archive/` est ignoré pour la même raison : ces PDF
portent le téléphone.

## Pourquoi

Il existait auparavant trois CV produits séparément, jamais resynchronisés. Ils
avaient fini par se contredire : le CV anglais annonçait « nine API sources ...
400+ listings per run » pour un projet qui en agrège trois. Un recruteur ouvrant
le dépôt public l'aurait vu.

Une source unique, deux sorties. C'est tout l'intérêt du dossier.

## Modifier un CV

Éditer **`content.json`**, jamais le PDF ni le HTML intermédiaire.

Règle à tenir : le bloc `skills` doit lister **exactement les mêmes
technologies** en `fr` et en `en`. Seule la langue des libellés change. Le
script ne le vérifie pas automatiquement — c'est une discipline, pas un garde-fou.

Ce qui a le droit de différer entre les deux versions, parce que ce sont des
arguments de marché :

| Élément      | FR                                    | EN                                       |
| ------------ | ------------------------------------- | ---------------------------------------- |
| Contact      | Adresse précise, Permis B             | Ville seule, « EU citizen »              |
| Disponibilité | Lyon ou télétravail                   | Europe ou télétravail                    |

## Contraintes

- **Une seule page.** Le script compte les pages et affiche `← DÉBORDE` si l'un
  des CV passe à deux. Un CV de deux pages dont la seconde est à moitié vide fait
  négligé : resserrer le CSS ou raccourcir le contenu.
- **Mise en page à colonne unique**, volontairement : les logiciels de tri
  automatique (ATS) mélangent l'ordre de lecture des mises en page à deux
  colonnes.
- Le style reprend les tokens du site (`frontend/src/app/globals.css`) : accent
  Forêt `#1F4D36`, Inter, filets fins. S'ils changent là-bas, les répercuter dans
  le bloc `CSS` de `build.py`.

## Dépendances

- Google Chrome (impression PDF via le protocole DevTools)
- `websocket-client` côté Python
- `assets/inter-latin.b64` — Inter, sous-ensemble latin, embarquée dans le
  document pour que le PDF ne dépende d'aucune police installée

## Versions candidature

Toute variante ciblée sur une offre précise — y compris une version orientée
alternance — se dérive de `content.json` et **reste hors du site**. Le portfolio
ne sert que les deux CV de référence ci-dessus.

`archive/` contient les anciens CV, conservés pour référence et **plus servis
publiquement**.
