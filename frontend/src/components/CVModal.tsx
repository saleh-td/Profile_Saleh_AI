"use client";

import { useEffect, useCallback } from "react";

import { Button, ButtonLink } from "./Button";
import styles from "./cvmodal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Chemin du PDF à afficher — dépend de la langue, voir config/profile.ts */
  src: string;
  labels: { title: string; close: string; download: string };
};

export function CVModal({ open, onClose, src, labels }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.bar}>
          <span className={styles.barTitle}>{labels.title}</span>
          <div className={styles.barActions}>
            <ButtonLink href={src} variant="ghost" size="sm" download>
              {labels.download}
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={onClose}>
              {labels.close}
            </Button>
          </div>
        </div>

        <iframe src={`${src}#view=FitH`} className={styles.viewer} title={labels.title} />
      </div>
    </div>
  );
}
