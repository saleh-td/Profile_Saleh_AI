"use client";

import { motion } from "framer-motion";

import { fadeUp, REVEAL, REVEAL_VIEWPORT, staggerDense } from "./motion";
import { getConceptFamily, getTechColor, getTechIcon, hasTechIcon } from "./TechIcon";
import s from "./stackGrid.module.css";

/**
 * Deux registres, pas une liste plate : les outils qui ont une vraie marque
 * (logo officiel, couleur réelle — seule exception du site à la règle
 * « un seul accent », voir DESIGN.md) puis les notions sans logo, qui
 * portent la teinte de leur famille. Jamais une icône générique inventée
 * pour combler l'absence de marque.
 */
export function StackGrid({ items }: { items: string[] }) {
  // Les outils identifiables passent devant, les notions ferment la liste.
  // L'ordre est reconstruit plutôt que laissé à celui du contenu : une notion
  // isolée au milieu des logos casserait la lecture en deux temps.
  const ordered = [
    ...items.filter((item) => hasTechIcon(item)),
    ...items.filter((item) => !hasTechIcon(item)),
  ];

  if (ordered.length === 0) return null;

  return (
    // Une seule liste, pas deux. Les outils et les notions forment la même
    // stack, et en deux `ul` distincts ils ne partagent pas la rangée flex :
    // les notions basculaient sur une ligne à part et n'héritaient pas de la
    // hauteur des tuiles à logo.
    <motion.ul
      className={s.grid}
      initial="hidden"
      whileInView="shown"
      viewport={REVEAL_VIEWPORT}
      variants={staggerDense}
    >
      {ordered.map((item) => {
        const Icon = getTechIcon(item);
        const color = getTechColor(item);
        // Une notion reçoit la teinte de sa famille quand elle en a une.
        // Sans famille, elle reste neutre : voir CONCEPT_FAMILIES.
        const family = Icon ? undefined : getConceptFamily(item);
        const classes = [
          s.tile,
          Icon ? null : s.concept,
          family === "data" ? s.conceptData : null,
          family === "process" ? s.conceptProcess : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <motion.li key={item} className={s.cell} variants={fadeUp} transition={REVEAL}>
            <span className={classes}>
              {Icon ? (
                <>
                  <Icon className={s.icon} style={{ color }} aria-hidden="true" />
                  <span className={s.label}>{item}</span>
                </>
              ) : (
                // Pas de pictogramme de remplacement : là où les autres tuiles
                // sont identifiées par une marque, celles-ci le sont par la
                // teinte de leur famille.
                <span className={s.conceptLabel}>{item}</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
