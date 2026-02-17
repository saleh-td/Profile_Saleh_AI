import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import s from "./home.module.css";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.seo.homeTitle,
    description: dict.seo.homeDescription,
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return (
    <section className={s.hero}>
      {/* ── Background ── */}
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

      {/* ── 12-col grid ── */}
      <div className={s.grid}>
        {/* === LEFT: Identity === */}
        <div className={s.colLeft}>
          <div>
            <p className={s.kicker}>// SYS.IDENTIFICATION_</p>
            <h1 className={s.name}>
              Saleh<br />Minawi
            </h1>
            <h2 className={s.subtitle}>{dict.home.role}</h2>
          </div>

          {/* Bio: terminal style, left cyan border */}
          <div className={s.bioBlock}>
            <p className={s.bioText}>{dict.home.goal}</p>
          </div>
        </div>

        {/* === RIGHT: Stack & CTA === */}
        <div className={s.colRight}>
          {/* Stack cards top-right */}
          <div className={s.stackGrid}>
            <div className={s.stackCard}>
              <span className={s.stackLabel}>[01] BACKEND</span>
              <p className={s.stackText}>{dict.home.stackBackend}</p>
            </div>
            <div className={s.stackCard}>
              <span className={s.stackLabel}>[02] AI_STACK</span>
              <p className={s.stackText}>{dict.home.stackAi}</p>
            </div>
            <div className={s.stackCard}>
              <span className={s.stackLabel}>[03] INFRA</span>
              <p className={s.stackText}>{dict.home.stackInfra}</p>
            </div>
            <div className={s.stackCard}>
              <span className={s.stackLabel}>[04] DATA</span>
              <p className={s.stackText}>{dict.home.stackData}</p>
            </div>
          </div>

          {/* CTA bottom-right */}
          <div className={s.ctaArea}>
            <Link href={`/${locale}/chat`} className={s.cta}>
              {dict.home.chatCta}
            </Link>
            <span className={s.versionTag}>v1.0.4 // LOCAL_HOST</span>
          </div>
        </div>
      </div>
    </section>
  );
}
