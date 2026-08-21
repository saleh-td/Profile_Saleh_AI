import type { Metadata } from "next";

import { Page } from "@/components/Section";
import { getProjects } from "@/content/projects/getProjects";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { ProjetsScene } from "./ProjetsScene";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.seo.projectsTitle,
    description: dict.seo.projectsDescription,
  };
}

export default async function ProjectsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);
  const projects = await getProjects(locale);

  return (
    <Page>
      <ProjetsScene dict={dict} projects={projects} />
    </Page>
  );
}
