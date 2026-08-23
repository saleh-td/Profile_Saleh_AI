import type { Variants } from "framer-motion";

/**
 * Définitions d'animation partagées par tout le site.
 *
 * Elles vivaient auparavant dans chaque page, redéclarées à l'identique mais
 * jamais aux mêmes valeurs : six déclarations de `fadeUp` et de `stagger`
 * pour six échelonnements différents, trois durées et deux marges de
 * déclenchement. Rien de tout cela n'avait été décidé, c'était de la dérive.
 * Le visiteur ne sait pas nommer ce décalage, mais il perçoit que le site
 * n'est pas d'une seule main.
 *
 * Toute nouvelle animation part d'ici. Si une valeur ne convient pas quelque
 * part, on la change ici pour tout le monde plutôt que d'en déclarer une
 * variante à côté.
 */

/**
 * Révélation d'un bloc : fondu et remontée de 12px.
 *
 * 12px et pas davantage : au-delà, le déplacement devient le sujet et le
 * texte se lit après coup. C'est aussi la limite écrite dans DESIGN.md.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

/**
 * Cascade d'une liste courte, de deux à six éléments.
 *
 * 70ms entre deux enfants : assez pour qu'on perçoive un ordre, assez peu
 * pour qu'une liste de quatre soit entièrement là en un quart de seconde.
 */
export const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07 } },
};

/**
 * Cascade d'une grille dense, à partir d'une quinzaine d'éléments.
 *
 * Il y a deux valeurs et pas une parce qu'une seule ne peut pas servir les
 * deux cas : la stack compte jusqu'à vingt-cinq tuiles, où 70ms
 * demanderaient près de deux secondes avant la dernière. À 30ms l'ensemble
 * se pose en moins d'une seconde tout en gardant un sens de lecture.
 */
export const staggerDense: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.03 } },
};

/** Durée d'une révélation. Une seule valeur pour tout le site. */
export const REVEAL = { duration: 0.4 } as const;

/**
 * Déclenchement au défilement.
 *
 * `once: true` n'est pas négociable : sans lui, le contenu se ré-anime à
 * chaque passage et on ne peut plus remonter relire un paragraphe sans qu'il
 * clignote. La marge négative déclenche la révélation un peu avant que le
 * bloc n'entre dans le champ, pour qu'il soit déjà en place quand l'œil
 * l'atteint.
 */
export const REVEAL_VIEWPORT = { once: true, margin: "-72px" } as const;
