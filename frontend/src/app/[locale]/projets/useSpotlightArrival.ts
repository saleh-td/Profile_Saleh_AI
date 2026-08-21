"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

import { takeSpotlightOrigin } from "@/content/projects/sharedLayout";

/**
 * Déplacement maximal appliqué à la fiche à l'arrivée.
 *
 * Le décalage réel dépend de l'endroit où le visiteur avait la carte à
 * l'écran au moment du clic : il peut dépasser 700px si la carte était en
 * bas de la fenêtre. Faire glisser un bloc de 1500px de haut sur cette
 * distance est lourd et attire l'œil sur le mouvement plutôt que sur la
 * fiche. On garde la direction, on borne l'amplitude.
 */
const MAX_TRAVEL = 200;

const clamp = (value: number) => Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, value));

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Rejoue l'arrivée de la fiche mise en avant depuis la position qu'occupait
 * la carte de la home au clic.
 *
 * Pourquoi pas `layoutId` : framer-motion a besoin que l'élément de départ
 * soit encore monté pour mesurer sa boîte. Sur un changement de route de
 * l'App Router, l'arbre de la home est démonté avant que celui de /projets
 * ne soit monté, donc la projection ne se déclenche jamais. Mesuré image par
 * image : aucun `transform` n'est appliqué, la fiche apparaît directement à
 * sa position finale.
 *
 * On anime la position et l'opacité, pas l'échelle : la carte fait 169px de
 * haut et la fiche 1578px, un morphing géométrique écraserait le schéma de
 * pipeline et le texte.
 */
export function useSpotlightArrival() {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fadeIn = () => animate(opacity, 1, { duration: 0.4, ease: "easeOut" });
    const source = takeSpotlightOrigin();

    // Arrivée directe par URL, ou visiteur qui a demandé moins d'animation :
    // la fiche se contente d'apparaître, sans déplacement.
    if (!source || prefersReducedMotion) {
      fadeIn();
      return;
    }

    // Le défilement vers l'ancre est fait ici plutôt que laissé au
    // navigateur : il faut qu'il soit appliqué avant de mesurer, sinon le
    // décalage est calculé contre une position que la fiche n'occupe déjà
    // plus. `scrollIntoView` respecte le `scroll-margin-top` de la fiche,
    // donc elle se pose sous le header collant.
    element.scrollIntoView({ block: "start", behavior: "instant" });

    const rect = element.getBoundingClientRect();
    const dx = clamp(source.left - rect.left);
    const dy = clamp(source.top - rect.top);

    // Le décalage est écrit directement sur le nœud avant de le confier aux
    // MotionValue. `.set()` seul ne suffit pas : framer-motion écrit le
    // transform dans sa propre boucle rAF, donc la première image serait
    // peinte à la position finale et le déplacement ne commencerait qu'à la
    // suivante. Mesuré : `matrix(1, 0, 0, 1, 0, 0)` sur l'image d'ouverture.
    element.style.transform = `translate(${dx}px, ${dy}px)`;
    x.set(dx);
    y.set(dy);

    const travel = { duration: 0.55, ease: EASE };
    animate(x, 0, travel);
    animate(y, 0, travel);
    fadeIn();
  }, [opacity, prefersReducedMotion, x, y]);

  return { ref, style: { x, y, opacity } };
}
