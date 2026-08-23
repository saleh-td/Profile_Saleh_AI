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
        sizes={wide ? "(max-width: 760px) 100vw, 700px" : "(max-width: 720px) 100vw, 280px"}
      />
    </figure>
  );
}
