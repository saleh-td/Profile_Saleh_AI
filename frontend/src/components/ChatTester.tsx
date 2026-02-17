"use client";

import { useState } from "react";

import styles from "./chatTester.module.css";

type Props = {
  title: string;
  placeholder: string;
  send: string;
  okPrefix: string;
  errorPrefix: string;
};

export function ChatTester({ title, placeholder, send, okPrefix, errorPrefix }: Props) {
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit() {
    setIsLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message || "ping" }),
      });

      const data = (await res.json()) as { message?: string };
      setResult(`${okPrefix} ${data.message ?? "(no message)"}`);
    } catch {
      setResult(`${errorPrefix} request_failed`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.wrap}>
      <strong>{title}</strong>

      <div className={styles.row}>
        <input
          className={styles.input}
          value={message}
          placeholder={placeholder}
          onChange={(e) => setMessage(e.target.value)}
          aria-label={placeholder}
        />
        <button className={styles.button} onClick={onSubmit} disabled={isLoading}>
          {isLoading ? "…" : send}
        </button>
      </div>

      {result ? <div className={styles.result}>{result}</div> : null}
    </section>
  );
}
