# Safety

Eine Software für Safety Engineering mit drei Reitern: **Fehlerbaumanalyse**, **Zuverlässigkeitsdiagramm** und **Binary Decision Diagram (BDD)**. Alle drei Reiter beschreiben dasselbe System, nur in unterschiedlicher Darstellung — jede Darstellung lässt sich automatisch aus einer der beiden anderen ableiten.

Das Projekt entsteht im Rahmen des Praktikums Betriebssicherheit am Institut für Echtzeitsysteme und Softwaretechnik.

## Konzept und Anforderungen

- [`Konzept.md`](Konzept.md) — Gesamtkonzept: Plattform, UI-Prinzip, Berechnungsgrundlagen, Spielregeln für die Mitarbeit
- [`requirements/`](requirements) — Detaillierte Anforderungen je Reiter:
  - [Fehlerbaumanalyse](requirements/Fehlerbaumanalyse.md)
  - [Zuverlässigkeitsdiagramm](requirements/Zuverlaessigkeitsdiagramm.md)
  - [Binary Decision Diagram](requirements/Binary%20Decision%20Diagram.md)

## Entwicklung

Tech-Stack: React + TypeScript + Vite.

```
npm install
npm run dev     # Dev-Server
npm run build   # Typecheck + Produktions-Build
```

## Mitmachen

1. Ein offenes [Issue](https://github.com/derkrembold/safety/issues) aussuchen (oder im [Project-Board](https://github.com/users/derkrembold/projects/3) nachsehen, was noch offen ist).
2. Repo forken, eigenen Branch anlegen (`issue-<nr>-kurzbeschreibung`).
3. Pull Request öffnen, der das Issue referenziert (`Closes #<nr>`).
4. Codex schaut sich den PR an und kommentiert (ändert keinen Code). Offene Punkte werden von dir oder dem Dozenten gelöst.
5. Merge erfolgt ausschließlich durch den Dozenten.

Details zu den Regeln: siehe [`Konzept.md`, Abschnitt "Spielregeln"](Konzept.md#spielregeln).
