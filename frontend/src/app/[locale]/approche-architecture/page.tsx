import type { Metadata } from "next";

import { Page } from "@/components/Section";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { ApprocheScene } from "./ApprocheScene";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.seo.approachTitle,
    description: dict.seo.approachDescription,
  };
}

export default async function ApproachPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return (
    <Page>
      <ApprocheScene dict={dict} />
    </Page>
  );
}
