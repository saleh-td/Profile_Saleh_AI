import type { Metadata } from "next";

import { getProjects } from "@/content/projects/getProjects";
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
    <section>
      <h1>{dict.projects.title}</h1>
      <p style={{ marginTop: "0.75rem", maxWidth: 900 }}>{dict.projects.intro}</p>

      <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
        {projects.map((project) => (
            <article
              key={project.name}
              style={{
                border: "1px solid color-mix(in srgb, var(--foreground) 18%, transparent)",
                borderRadius: 10,
                padding: "1rem",
              }}
            >
              <h2 style={{ fontSize: "1.1rem" }}>{project.name}</h2>

              <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                <section>
                  <strong>{dict.projects.labels.context}</strong>
                  <div style={{ opacity: 0.9, marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                    {project.context}
                  </div>
                </section>
                <section>
                  <strong>{dict.projects.labels.architecture}</strong>
                  <div style={{ opacity: 0.9, marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                    {project.architecture}
                  </div>
                </section>
                <section>
                  <strong>{dict.projects.labels.choices}</strong>
                  <div style={{ opacity: 0.9, marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                    {project.choices}
                  </div>
                </section>
                <section>
                  <strong>{dict.projects.labels.constraints}</strong>
                  <div style={{ opacity: 0.9, marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                    {project.constraints}
                  </div>
                </section>
                <section>
                  <strong>{dict.projects.labels.results}</strong>
                  <div style={{ opacity: 0.9, marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                    {project.results}
                  </div>
                </section>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
