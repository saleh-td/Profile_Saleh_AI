"use client";

import { useEffect, useState } from "react";

import styles from "./backendStatus.module.css";

type Props = {
  label: string;
  loading: string;
  ok: string;
  error: string;
};

type Health = {
  status?: string;
};

export function BackendStatus({ label, loading, ok, error }: Props) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as Health;
        if (cancelled) return;

        setState(res.ok && data.status === "ok" ? "ok" : "error");
      } catch {
        if (cancelled) return;
        setState("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const text = state === "loading" ? loading : state === "ok" ? ok : error;
  const tone = state === "ok" ? styles.ok : state === "error" ? styles.error : styles.muted;

  return (
    <div className={styles.wrap} aria-label={label}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${tone}`}>{text}</span>
    </div>
  );
}
