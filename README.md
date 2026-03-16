# b.signal Landing Page

KI-gestützter Intelligence-Dienst für Projektentwickler im Immobilienmarkt.

## Deployment auf GitHub Pages

1. **Repository erstellen** (falls noch nicht vorhanden):
   ```bash
   git init
   git add index.html .nojekyll README.md
   git commit -m "Initial landing page"
   git remote add origin https://github.com/DEIN-USER/b.signal.git
   git push -u origin main
   ```

2. **GitHub Pages aktivieren:**
   - Repository → Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
   - Save

3. **Fertig.** Die Seite ist nach 1–2 Minuten unter `https://DEIN-USER.github.io/b.signal/` erreichbar.

## Hinweise

- Kein Build-Step nötig — die `index.html` ist die gesamte Seite
- `.nojekyll` verhindert Jekyll-Processing auf GitHub Pages
- Fonts werden via Google Fonts CDN geladen
- Der API-Call im Formular benötigt einen gültigen Anthropic API-Key (muss serverseitig oder via Header ergänzt werden)

## Struktur

```
/
├── index.html    ← Gesamte Landing Page (HTML + CSS + JS)
├── .nojekyll     ← GitHub Pages: Jekyll deaktivieren
└── README.md     ← Diese Datei
```
