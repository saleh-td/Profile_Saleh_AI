"use client";

import type { CSSProperties } from "react";
import { motion, type Variants } from "framer-motion";

import { getTechColor, getTechIcon, hasTechIcon } from "./TechIcon";
import s from "./stackGrid.module.css";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05 } },
};

/**
 * Périodes de dérive, en secondes. Volontairement premières entre elles :
 * deux tuiles ne repassent jamais par la même phase au même moment, donc
 * l'ensemble ne se resynchronise jamais en une pulsation perceptible.
 */
const DRIFT_PERIODS = [11, 13, 17, 19, 23];

/** Trois trajectoires distinctes, pour qu'aucune tuile ne suive sa voisine. */
const DRIFT_PATHS = [0, 1, 2];

/**
 * Décalage négatif : l'animation démarre déjà entamée, à un endroit
 * différent de son cycle pour chaque tuile. Sans ça, toutes partent du
 * même point au premier rendu et le départ groupé se voit.
 */
function driftStyle(index: number): CSSProperties {
  const period = DRIFT_PERIODS[index % DRIFT_PERIODS.length];
  return {
    "--drift-period": `${period}s`,
    "--drift-offset": `-${(index * 2.9) % period}s`,
  } as CSSProperties;
}

type Props = {
  items: string[];
  /**
   * Fait dériver les tuiles sur place, comme en apesanteur. Réservé à la
   * page parcours, où la stack est le sujet et occupe la fin de page. Sur
   * l'accueil et les fiches projets elle n'est qu'un élément parmi d'autres :
   * un mouvement permanent y capterait l'attention au détriment du texte.
   */
  drift?: boolean;
};

/**
 * Deux registres, pas une liste plate : les outils qui ont une vraie marque
 * (logo officiel, couleur réelle — seule exception du site à la règle
 * « un seul accent », voir DESIGN.md) scannables d'un coup d'œil, puis les
 * concepts sans logo (RAG, LLM, API REST…) en badges texte. Jamais une
 * icône générique inventée pour combler l'absence de marque.
 */
export function StackGrid({ items, drift = false }: Props) {
  // Les outils identifiables passent devant, les notions ferment la liste.
  // L'ordre est reconstruit plutôt que laissé à celui du contenu : une notion
  // isolée au milieu des logos casserait la lecture en deux temps.
  const ordered = [
    ...items.filter((item) => hasTechIcon(item)),
    ...items.filter((item) => !hasTechIcon(item)),
  ];

  if (ordered.length === 0) return null;

  const grid = (
    // Une seule liste, pas deux. Les outils et les notions forment la même
    // stack, et en deux `ul` distincts ils ne partagent pas la rangée flex :
    // les notions basculaient sur une ligne à part et n'héritaient pas de la
    // hauteur des tuiles à logo. Mesuré, 84x42 contre 84x74.
    <motion.ul
      className={drift ? `${s.grid} ${s.driftGrid}` : s.grid}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
    >
      {ordered.map((item, index) => {
        const Icon = getTechIcon(item);
        const color = getTechColor(item);
        const path = DRIFT_PATHS[index % DRIFT_PATHS.length];
        const classes = [s.tile, Icon ? null : s.concept, drift ? s.drift : null, drift ? s[`path${path}`] : null]
          .filter(Boolean)
          .join(" ");

        return (
          // La cellule et la tuile sont deux nœuds distincts parce que deux
          // animations veulent écrire `transform` : framer-motion pour
          // l'entrée, la dérive en CSS ensuite. Sur un seul nœud, le transform
          // inline laissé par framer à la fin de l'entrée gagne contre la
          // keyframe et la dérive ne démarre jamais.
          <motion.li
            key={item}
            className={s.cell}
            variants={fadeUp}
            transition={{ duration: 0.3 }}
          >
            <span className={classes} style={drift ? driftStyle(index) : undefined}>
              {Icon ? (
                <>
                  <Icon className={s.icon} style={{ color }} aria-hidden="true" />
                  <span className={s.label}>{item}</span>
                </>
              ) : (
                // Pas de pictogramme de remplacement : là où les autres tuiles
                // sont identifiées par une marque, celles-ci le sont par la
                // teinte réservée aux notions.
                <span className={s.conceptLabel}>{item}</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </motion.ul>
  );

  if (!drift) return grid;

  return (
    <div className={s.field}>
      {/* Trajectoires suggérées, pas décrites : trois ellipses inclinées,
          tracées dans le gris de filet du site. Aucune lueur, aucune couleur
          nouvelle. Purement décoratives, donc retirées de l'arbre
          d'accessibilité, et en trait d'épaisseur constante quelle que soit
          la déformation imposée par la boîte. */}
      <svg
        className={s.paths}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse cx="50" cy="50" rx="46" ry="30" transform="rotate(-8 50 50)" />
          <ellipse cx="50" cy="50" rx="34" ry="44" transform="rotate(24 50 50)" />
          <ellipse cx="50" cy="50" rx="44" ry="18" transform="rotate(9 50 50)" />
        </g>
      </svg>
      {grid}
    </div>
  );
}
