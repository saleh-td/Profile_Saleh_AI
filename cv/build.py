#!/usr/bin/env python3
"""
Génère les deux CV en PDF depuis cv/content.json.

Même identité visuelle que le portfolio : palette Forêt, Inter, filets fins.
Les tokens sont repris de frontend/src/app/globals.css — s'ils changent là-bas,
les répercuter dans CSS ci-dessous.

    python cv/build.py

Sortie : frontend/public/CV_Saleh_Minawi_FR.pdf et CV_Saleh_Minawi_EN.pdf
Dépendances : websocket-client, et Google Chrome installé.
"""

from __future__ import annotations

import base64
import html
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT.parent / "frontend" / "public"
FONT_B64 = (ROOT / "assets" / "inter-latin.b64").read_text().strip()
DEBUG_PORT = 9333

# ── Tokens, alignés sur globals.css ────────────────────────────────────
CSS = """
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 600;
  font-display: block;
  src: url(data:font/woff2;base64,%FONT%) format('woff2');
}

:root {
  --fg: #1a1a1a;
  --muted: #6b6560;
  --line: #e3ded7;
  --line-strong: #cfc7bc;
  --accent: #1f4d36;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: A4;
  /* Marges resserrées : tout doit tenir sur une seule page. */
  margin: 11mm 13mm;
}

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  font-family: 'Inter', sans-serif;
  font-size: 8.6pt;
  line-height: 1.36;
  color: var(--fg);
  background: #fff;
}

a { color: inherit; text-decoration: none; }

/* ── En-tête ── */
.name {
  font-size: 18.5pt;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.05;
}

.title {
  font-size: 10pt;
  font-weight: 500;
  color: var(--accent);
  margin-top: 1.5pt;
  letter-spacing: -0.01em;
}

.contact {
  margin-top: 5pt;
  font-size: 7.9pt;
  color: var(--muted);
}

.contact span + span::before { content: "  ·  "; }

.links { margin-top: 1.5pt; font-size: 7.9pt; }
.links a { color: var(--accent); }
.links a + a::before { content: "  ·  "; color: var(--muted); }

/* Disponibilité : la seule zone teintée du document. */
.availability {
  margin-top: 6.5pt;
  padding: 4pt 7pt;
  background: #edf1ee;
  border-left: 2pt solid var(--accent);
  font-size: 8.2pt;
  font-weight: 500;
  color: var(--accent);
}

/* ── Sections ── */
.section { margin-top: 8.5pt; }

.section > h2 {
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--muted);
  padding-bottom: 2.5pt;
  border-bottom: 0.75pt solid var(--line);
  margin-bottom: 5pt;
}

.summary { font-size: 8.6pt; line-height: 1.42; }

/* ── Entrées ── */
.entry { margin-bottom: 6.5pt; break-inside: avoid; }
.entry:last-child { margin-bottom: 0; }

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10pt;
}

.entry-role {
  font-size: 9.4pt;
  font-weight: 600;
  letter-spacing: -0.012em;
}

.entry-period {
  font-size: 7.9pt;
  color: var(--muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.entry-sub {
  font-size: 8.2pt;
  color: var(--muted);
  margin-top: 0.5pt;
}

.entry-url { color: var(--accent); font-weight: 500; }

ul.bullets { list-style: none; margin-top: 3pt; }

ul.bullets li {
  position: relative;
  padding-left: 8.5pt;
  margin-bottom: 1.4pt;
  font-size: 8.5pt;
  line-height: 1.34;
}

/* Tiret en accent plutôt qu'une puce ronde : même signe que sur le site. */
ul.bullets li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4.9pt;
  width: 4.5pt;
  height: 0.75pt;
  background: var(--accent);
}

/* ── Compétences ── */
.skill-row {
  display: flex;
  gap: 8pt;
  padding: 1.9pt 0;
  border-bottom: 0.5pt solid var(--line);
  break-inside: avoid;
}

.skill-row:last-child { border-bottom: 0; }

.skill-cat {
  flex: 0 0 31mm;
  font-size: 8pt;
  font-weight: 500;
  color: var(--muted);
}

.skill-items { flex: 1; font-size: 8.3pt; line-height: 1.34; }

/* ── Formation ── */
.edu { margin-bottom: 4pt; break-inside: avoid; }
.edu:last-child { margin-bottom: 0; }
.edu-degree { font-size: 8.7pt; font-weight: 600; letter-spacing: -0.01em; }
.edu-sub { font-size: 8pt; color: var(--muted); margin-top: 0.3pt; }

.interests { font-size: 8.3pt; color: var(--muted); }
"""


