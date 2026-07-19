# Testbericht 10.9.6

## Behobener Fehler
Der Tilgungsplan brach bisher ab, sobald eine geplante Monatsrate nur die laufenden Zinsen deckte. Dadurch wurden spätere Ratenänderungen und Sondertilgungen nicht mehr erreicht.

## Rechentest
Testfall: 300.144 € Bankdarlehen, 3,5 % Sollzins, 50 Jahre Basislaufzeit, Ratenänderungen ab Jahr 1 bis 6 und zwölf Sondertilgungen zu je 1.000 €.

Ergebnis nach dem Fix:
- 12.000 € Sondertilgungen tatsächlich verrechnet
- Laufzeit verkürzt sich von 600 auf 463 Monate
- Zinskosten sinken um rund 83.901 €

## Build
- Produktionsbuild erfolgreich
- PWA-Service-Worker neu erzeugt
- sichtbare Version 10.9.6
