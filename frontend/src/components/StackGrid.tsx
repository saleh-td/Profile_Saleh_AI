"use client";

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
 * Deux registres, pas une liste plate : les outils qui ont une vraie marque
 * (logo officiel, couleur réelle — seule exception du site à la règle
 * « un seul accent », voir DESIGN.md) scannables d'un coup d'œil, puis les
 * concepts sans logo (RAG, LLM, API REST…) en badges texte. Jamais une
 * icône générique inventée pour combler l'absence de marque.
 */
export function StackGrid({ items }: { items: string[] }) {
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
          {iconized.map((item) => {
            const Icon = getTechIcon(item);
            const color = getTechColor(item);
            return (
              <motion.li key={item} className={s.tile} variants={fadeUp} transition={{ duration: 0.3 }}>
                {Icon ? <Icon className={s.icon} style={{ color }} aria-hidden="true" /> : null}
                <span className={s.label}>{item}</span>
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
