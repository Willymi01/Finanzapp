# Finanzzentrale V7 auf GitHub Pages aktualisieren

1. ZIP entpacken.
2. Alle enthaltenen Dateien in deinen lokalen GitHub-Repository-Ordner kopieren.
3. Vorhandene Dateien ersetzen.
4. GitHub Desktop öffnen.
5. Commit-Text z. B. `Version 7.0`.
6. **Commit to main** und danach **Push origin**.
7. Nach 1–3 Minuten die Seite neu laden.

## Cloud einrichten

Die vorhandene Supabase-Einrichtung aus V6 kann weiterverwendet werden.

In `config.js` eintragen:

```js
window.FINANCE_CLOUD_CONFIG = {
  supabaseUrl: "DEINE_PROJECT_URL",
  supabaseAnonKey: "DEIN_OEFFENTLICHER_ANON_KEY"
};
```

Nur den öffentlichen Anon-/Publishable-Key verwenden, niemals den Service-Role-Key.

## Sicherheit

- GitHub Pages veröffentlicht nur den Programmcode.
- Finanzwerte stehen nicht fest im Repository, sondern werden im Browser oder nach Anmeldung in Supabase gespeichert.
- Die optionale lokale PIN ist nur eine Bildschirmsperre.
- Der eigentliche Cloud-Schutz besteht aus Supabase-Login plus Row Level Security.
- Dokumentenupload ist bewusst noch nicht enthalten.
