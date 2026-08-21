import type { Locale } from "@/i18n/locales";

export const profile = {
  name: "Saleh Minawi",
  email: "sminawi24@gmail.com",
  location: "Lyon, France",
  socials: {
    github: {
      handle: "saleh-td",
      url: "https://github.com/saleh-td",
    },
    linkedin: {
      url: "https://www.linkedin.com/in/saleh-minawi-62331123b/",
    },
  },
  /**
   * Les deux CV sont générés par `python cv/build.py` depuis cv/content.json,
   * qui est la source unique. Ne pas éditer les PDF à la main : la prochaine
   * génération écraserait la modification.
   */
  cv: {
    fr: "/CV_Saleh_Minawi_FR.pdf",
    en: "/CV_Saleh_Minawi_EN.pdf",
  },
} as const;

export function getCvPath(locale: Locale): string {
  return profile.cv[locale] ?? profile.cv.fr;
}
