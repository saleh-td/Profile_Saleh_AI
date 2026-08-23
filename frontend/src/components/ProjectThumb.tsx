import Image from "next/image";

import type { Project } from "@/content/projects/types";
import s from "./projectThumb.module.css";

/**
 * Vignette d'un projet : une capture réelle de son interface.
 *
 * Le composant ne rend rien si le projet n'a pas de capture. Pas d'image de
 * remplacement, pas de dégradé décoratif : une vignette sert à montrer que le
 * produit existe, une illustration générique ne montrerait rien.
 */
type Props = {
  thumbnail: Project["thumbnail"];
  /**
   * Pleine largeur de la colonne de contenu, sur la fiche projet. À 280px
   * une capture de tableau n'est plus lisible : elle prouve seulement que
   * l'interface existe. Là où la place le permet, elle doit se lire.
   */
  wide?: boolean;
};

export function ProjectThumb({ thumbnail, wide }: Props) {
  if (!thumbnail) return null;

  return (
    <figure className={wide ? `${s.thumb} ${s.wide}` : s.thumb}>
      <Image
        src={thumbnail.src}
        alt={thumbnail.alt}
        width={thumbnail.width}
        height={thumbnail.height}
        className={s.image}
        sizes={
          // Largeurs mesurées sur le rendu, pas estimées : 775px pour la
          // colonne de la fiche, 280px pour la vignette de l'accueil. Un
          // `sizes` sous-évalué fait choisir au navigateur une image plus
          // petite que la place réelle, qui est ensuite étirée.
          wide ? "(max-width: 820px) 100vw, 800px" : "(max-width: 720px) 100vw, 300px"
        }
      />
    </figure>
  );
}
