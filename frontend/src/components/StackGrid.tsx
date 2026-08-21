"use client";

import type { CSSProperties } from "react";
import { motion, type Variants } from "framer-motion";

import { Badge } from "./Badge";
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
  const iconized = items.filter((item) => hasTechIcon(item));
  const conceptual = items.filter((item) => !hasTechIcon(item));

  return (
    <div className={s.wrap}>
      {iconized.length > 0 ? (
        <motion.ul
          className={s.grid}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          {iconized.map((item, index) => {
            const Icon = getTechIcon(item);
            const color = getTechColor(item);
            const path = DRIFT_PATHS[index % DRIFT_PATHS.length];
            return (
              // La cellule et la tuile sont deux nœuds distincts parce que
              // deux animations veulent écrire `transform` : framer-motion
              // pour l'entrée, la dérive en CSS ensuite. Sur un seul nœud,
              // le transform inline laissé par framer à la fin de l'entrée
              // gagne contre la keyframe et la dérive ne démarre jamais.
              <motion.li
                key={item}
                className={s.cell}
                variants={fadeUp}
                transition={{ duration: 0.3 }}
              >
                <span
                  className={drift ? `${s.tile} ${s.drift} ${s[`path${path}`]}` : s.tile}
                  style={drift ? driftStyle(index) : undefined}
                >
                  {Icon ? <Icon className={s.icon} style={{ color }} aria-hidden="true" /> : null}
                  <span className={s.label}>{item}</span>
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      ) : null}

      {conceptual.length > 0 ? (
        <ul className={s.concepts}>
          {conceptual.map((item) => (
            <li key={item}>
              <Badge>{item}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
