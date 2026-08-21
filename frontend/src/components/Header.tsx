"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { ButtonLink } from "./Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import styles from "./header.module.css";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function Header({ locale, dict }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Le flou ne s'active qu'une fois la page défilée : en haut, le header se
  // fond dans la page, il n'ajoute pas une barre visuelle inutile.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ordre volontaire : la home est un résumé, chaque lien suivant mène au
  // contenu détaillé correspondant, dans l'ordre où on le découvre.
  const home = `/${locale}`;
  const links = [
    { href: home, label: dict.nav.home },
    { href: `${home}/parcours`, label: dict.nav.career },
    { href: `${home}/projets`, label: dict.nav.projects },
    { href: `${home}/approche-architecture`, label: dict.nav.approach },
    { href: `${home}/chat`, label: dict.nav.assistant },
    { href: `${home}/contact`, label: dict.nav.contact },
  ];

  // La home ne doit correspondre qu'à elle-même, sinon elle resterait active
  // sur toutes les sous-pages qui partagent son préfixe.
  const isActive = (href: string) =>
    href === home ? pathname === home : pathname.startsWith(href);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link href={home} className={styles.brand}>
          <Logo />
          <span className={styles.wordmark}>Saleh Minawi</span>
        </Link>

        <nav className={styles.nav} aria-label={dict.nav.mainNavigation}>
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
                {active ? (
                  // layoutId : le trait glisse d'un lien à l'autre au lieu
                  // d'apparaître d'un coup. Neutralisé automatiquement sous
                  // prefers-reduced-motion via MotionProvider.
                  <motion.span
                    layoutId="navIndicator"
                    className={styles.indicator}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          {/* Joignable depuis toutes les pages, pas seulement la home. */}
          <ButtonLink href={`${home}/contact`} size="sm" className={styles.cta}>
            {dict.home.cta.contact}
          </ButtonLink>
          <LanguageSwitcher locale={locale} dict={dict} />
        </div>
      </div>
    </header>
  );
}
