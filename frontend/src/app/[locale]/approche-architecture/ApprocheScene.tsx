"use client";

import { motion, type Variants } from "framer-motion";

import { PageHeader } from "@/components/Section";
import type { Dictionary } from "@/i18n/getDictionary";
import s from "./approche.module.css";

type Props = { dict: Dictionary };

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};

export function ApprocheScene({ dict }: Props) {
  return (
    <>
      <PageHeader title={dict.approach.title} lede={dict.approach.intro} />

      {/* Déplacé depuis la home lors de son passage en résumé court. Écrit à
          la première personne, contrairement au chapô descriptif au-dessus :
          les deux se complètent plutôt que de se répéter. */}
      <motion.p
        className={s.teaser}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        {dict.approach.teaser}
      </motion.p>

      {/* Un rail continu plutôt que des lignes séparées par un filet : ces
          sept étapes forment une vraie chaîne de décision, chacune découle
          de la précédente. Le rail rend cette dépendance visible, pas
          seulement énoncée dans le texte. */}
      <motion.ol
        className={s.steps}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        {dict.approach.steps.map((step: { title: string; detail: string }, index: number) => (
          <motion.li key={step.title} className={s.step} variants={fadeUp} transition={{ duration: 0.4 }}>
            <span className={`${s.number} tabular`} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={s.content}>
              <h2 className={s.stepTitle}>{step.title}</h2>
              <p className={s.stepDetail}>{step.detail}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </>
  );
}
