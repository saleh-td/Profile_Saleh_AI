import styles from "./badge.module.css";

type Props = {
  /**
   * accent    — met en avant la techno structurante d'un projet (une par carte)
   * secondary — terracotta, réservé aux qualificatifs transversaux (nature de
   *             l'engagement : mission professionnelle vs projet personnel).
   *             Jamais pour une technologie — TechIcon et le ton accent
   *             suffisent déjà à ça. À doser : quelques badges par page, pas
   *             une teinte qu'on retrouve partout.
   * neutral   — le reste de la stack, par défaut
   */
  tone?: "accent" | "secondary" | "neutral";
  children: React.ReactNode;
};

/** Étiquette courte : technologie, catégorie, statut. */
export function Badge({ tone = "neutral", children }: Props) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
