import type { Locale } from "@/i18n/locales";
import type { Project } from "./types";

const projectsByLocale: Record<Locale, () => Promise<Project[]>> = {
  fr: async () => (await import("./fr.json")).default as Project[],
  en: async () => (await import("./en.json")).default as Project[],
};

export async function getProjects(locale: Locale): Promise<Project[]> {
  return projectsByLocale[locale]();
}
