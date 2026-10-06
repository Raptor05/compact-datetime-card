/**
 * Compact DateTime Card for Home Assistant
 * Shows date/time of a time, date, datetime or input_datetime entity compactly
 * and opens a mobile friendly (Material / Android style) picker popover.
 *
 * License: MIT
 */
const CDT_VERSION = "1.0.0";
const CDT_DOMAINS = ["time", "date", "datetime", "input_datetime"];

/* ------------------------------------------------------------------ */
/* i18n                                                                */
/* ------------------------------------------------------------------ */
const CDT_I18N = {
  de: {
    date: "Datum", time: "Uhrzeit", cancel: "Abbrechen", ok: "OK",
    today: "Heute", now: "Jetzt", select_date: "Datum auswählen",
    select_time: "Uhrzeit auswählen", unavailable: "Nicht verfügbar",
    not_set: "Nicht gesetzt", edit: "Bearbeiten", prev: "Vorheriger Monat",
    next: "Nächster Monat", keyboard: "Tastatureingabe", dial: "Ziffernblatt",
    hour: "Stunde", minute: "Minute", choose_year: "Jahr auswählen",
    error: "Wert konnte nicht gesetzt werden", no_entity: "Bitte eine Entität auswählen",
  },
  en: {
    date: "Date", time: "Time", cancel: "Cancel", ok: "OK",
    today: "Today", now: "Now", select_date: "Select date",
    select_time: "Select time", unavailable: "Unavailable",
    not_set: "Not set", edit: "Edit", prev: "Previous month",
    next: "Next month", keyboard: "Keyboard input", dial: "Clock dial",
    hour: "Hour", minute: "Minute", choose_year: "Choose year",
    error: "Could not set value", no_entity: "Please select an entity",
  },
};

const CDT_EDITOR_LABELS = {
  de: {
    entity: "Entität", name: "Name", icon: "Icon",
    show_date: "Datum anzeigen & bearbeiten", show_time: "Uhrzeit anzeigen & bearbeiten",
    show_name: "Name anzeigen", show_icon: "Icon anzeigen",
    date_style: "Datumsformat", hour_format: "Zeitformat",
    minute_step: "Minuten-Schritte", first_day_of_week: "Erster Wochentag",
    auto_advance: "Nach Datumswahl zur Uhrzeit wechseln",
    hour_to_minute: "Nach Stundenwahl zu Minuten wechseln",
    appearance: "Darstellung & Eingabe",
  },
  en: {
    entity: "Entity", name: "Name", icon: "Icon",
    show_date: "Show & edit date", show_time: "Show & edit time",
    show_name: "Show name", show_icon: "Show icon",
    date_style: "Date format", hour_format: "Time format",
    minute_step: "Minute step", first_day_of_week: "First day of week",
    auto_advance: "Switch to time after picking a date",
    hour_to_minute: "Switch to minutes after picking the hour",
    appearance: "Appearance & input",
  },
};

const cdtLang = (hass) =>
  (hass?.locale?.language || hass?.language || navigator.language || "en");
const cdtShortLang = (hass) => (cdtLang(hass).toLowerCase().startsWith("de") ? "de" : "en");
const cdtT = (hass, key) => CDT_I18N[cdtShortLang(hass)][key] ?? CDT_I18N.en[key] ?? key;

/* ------------------------------------------------------------------ */
/* Icons (inline MDI paths, no dependency on ha-icon in the popover)   */
/* ------------------------------------------------------------------ */
const CDT_ICONS = {
  left: "M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z",
  right: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  down: "M7,10L12,15L17,10H7Z",
  up: "M7,15L12,10L17,15H7Z",
  keyboard:
    "M19,10H17V8H19M19,13H17V11H19M16,10H14V8H16M16,13H14V11H16M16,17H8V15H16M7,10H5V8H7M7,13H5V11H7M8,11H10V13H8M8,8H10V10H8M11,11H13V13H11M11,8H13V10H11M20,5H4C2.89,5 2,5.89 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7C22,5.89 21.1,5 20,5Z",
  clock:
    "M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z",
  calendar:
    "M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z",
};
const cdtSvg = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CDT_ICONS[name]}"/></svg>`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const pad = (n, l = 2) => String(n).padStart(l, "0");
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12
const utcDate = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function cdtDomain(entityId) {
  return (entityId || "").split(".")[0];
}

/** Which parts does an entity support? */
function cdtCaps(stateObj) {
  if (!stateObj) return { hasDate: true, hasTime: true };
  switch (cdtDomain(stateObj.entity_id)) {
    case "time": return { hasDate: false, hasTime: true };
    case "date": return { hasDate: true, hasTime: false };
    case "datetime": return { hasDate: true, hasTime: true };
    case "input_datetime":
      return { hasDate: !!stateObj.attributes?.has_date, hasTime: !!stateObj.attributes?.has_time };
    default: return { hasDate: true, hasTime: true };
  }
}

/** Date parts of a JS Date in the Home Assistant server time zone */
function cdtPartsInTz(date, tz) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || undefined, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
  } catch (e) {
    fmt = new Intl.DateTimeFormat("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
  }
  const p = fmt.formatToParts(date);
  const g = (k) => parseInt(p.find((x) => x.type === k).value, 10);
  return { year: g("year"), month: g("month"), day: g("day"), hour: g("hour") % 24, minute: g("minute"), second: g("second") };
}

