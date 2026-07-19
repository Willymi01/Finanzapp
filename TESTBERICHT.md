# Testbericht 10.9.5

- Produktionsbuild mit Vite erfolgreich
- PWA-Service-Worker neu erzeugt
- sichtbare Version und Cloud-App-Version auf 10.9.5 angehoben
- Leistbarkeitsampel in die Wohnungsfinanzierung eingebunden
- aktuelle Wohnkosten werden anhand ihrer Bezeichnungen erkannt und ersetzt
- Restpuffer und Wohnkostenquote werden aus dem Finanzplan berechnet
- responsive Darstellung für Desktop, Tablet und Smartphone ergänzt
- bestehende Tilgungs-, Ratenwechsel- und Sondertilgungslogik unverändert erhalten

## Ergänzungen 10.9.5
- Sondertilgungen und feste Ratenänderungen werden gegen einen Basisplan ohne Zusatztilgung verglichen.
- Neue Wirkungskarte zeigt Zinsersparnis, verkürzte Laufzeit und reduzierte Restschuld nach Zinsbindung.
- Automatische jährliche Ratenerhöhung getrennt für Bank und KfW, inklusive Startjahr und optionaler Maximalrate.
- Jährlicher Tilgungsplan zeigt zusätzlich die durchschnittliche Monatszahlung je Finanzierungsjahr.
- Produktionsbuild erfolgreich erstellt.
