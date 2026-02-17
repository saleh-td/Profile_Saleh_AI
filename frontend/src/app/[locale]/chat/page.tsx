import type { Metadata } from "next";

import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";
import { ChatScene } from "./ChatScene";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.seo.chatTitle,
    description: dict.seo.chatDescription,
  };
}

export default async function ChatPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return <ChatScene locale={locale} dict={dict} />;
}