def esc(value: str) -> str:
    return html.escape(value, quote=False)


def render(cv: dict, full: bool = False) -> str:
    parts: list[str] = []

    # En-tête. Le téléphone et l'adresse précise ne sortent qu'en mode
    # candidature : les PDF servis par le site sont publics et indexables.
    contact = list(cv["contact"])
    if full:
        contact = cv.get("contactPrivate", []) + contact

    parts.append(f'<div class="name">{esc(cv["name"])}</div>')
    parts.append(f'<div class="title">{esc(cv["title"])}</div>')
    parts.append(
        '<div class="contact">'
        + "".join(f"<span>{esc(c)}</span>" for c in contact)
        + "</div>"
    )
    parts.append(
        '<div class="links">'
        + "".join(f'<a href="{esc(l["url"])}">{esc(l["label"])}</a>' for l in cv["links"])
        + "</div>"
    )
    parts.append(f'<div class="availability">{esc(cv["availability"])}</div>')

    # Profil
    parts.append(
        f'<div class="section"><h2>{esc(cv["summaryLabel"])}</h2>'
        f'<p class="summary">{esc(cv["summary"])}</p></div>'
    )

    # Expérience
    entries = []
    for job in cv["experience"]:
        bullets = "".join(f"<li>{esc(b)}</li>" for b in job["bullets"])
        sub = esc(job["company"])
        if job.get("note"):
            sub += f' · {esc(job["note"])}'
        entries.append(
            '<div class="entry">'
            f'<div class="entry-head"><span class="entry-role">{esc(job["role"])}</span>'
            f'<span class="entry-period">{esc(job["period"])}</span></div>'
            f'<div class="entry-sub">{sub}</div>'
            f'<ul class="bullets">{bullets}</ul>'
            "</div>"
        )
    parts.append(
        f'<div class="section"><h2>{esc(cv["experienceLabel"])}</h2>'
        + "".join(entries)
        + "</div>"
    )

    # Projet
    entries = []
    for project in cv["projects"]:
        bullets = "".join(f"<li>{esc(b)}</li>" for b in project["bullets"])
        entries.append(
            '<div class="entry">'
            f'<div class="entry-head"><span class="entry-role">{esc(project["name"])}</span>'
            f'<span class="entry-period">{esc(project["note"])}</span></div>'
            f'<div class="entry-sub"><a class="entry-url" href="https://{esc(project["url"])}">'
            f'{esc(project["url"])}</a></div>'
            f'<ul class="bullets">{bullets}</ul>'
            "</div>"
        )
    parts.append(
        f'<div class="section"><h2>{esc(cv["projectLabel"])}</h2>'
        + "".join(entries)
        + "</div>"
    )

    # Compétences
    rows = "".join(
        f'<div class="skill-row"><div class="skill-cat">{esc(s["cat"])}</div>'
        f'<div class="skill-items">{esc(s["items"])}</div></div>'
        for s in cv["skills"]
    )
    parts.append(
        f'<div class="section"><h2>{esc(cv["skillsLabel"])}</h2>{rows}</div>'
    )

    # Formation
    edus = []
    for edu in cv["education"]:
        sub = f'{esc(edu["school"])} · {esc(edu["period"])}'
        if edu.get("note"):
            sub += f' · {esc(edu["note"])}'
        edus.append(
            f'<div class="edu"><div class="edu-degree">{esc(edu["degree"])}</div>'
            f'<div class="edu-sub">{sub}</div></div>'
        )
    parts.append(
        f'<div class="section"><h2>{esc(cv["educationLabel"])}</h2>'
        + "".join(edus)
        + "</div>"
    )

    # Section optionnelle : rien ne s'affiche si elle n'est pas renseignée.
    if cv.get("interests"):
        parts.append(
            f'<div class="section"><h2>{esc(cv["interestsLabel"])}</h2>'
            f'<p class="interests">{esc(cv["interests"])}</p></div>'
        )

    style = CSS.replace("%FONT%", FONT_B64)
    return (
        f'<!doctype html><html lang="{cv["lang"]}"><head><meta charset="utf-8">'
        f'<title>{esc(cv["name"])} — {esc(cv["title"])}</title>'
        f"<style>{style}</style></head><body>"
        + "".join(parts)
        + "</body></html>"
    )


# ── Impression PDF via Chrome ──────────────────────────────────────────

