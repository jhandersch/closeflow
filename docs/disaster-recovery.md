# Disaster-Recovery und Rollback

Ergänzt `backup-restore.md` und `incident-plan.md`.

## Ziele (ehrlich, aktueller Stand)
| Ziel | Wert | Begründung |
|---|---|---|
| RPO (maximaler Datenverlust) | bis 7 Tage | manuelles Backup wöchentlich, Supabase Free ohne Provider-Backups |
| RTO (Wiederherstellungszeit) | ca. 4 Stunden | Restore-Skripte lokal getestet, Dauer gegen Produktion nicht gemessen |

**Vor echten Kunden:** Supabase Pro mit Point-in-Time-Recovery, dann RPO Minuten. Bis dahin NO-GO laut Release-Matrix.

## Szenarien
1. **Fehlerhaftes Deployment:** in Vercel → Deployments das letzte gute Deployment wählen → „Promote to Production“. Dauer Minuten. Datenbank bleibt unverändert.
2. **Fehlerhafte Migration:** Wartungsmodus einschalten (`docs/maintenance-mode.md`), Gegenmigration schreiben oder `public` aus dem letzten Backup wiederherstellen (`scripts/restore-supabase-public.ps1`), Daten seit Backup neu erfassen lassen, Wartungsmodus aus.
3. **Datenverlust oder Manipulation:** Wartungsmodus, Backup prüfen, Restore in neues Projekt (`scripts/restore-supabase-fresh.ps1`), Umgebungsvariablen in Vercel umstellen, Redeploy.
4. **Secret-Leak:** `incident-plan.md`, Abschnitt 5.
5. **Ausfall Anbieter (Vercel/Supabase):** Statusseiten beobachten, Wartungsseite/Kommunikation; kein automatisches Failover vorhanden.

## Tests
- Restore-Test lokal: 2026-10-19 (siehe `backup-restore.md`).
- **OFFEN:** halbjährlicher Restore-Test mit Zeitmessung; Rollback-Übung auf Vercel nach Wartungsmodus.
