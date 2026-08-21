import Link from "next/link";

import styles from "./card.module.css";

type Props = {
  /** Rend la carte entièrement cliquable. */
  href?: string;
  /** Sans fond ni bordure — pour les listes séparées par un filet. */
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Conteneur de contenu. Une seule apparence sur tout le site :
 * surface blanche, filet 1px, rayon 2px. Pas de variante d'ombre,
 * pas de bandeau d'accent.
 */
export function Card({ href, plain, className, children }: Props) {
  const classes = [styles.card, plain ? styles.plain : null, href ? styles.linked : null, className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const isExternal = /^https?:/.test(href);

    if (isExternal) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }

    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return <article className={classes}>{children}</article>;
}

/** Titre de carte. */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.title}>{children}</h3>;
}

/** Corps de carte, en texte secondaire. */
export function CardBody({ children }: { children: React.ReactNode }) {
  return <p className={styles.body}>{children}</p>;
}

/** Rangée de badges en pied de carte. */
export function CardTags({ children }: { children: React.ReactNode }) {
  return <div className={styles.tags}>{children}</div>;
}
