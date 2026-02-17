import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Header } from "@/components/Header";
import { Container } from "@/components/Container";
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
      <main>
        <Container>{children}</Container>
      </main>
    </>
  );
}
