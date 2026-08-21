import type { Metadata } from "next";

import { getProjects } from "@/content/projects/getProjects";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { HomeScene } from "./HomeScene";

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
  const projects = await getProjects(locale);

  return <HomeScene locale={locale} dict={dict} projects={projects} />;
}
