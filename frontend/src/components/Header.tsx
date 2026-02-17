import Link from "next/link";

import styles from "./header.module.css";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function Header({ locale, dict }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left: status beacon */}
        <Link href={`/${locale}`} className={styles.status}>
          <span className={styles.dotWrap}>
            <span className={styles.dotPing} />
            <span className={styles.dot} />
          </span>
          <span className={styles.statusText}>SYSTEM_ACTIVE</span>
        </Link>

        {/* Right: nav + lang */}
        <div className={styles.actions}>
          <Link href={`/${locale}`} className={styles.navLink}>{dict.nav.home}</Link>
          <Link href={`/${locale}/contact`} className={styles.navLink}>{dict.nav.contact}</Link>
          <LanguageSwitcher locale={locale} dict={dict} />
        </div>
      </div>
    </header>
  );
}
