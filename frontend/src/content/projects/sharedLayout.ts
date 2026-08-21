/**
 * Lien entre la carte du projet mis en avant sur la home et sa fiche
 * complète sur /projets : une ancre pour la destination, et la géométrie
 * de la carte au moment du clic pour la continuité visuelle.
 */

/**
 * Ancre de la fiche mise en avant.
 *
 * Une constante plutôt qu'une chaîne recopiée dans les deux vues : une ancre
 * et sa cible qui divergent d'un caractère ne produisent aucune erreur, juste
 * un lien qui n'amène plus nulle part. Le bug serait silencieux.
 *
 * Volontairement neutre en langue : l'identifiant est le même en /fr et /en,
 * donc un lien partagé reste valide après changement de langue.
 */
export const SPOTLIGHT_ANCHOR = "projet-en-avant";

/** Position de la carte à l'écran, en coordonnées viewport. */
type Origin = { top: number; left: number };

/**
 * Volontairement une variable de module, pas sessionStorage.
 *
 * Elle survit à une navigation côté client, ce qu'on veut, et disparaît au
 * rechargement complet, ce qu'on veut aussi : quelqu'un qui ouvre l'URL avec
 * l'ancre directement n'a jamais vu la carte, il n'y a donc pas de mouvement
 * à rejouer. Avec sessionStorage il aurait fallu inventer une date de
 * péremption pour obtenir le même résultat.
 */
let origin: Origin | null = null;

/** Mémorise la position de la carte au clic. */
export function rememberSpotlightOrigin(el: HTMLElement | null) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  origin = { top: rect.top, left: rect.left };
}

/**
 * Lit la position mémorisée et l'efface aussitôt : une seule arrivée peut
 * la consommer. Sans cette remise à zéro, un retour arrière rejouerait un
 * mouvement calculé depuis une position qui n'est plus la bonne.
 */
export function takeSpotlightOrigin(): Origin | null {
  const taken = origin;
  origin = null;
  return taken;
}
