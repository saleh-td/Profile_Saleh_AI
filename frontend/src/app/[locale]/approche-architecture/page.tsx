import type { Metadata } from "next";

import { getDictionary } from "@/i18n/getDictionary";
import { isLocale, type Locale } from "@/i18n/locales";

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

export default async function ApproachArchitecturePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = (isLocale(localeParam) ? localeParam : "fr") as Locale;
  const dict = await getDictionary(locale);

  return (
    <section>
      <h1>{dict.approach.title}</h1>
      <p style={{ marginTop: "0.75rem", maxWidth: 900 }}>{dict.approach.intro}</p>

      <ol style={{ marginTop: "1.5rem", paddingLeft: "1.25rem", display: "grid", gap: "0.75rem" }}>
        {dict.approach.steps.map((step: { title: string; detail: string }) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <div style={{ opacity: 0.9, marginTop: "0.25rem" }}>{step.detail}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
