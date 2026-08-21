import s from "./highlight.module.css";

// Pur découpage de texte, jamais de HTML injecté : aucun risque d'injection,
// contrairement à un rendu via dangerouslySetInnerHTML.
const METRIC_PATTERN = /(\d+(?:[.,]\d+)?\s?%)/g;

/**
 * Met en évidence les métriques chiffrées (« 50 % », « 87 % ») déjà
 * présentes dans un texte source vérifié — n'ajoute et n'invente aucun
 * chiffre, ne fait que le rendre visuellement scannable.
 */
export function Highlight({ children }: { children: string }) {
  const parts = children.split(METRIC_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={s.metric}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
