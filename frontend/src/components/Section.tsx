import styles from "./section.module.css";

type SectionProps = {
  /** Label court en capitales, affiché au-dessus d'un filet. */
  label?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Bloc de contenu d'une page. Porte le rythme vertical et,
 * si un label est fourni, l'en-tête de section souligné.
 */
export function Section({ label, id, className, children }: SectionProps) {
  return (
    <section id={id} className={[styles.section, className].filter(Boolean).join(" ")}>
      {label ? <h2 className={styles.label}>{label}</h2> : null}
      {children}
    </section>
  );
}

/**
 * Enveloppe de page : largeur maximale et gouttières.
 * Remplace l'ancien composant Container.
 */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.page, className].filter(Boolean).join(" ")}>{children}</div>;
}

/** En-tête de page : titre et chapô. */
export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className={styles.pageHeader}>
      <h1>{title}</h1>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
    </header>
  );
}
