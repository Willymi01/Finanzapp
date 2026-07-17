# Meine Finanzzentrale V10.8.1 – Cloud-Konsistenz-Fix

Diese Version behebt den Fall, dass PC und Handy „Alles synchron“ anzeigen, aber unterschiedliche Ergebnisse darstellen.

## Behoben

- Das Cloud-Center zeigt jetzt die **tatsächlich laufende App-Version** des Geräts an – nicht nur die Version, mit der der Datenstand gespeichert wurde.
- Unterschiedliche App-Versionen werden deutlich gewarnt.
- Mit **„App jetzt aktualisieren“** werden alte Service-Worker- und Cache-Dateien entfernt und die aktuelle GitHub-Pages-Version neu geladen.
- Die PWA prüft regelmäßig auf neue Versionen und aktiviert Updates automatisch.
- Der Datenvergleich zeigt neben der Anzahl auch die Gesamtsumme der Sonderzahlungen.
- Die alte Pauschale `specialAnnual` wurde aus dem Datenmodell entfernt.
- Der Finanzcoach berücksichtigt für den aktuellen Monat echte Sonderzahlungen statt nur die normale Sparrate.

## Nach dem Deployment

1. Dateien ersetzen, committen und pushen.
2. Warten, bis GitHub Actions grün ist.
3. Auf PC **und** Handy das Cloud-Center öffnen.
4. Auf jedem Gerät einmal **„App jetzt aktualisieren“** drücken, falls eine Versionswarnung erscheint.
5. Danach muss auf beiden Geräten **Laufende App 10.8.1** stehen.
6. Anschließend den neueren Datenstand hochladen bzw. übernehmen.

Die Sonderzahlungen selbst bleiben Teil des zentralen App-Zustands und werden vollständig über Supabase synchronisiert.

# Meine Finanzzentrale V10.8 – Cloud Center

Neu:
- Transparenter Cloud-Status: alles synchron, lokale Änderungen oder neuerer Cloud-Stand.
- Vergleich von PC/Handy und Cloud mit Zeitstempel, Gerätename, App-Version und Revision.
- Vergleich der Anzahl von Sparplan-Monaten, Sonderzahlungen, Zwischenständen, Immobilien und Dokumenten.
- Bewusste Aktionen: lokalen Stand hochladen oder Cloud-Stand übernehmen.
- Automatische Sicherung vor dem Ersetzen lokaler Daten.
- Auto-Sync überschreibt keinen eindeutig neueren Cloud-Stand.
- Dashboard-Karte mit aktuellem Cloud-Status.
- Sonderzahlungen bleiben Teil des zentralen App-States und werden vollständig mit `app_state` synchronisiert.

Update: Dateien ins Repository kopieren, ersetzen, committen und pushen. Danach App auf PC und Handy vollständig neu laden.
