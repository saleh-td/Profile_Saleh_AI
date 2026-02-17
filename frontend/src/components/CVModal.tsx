"use client";

import { useEffect, useCallback } from "react";
import styles from "./cvmodal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  labels: { title: string; close: string; download: string };
};

export function CVModal({ open, onClose, labels }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header bar */}
        <div className={styles.bar}>
          <span className={styles.barTitle}>{labels.title}</span>
          <div className={styles.barActions}>
            <a
              href="/cv.pdf"
              download
              className={styles.downloadBtn}
            >
              {labels.download} ↓
            </a>
            <button onClick={onClose} className={styles.closeBtn}>
              {labels.close}
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <iframe
          src="/cv.pdf"
          className={styles.viewer}
          title="CV Saleh Minawi"
        />
      </div>
    </div>
  );
}
