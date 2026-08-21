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
export function ProjectThumb({ thumbnail }: { thumbnail: Project["thumbnail"] }) {
  if (!thumbnail) return null;

  return (
    <figure className={s.thumb}>
      <Image
        src={thumbnail.src}
        alt={thumbnail.alt}
        width={thumbnail.width}
        height={thumbnail.height}
        className={s.image}
        sizes="(max-width: 720px) 100vw, 280px"
      />
    </figure>
  );
}
