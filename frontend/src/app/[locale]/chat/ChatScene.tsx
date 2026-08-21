"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Page, PageHeader } from "@/components/Section";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";
import s from "./chat.module.css";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = { locale: Locale; dict: Dictionary };

const REQUEST_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Messages d'erreur destinés au visiteur : ils disent ce qui s'est
 * passé et ce qu'il peut faire, sans jargon ni code HTTP.
 */
function toUserErrorMessage(locale: Locale, detail: string, status?: number): string {
  const fr = locale.startsWith("fr");

  if (detail === "timeout") {
    return fr
      ? "Le serveur met trop de temps à répondre. Réessayez dans quelques secondes."
      : "The server is taking too long to respond. Please try again in a few seconds.";
  }

  if (/quota|rate limit/i.test(detail) || status === 429) {
    return fr
      ? "Trop de questions en peu de temps. Patientez une minute avant de réessayer."
      : "Too many questions in a short time. Please wait a minute before trying again.";
  }

  if ((status && RETRYABLE_STATUSES.has(status)) || /unreachable/i.test(detail)) {
    return fr
      ? "L'assistant est momentanément indisponible. Vous pouvez m'écrire directement à sminawi24@gmail.com."
      : "The assistant is temporarily unavailable. You can email me directly at sminawi24@gmail.com.";
  }

  return fr
    ? "Une erreur est survenue. Réessayez, ou écrivez-moi à sminawi24@gmail.com."
    : "Something went wrong. Please try again, or email me at sminawi24@gmail.com.";
}

async function postChat(params: { message: string; sessionId: string; locale: Locale }) {
  let lastDetail = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: params.message,
          session_id: params.sessionId,
          locale: params.locale,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      clearTimeout(timeout);

      if (res.ok) return data;

      lastDetail =
        (typeof data.detail === "string" && data.detail) || `HTTP_${res.status}`;

      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }

      throw new Error(lastDetail);
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof DOMException && error.name === "AbortError") {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        throw new Error("timeout");
      }

      // TypeError = coupure réseau : une seconde tentative vaut le coup.
      if (error instanceof TypeError && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }

      throw error instanceof Error ? error : new Error(lastDetail || "request_failed");
    }
  }

  throw new Error(lastDetail || "request_failed");
}

/**
 * Le backend renvoie du texte brut avec des listes en tirets.
 * On reconstruit des paragraphes et des listes, sans plus.
 */
function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, blockIndex) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const isList = lines.length > 0 && lines.every((line) => /^[-–]\s+/.test(line));

      if (isList) {
        return (
          <ul key={blockIndex} className={s.list}>
            {lines.map((line, lineIndex) => (
              <li key={lineIndex}>{line.replace(/^[-–]\s+/, "")}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={blockIndex}>
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    });
}

export function ChatScene({ locale, dict }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Identifiant de session généré côté client uniquement, pour éviter
  // une différence entre le rendu serveur et l'hydratation.
  useEffect(() => {
    setSessionId(Math.random().toString(36).slice(2, 10));
  }, []);

  useEffect(() => {
    const node = streamRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isSending]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || isSending) return;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: text },
      ]);
      setInput("");
      setIsSending(true);

      try {
        const data = await postChat({ message: text, sessionId, locale });
        const reply = data.response ?? data.message ?? "";

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: reply || toUserErrorMessage(locale, "empty"),
          },
        ]);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "request_failed";
        const status = Number(detail.match(/^HTTP_(\d{3})$/)?.[1]) || undefined;

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: toUserErrorMessage(locale, detail, status),
          },
        ]);
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [isSending, locale, sessionId]
  );

  const isEmpty = messages.length === 0;

  return (
    <Page>
      <PageHeader title={dict.chat.title} lede={dict.chat.intro} />

      <div className={s.chat}>
        {/* La région reste montée même vide : un `aria-live` qui apparaît en
            même temps que son premier contenu n'est pas annoncé. Seule son
            apparence change, pour ne pas afficher un cadre vide de 180px
            avant que la conversation ait commencé.

            Rien n'y est écrit tant qu'il n'y a pas de message : le label
            « par exemple » qui suit et le champ de saisie disent déjà quoi
            faire, une phrase d'invitation de plus ne fait que répéter. */}
        <div
          className={isEmpty ? s.streamIdle : s.stream}
          ref={streamRef}
          aria-live="polite"
          aria-busy={isSending}
        >
          {isEmpty ? null : (
            <ol className={s.messages}>
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={message.role === "user" ? s.fromUser : s.fromAssistant}
                >
                  <span className={s.author}>
                    {message.role === "user" ? dict.chat.you : dict.chat.assistant}
                  </span>
                  <div className={s.bubble}>{renderContent(message.content)}</div>
                </li>
              ))}
            </ol>
          )}

          {isSending ? (
            <p className={s.pending}>
              <span className={s.pendingDot} aria-hidden="true" />
              {dict.chat.sendingLabel}…
            </p>
          ) : null}
        </div>

        {isEmpty ? (
          <div className={s.suggestions}>
            <span className={s.suggestionsTitle}>{dict.chat.suggestionsTitle}</span>
            <div className={s.suggestionList}>
              {dict.chat.suggestions.map((suggestion: string) => (
                <button
                  key={suggestion}
                  type="button"
                  className={s.suggestion}
                  onClick={() => send(suggestion)}
                  disabled={isSending}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className={s.composer}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="chat-input" className="srOnly">
            {dict.chat.inputPlaceholder}
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            className={s.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dict.chat.inputPlaceholder}
            disabled={isSending}
            autoComplete="off"
            maxLength={1200}
          />
          <Button type="submit" disabled={isSending || !input.trim()}>
            {dict.chat.send}
          </Button>
        </form>

        <p className={s.disclaimer}>{dict.chat.disclaimer}</p>
      </div>
    </Page>
  );
}
