# Testbericht – Version 10.9.3

## Produktionsbuild

- `npm run build` erfolgreich
- PWA-Service-Worker neu erzeugt
- neue versionierte CSS- und JavaScript-Dateien erzeugt

## Berechnungstests

Getestetes Beispieldarlehen: 300.000 €, 3,5 % Sollzins, 2 % Anfangstilgung, 30 Jahre Wunschlaufzeit.

- Basisszenario: 348 Monate, rund 177.593 € Zinsen
- 10.000 € Sondertilgung im zweiten Jahr: 330 Monate, rund 162.586 € Zinsen
- Monatsrate ab dem dritten Jahr auf 1.800 € erhöht: 240 Monate, rund 120.736 € Zinsen
- KfW-Anlaufphase und Sondertilgung wurden separat geprüft

Die Tests bestätigen, dass Sondertilgungen und Ratenänderungen Laufzeit, Zinsen und Restschuld verändern.

## Datenmigration

Bestehende Finanzierungsprojekte erhalten beim Laden automatisch leere Listen für Ratenänderungen und Sondertilgungen. Vorhandene Projektdaten bleiben erhalten.
