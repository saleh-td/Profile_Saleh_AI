import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

// Inter est auto-hébergée par next/font : pas de requête vers un CDN
// tiers au chargement de la page, pas de FOUT.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://profile-saleh-ai.vercel.app"),
  title: {
    default: "Saleh Minawi — Développeur backend, systèmes IA",
    template: "%s — Saleh Minawi",
  },
  description:
    "Développeur backend spécialisé dans les systèmes IA en production : RAG, bases vectorielles, APIs et pipelines de données.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
