import type { IconType } from "react-icons";
import {
  SiApacheairflow,
  SiDjango,
  SiDocker,
  SiFastapi,
  SiFlask,
  SiJsonwebtokens,
  SiKubernetes,
  SiMlflow,
  SiMongodb,
  SiN8N,
  SiNextdotjs,
  SiOllama,
  SiPostgresql,
  SiPytorch,
  SiPython,
  SiQdrant,
  SiReact,
  SiRedis,
  SiScikitlearn,
  SiTensorflow,
  SiVite,
  SiVuedotjs,
} from "react-icons/si";

type TechEntry = { icon: IconType; color: string };

/**
 * Logos officiels only, avec leur couleur de marque réelle (hex Simple
 * Icons, vérifié via le paquet `simple-icons` — pas une valeur devinée).
 *
 * Exception assumée et documentée à la règle « un seul accent » du
 * DESIGN.md : cette grille est le seul endroit du site où plusieurs teintes
 * apparaissent ensemble. Nulle part ailleurs (texte, CTA, liens, survol de
 * carte) une couleur de marque ne doit être reprise.
 *
 * Un terme sans entrée ici (RAG, LLM, API REST, XGBoost…) n'a pas de vraie
 * marque : il retombe en `Badge` texte, jamais une icône générique inventée.
 */
const TECH_ICONS: Record<string, TechEntry> = {
  Python: { icon: SiPython, color: "#3776AB" },
  FastAPI: { icon: SiFastapi, color: "#009688" },
  Django: { icon: SiDjango, color: "#092E20" },
  "Django REST": { icon: SiDjango, color: "#092E20" },
  Flask: { icon: SiFlask, color: "#3BABC3" },
  PostgreSQL: { icon: SiPostgresql, color: "#4169E1" },
  MongoDB: { icon: SiMongodb, color: "#47A248" },
  Qdrant: { icon: SiQdrant, color: "#DC244C" },
  Redis: { icon: SiRedis, color: "#FF4438" },
  PyTorch: { icon: SiPytorch, color: "#EE4C2C" },
  TensorFlow: { icon: SiTensorflow, color: "#FF6F00" },
  "scikit-learn": { icon: SiScikitlearn, color: "#F7931E" },
  MLflow: { icon: SiMlflow, color: "#0194E2" },
  Airflow: { icon: SiApacheairflow, color: "#017CEE" },
  Docker: { icon: SiDocker, color: "#2496ED" },
  "Docker Compose": { icon: SiDocker, color: "#2496ED" },
  Kubernetes: { icon: SiKubernetes, color: "#326CE5" },
  n8n: { icon: SiN8N, color: "#EA4B71" },
  Ollama: { icon: SiOllama, color: "#000000" },
  React: { icon: SiReact, color: "#61DAFB" },
  "Vue 3": { icon: SiVuedotjs, color: "#4FC08D" },
  Vite: { icon: SiVite, color: "#9135FF" },
  "Next.js": { icon: SiNextdotjs, color: "#000000" },
  JWT: { icon: SiJsonwebtokens, color: "#000000" },
};

export function getTechIcon(name: string): IconType | undefined {
  return TECH_ICONS[name]?.icon;
}

export function getTechColor(name: string): string | undefined {
  return TECH_ICONS[name]?.color;
}

export function hasTechIcon(name: string): boolean {
  return name in TECH_ICONS;
}