def _cdp(ws, method, params=None, _id=[0]):
    _id[0] += 1
    ws.send(json.dumps({"id": _id[0], "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == _id[0]:
            if "error" in msg:
                raise RuntimeError(msg["error"])
            return msg["result"]


def print_pdf(html_path: Path, pdf_path: Path, chrome: str, profile: Path) -> None:
    proc = subprocess.Popen(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            f"--remote-debugging-port={DEBUG_PORT}",
            "--remote-allow-origins=*",
            f"--user-data-dir={profile}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(40):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json/list", timeout=1)
                break
            except Exception:
                time.sleep(0.5)

        tabs = json.loads(
            urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json/list").read()
        )
        page = next(t for t in tabs if t["type"] == "page")
        ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=60)

        _cdp(ws, "Page.enable")
        _cdp(ws, "Page.navigate", {"url": html_path.as_uri()})
        time.sleep(2.5)  # laisse la police s'appliquer avant l'impression

        result = _cdp(
            ws,
            "Page.printToPDF",
            {
                "printBackground": True,
                "preferCSSPageSize": True,
                "marginTop": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                "marginRight": 0,
            },
        )
        pdf_path.write_bytes(base64.b64decode(result["data"]))
        ws.close()
    finally:
        proc.terminate()
        proc.wait(timeout=10)


def count_pages(pdf_path: Path) -> int:
    """Nombre de pages, sans dépendance externe : on compte les objets /Type /Page."""
    raw = pdf_path.read_bytes()
    return raw.count(b"/Type /Page") - raw.count(b"/Type /Pages") or raw.count(b"/Type/Page")


PRIVATE_FILE = "data.local.json"


def merge_private(content: dict) -> None:
    """Réinjecte les coordonnées personnelles depuis le fichier local.

    Elles vivent hors du dépôt, qui est public : un numéro de téléphone
    entré dans l'historique git y reste même après suppression du fichier.
    content.json ne porte donc que ce qui peut être publié, et ce fichier
    n'est lu qu'en mode --full, pour les CV de candidature.
    """
    path = ROOT / PRIVATE_FILE
    if not path.exists():
        raise SystemExit(
            f"{PRIVATE_FILE} introuvable dans {ROOT}. Ce fichier n'est pas "
            "versionné : il contient les coordonnées personnelles. Voir "
            "cv/README.md pour son contenu attendu."
        )

    private = json.loads(path.read_text(encoding="utf-8"))
    for locale in ("fr", "en"):
        values = private.get(locale, {}).get("contactPrivate")
        if not values:
            raise SystemExit(
                f"{PRIVATE_FILE} : bloc « {locale}.contactPrivate » absent ou vide."
            )
        content[locale]["contactPrivate"] = values


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--full",
        action="store_true",
        help="Version candidature : ajoute téléphone et adresse précise, "
        "et écrit dans cv/out/ au lieu de frontend/public/.",
    )
    args = parser.parse_args()

    chrome = shutil.which("google-chrome-stable") or shutil.which("google-chrome")
    if not chrome:
        raise SystemExit("Google Chrome introuvable — requis pour produire les PDF.")

    content = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
    if args.full:
        merge_private(content)
    tmp = Path(tempfile.mkdtemp(prefix="cv-"))
    profile = tmp / "chrome-profile"

    out_dir = (ROOT / "out") if args.full else OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    overflowed = []

    for locale in ("fr", "en"):
        cv = content[locale]
        html_path = tmp / f"cv-{locale}.html"
        html_path.write_text(render(cv, full=args.full), encoding="utf-8")

        name = cv["file"]
        if args.full:
            name = name.replace(".pdf", "_complet.pdf")
        pdf_path = out_dir / name
        print_pdf(html_path, pdf_path, chrome, profile)

        pages = count_pages(pdf_path)
        flag = "" if pages == 1 else "  ← DÉBORDE"
        if pages != 1:
            overflowed.append(pdf_path.name)
        print(f"{pdf_path.name}: {pdf_path.stat().st_size // 1024} Ko, {pages} page(s){flag}")

    if overflowed:
        # Un CV sur deux pages dont la seconde est presque vide fait négligé :
        # mieux vaut le signaler bruyamment que de le découvrir à l'envoi.
        print(
            "\nAttention : "
            + ", ".join(overflowed)
            + " tient sur plus d'une page. Resserrer le CSS ou raccourcir le contenu."
        )


if __name__ == "__main__":
    main()
