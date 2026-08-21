"use client";

import { motion, type Variants } from "framer-motion";

import { ProjectThumb } from "@/components/ProjectThumb";
import { Badge } from "@/components/Badge";
import { Highlight } from "@/components/Highlight";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { PageHeader } from "@/components/Section";
import { StackGrid } from "@/components/StackGrid";
import { SPOTLIGHT_ANCHOR } from "@/content/projects/sharedLayout";
import type { Project } from "@/content/projects/types";
import type { Dictionary } from "@/i18n/getDictionary";
import s from "./projets.module.css";
import { useSpotlightArrival } from "./useSpotlightArrival";

type Props = {
  dict: Dictionary;
  projects: Project[];
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

export function ProjetsScene({ dict, projects }: Props) {
  const { labels, engagement: engagementLabels } = dict.projects;
  const arrival = useSpotlightArrival();

  return (
    <>
      <PageHeader title={dict.projects.title} lede={dict.projects.intro} />

      <motion.div
        className={s.list}
        initial="hidden"
        animate="shown"
        variants={stagger}
      >
        {projects.map((project) => {
          // Un champ non renseigné n'est pas affiché : mieux vaut une fiche
          // courte qu'une fiche remplie d'approximations.
          const rows = [
            { label: labels.context, value: project.context },
            { label: labels.architecture, value: project.architecture },
            { label: labels.choices, value: project.choices },
            { label: labels.constraints, value: project.constraints },
            { label: labels.results, value: project.results, highlight: true },
          ].filter((row) => Boolean(row.value));

          // La fiche mise en avant est pilotée par le hook d'arrivée, pas par
          // les variantes du groupe : son animation dépend d'une mesure qui
          // n'existe qu'après le montage.
          const shared = project.spotlight;

          return (
            <motion.article
              key={project.name}
              // Cible du lien de la home : le visiteur qui clique la carte
              // arrive sur cette fiche, pas en haut d'une page où elle est
              // quatrième. L'ancre est indépendante de la langue.
              id={shared ? SPOTLIGHT_ANCHOR : undefined}
              ref={shared ? arrival.ref : undefined}
              className={s.project}
              style={shared ? arrival.style : undefined}
              variants={shared ? undefined : fadeUp}
              transition={shared ? undefined : { duration: 0.4 }}
            >
              <header className={s.head}>
                <div className={s.headTop}>
                  <h2 className={s.title}>{project.name}</h2>
                  <Badge tone="secondary">{engagementLabels[project.engagement]}</Badge>
                </div>
                <p className={s.origin}>{project.origin}</p>
                {project.url ? (
                  <a
                    className={s.repo}
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.url.replace(/^https?:\/\//, "")} ↗
                  </a>
                ) : null}
              </header>

              {/* Sous l'en-tête plutôt qu'à côté : la fiche est déjà une
                  colonne de définitions large, y insérer une vignette
                  latérale casserait l'alignement des libellés. */}
              <ProjectThumb thumbnail={project.thumbnail} />

              <dl className={s.detail}>
                {rows.map((row) => (
                  <div key={row.label} className={s.row}>
                    <dt className={s.rowLabel}>{row.label}</dt>
                    <dd className={s.rowValue}>
                      {row.highlight ? <Highlight>{row.value as string}</Highlight> : row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Le schéma se place après le texte : il illustre une
                  architecture déjà décrite, il ne la remplace pas. */}
              {project.diagram === "jobsearch" ? (
                <PipelineDiagram labels={dict.projects.diagram} />
              ) : null}

              <StackGrid items={project.stack} />
            </motion.article>
          );
        })}
      </motion.div>
    </>
  );
}