function cdtNow(hass) {
  return cdtPartsInTz(new Date(), hass?.config?.time_zone);
}

/** Parse the entity state into {year, month, day, hour, minute, second} (partial) */
function cdtParse(stateObj, hass) {
  if (!stateObj) return null;
  const s = stateObj.state;
  if (!s || ["unknown", "unavailable", "none", ""].includes(s)) return null;
  if (cdtDomain(stateObj.entity_id) === "datetime") {
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return null;
    return cdtPartsInTz(dt, hass?.config?.time_zone);
  }
  const v = {};
  const dm = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dm) Object.assign(v, { year: +dm[1], month: +dm[2], day: +dm[3] });
  const rest = dm ? s.slice(dm.index + dm[0].length) : s;
  const tm = rest.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (tm) Object.assign(v, { hour: +tm[1], minute: +tm[2], second: +(tm[3] || 0) });
  return Object.keys(v).length ? v : null;
}

async function cdtWrite(hass, entityId, v, caps) {
  const D = `${pad(v.year, 4)}-${pad(v.month)}-${pad(v.day)}`;
  const T = `${pad(v.hour)}:${pad(v.minute)}:${pad(v.second || 0)}`;
  switch (cdtDomain(entityId)) {
    case "time":
      return hass.callService("time", "set_value", { entity_id: entityId, time: T });
    case "date":
      return hass.callService("date", "set_value", { entity_id: entityId, date: D });
    case "datetime":
      return hass.callService("datetime", "set_value", { entity_id: entityId, datetime: `${D} ${T}` });
    case "input_datetime": {
      const data = { entity_id: entityId };
      if (caps.hasDate && caps.hasTime) data.datetime = `${D} ${T}`;
      else if (caps.hasDate) data.date = D;
      else data.time = T;
      return hass.callService("input_datetime", "set_datetime", data);
    }
    default:
      throw new Error(`Unsupported domain: ${entityId}`);
  }
}

function cdtUses12h(hass, cfgFormat) {
  if (cfgFormat === "12") return true;
  if (cfgFormat === "24") return false;
  const tf = hass?.locale?.time_format;
  if (tf === "12") return true;
  if (tf === "24") return false;
  const loc = tf === "system" ? undefined : cdtLang(hass);
  try {
    const hc = new Intl.DateTimeFormat(loc, { hour: "numeric" }).resolvedOptions().hourCycle;
    return hc === "h11" || hc === "h12";
  } catch (e) {
    return false;
  }
}

