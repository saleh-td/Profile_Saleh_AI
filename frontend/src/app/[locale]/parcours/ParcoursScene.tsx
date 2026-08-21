"use client";

import { motion, type Variants } from "framer-motion";

import { Highlight } from "@/components/Highlight";
import { PageHeader, Section } from "@/components/Section";
import { StackGrid } from "@/components/StackGrid";
import type { Dictionary } from "@/i18n/getDictionary";
import s from "./parcours.module.css";

type Props = { dict: Dictionary };

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

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
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {parcours.experience.map((job) => (
              <motion.li
                key={job.company}
                className={`${s.step} ${job.current ? s.stepCurrent : ""}`}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
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
          <StackGrid items={parcours.stack} />
        </Section>
      </div>
    </>
  );
}
