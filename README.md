# Meine Finanzzentrale V8.2 – einsatzbereit

Enthalten:
- Dashboard und Vermögensprognose
- Finanzplan im vertrauten Schwarz/Grün/Rot/Gelb/Blau-Stil
- editierbare Einnahmen, feste/variable Kosten und Jahresposten
- monatlicher Sparplan mit Zwischenständen
- Vermögensübersicht
- Finanzierung und drei Was-wäre-wenn-Szenarien
- Wohnungscockpit mit Favoriten, Link, KfW, Energie und Notizen
- lokale PIN-Sperre
- Supabase-Cloud-Synchronisierung
- PWA-Installation auf PC und Handy
- automatische Datenmigration und JSON-Backups

## Update auf GitHub

1. ZIP entpacken.
2. Alle Dateien in den lokalen Repository-Ordner kopieren und ersetzen.
3. GitHub Desktop: Commit `Version 8.2 komplett`.
4. Push origin.
5. Actions abwarten, bis `Deploy to GitHub Pages` grün ist.
6. Seite mit Strg+F5 neu laden.

## Handy

Die GitHub-Pages-Adresse in Chrome oder Safari öffnen:
- Android: Menü → App installieren / Zum Startbildschirm
- iPhone: Teilen → Zum Home-Bildschirm

## Cloud

Repository-Secrets:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Die bestehende Tabelle `finance_profiles` und RLS-Regeln können weiterverwendet werden.
