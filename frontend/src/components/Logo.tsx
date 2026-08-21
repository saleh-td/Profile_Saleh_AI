import s from "./logo.module.css";

/**
 * Monogramme SM sur fond Forêt.
 *
 * Le carré reprend le rayon du site (--radius) plutôt qu'un cercle ou un
 * arrondi générique, et le trait de gauche reprend le motif de rail qui
 * structure /parcours et /approche : la marque parle le même langage
 * visuel que les pages, elle n'est pas posée à côté.
 *
 * Les lettres sont rendues en <text> et héritent d'Inter, auto-hébergée par
 * next/font : pas de dépendance à une police externe, pas de chemins SVG
 * écrits à la main qui deviendraient impossibles à corriger.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={[s.logo, className].filter(Boolean).join(" ")}
      viewBox="0 0 28 28"
      role="img"
      aria-label="Saleh Minawi"
      focusable="false"
    >
      <rect className={s.ground} width="28" height="28" rx="2" />
      {/* Le rail : même signe que les jalons de parcours, en réduction. */}
      <rect className={s.rail} x="4.5" y="6" width="1" height="16" rx="0.5" />
      <text
        className={s.mark}
        x="16.5"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
      >
        SM
      </text>
    </svg>
  );
}
