# Compact DateTime Card

🇩🇪 [Deutsche Version](README.de.md)

A compact Lovelace card for Home Assistant that displays the date and/or time of an entity and opens a **mobile-optimized picker** via a button. The picker follows Android/Material Design (calendar + clock dial) and switches between date and time using tabs.

## Features

- Supported entities: `time`, `date`, `datetime`, `input_datetime`
- Date and time can be enabled/disabled individually (e.g. edit only the time of a `datetime`)
- **Date:** month calendar with swipe gestures, year selection, "Today" button
- **Time:** clock dial (24 h with inner ring or 12 h with AM/PM), alternative keyboard input, "Now" button, minute steps (1/5/10/15/30)
- Automatically switches to time after picking a date and to minutes after picking the hour (can be disabled)
- Configuration via the visual form editor **and** YAML
- Uses Home Assistant theme colors, haptic feedback in the Companion app
- German & English (follows the language of the HA user profile)

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories**
2. Enter the URL of this repository and select type **Dashboard**
3. Install "Compact DateTime Card" and reload your browser

### Manual

1. Copy `dist/compact-datetime-card.js` to `config/www/`
2. Settings → Dashboards → ⋮ → Resources → add `/local/compact-datetime-card.js` as a **JavaScript module**

## Configuration

```yaml
type: custom:compact-datetime-card
entity: datetime.next_appointment
name: Next appointment
show_date: true
show_time: true
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entity` | string | **required** | `time.*`, `date.*`, `datetime.*` or `input_datetime.*` |
| `name` | string | entity name | Displayed name |
| `icon` | string | entity icon | e.g. `mdi:alarm` |
| `show_date` | boolean | `true` | Show and edit the date (only if the entity has a date) |
| `show_time` | boolean | `true` | Show and edit the time (only if the entity has a time) |
| `show_name` | boolean | `true` | Show the name above the value |
| `show_icon` | boolean | `true` | Show the icon on the left |
| `date_style` | `short` \| `medium` \| `long` | `medium` | `10/06/2026` / `Tue, 10/06/2026` / `Tuesday, October 6, 2026` (localized) |
| `hour_format` | `auto` \| `24` \| `12` | `auto` | `auto` follows the time format of the HA profile |
| `minute_step` | `1` \| `5` \| `10` \| `15` \| `30` | `1` | Minute grid of the clock dial |
| `first_day_of_week` | `auto` \| `monday` \| `sunday` \| `saturday` | `auto` | `auto` follows the HA profile or language |
| `auto_advance` | boolean | `true` | Switch to time after selecting a day |
| `hour_to_minute` | boolean | `true` | Switch to minutes after selecting the hour |

If both `show_date` and `show_time` are `false`, all parts supported by the entity are shown.

### Usage

- **Button on the right** opens the picker
- **Tapping the icon/text** opens the entity's "more info" dialog
- In the picker: the tabs at the top switch between date and time, ⌨ at the bottom left switches to keyboard input, **OK** saves

### Actions used

| Domain | Action |
| --- | --- |
| `time` | `time.set_value` |
| `date` | `date.set_value` |
| `datetime` | `datetime.set_value` (time in the server time zone) |
| `input_datetime` | `input_datetime.set_datetime` |

## Requirements

Home Assistant **2024.11** or newer (form editor via `getConfigForm`).

## License

MIT

## Additional notes
This card was created using the help of AI (Claude Code)
