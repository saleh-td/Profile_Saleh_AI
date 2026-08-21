import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssistantFab } from "@/components/AssistantFab";
import { Header } from "@/components/Header";
import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale, SUPPORTED_LOCALES } from "@/i18n/locales";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.seo.siteTitle,
    description: dict.seo.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: "/fr",
        en: "/en",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();

  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return (
    <>
      <Header locale={locale} dict={dict} />
      <main>{children}</main>
      {/* Posé ici plutôt que page par page : le raccourci n'a d'intérêt que
          s'il est partout. Il se retire lui-même sur /chat. */}
      <AssistantFab
        locale={locale}
        label={dict.nav.assistant}
        hint={dict.nav.assistantHint}
      />
    </>
  );
}
