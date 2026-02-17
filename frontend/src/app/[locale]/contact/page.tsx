import type { Metadata } from "next";

import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { ContactScene } from "./ContactScene";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.seo.contactTitle,
    description: dict.seo.contactDescription,
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return <ContactScene locale={locale} dict={dict} />;
}
