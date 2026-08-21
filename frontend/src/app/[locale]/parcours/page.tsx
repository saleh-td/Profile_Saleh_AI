import type { Metadata } from "next";

import { Page } from "@/components/Section";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { ParcoursScene } from "./ParcoursScene";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.seo.parcoursTitle,
    description: dict.seo.parcoursDescription,
  };
}

export default async function ParcoursPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return (
    <Page>
      <ParcoursScene dict={dict} />
    </Page>
  );
}
