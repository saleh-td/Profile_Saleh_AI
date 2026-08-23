"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import type { Locale } from "@/i18n/locales";
import { REVEAL } from "./motion";
import s from "./assistantFab.module.css";

type Props = {
  locale: Locale;
  /** Libellé court, depuis nav.assistant. */
  label: string;
  /** Phrase complète lue par les lecteurs d'écran, depuis nav.assistantHint. */
  hint: string;
};

/**
 * Raccourci permanent vers l'assistant, en bas à droite de chaque page.
 *
 * Il corrige un défaut réel : l'assistant vivait sur une page à lui, atteignable
 * seulement par la navigation, donc invisible pour un visiteur qui parcourt le
 * site sans lire le menu.
 *
 * C'est un lien vers /chat, pas un panneau qui s'ouvre par-dessus la page. Un
 * tiroir demanderait un piège à focus, un verrouillage du défilement et un
 * second état de conversation à tenir en parallèle de la page existante, pour
 * un bénéfice nul : la page /chat est déjà écrite et fonctionne. Un lien est
 * ce qu'on peut faire correctement du premier coup.
 */
export function AssistantFab({ locale, label, hint }: Props) {
  const pathname = usePathname();

  // Inutile sur la page qu'il désigne : le raccourci y pointerait sur lui-même.
  if (pathname?.startsWith(`/${locale}/chat`)) return null;

  return (
    <motion.div
      className={s.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...REVEAL, delay: 0.5, ease: "easeOut" }}
    >
      <Link href={`/${locale}/chat`} className={s.fab} aria-label={hint}>
        {/* Pastille fixe, pas clignotante. Une pastille qui pulse en
            permanence prétendrait montrer une activité que rien ne mesure,
            et le site s'interdit les indicateurs inventés. */}
        <span className={s.pip} aria-hidden="true" />
        <span className={s.label}>{label}</span>
      </Link>
    </motion.div>
  );
}
