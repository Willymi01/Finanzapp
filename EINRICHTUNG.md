# Einrichtung: GitHub Pages + Cloud-Synchronisierung

## 1. GitHub Pages

1. Erstelle auf GitHub ein Repository, zum Beispiel `finanzzentrale`.
2. Lade **den Inhalt dieses Ordners** hoch, nicht die ZIP-Datei.
3. Öffne im Repository **Settings → Pages**.
4. Wähle **Deploy from a branch**.
5. Branch: `main`, Ordner: `/ (root)`.
6. Nach kurzer Wartezeit erreichst du die App unter  
   `https://DEIN-NAME.github.io/finanzzentrale/`.

GitHub Pages veröffentlicht nur die App-Dateien. Trage keine echten Finanzdaten fest in Dateien des Repositories ein.

## 2. Supabase-Projekt anlegen

1. Erstelle ein kostenloses Projekt bei Supabase.
2. Öffne den **SQL Editor**.
3. Führe den Inhalt von `supabase-setup.sql` aus.
4. Öffne **Project Settings → API**.
5. Kopiere:
   - Project URL
   - öffentlichen `anon` / `publishable` key
6. Öffne `config.js` und trage beide Werte ein:

```js
window.FINANCE_CLOUD_CONFIG = {
  supabaseUrl: "DEINE_PROJECT_URL",
  supabaseAnonKey: "DEIN_OEFFENTLICHER_ANON_KEY"
};
```

**Niemals einen Service-Role-Key in die App eintragen.**

## 3. Anmeldung

1. Lade die geänderte `config.js` wieder zu GitHub hoch.
2. Öffne die veröffentlichte App.
3. Wechsle zu **Cloud & Login**.
4. Lege mit E-Mail und Passwort ein Konto an.
5. Speichere den Datenstand mit **Jetzt in Cloud speichern**.
6. Öffne die App auf dem Handy, melde dich an und wähle **Aus Cloud laden**.
7. Optional: **Automatisch synchronisieren** aktivieren.

## 4. Auf dem Handy installieren

- **Android/Chrome:** Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.
- **iPhone/Safari:** Teilen → „Zum Home-Bildschirm“.

## Datenschutz

- Der GitHub-Pages-Code ist öffentlich, wenn das Repository öffentlich ist.
- Finanzdaten werden nicht in GitHub gespeichert.
- Cloud-Daten liegen in deinem Supabase-Projekt.
- Row Level Security sorgt dafür, dass ein angemeldeter Benutzer nur seinen eigenen Datensatz lesen und ändern darf.
