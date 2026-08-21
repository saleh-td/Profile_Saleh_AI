"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import { ButtonLink } from "@/components/Button";
import { Highlight } from "@/components/Highlight";
import { Section } from "@/components/Section";
import { StackGrid } from "@/components/StackGrid";
import { getCvPath, profile } from "@/config/profile";
import {
  rememberSpotlightOrigin,
  SPOTLIGHT_ANCHOR,
} from "@/content/projects/sharedLayout";
import type { Project } from "@/content/projects/types";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";
import s from "./home.module.css";

type Props = {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
};

// Un seul rythme de révélation réutilisé partout : léger déplacement + fondu,
// jamais plus de 16px, assez pour se voir sans distraire.
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};

export function HomeScene({ locale, dict, projects }: Props) {
  const { home, parcours } = dict;

  // La home est un résumé : le poste courant est lu depuis la source unique
  // de `parcours`, jamais recopié. Le détail complet vit sur /parcours.
  const currentJob = parcours.experience.find((job) => job.current);
  const spotlight = projects.find((project) => project.spotlight);

  // Position de la carte au clic : /projets s'en sert pour faire arriver la
  // fiche depuis l'endroit exact d'où le visiteur est parti.
  const spotlightRef = useRef<HTMLElement>(null);

  return (
    <div className={s.layout}>
      {/* ── Colonne d'identité : reste visible pendant la lecture ── */}
      <aside className={s.identity}>
        <motion.div
          className={s.identityInner}
          initial="hidden"
          animate="shown"
          variants={stagger}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
            <h1 className={s.name}>{home.name}</h1>
            <p className={s.role}>{home.role}</p>
          </motion.div>

          <motion.p
            className={s.availability}
            variants={fadeUp}
            transition={{ duration: 0.4 }}
          >
            <span className={s.pip} aria-hidden="true" />
            {home.availability}
          </motion.p>

          <hr className={s.rule} />

          <motion.dl className={s.meta} variants={fadeUp} transition={{ duration: 0.4 }}>
            <div className={s.metaRow}>
              <dt>{home.labels.basedIn}</dt>
              <dd>{home.location}</dd>
            </div>
            <div className={s.metaRow}>
              <dt>{home.labels.languages}</dt>
              <dd>{home.labels.languagesValue}</dd>
            </div>
          </motion.dl>

          <hr className={s.rule} />

          <motion.div className={s.actions} variants={fadeUp} transition={{ duration: 0.4 }}>
            <ButtonLink href={`/${locale}/contact`} block>
              {home.cta.contact}
            </ButtonLink>
            <ButtonLink href={getCvPath(locale)} variant="secondary" block download>
              {home.cta.cv}
            </ButtonLink>
          </motion.div>
        </motion.div>
      </aside>

      {/* ── Colonne de preuve : résumé court, chaque section renvoie au détail ── */}
      <div className={s.main}>
        <motion.p
          className={s.summary}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          {home.summary}
        </motion.p>

        <Section label={home.sections.experience}>
          {currentJob ? (
            <motion.div
              className={s.career}
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                <div className={s.careerHead}>
                  <h3 className={s.careerRole}>{currentJob.role}</h3>
                  <span className={`${s.careerPeriod} tabular`}>{currentJob.period}</span>
                </div>
                <p className={s.careerCompany}>
                  {currentJob.company} · {currentJob.place}
                </p>
              </motion.div>

              {/* Le point le plus fort, chiffré : ce qu'un recruteur retient
                  s'il ne lit rien d'autre. Le détail complet est sur /parcours. */}
              <motion.p
                className={s.careerHighlight}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
              >
                <Highlight>{home.careerHighlight}</Highlight>
              </motion.p>
            </motion.div>
          ) : null}

          <Link href={`/${locale}/parcours`} className="link">
            {home.cta.career} →
          </Link>
        </Section>

        <Section label={home.sections.projects}>
          {spotlight ? (
            <motion.article
              ref={spotlightRef}
              className={s.spotlight}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Le lien porte le titre et s'étend sur toute la carte via
                  ::after. Envelopper la carte dans un <a> aurait imbriqué
                  le lien du dépôt dans un autre lien, ce qui est invalide
                  et casse la navigation au clavier. */}
              <h3 className={s.spotlightTitle}>
                <Link
                  href={`/${locale}/projets#${SPOTLIGHT_ANCHOR}`}
                  className={s.spotlightLink}
                  onClick={() => rememberSpotlightOrigin(spotlightRef.current)}
                >
                  {spotlight.name}
                </Link>
              </h3>
              <p className={s.spotlightText}>{spotlight.context}</p>
              {spotlight.url ? (
                <a
                  className={s.spotlightRepo}
                  href={spotlight.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {spotlight.url.replace(/^https?:\/\//, "")} ↗
                </a>
              ) : null}
            </motion.article>
          ) : null}

          <Link href={`/${locale}/projets`} className="link">
            {home.cta.allProjects} →
          </Link>
        </Section>

        <Section label={home.sections.stack}>
          <StackGrid items={home.stackFeatured} />
          <Link href={`/${locale}/parcours`} className="link">
            {home.cta.stack} →
          </Link>
        </Section>

        <p className={s.contactLine}>
          <a href={`mailto:${profile.email}`} className="link">
            {profile.email}
          </a>
        </p>
      </div>
    </div>
  );
}
