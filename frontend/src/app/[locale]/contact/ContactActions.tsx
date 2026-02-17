"use client";

import { useState } from "react";
import { CVModal } from "@/components/CVModal";
import styles from "./contact.module.css";

type Props = {
  labels: {
    emailTag: string;
    email: string;
    copy: string;
    copied: string;
    cvTag: string;
    cvLabel: string;
    cvHint: string;
    cvModalTitle: string;
    cvModalClose: string;
    cvModalDownload: string;
  };
};

export function ContactActions({ labels }: Props) {
  const [cvOpen, setCvOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(labels.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Email card */}
      <div className={styles.card}>
        <span className={styles.cardTag}>{labels.emailTag}</span>
        <div className={styles.emailRow}>
          <span className={styles.emailAddr}>{labels.email}</span>
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? labels.copied : labels.copy}
          </button>
        </div>
      </div>

      {/* CV card */}
      <button className={styles.cvCard} onClick={() => setCvOpen(true)}>
        <span className={styles.cardTag}>{labels.cvTag}</span>
        <h3 className={styles.cardTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.5rem' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {labels.cvLabel}
        </h3>
        <p className={styles.cardDesc}>{labels.cvHint}</p>
      </button>

      {/* CV Modal */}
      <CVModal
        open={cvOpen}
        onClose={() => setCvOpen(false)}
        labels={{
          title: labels.cvModalTitle,
          close: labels.cvModalClose,
          download: labels.cvModalDownload,
        }}
      />
    </>
  );
}
