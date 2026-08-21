"use client";

import s from "./pipelineDiagram.module.css";

type Labels = {
  title: string;
  sourcesLabel: string;
  dedup: string;
  scoring: string;
  scoringDetail: string;
  storage: string;
  ui: string;
};

/**
 * Pipeline réel de jobsearch-platform, dessiné à la main.
 *
 * Composition verticale plutôt qu'horizontale : trois sources convergent
 * vers une colonne unique, qui reprend le motif de rail de /parcours et
 * /approche. Ça évite aussi le défilement horizontal à 390px, où un schéma
 * en largeur deviendrait illisible.
 *
 * Le flux est animé en `transform` seul (voir le module CSS), et les points
 * disparaissent complètement sous prefers-reduced-motion : le schéma reste
 * lisible et directionnel grâce aux têtes de flèche.
 *
 * Aucune étape inventée : EURES, Adzuna, Himalayas, déduplication, scoring
 * LLM local, PostgreSQL, interface Vue 3 sont les étapes réelles.
 */
export function PipelineDiagram({ labels }: { labels: Labels }) {
  const sources = ["EURES", "Adzuna", "Himalayas"];

  return (
    <figure className={s.figure}>
      <svg
        className={s.svg}
        viewBox="0 0 340 384"
        role="img"
        aria-label={labels.title}
      >
        <defs>
          <marker
            id="pipelineArrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path className={s.arrow} d="M0.5 0.5 L7.5 4 L0.5 7.5 Z" />
          </marker>
        </defs>

        {/* ── Sources ── */}
        <text className={s.sectionLabel} x="10" y="9">
          {labels.sourcesLabel.toUpperCase()}
        </text>

        {sources.map((name, i) => {
          const x = 10 + i * 112.5;
          return (
            <g key={name}>
              <rect className={s.box} x={x} y="18" width="95" height="34" rx="2" />
              <text className={s.boxLabel} x={x + 47.5} y="35">
                {name}
              </text>
            </g>
          );
        })}

        {/* ── Convergence des trois sources ──
             Les trois lignes se rejoignent sur un point de jonction, puis un
             seul segment fléché entre dans l'étape suivante. Trois têtes de
             flèche superposées au même endroit formaient un amas illisible. */}
        <path className={s.link} d="M57.5 52 L170 80" />
        <path className={s.link} d="M170 52 L170 80" />
        <path className={s.link} d="M282.5 52 L170 80" />
        <circle className={s.junction} cx="170" cy="80" r="2" />
        <path className={s.link} markerEnd="url(#pipelineArrow)" d="M170 80 L170 92" />

        {/* ── Déduplication ── */}
        <rect className={s.box} x="95" y="98" width="150" height="38" rx="2" />
        <text className={s.boxLabel} x="170" y="117">
          {labels.dedup}
        </text>

        <path className={s.link} markerEnd="url(#pipelineArrow)" d="M170 136 L170 170" />

        {/* ── Scoring : le cœur du système, seul encadré en accent ── */}
        <rect className={s.boxAccent} x="55" y="176" width="230" height="52" rx="2" />
        <text className={s.boxLabelAccent} x="170" y="196">
          {labels.scoring}
        </text>
        <text className={s.boxDetail} x="170" y="213">
          {labels.scoringDetail}
        </text>

        <path className={s.link} markerEnd="url(#pipelineArrow)" d="M170 228 L170 262" />

        {/* ── Stockage ── */}
        <rect className={s.box} x="95" y="268" width="150" height="38" rx="2" />
        <text className={s.boxLabel} x="170" y="287">
          {labels.storage}
        </text>

        <path className={s.link} markerEnd="url(#pipelineArrow)" d="M170 306 L170 340" />

        {/* ── Restitution ── */}
        <rect className={s.box} x="95" y="346" width="150" height="38" rx="2" />
        <text className={s.boxLabel} x="170" y="365">
          {labels.ui}
        </text>

        {/* ── Flux animé. Chaque point part du départ de son segment et se
             déplace en translate pur, sans recalcul de mise en page. ── */}
        <g className={s.flow} aria-hidden="true">
          <circle className={`${s.dot} ${s.dotFanLeft}`} cx="57.5" cy="52" r="2.5" />
          <circle className={`${s.dot} ${s.dotFanMiddle}`} cx="170" cy="52" r="2.5" />
          <circle className={`${s.dot} ${s.dotFanRight}`} cx="282.5" cy="52" r="2.5" />
          <circle className={`${s.dot} ${s.dotSpine1}`} cx="170" cy="136" r="2.5" />
          <circle className={`${s.dot} ${s.dotSpine2}`} cx="170" cy="228" r="2.5" />
          <circle className={`${s.dot} ${s.dotSpine3}`} cx="170" cy="306" r="2.5" />
        </g>
      </svg>

      <figcaption className={s.caption}>{labels.title}</figcaption>
    </figure>
  );
}
