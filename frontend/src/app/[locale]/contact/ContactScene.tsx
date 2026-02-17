"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { profile } from "@/config/profile";
import { CVModal } from "@/components/CVModal";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";
import s from "./contact.module.css";

type Props = { locale: Locale; dict: Dictionary };

/* ── Floating card wrapper ── */
function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function ContactScene({ locale, dict }: Props) {
  const router = useRouter();
  const [cvOpen, setCvOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profile.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTerminate = () => {
    setExiting(true);
    setTimeout(() => router.push(`/${locale}`), 600);
  };

  return (
    <AnimatePresence>
      <motion.section
        className={s.scene}
        animate={exiting ? { scale: 1.05, opacity: 0, filter: "blur(20px)" } : {}}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        {/* BG layers */}
        <div className={s.bgWrap}>
          <Image
            src="/bg.jpg"
            alt="AI Network"
            fill
            priority
            className={s.bgImg}
            sizes="100vw"
          />
          <div className={s.bgRadial} />
        </div>

        {/* ── Ghost title ── */}
        <motion.h1
          className={s.ghost}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          CONTACT
        </motion.h1>

        {/* ═══ Constellation cards ═══ */}

        {/* 01 · LinkedIn — top-left */}
        <FloatingCard className={`${s.node} ${s.nodeLinkedin}`} delay={0.15}>
          <a
            href={profile.socials.linkedin.url}
            target="_blank"
            rel="noopener noreferrer"
            className={s.card}
          >
            <span className={s.tag}>01 // {dict.contact.tagProfessional}</span>
            <h3 className={s.cardTitle}>LinkedIn</h3>
            <p className={s.cardDesc}>{dict.contact.linkedinDesc}</p>
          </a>
        </FloatingCard>

        {/* 02 · GitHub — top-right */}
        <FloatingCard className={`${s.node} ${s.nodeGithub}`} delay={0.3}>
          <a
            href={profile.socials.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className={s.card}
          >
            <span className={s.tag}>02 // {dict.contact.tagCode}</span>
            <h3 className={s.cardTitle}>GitHub</h3>
            <p className={s.cardDesc}>{dict.contact.githubDesc}</p>
          </a>
        </FloatingCard>

        {/* 03 · Email — bottom-left */}
        <FloatingCard className={`${s.node} ${s.nodeEmail}`} delay={0.45}>
          <div className={s.card}>
            <span className={s.tag}>03 // {dict.contact.tagDirectMail}</span>
            <div className={s.emailRow}>
              <span className={s.emailAddr}>{profile.email}</span>
              <button className={s.copyBtn} onClick={handleCopy}>
                {copied ? dict.contact.emailCopied : dict.contact.emailCopy}
              </button>
            </div>
          </div>
        </FloatingCard>

        {/* 04 · CV — bottom-right */}
        <FloatingCard className={`${s.node} ${s.nodeCv}`} delay={0.6}>
          <button className={`${s.card} ${s.cardBtn}`} onClick={() => setCvOpen(true)}>
            <span className={s.tag}>04 // {dict.contact.tagCurriculum}</span>
            <h3 className={s.cardTitle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.5rem" }}
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {dict.contact.cvLabel}
            </h3>
            <p className={s.cardDesc}>{dict.contact.cvHint}</p>
          </button>
        </FloatingCard>

        {/* ── TERMINATE_SESSION button ── */}
        <motion.div
          className={s.terminate}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <button onClick={handleTerminate} className={s.terminateBtn}>
            <span className={s.terminateLabel}>Return to Core</span>
            <span className={s.terminateIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
            <span className={s.terminateCode}>[TERMINATE_SESSION]</span>
          </button>
        </motion.div>

        {/* ── Footer technique ── */}
        <div className={s.footer}>
          <span>LATENCY: 24ms // LOCATION: FR_PARIS</span>
          <span>© 2025 ARCHITECT_ID_091</span>
        </div>

        {/* ── CV Modal ── */}
        <CVModal
          open={cvOpen}
          onClose={() => setCvOpen(false)}
          labels={{
            title: dict.contact.cvModalTitle,
            close: dict.contact.cvModalClose,
            download: dict.contact.cvModalDownload,
          }}
        />
      </motion.section>
    </AnimatePresence>
  );
}
