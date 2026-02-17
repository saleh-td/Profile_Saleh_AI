import type fr from "./dictionaries/fr.json";
import type { Locale } from "./locales";

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: async () => (await import("./dictionaries/fr.json")).default,
  en: async () => (await import("./dictionaries/en.json")).default,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
