# Testbericht 10.9.8

- Produktionsbuild mit Vite erfolgreich.
- Separater Machbarkeits-Finanzplan pro Wohnungsprojekt ergänzt.
- Bestehende Projekte erhalten beim Laden eine unabhängige Kopie von Einkommen, Fixkosten und variablen Kosten.
- Bearbeitung schreibt ausschließlich nach `housingFinance.projects[].scenarioBudget` und verändert `state.budget` nicht.
- Leistbarkeitsampel verwendet den Szenario-Finanzplan.
- Erkannte bisherige Wohnkosten werden weiterhin durch die neue Wohnbelastung ersetzt.
- Einkommen, Fixkosten, variable Kosten und Restpuffer werden direkt zusammengefasst.
- Aktueller Haupt-Finanzplan kann jederzeit erneut in das Szenario kopiert werden.
- Responsive Darstellung für Desktop, Tablet und Smartphone ergänzt.
