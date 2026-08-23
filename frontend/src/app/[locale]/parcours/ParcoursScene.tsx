"use client";

import { motion } from "framer-motion";

import { Highlight } from "@/components/Highlight";
import { PageHeader, Section } from "@/components/Section";
import { StackGrid } from "@/components/StackGrid";
import type { Dictionary } from "@/i18n/getDictionary";
import s from "./parcours.module.css";
import { fadeUp, REVEAL, REVEAL_VIEWPORT, stagger } from "@/components/motion";

type Props = { dict: Dictionary };

export function ParcoursScene({ dict }: Props) {
  const { parcours } = dict;

  return (
    <>
      <PageHeader title={parcours.title} lede={parcours.intro} />

      <div className={s.wrap}>
        <Section label={parcours.experienceLabel}>
          <motion.ol
            className={s.track}
            initial="hidden"
            whileInView="shown"
            viewport={REVEAL_VIEWPORT}
            variants={stagger}
          >
            {parcours.experience.map((job) => (
              <motion.li
                key={job.company}
                className={`${s.step} ${job.current ? s.stepCurrent : ""}`}
                variants={fadeUp}
                transition={REVEAL}
              >
                <div className={s.jobHead}>
                  <h3 className={s.jobTitle}>{job.role}</h3>
                  <span className={`${s.jobPeriod} tabular`}>{job.period}</span>
                </div>
                <p className={s.jobCompany}>
                  {job.company} · {job.place}
                </p>
                <ul className={s.bullets}>
                  {job.bullets.map((bullet: string) => (
                    <li key={bullet}>
                      <Highlight>{bullet}</Highlight>
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </motion.ol>
        </Section>

        <Section label={parcours.stackLabel}>
          <p className={s.stackIntro}>{parcours.stackIntro}</p>
          <StackGrid items={parcours.stack} drift />
        </Section>
      </div>
    </>
  );
}
