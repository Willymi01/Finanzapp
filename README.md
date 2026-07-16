# Meine Finanzzentrale V8.1

Neuaufbau mit React, Vite und modularen Komponenten.

## Bestehende Daten

Version 8 verwendet dauerhaft den Speichernamen `finanzzentrale` und übernimmt beim ersten Start automatisch Daten aus älteren Versionen. Vor der Migration wird eine lokale Sicherung angelegt.

## GitHub-Update

1. ZIP entpacken.
2. Den Inhalt vollständig in den lokalen Repository-Ordner kopieren.
3. Alte Dateien dürfen ersetzt werden.
4. GitHub Desktop öffnen.
5. Commit: `Version 8.0`.
6. **Commit to main** und anschließend **Push origin**.
7. In GitHub unter **Settings → Pages** als Quelle **GitHub Actions** auswählen.

Beim ersten Push installiert GitHub automatisch die Abhängigkeiten und veröffentlicht die fertige App.

## Supabase / Cloud

Im Repository unter **Settings → Secrets and variables → Actions** zwei Repository-Secrets anlegen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nur den öffentlichen Anon-/Publishable-Key verwenden. Niemals den Service-Role-Key.

Die bereits angelegte Tabelle `finance_profiles` und die RLS-Regeln aus Version 6 können weiterverwendet werden.

## Lokal entwickeln

```bash
npm install
npm run dev
```

## Sicherheit

- GitHub Pages enthält nur den App-Code.
- Finanzdaten werden lokal oder im eigenen Supabase-Projekt gespeichert.
- Alte Daten werden automatisch migriert.
- JSON-Export dient als zusätzliche Sicherung.


## Korrektur in Version 8.1

Der GitHub-Workflow verwendet jetzt `npm install` statt `npm ci`.
Dadurch ist keine bereits vorhandene `package-lock.json` erforderlich.
Außerdem wurde der Cache entfernt, der ebenfalls eine Lock-Datei vorausgesetzt hatte.
