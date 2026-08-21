"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

import { Button, ButtonLink } from "@/components/Button";
import { Card, CardBody, CardTitle } from "@/components/Card";
import { CVModal } from "@/components/CVModal";
import { Page, PageHeader } from "@/components/Section";
import { getCvPath, profile } from "@/config/profile";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";
import s from "./contact.module.css";

type Props = { locale: Locale; dict: Dictionary };

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

export function ContactScene({ locale, dict }: Props) {
  const cvPath = getCvPath(locale);
  const [cvOpen, setCvOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : l'adresse reste sélectionnable
      // à l'écran et le bouton « Écrire un e-mail » fonctionne.
    }
  };

  const { contact } = dict;

  return (
    <Page>
      <PageHeader title={contact.title} lede={contact.intro} />

      <motion.div
        className={s.wrap}
        initial="hidden"
        animate="shown"
        variants={stagger}
      >
        {/* ── Action principale : l'e-mail ── */}
        <motion.section className={s.primary} variants={fadeUp} transition={{ duration: 0.4 }}>
          <h2 className={s.primaryLabel}>{contact.emailLabel}</h2>
          <a href={`mailto:${profile.email}`} className={s.email}>
            {profile.email}
          </a>
          <div className={s.primaryActions}>
            <ButtonLink href={`mailto:${profile.email}`}>{contact.emailWrite}</ButtonLink>
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? contact.emailCopied : contact.emailCopy}
            </Button>
          </div>
        </motion.section>

        {/* ── Le reste ── */}
        <motion.div className={s.secondary} variants={fadeUp} transition={{ duration: 0.4 }}>
          <Card href={profile.socials.linkedin.url}>
            <CardTitle>
              {/* Marque officielle, mais hors de TechIcon : ce n'est pas une
                  techno de stack, c'est un canal de contact. Rendue en
                  monochrome pour rester sur l'unique accent du site — pas
                  une troisième exception à ouvrir sans validation. */}
              <span className={s.cardTitleRow}>
                <FaLinkedin className={s.cardIcon} aria-hidden="true" />
                {contact.linkedinTitle}
              </span>
            </CardTitle>
            <CardBody>{contact.linkedinDesc}</CardBody>
          </Card>

          <Card href={profile.socials.github.url}>
            <CardTitle>
              <span className={s.cardTitleRow}>
                <FaGithub className={s.cardIcon} aria-hidden="true" />
                {contact.githubTitle}
              </span>
            </CardTitle>
            <CardBody>{contact.githubDesc}</CardBody>
          </Card>

          <Card>
            <CardTitle>{contact.cvTitle}</CardTitle>
            <CardBody>{contact.cvDesc}</CardBody>
            <div className={s.cvActions}>
              <Button variant="secondary" size="sm" onClick={() => setCvOpen(true)}>
                {contact.cvLabel}
              </Button>
              <ButtonLink href={cvPath} variant="ghost" size="sm" download>
                {contact.cvModalDownload}
              </ButtonLink>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <CVModal
        open={cvOpen}
        onClose={() => setCvOpen(false)}
        src={cvPath}
        labels={{
          title: contact.cvModalTitle,
          close: contact.cvModalClose,
          download: contact.cvModalDownload,
        }}
      />
    </Page>
  );
}
