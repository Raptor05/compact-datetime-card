# Compact DateTime Card

🇬🇧 [English version](README.md)

Kompakte Lovelace-Karte für Home Assistant, die Datum und/oder Uhrzeit einer Entität anzeigt und über einen Button einen **mobil optimierten Picker** öffnet. Der Picker orientiert sich am Android/Material-Design (Kalender + Ziffernblatt) und wechselt auf dem Smartphone über Tabs zwischen Datum und Uhrzeit.

## Funktionen

- Unterstützte Entitäten: `time`, `date`, `datetime`, `input_datetime`
- Datum und Uhrzeit einzeln ein-/ausschaltbar (z. B. bei `datetime` nur die Uhrzeit bearbeiten)
- **Datum:** Monatskalender mit Wischgesten, Jahresauswahl, „Heute“-Button
- **Uhrzeit:** Ziffernblatt (24 h mit Innenring oder 12 h mit AM/PM), alternativ Tastatureingabe, „Jetzt“-Button, Minuten-Schritte (1/5/10/15/30)
- Nach Datumswahl automatisch zur Uhrzeit, nach Stundenwahl automatisch zu den Minuten (abschaltbar)
- Konfiguration per Formular-Editor **und** YAML
- Nutzt die Theme-Farben von Home Assistant, Haptik-Feedback in der Companion-App
- Deutsch & Englisch (folgt der Sprache des HA-Profils)

## Installation

### HACS (benutzerdefiniertes Repository)

1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. URL dieses Repositories eintragen, Typ **Dashboard** wählen
3. „Compact DateTime Card“ installieren und den Browser neu laden

### Manuell

1. `dist/compact-datetime-card.js` nach `config/www/` kopieren
2. Einstellungen → Dashboards → ⋮ → Ressourcen → `/local/compact-datetime-card.js` als **JavaScript-Modul** hinzufügen

## Konfiguration

```yaml
type: custom:compact-datetime-card
entity: datetime.wecker_naechster_termin
name: Nächster Termin
show_date: true
show_time: true
```

| Option | Typ | Standard | Beschreibung |
| --- | --- | --- | --- |
| `entity` | string | **erforderlich** | `time.*`, `date.*`, `datetime.*` oder `input_datetime.*` |
| `name` | string | Entitätsname | Angezeigter Name |
| `icon` | string | Entitäts-Icon | z. B. `mdi:alarm` |
| `show_date` | boolean | `true` | Datum anzeigen und bearbeiten (nur wenn die Entität ein Datum hat) |
| `show_time` | boolean | `true` | Uhrzeit anzeigen und bearbeiten (nur wenn die Entität eine Uhrzeit hat) |
| `show_name` | boolean | `true` | Name über dem Wert anzeigen |
| `show_icon` | boolean | `true` | Icon links anzeigen |
| `date_style` | `short` \| `medium` \| `long` | `medium` | `06.10.2026` / `Di., 06.10.2026` / `Dienstag, 6. Oktober 2026` |
| `hour_format` | `auto` \| `24` \| `12` | `auto` | `auto` folgt dem Zeitformat im HA-Profil |
| `minute_step` | `1` \| `5` \| `10` \| `15` \| `30` | `1` | Raster der Minuten am Ziffernblatt |
| `first_day_of_week` | `auto` \| `monday` \| `sunday` \| `saturday` | `auto` | `auto` folgt dem HA-Profil bzw. der Sprache |
| `auto_advance` | boolean | `true` | Nach Auswahl eines Tages zur Uhrzeit wechseln |
| `hour_to_minute` | boolean | `true` | Nach Auswahl der Stunde zu den Minuten wechseln |

Sind `show_date` und `show_time` beide `false`, werden alle Teile angezeigt, die die Entität unterstützt.

### Bedienung

- **Button rechts** öffnet den Picker
- **Tippen auf Icon/Text** öffnet den „Mehr-Info“-Dialog der Entität
- Im Picker: Tabs oben wechseln zwischen Datum und Uhrzeit, ⌨ unten links schaltet zur Tastatureingabe, **OK** speichert

### Verwendete Aktionen

| Domain | Aktion |
| --- | --- |
| `time` | `time.set_value` |
| `date` | `date.set_value` |
| `datetime` | `datetime.set_value` (Zeit in der Server-Zeitzone) |
| `input_datetime` | `input_datetime.set_datetime` |

## Voraussetzungen

Home Assistant **2024.11** oder neuer (Formular-Editor über `getConfigForm`).

## Lizenz

MIT

## Hinweis
Die Card wurde mit Hilfe von AI erstellt (Claude Code).