/** first day of week, JS convention 0 = Sunday */
function cdtFirstDay(hass, cfg) {
  const map = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  if (cfg && cfg !== "auto" && cfg in map) return map[cfg];
  const fw = hass?.locale?.first_weekday;
  if (fw && fw in map) return map[fw];
  try {
    const loc = new Intl.Locale(cdtLang(hass));
    const info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch (e) { /* ignore */ }
  return 1;
}

function cdtFireHaptic(type = "selection") {
  window.dispatchEvent(new CustomEvent("haptic", { detail: type, bubbles: true, composed: true }));
}

function cdtFormatTime(hass, v, hour12) {
  if (!hour12) return `${pad(v.hour)}:${pad(v.minute)}`;
  const h = v.hour % 12 === 0 ? 12 : v.hour % 12;
  return `${h}:${pad(v.minute)} ${v.hour < 12 ? "AM" : "PM"}`;
}

function cdtFormatDate(hass, v, style = "medium") {
  const opts = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    medium: { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" },
    long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  }[style] || { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  return new Intl.DateTimeFormat(cdtLang(hass), { ...opts, timeZone: "UTC" }).format(utcDate(v.year, v.month, v.day));
}

/* ------------------------------------------------------------------ */
/* Picker popover                                                      */
/* ------------------------------------------------------------------ */
const CDT_DIAL = { C: 128, RO: 100, RI: 64, RS: 20 };

class CompactDateTimePicker extends HTMLElement {
  static open(opts) {
    const el = document.createElement("compact-datetime-picker");
    el._opts = opts;
    document.body.appendChild(el);
    return new Promise((resolve) => (el._resolve = resolve));
  }

  connectedCallback() {
    const o = this._opts;
    this.hass = o.hass;
    this.v = { ...o.value };
    this.hasDate = o.hasDate;
    this.hasTime = o.hasTime;
    this.hour12 = o.hour12;
    this.step = Math.max(1, parseInt(o.minuteStep, 10) || 1);
    this.firstDay = o.firstDay;
    this.autoAdvance = o.autoAdvance !== false;
    this.hourToMinute = o.hourToMinute !== false;
    this.view = this.hasDate ? "date" : "time";
    this.dateMode = "calendar";
    this.timeMode = "dial";
    this.unit = "hour";
    this.viewY = this.v.year;
    this.viewM = this.v.month;
    this.loc = cdtLang(this.hass);
    this.t = (k) => cdtT(this.hass, k);

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${CompactDateTimePicker.styles}</style>
      <div class="scrim" part="scrim"></div>
      <div class="dialog" role="dialog" aria-modal="true"><div class="content"></div></div>`;
    this.$content = this.shadowRoot.querySelector(".content");

    this.shadowRoot.querySelector(".scrim").addEventListener("click", () => this._close(null));
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    this.shadowRoot.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: true });
    this.shadowRoot.addEventListener("touchend", (e) => this._onTouchEnd(e));
    this._onKey = (e) => {
      if (e.key === "Escape") this._close(null);
      if (e.key === "Enter" && this.view === "time" && this.timeMode === "input") this._ok();
    };
    document.addEventListener("keydown", this._onKey);
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKey);
    this._stopDrag();
  }

  _close(result) {
    if (this._closing) return;
    this._closing = true;
    this.shadowRoot.querySelector(".dialog").classList.add("out");
    this.shadowRoot.querySelector(".scrim").classList.add("out");
    setTimeout(() => this.remove(), 140);
    this._resolve?.(result);
  }

  _ok() {
    if (this.view === "time" && this.timeMode === "input") this._readInputs();
    this._close({ ...this.v, second: 0 });
  }

  /* ---------------- rendering ---------------- */
  _render() {
    const both = this.hasDate && this.hasTime;
    let html = "";
    if (both) {
      const dateLbl = new Intl.DateTimeFormat(this.loc, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
        .format(utcDate(this.v.year, this.v.month, this.v.day));
      html += `<div class="tabs" role="tablist">
        <button class="tab ${this.view === "date" ? "on" : ""}" data-act="tab-date" role="tab">${cdtSvg("calendar")}<span>${esc(dateLbl)}</span></button>
        <button class="tab ${this.view === "time" ? "on" : ""}" data-act="tab-time" role="tab">${cdtSvg("clock")}<span>${esc(cdtFormatTime(this.hass, this.v, this.hour12))}</span></button>
      </div>`;
    }
    html += this.view === "date" ? this._renderDate() : this._renderTime();

    const nowLbl = this.view === "date" ? this.t("today") : this.t("now");
    const modeBtn = this.view === "time"
      ? `<button class="icon-btn" data-act="mode" title="${this.timeMode === "dial" ? this.t("keyboard") : this.t("dial")}">${cdtSvg(this.timeMode === "dial" ? "keyboard" : "clock")}</button>`
      : "";
    html += `<div class="footer">${modeBtn}
      <button class="txt" data-act="now">${nowLbl}</button>
      <span class="spacer"></span>
      <button class="txt" data-act="cancel">${this.t("cancel")}</button>
      <button class="txt strong" data-act="ok">${this.t("ok")}</button>
    </div>`;
    this.$content.innerHTML = html;

    if (this.view === "date" && this.dateMode === "years") {
      const box = this.shadowRoot.querySelector(".years");
      const sel = box?.querySelector(".yr.sel");
      if (box && sel) box.scrollTop = sel.offsetTop - box.clientHeight / 2 + sel.clientHeight / 2;
    }
  }

  _renderDate() {
    const v = this.v;
    const big = new Intl.DateTimeFormat(this.loc, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
      .format(utcDate(v.year, v.month, v.day));
    const monthLbl = new Intl.DateTimeFormat(this.loc, { month: "long", year: "numeric", timeZone: "UTC" })
      .format(utcDate(this.viewY, this.viewM, 1));
    let html = `<div class="hdr">
        <div class="hdr-label">${this.t("select_date")}</div>
        <div class="hdr-main">${esc(big)}</div>
      </div>
      <div class="cal-nav">
        <button class="ym" data-act="years" title="${this.t("choose_year")}">${esc(monthLbl)}${cdtSvg(this.dateMode === "years" ? "up" : "down")}</button>
        <span class="spacer"></span>
        ${this.dateMode === "calendar"
          ? `<button class="icon-btn" data-act="prev" title="${this.t("prev")}">${cdtSvg("left")}</button>
             <button class="icon-btn" data-act="next" title="${this.t("next")}">${cdtSvg("right")}</button>`
          : ""}
      </div>`;

    if (this.dateMode === "years") {
      let ys = "";
      for (let y = 1900; y <= 2100; y++)
        ys += `<button class="yr ${y === this.viewY ? "sel" : ""}" data-year="${y}">${y}</button>`;
      return html + `<div class="years">${ys}</div>`;
    }

    // weekday header
    const wdFmt = new Intl.DateTimeFormat(this.loc, { weekday: "short", timeZone: "UTC" });
    let wk = "";
    for (let i = 0; i < 7; i++) {
      const jsDay = (this.firstDay + i) % 7; // 0 = Sunday
      const d = utcDate(2023, 1, 1 + jsDay); // 2023-01-01 was a Sunday
      wk += `<span>${esc(wdFmt.format(d).replace(/\.$/, "").slice(0, 2))}</span>`;
    }
    // days
    const first = utcDate(this.viewY, this.viewM, 1).getUTCDay();
    const offset = (first - this.firstDay + 7) % 7;
    const dim = daysInMonth(this.viewY, this.viewM);
    const now = cdtNow(this.hass);
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = i - offset + 1;
      if (d < 1 || d > dim) { cells += `<span class="day empty"></span>`; continue; }
      const sel = d === v.day && this.viewM === v.month && this.viewY === v.year;
      const today = d === now.day && this.viewM === now.month && this.viewY === now.year;
      cells += `<button class="day ${sel ? "sel" : ""} ${today ? "today" : ""}" data-day="${d}">${d}</button>`;
    }
    return html + `<div class="cal"><div class="wk">${wk}</div><div class="grid">${cells}</div></div>`;
  }

  _renderTime() {
    const v = this.v;
    const hDisp = this.hour12 ? (v.hour % 12 === 0 ? 12 : v.hour % 12) : pad(v.hour);
    const pm = v.hour >= 12;
    const ampm = this.hour12
      ? `<div class="ampm"><button class="${!pm ? "on" : ""}" data-act="am">AM</button><button class="${pm ? "on" : ""}" data-act="pm">PM</button></div>`
      : "";
    let html = `<div class="hdr"><div class="hdr-label">${this.t("select_time")}</div></div>`;

    if (this.timeMode === "input") {
      html += `<div class="time-row">
        <div class="time-inputs">
          <label><input id="in-h" inputmode="numeric" maxlength="2" autocomplete="off" value="${hDisp}"><span>${this.t("hour")}</span></label>
          <span class="colon">:</span>
          <label><input id="in-m" inputmode="numeric" maxlength="2" autocomplete="off" value="${pad(v.minute)}"><span>${this.t("minute")}</span></label>
        </div>${ampm}</div>`;
      return html;
    }

    html += `<div class="time-row">
        <div class="time-display">
          <button class="seg ${this.unit === "hour" ? "on" : ""}" data-act="unit-hour">${hDisp}</button>
          <span class="colon">:</span>
          <button class="seg ${this.unit === "minute" ? "on" : ""}" data-act="unit-minute">${pad(v.minute)}</button>
        </div>${ampm}
      </div>
      ${this._renderDial()}`;
    return html;
  }

  _renderDial() {
    const { C, RO, RI, RS } = CDT_DIAL;
    const v = this.v;
    const pos = (deg, r) => {
      const a = (deg * Math.PI) / 180;
      return [C + r * Math.sin(a), C - r * Math.cos(a)];
    };
    const labels = [];
    let selDeg, selR, offStep = false;
    if (this.unit === "hour") {
      if (this.hour12) {
        for (let i = 0; i < 12; i++)
          labels.push({ deg: i * 30, r: RO, text: String(i === 0 ? 12 : i), on: v.hour % 12 === i });
        selDeg = (v.hour % 12) * 30; selR = RO;
      } else {
        for (let i = 0; i < 12; i++) {
          labels.push({ deg: i * 30, r: RO, text: i === 0 ? "00" : String(i), on: v.hour === i });
          labels.push({ deg: i * 30, r: RI, text: String(i + 12), on: v.hour === i + 12, inner: true });
        }
        selDeg = (v.hour % 12) * 30; selR = v.hour >= 12 ? RI : RO;
      }
    } else {
      for (let i = 0; i < 12; i++)
        labels.push({ deg: i * 30, r: RO, text: pad(i * 5), on: v.minute === i * 5 });
      selDeg = v.minute * 6; selR = RO; offStep = v.minute % 5 !== 0;
    }
    const [sx, sy] = pos(selDeg, selR);
    const [hx, hy] = pos(selDeg, selR - RS);
    let svg = `<svg class="dial" viewBox="0 0 256 256" role="slider" aria-label="${this.unit === "hour" ? this.t("hour") : this.t("minute")}">
      <circle class="face" cx="${C}" cy="${C}" r="124"/>
      <line class="hand" x1="${C}" y1="${C}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}"/>
      <circle class="hub" cx="${C}" cy="${C}" r="4"/>
      <circle class="sel" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${RS}"/>`;
    if (offStep) svg += `<circle class="dot" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3"/>`;
    for (const l of labels) {
      const [x, y] = pos(l.deg, l.r);
      svg += `<text class="lbl ${l.inner ? "inner" : ""} ${l.on ? "on" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${l.text}</text>`;
    }
    return svg + `</svg>`;
  }

  /* ---------------- interaction ---------------- */
  _onClick(e) {
    const btn = e.composedPath().find((n) => n instanceof Element && (n.dataset?.act || n.dataset?.day || n.dataset?.year));
    if (!btn) return;
    const { act, day, year } = btn.dataset;
    if (day) {
      this.v.year = this.viewY; this.v.month = this.viewM; this.v.day = +day;
      cdtFireHaptic();
      if (this.hasTime && this.autoAdvance) this.view = "time";
      return this._render();
    }
    if (year) {
      this.viewY = +year; this.dateMode = "calendar";
      return this._render();
    }
    switch (act) {
      case "tab-date": this._readInputsIfNeeded(); this.view = "date"; this.dateMode = "calendar"; this.viewY = this.v.year; this.viewM = this.v.month; break;
      case "tab-time": this.view = "time"; this.unit = "hour"; break;
      case "years": this.dateMode = this.dateMode === "years" ? "calendar" : "years"; break;
      case "prev": this._shiftMonth(-1); break;
      case "next": this._shiftMonth(1); break;
      case "unit-hour": this.unit = "hour"; break;
      case "unit-minute": this.unit = "minute"; break;
      case "am": this._readInputsIfNeeded(); if (this.v.hour >= 12) this.v.hour -= 12; break;
      case "pm": this._readInputsIfNeeded(); if (this.v.hour < 12) this.v.hour += 12; break;
      case "mode": this._readInputsIfNeeded(); this.timeMode = this.timeMode === "dial" ? "input" : "dial"; break;
      case "now": {
        const n = cdtNow(this.hass);
        if (this.view === "date") Object.assign(this.v, { year: n.year, month: n.month, day: n.day });
        else Object.assign(this.v, { hour: n.hour, minute: n.minute });
        this.viewY = this.v.year; this.viewM = this.v.month; this.dateMode = "calendar";
        break;
      }
      case "cancel": return this._close(null);
      case "ok": return this._ok();
      default: return;
    }
    this._render();
    if (act === "mode" && this.timeMode === "input") {
      const inp = this.shadowRoot.getElementById("in-h");
      inp?.focus(); inp?.select();
    }
  }

  _shiftMonth(delta) {
    let m = this.viewM + delta, y = this.viewY;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    this.viewM = m; this.viewY = y;
  }

  _onTouchStart(e) {
    if (!e.composedPath().some((n) => n.classList?.contains("cal"))) return;
    this._touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  _onTouchEnd(e) {
    if (!this._touch) return;
    const dx = e.changedTouches[0].clientX - this._touch.x;
    const dy = e.changedTouches[0].clientY - this._touch.y;
    this._touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.preventDefault();
      this._shiftMonth(dx < 0 ? 1 : -1);
      this._render();
    }
  }

  /* --- clock dial dragging --- */
  _onPointerDown(e) {
    if (!e.composedPath().some((n) => n.classList?.contains("dial"))) return;
    e.preventDefault();
    this._dragging = true;
    this._applyDial(e);
    this._move = (ev) => this._dragging && this._applyDial(ev);
    this._up = (ev) => {
      if (!this._dragging) return;
      this._applyDial(ev);
      this._stopDrag();
      if (this.unit === "hour" && this.hourToMinute) {
        this.unit = "minute";
        this._render();
      }
    };
    window.addEventListener("pointermove", this._move);
    window.addEventListener("pointerup", this._up);
    window.addEventListener("pointercancel", this._up);
  }

  _stopDrag() {
    this._dragging = false;
    if (this._move) window.removeEventListener("pointermove", this._move);
    if (this._up) {
      window.removeEventListener("pointerup", this._up);
      window.removeEventListener("pointercancel", this._up);
    }
  }

  _applyDial(ev) {
    const svg = this.shadowRoot.querySelector("svg.dial");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 256 - CDT_DIAL.C;
    const y = ((ev.clientY - r.top) / r.height) * 256 - CDT_DIAL.C;
    let a = (Math.atan2(x, -y) * 180) / Math.PI;
    if (a < 0) a += 360;
    const dist = Math.hypot(x, y);
    const before = `${this.v.hour}:${this.v.minute}`;
    if (this.unit === "hour") {
      const idx = Math.round(a / 30) % 12;
      if (this.hour12) this.v.hour = idx + (this.v.hour >= 12 ? 12 : 0);
      else this.v.hour = dist < (CDT_DIAL.RO + CDT_DIAL.RI) / 2 ? idx + 12 : idx;
    } else {
      let m = Math.round(a / 6) % 60;
      m = (Math.round(m / this.step) * this.step) % 60;
      this.v.minute = m;
    }
    if (before !== `${this.v.hour}:${this.v.minute}`) {
      cdtFireHaptic();
      this._render();
    }
  }

  /* --- keyboard input mode --- */
  _onInput(e) {
    const t = e.composedPath()[0];
    if (!(t instanceof HTMLInputElement)) return;
    t.value = t.value.replace(/\D/g, "").slice(0, 2);
    if (t.id === "in-h" && t.value.length === 2) {
      const m = this.shadowRoot.getElementById("in-m");
      m?.focus(); m?.select();
    }
  }

  _readInputsIfNeeded() {
    if (this.view === "time" && this.timeMode === "input") this._readInputs();
  }

  _readInputs() {
    const h = parseInt(this.shadowRoot.getElementById("in-h")?.value, 10);
    const m = parseInt(this.shadowRoot.getElementById("in-m")?.value, 10);
    if (!isNaN(h)) {
      if (this.hour12) {
        const hh = Math.min(12, Math.max(1, h)) % 12;
        this.v.hour = hh + (this.v.hour >= 12 ? 12 : 0);
      } else this.v.hour = Math.min(23, Math.max(0, h));
    }
    if (!isNaN(m)) this.v.minute = Math.min(59, Math.max(0, m));
  }

  static get styles() {
    return `
:host {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, system-ui, -apple-system, sans-serif));
  --cdt-primary: var(--primary-color, #03a9f4);
  --cdt-on-primary: var(--text-primary-color, #fff);
  --cdt-surface: var(--ha-dialog-surface-background, var(--mdc-theme-surface, var(--card-background-color, #fff)));
  --cdt-text: var(--primary-text-color, #212121);
  --cdt-text2: var(--secondary-text-color, #727272);
  --cdt-divider: var(--divider-color, rgba(127,127,127,.3));
  --cdt-container: color-mix(in srgb, var(--cdt-primary) 18%, transparent);
  --cdt-face: color-mix(in srgb, var(--cdt-text) 8%, transparent);
  --cdt-hover: color-mix(in srgb, var(--cdt-text) 8%, transparent);
  -webkit-tap-highlight-color: transparent;
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; border: 0; background: transparent; cursor: pointer; padding: 0; }
svg { display: block; }
.scrim { position: absolute; inset: 0; background: rgba(0,0,0,.45); animation: fade .15s ease-out; }
.dialog {
  position: relative; width: min(360px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow: auto;
  background: var(--cdt-surface); color: var(--cdt-text); border-radius: 28px;
  box-shadow: 0 12px 40px rgba(0,0,0,.35); padding: 20px 20px 10px;
  animation: pop .2s cubic-bezier(.2,0,0,1); user-select: none; -webkit-user-select: none; touch-action: manipulation;
}
.dialog.out { animation: popout .14s ease-in forwards; }
.scrim.out { animation: fadeout .14s ease-in forwards; }
@keyframes fade { from { opacity: 0 } }
@keyframes fadeout { to { opacity: 0 } }
@keyframes pop { from { opacity: 0; transform: scale(.92) } }
@keyframes popout { to { opacity: 0; transform: scale(.95) } }

.tabs { display: flex; border: 1px solid var(--cdt-divider); border-radius: 20px; overflow: hidden; margin-bottom: 14px; }
.tab { flex: 1; min-width: 0; height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; }
.tab + .tab { border-left: 1px solid var(--cdt-divider); }
.tab svg { width: 18px; height: 18px; fill: currentColor; flex: none; }
.tab span { overflow: hidden; text-overflow: ellipsis; }
.tab.on { background: var(--cdt-container); color: var(--cdt-primary); }

.hdr-label { font-size: 12px; font-weight: 500; letter-spacing: .4px; color: var(--cdt-text2); }
.hdr-main { font-size: 30px; line-height: 40px; margin: 6px 0 8px; }

.cal-nav { display: flex; align-items: center; height: 44px; margin: 0 -8px; }
.ym { display: flex; align-items: center; gap: 2px; padding: 8px 6px 8px 10px; border-radius: 20px; font-size: 14px; font-weight: 500; color: var(--cdt-text2); }
.ym svg, .icon-btn svg { width: 22px; height: 22px; fill: currentColor; }
.icon-btn { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--cdt-text2); flex: none; }
.spacer { flex: 1; }

.wk, .grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
.wk span { font-size: 12px; color: var(--cdt-text2); height: 36px; line-height: 36px; }
.grid { grid-auto-rows: 44px; align-items: center; }
.day { width: 40px; height: 40px; justify-self: center; border-radius: 50%; font-size: 14px; font-variant-numeric: tabular-nums; }
.day.empty { visibility: hidden; }
.day.today { box-shadow: inset 0 0 0 1px var(--cdt-primary); color: var(--cdt-primary); }
.day.sel { background: var(--cdt-primary); color: var(--cdt-on-primary); box-shadow: none; }
.years { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 8px; height: 300px; overflow-y: auto; align-content: start; padding: 4px 0; overscroll-behavior: contain; }
.yr { height: 36px; border-radius: 18px; font-size: 15px; }
.yr.sel { background: var(--cdt-primary); color: var(--cdt-on-primary); }

.time-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 14px 0 18px; }
.time-display, .time-inputs { display: flex; align-items: center; gap: 4px; }
.time-inputs { align-items: flex-start; }
.seg { width: clamp(72px, 24vw, 96px); height: 80px; border-radius: 12px; font-size: 52px; line-height: 1; background: var(--cdt-face); font-variant-numeric: tabular-nums; }
.seg.on { background: var(--cdt-container); color: var(--cdt-primary); }
.colon { font-size: 52px; line-height: 72px; width: 18px; text-align: center; }
.time-inputs label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--cdt-text2); }
.time-inputs input {
  width: clamp(72px, 24vw, 96px); height: 72px; border-radius: 12px; border: 2px solid transparent; outline: none;
  background: var(--cdt-face); color: var(--cdt-text); font: inherit; font-size: 44px; text-align: center; font-variant-numeric: tabular-nums;
  user-select: text; -webkit-user-select: text;
}
.time-inputs input:focus { border-color: var(--cdt-primary); background: var(--cdt-container); }
.ampm { display: flex; flex-direction: column; border: 1px solid var(--cdt-divider); border-radius: 10px; overflow: hidden; }
.ampm button { width: 48px; height: 38px; font-size: 14px; font-weight: 500; color: var(--cdt-text2); }
.ampm button + button { border-top: 1px solid var(--cdt-divider); }
.ampm button.on { background: var(--cdt-container); color: var(--cdt-primary); }

.dial { width: min(256px, 100%); margin: 0 auto 6px; touch-action: none; cursor: pointer; }
.face { fill: var(--cdt-face); }
.hand { stroke: var(--cdt-primary); stroke-width: 2; }
.hub, .sel { fill: var(--cdt-primary); }
.dot { fill: var(--cdt-on-primary); }
.lbl { fill: var(--cdt-text); font-size: 16px; pointer-events: none; font-family: inherit; }
.lbl.inner { font-size: 13px; fill: var(--cdt-text2); }
.lbl.on { fill: var(--cdt-on-primary); }

.footer { display: flex; align-items: center; gap: 2px; margin: 6px -8px 0; }
.txt { height: 40px; padding: 0 12px; border-radius: 20px; color: var(--cdt-primary); font-size: 14px; font-weight: 500; }
.txt.strong { font-weight: 700; }

@media (hover: hover) {
  .txt:hover, .icon-btn:hover, .ym:hover, .day:not(.sel):not(.empty):hover, .yr:not(.sel):hover, .tab:not(.on):hover { background: var(--cdt-hover); }
}
@media (max-height: 560px) {
  .dial { width: min(200px, 100%); }
  .hdr-main { font-size: 24px; line-height: 30px; }
}
`;
  }
}
if (!customElements.get("compact-datetime-picker")) customElements.define("compact-datetime-picker", CompactDateTimePicker);

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
class CompactDateTimeCard extends HTMLElement {
  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: CDT_DOMAINS } } },
        {
          type: "grid", name: "", schema: [
            { name: "name", selector: { text: {} } },
            { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
          ],
        },
        {
          type: "grid", name: "", schema: [
            { name: "show_date", selector: { boolean: {} } },
            { name: "show_time", selector: { boolean: {} } },
          ],
        },
        {
          type: "expandable", name: "appearance", icon: "mdi:tune", flatten: true, schema: [
            {
              type: "grid", name: "", schema: [
                { name: "show_name", selector: { boolean: {} } },
                { name: "show_icon", selector: { boolean: {} } },
              ],
            },
            {
              name: "date_style", selector: {
                select: {
                  mode: "dropdown", options: [
                    { value: "short", label: "06.10.2026" },
                    { value: "medium", label: "Di., 06.10.2026" },
                    { value: "long", label: "Dienstag, 6. Oktober 2026" },
                  ],
                },
              },
            },
            {
              name: "hour_format", selector: {
                select: {
                  mode: "dropdown", options: [
                    { value: "auto", label: "Auto (Profil)" },
                    { value: "24", label: "24 h" },
                    { value: "12", label: "12 h (AM/PM)" },
                  ],
                },
              },
            },
            {
              name: "minute_step", selector: {
                select: { mode: "dropdown", options: ["1", "5", "10", "15", "30"].map((v) => ({ value: v, label: v })) },
              },
            },
            {
              name: "first_day_of_week", selector: {
                select: {
                  mode: "dropdown", options: [
                    { value: "auto", label: "Auto" },
                    { value: "monday", label: "Montag / Monday" },
                    { value: "sunday", label: "Sonntag / Sunday" },
                    { value: "saturday", label: "Samstag / Saturday" },
                  ],
                },
              },
            },
            { name: "auto_advance", selector: { boolean: {} } },
            { name: "hour_to_minute", selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: (s, hass) => {
        const l = CDT_EDITOR_LABELS[cdtShortLang(hass)];
        return l[s.name] ?? s.name;
      },
      assertConfig: (config) => {
        if (config.entity && !CDT_DOMAINS.includes(cdtDomain(config.entity)))
          throw new Error(`Unsupported entity domain: ${config.entity}`);
      },
    };
  }

  static getStubConfig(hass) {
    const ent = Object.keys(hass?.states || {}).find((e) => CDT_DOMAINS.includes(cdtDomain(e)));
    return { entity: ent || "", show_date: true, show_time: true };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.entity && !CDT_DOMAINS.includes(cdtDomain(config.entity)))
      throw new Error(`Entity must be one of: ${CDT_DOMAINS.join(", ")}`);
    this._config = {
      show_date: true, show_time: true, show_name: true, show_icon: true,
      date_style: "medium", hour_format: "auto", minute_step: "1",
      first_day_of_week: "auto", auto_advance: true, hour_to_minute: true,
      ...config,
    };
    this._lastState = undefined;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const so = this._config?.entity ? hass.states[this._config.entity] : undefined;
    if (so !== this._lastState || !this._built) {
      this._lastState = so;
      this._render();
    } else if (this._iconEl) {
      this._iconEl.hass = hass;
    }
  }

  getCardSize() { return 1; }
  getGridOptions() { return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 }; }
  getLayoutOptions() { return { grid_columns: 2, grid_rows: 1 }; }

  /** effective edit flags, limited by what the entity supports */
  _flags(so) {
    const caps = cdtCaps(so);
    let d = caps.hasDate && this._config.show_date !== false;
    let t = caps.hasTime && this._config.show_time !== false;
    if (!d && !t) { d = caps.hasDate; t = caps.hasTime; }
    return { caps, d, t };
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    }
    const hass = this._hass;
    const cfg = this._config;
    const so = cfg.entity ? hass.states[cfg.entity] : undefined;
    const t = (k) => cdtT(hass, k);

    let valueText, unavailable = false;
    if (!cfg.entity) valueText = t("no_entity");
    else if (!so || so.state === "unavailable") { valueText = t("unavailable"); unavailable = true; }
    else {
      const v = cdtParse(so, hass);
      const { d, t: tm } = this._flags(so);
      if (!v) valueText = t("not_set");
      else {
        const parts = [];
        if (d && v.year != null) parts.push(cdtFormatDate(hass, v, cfg.date_style));
        if (tm && v.hour != null) parts.push(cdtFormatTime(hass, v, cdtUses12h(hass, cfg.hour_format)));
        valueText = parts.join(" · ") || t("not_set");
      }
    }
    const name = cfg.name || so?.attributes?.friendly_name || cfg.entity || "";
    const { d: fd, t: ft } = so ? this._flags(so) : { d: true, t: true };
    const btnIcon = fd ? "calendar" : "clock";

    this.shadowRoot.innerHTML = `<style>${CompactDateTimeCard.styles}</style>
      <ha-card class="${unavailable ? "unavailable" : ""}">
        <div class="row">
          ${cfg.show_icon !== false ? `<div class="icon" data-act="more-info"></div>` : ""}
          <div class="info" data-act="more-info">
            ${cfg.show_name !== false ? `<div class="name">${esc(name)}</div>` : ""}
            <div class="value ${cfg.show_name === false ? "solo" : ""}">${esc(valueText)}</div>
          </div>
          <button class="edit" data-act="open" title="${t("edit")}" aria-label="${t("edit")}" ${!so || unavailable ? "disabled" : ""}>${cdtSvg(btnIcon)}</button>
        </div>
      </ha-card>`;

    this._iconEl = null;
    const iconBox = this.shadowRoot.querySelector(".icon");
    if (iconBox) {
      const ic = document.createElement("ha-state-icon");
      ic.hass = hass;
      if (so) ic.stateObj = so;
      ic.icon = cfg.icon || (!so ? (ft && !fd ? "mdi:clock-outline" : "mdi:calendar-clock") : undefined);
      iconBox.appendChild(ic);
      this._iconEl = ic;
    }
    this._built = true;
  }

  _onClick(e) {
    const el = e.composedPath().find((n) => n instanceof Element && n.dataset?.act);
    if (!el) return;
    if (el.dataset.act === "more-info") {
      if (!this._config.entity) return;
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    } else if (el.dataset.act === "open") {
      this._openPicker();
    }
  }

  async _openPicker() {
    const hass = this._hass, cfg = this._config;
    const so = hass.states[cfg.entity];
    if (!so) return;
    const { caps, d, t } = this._flags(so);
    const now = cdtNow(hass);
    const cur = cdtParse(so, hass) || {};
    const value = {
      year: cur.year ?? now.year, month: cur.month ?? now.month, day: cur.day ?? now.day,
      hour: cur.hour ?? now.hour, minute: cur.minute ?? now.minute, second: cur.second ?? 0,
    };
    cdtFireHaptic("light");
    const res = await CompactDateTimePicker.open({
      hass, value, hasDate: d, hasTime: t,
      hour12: cdtUses12h(hass, cfg.hour_format),
      minuteStep: cfg.minute_step,
      firstDay: cdtFirstDay(hass, cfg.first_day_of_week),
      autoAdvance: cfg.auto_advance, hourToMinute: cfg.hour_to_minute,
    });
    if (!res) return;
    // keep parts that were not edited
    if (!t) { res.hour = value.hour; res.minute = value.minute; res.second = value.second; }
    if (!d) { res.year = value.year; res.month = value.month; res.day = value.day; }
    try {
      await cdtWrite(hass, cfg.entity, res, caps);
      cdtFireHaptic("success");
    } catch (err) {
      console.error("compact-datetime-card:", err);
      this.dispatchEvent(new CustomEvent("hass-notification", {
        detail: { message: `${cdtT(hass, "error")}: ${err?.message || err}` }, bubbles: true, composed: true,
      }));
    }
  }

  static get styles() {
    return `
:host { display: block; height: 100%; }
ha-card { height: 100%; padding: 8px 8px 8px 12px; box-sizing: border-box; display: flex; align-items: center; }
ha-card.unavailable .value { color: var(--secondary-text-color); font-weight: 400; }
.row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 40px; }
.icon {
  width: 36px; height: 36px; border-radius: 50%; flex: none; display: grid; place-items: center; cursor: pointer;
  background: color-mix(in srgb, var(--state-icon-color, var(--primary-color)) 15%, transparent);
  color: var(--state-icon-color, var(--primary-color)); --mdc-icon-size: 20px;
}
.info { flex: 1; min-width: 0; cursor: pointer; }
.name { font-size: 12px; line-height: 16px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.value { font-size: 15px; line-height: 20px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.value.solo { font-size: 16px; }
.edit {
  flex: none; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
  background: var(--primary-color); color: var(--text-primary-color, #fff); -webkit-tap-highlight-color: transparent;
  transition: transform .1s ease, opacity .2s;
}
.edit:active { transform: scale(.92); }
.edit:disabled { opacity: .35; cursor: default; }
.edit svg { width: 20px; height: 20px; fill: currentColor; }
`;
  }
}
if (!customElements.get("compact-datetime-card")) customElements.define("compact-datetime-card", CompactDateTimeCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "compact-datetime-card")) {
  window.customCards.push({
    type: "compact-datetime-card",
    name: "Compact DateTime Card",
    description: "Kompakte Anzeige von Datum/Uhrzeit mit mobilem Picker (time, date, datetime, input_datetime).",
    preview: true,
    documentationURL: "https://github.com/Raptor05/compact-datetime-card",
  });
}
console.info(`%c COMPACT-DATETIME-CARD %c v${CDT_VERSION} `, "background:#03a9f4;color:#fff;font-weight:700", "background:#444;color:#fff");
