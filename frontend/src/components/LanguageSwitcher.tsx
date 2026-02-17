"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./languageSwitcher.module.css";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

function swapLocale(pathname: string, nextLocale: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${nextLocale}`;
  parts[0] = nextLocale;
  return `/${parts.join("/")}`;
}

export function LanguageSwitcher({ locale, dict }: Props) {
  const pathname = usePathname() || "/";
  const otherLocale: Locale = locale === "fr" ? "en" : "fr";

  return (
    <div className={styles.wrap} aria-label={dict.nav.language}>
      <Link className={styles.link} href={swapLocale(pathname, otherLocale)}>
        {otherLocale === "fr" ? dict.language.switchToFr : dict.language.switchToEn}
      </Link>
    </div>
  );
}
