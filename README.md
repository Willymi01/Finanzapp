# Meine Finanzzentrale V8.3 – Registry-Fix

Diese Version behebt den Fehler `ETIMEDOUT` beim GitHub-Actions-Schritt `npm install`.

Ursache:
Die vorherige `package-lock.json` wurde in einer internen Build-Umgebung erzeugt und enthielt interne Paket-URLs. GitHub konnte diese Adressen nicht erreichen.

Korrektur:
- die alte `package-lock.json` wurde entfernt
- der Workflow verwendet ausdrücklich `https://registry.npmjs.org/`
- Proxy-Einstellungen werden vor der Installation entfernt
- danach wird die App normal gebaut und über GitHub Pages veröffentlicht

## Update

1. ZIP entpacken.
2. Alle Dateien in den lokalen Repository-Ordner kopieren.
3. Vorhandene Dateien ersetzen.
4. Prüfen, dass eine eventuell alte `package-lock.json` im Repository-Ordner gelöscht ist.
5. GitHub Desktop: Commit `V8.3 Registry Fix`.
6. Push origin.
7. Unter Actions warten, bis der Workflow grün wird.
