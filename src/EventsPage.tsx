import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, MapPin, Plus, Repeat, Search, Trash2 } from "lucide-react";
import { getLocale } from "./i18n";
import type { EventRepeat, EventRsvp, NexusEvent, NexusState } from "./types";

type EventCategory = "Gaming" | "Creator" | "Community" | "Projects" | "Personal";
type CalendarView = "month" | "week" | "day" | "agenda";

const CATEGORIES: { id: EventCategory; emoji: string; color: string; fi: string; en: string }[] = [
  { id: "Gaming", emoji: "🎮", color: "#f4b17a", fi: "Gaming", en: "Gaming" },
  { id: "Creator", emoji: "🎬", color: "#b6a2ff", fi: "Creator", en: "Creator" },
  { id: "Community", emoji: "👥", color: "#78d6e2", fi: "Community", en: "Community" },
  { id: "Projects", emoji: "🛠️", color: "#7ee0a0", fi: "Projects", en: "Projects" },
  { id: "Personal", emoji: "📌", color: "#f47ca9", fi: "Oma meno", en: "Personal" },
];

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const DEFAULT_DURATION = 60;

type Occurrence = { event: NexusEvent; start: Date; end: Date; key: string; category: EventCategory };

function tr(fi: string, en: string) {
  return getLocale() === "en-GB" ? en : fi;
}

function normalizeCategory(category: string): EventCategory {
  return CATEGORIES.some((item) => item.id === category) ? category as EventCategory : "Community";
}

function categoryInfo(category: EventCategory) {
  return CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[2];
}

function categoryLabel(category: EventCategory) {
  const info = categoryInfo(category);
  return `${info.emoji} ${tr(info.fi, info.en)}`;
}

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

function occurrencesBetween(events: NexusEvent[], from: Date, to: Date): Occurrence[] {
  const result: Occurrence[] = [];
  events.forEach((event) => {
    const base = new Date(event.startsAt);
    if (Number.isNaN(base.getTime())) return;
    const duration = (event.durationMin ?? DEFAULT_DURATION) * 60000;
    const category = normalizeCategory(event.category);
    const push = (start: Date, index: number) => {
      if (start >= from && start < to) result.push({ event, start, end: new Date(start.getTime() + duration), key: `${event.id}:${index}`, category });
    };
    if (event.repeat === "weekly") {
      const firstWeek = Math.max(0, Math.floor((from.getTime() - base.getTime()) / WEEK_MS) - 1);
      for (let week = firstWeek; ; week += 1) {
        const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + week * 7, base.getHours(), base.getMinutes());
        if (start >= to) break;
        push(start, week);
      }
    } else {
      push(base, 0);
    }
  });
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

function countdown(occurrence: Occurrence, now: number) {
  if (now >= occurrence.end.getTime()) return tr("Päättynyt", "Ended");
  const diff = occurrence.start.getTime() - now;
  if (diff <= 0) return tr("Käynnissä nyt", "Happening now");
  const minutes = Math.ceil(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const parts = days > 0 ? `${days} d ${hours} h` : hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
  return tr(`Alkaa ${parts} kuluttua`, `Starts in ${parts}`);
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function exportIcs(event: NexusEvent) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + (event.durationMin ?? DEFAULT_DURATION) * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NEXUS//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@nexus.local`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeIcs(event.name)}`,
    ...(event.detail ? [`DESCRIPTION:${escapeIcs(event.detail)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
    ...(event.repeat === "weekly" ? ["RRULE:FREQ=WEEKLY"] : []),
    `CATEGORIES:${normalizeCategory(event.category)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "event"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function DateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const toDisplay = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
  const [text, setText] = useState(toDisplay(value));
  const picker = useRef<HTMLInputElement>(null);
  const parse = (input: string) => {
    const match = input.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!match) return null;
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  };
  const commit = (input: string) => {
    const iso = parse(input);
    if (iso) { onChange(iso); setText(toDisplay(iso)); } else setText(toDisplay(value));
  };
  return <div className="ev-date-field">
    <input type="text" inputMode="numeric" value={text} placeholder="dd/mm/yyyy" aria-label={tr("Päivä (pp/kk/vvvv)", "Date (dd/mm/yyyy)")} onChange={(event) => { setText(event.target.value); const iso = parse(event.target.value); if (iso) onChange(iso); }} onBlur={() => commit(text)} />
    <button type="button" className="ev-date-button" aria-label={tr("Avaa kalenteri", "Open calendar")} onClick={() => picker.current?.showPicker()}><CalendarDays size={16} /></button>
    <input ref={picker} className="ev-date-native" type="date" tabIndex={-1} aria-hidden="true" value={value} min={dateKey(new Date())} onChange={(event) => { if (event.target.value) { onChange(event.target.value); setText(toDisplay(event.target.value)); } }} />
  </div>;
}

function EventForm({ onSubmit, onCancel }: {
  onSubmit: (event: Omit<NexusEvent, "id" | "attendees">) => void;
  onCancel: () => void;
}) {
  const tomorrow = addDays(new Date(), 1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EventCategory>("Gaming");
  const [date, setDate] = useState(dateKey(tomorrow));
  const [time, setTime] = useState("20:00");
  const [location, setLocation] = useState("Online");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [repeat, setRepeat] = useState<EventRepeat>("none");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) return;
    onSubmit({
      name,
      detail: description.trim(),
      startsAt: startsAt.toISOString(),
      category,
      location: location.trim(),
      durationMin: duration,
      repeat,
    });
  };

  return <form className="ev-form" onSubmit={submit}>
    <h2>{tr("Uusi tapahtuma", "New event")}</h2>
    <label className="ev-field"><span>{tr("Tapahtuman nimi", "Event name")}</span><input value={name} maxLength={80} required placeholder={tr("Esim. Rust Gaming Night", "E.g. Rust Gaming Night")} onChange={(event) => setName(event.target.value)} /></label>
    <fieldset className="ev-field ev-categories">
      <legend>{tr("Kategoria", "Category")}</legend>
      {CATEGORIES.map((item) => <label className={`ev-radio${category === item.id ? " is-checked" : ""}`} key={item.id} style={{ "--ev-color": item.color } as CSSProperties}>
        <input type="radio" name="event-category" value={item.id} checked={category === item.id} onChange={() => setCategory(item.id)} />
        <i aria-hidden="true" />
        <span>{`${item.emoji} ${tr(item.fi, item.en)}`}</span>
      </label>)}
    </fieldset>
    <div className="ev-form-row">
      <div className="ev-field"><span>{tr("Päivä", "Date")}</span><DateSelect value={date} onChange={setDate} /></div>
      <label className="ev-field"><span>{tr("Kellonaika", "Time")}</span><input type="time" value={time} required onChange={(event) => setTime(event.target.value)} /></label>
    </div>
    <div className="ev-form-row">
      <label className="ev-field"><span>{tr("Kesto", "Duration")}</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 60, 90, 120, 180, 240].map((minutes) => <option value={minutes} key={minutes}>{durationLabel(minutes)}</option>)}</select></label>
      <label className="ev-field"><span>{tr("Toisto", "Repeat")}</span><select value={repeat} onChange={(event) => setRepeat(event.target.value as EventRepeat)}><option value="none">{tr("Ei toistoa", "Does not repeat")}</option><option value="weekly">{tr("Joka viikko", "Every week")}</option></select></label>
    </div>
    <label className="ev-field"><span>{tr("Paikka", "Location")}</span><input value={location} maxLength={80} placeholder="Online" onChange={(event) => setLocation(event.target.value)} /></label>
    <label className="ev-field"><span>{tr("Kuvaus", "Description")}</span><textarea rows={3} maxLength={300} value={description} placeholder={tr("Mitä tapahtumassa tehdään?", "What will happen at the event?")} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="ev-form-actions">
      <button className="button button-primary" type="submit">{tr("Tallenna tapahtuma", "Save event")}</button>
      <button className="button button-secondary" type="button" onClick={onCancel}>{tr("Peruuta", "Cancel")}</button>
    </div>
  </form>;
}

function EventDetails({ occurrence, joined, onJoin, onUpdate, onDelete }: {
  occurrence: Occurrence;
  joined: boolean;
  onJoin: (name: string) => void;
  onUpdate: (id: string, patch: Partial<NexusEvent>) => void;
  onDelete: (id: string) => void;
}) {
  const { event } = occurrence;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rsvpOptions: { id: EventRsvp; label: string }[] = [
    { id: "going", label: tr("Osallistun", "Going") },
    { id: "maybe", label: tr("Ehkä", "Maybe") },
    { id: "no", label: tr("En osallistu", "Not going") },
  ];
  const chooseRsvp = (rsvp: EventRsvp) => {
    onUpdate(event.id, { rsvp });
    if (rsvp === "going" && !joined) onJoin(event.name);
  };
  return <div className="ev-details">
    <p className="ev-description">{event.detail || tr("Ei kuvausta.", "No description.")}</p>
    <dl className="ev-facts">
      <div><dt><Clock3 size={13} /> {tr("Aika", "When")}</dt><dd>{formatDate(occurrence.start, { weekday: "long", day: "numeric", month: "long" })} · {formatTime(occurrence.start)}–{formatTime(occurrence.end)}</dd></div>
      <div><dt><MapPin size={13} /> {tr("Paikka", "Location")}</dt><dd>{event.location || "Online"}</dd></div>
      <div><dt><CalendarDays size={13} /> {tr("Kesto", "Duration")}</dt><dd>{durationLabel(event.durationMin ?? DEFAULT_DURATION)}</dd></div>
      {event.repeat === "weekly" && <div><dt><Repeat size={13} /> {tr("Toisto", "Repeat")}</dt><dd>{tr("Joka viikko", "Every week")}</dd></div>}
    </dl>
    <div className="ev-rsvp" role="group" aria-label={tr("Osallistumistila", "Attendance")}>
      {rsvpOptions.map((option) => <button type="button" className={`ev-chip${event.rsvp === option.id ? " is-active" : ""}`} aria-pressed={event.rsvp === option.id} key={option.id} onClick={() => chooseRsvp(option.id)}>{option.label}</button>)}
    </div>
    <label className="ev-field"><span>{tr("Muistiinpanot", "Notes")}</span><textarea rows={2} maxLength={500} value={event.notes ?? ""} placeholder={tr("Omat muistiinpanot tapahtumasta...", "Your notes about this event...")} onChange={(change) => onUpdate(event.id, { notes: change.target.value })} /></label>
    <div className="ev-detail-actions">
      <button type="button" className="button button-secondary" onClick={() => exportIcs(event)}><Download size={14} /> {tr("Vie .ics", "Export .ics")}</button>
      <button type="button" className={`button ${confirmDelete ? "button-danger" : "button-secondary"}`} onClick={() => confirmDelete ? onDelete(event.id) : setConfirmDelete(true)} onBlur={() => setConfirmDelete(false)}><Trash2 size={14} /> {confirmDelete ? tr("Vahvista poisto", "Confirm delete") : event.repeat === "weekly" ? tr("Poista sarja", "Delete series") : tr("Poista", "Delete")}</button>
    </div>
  </div>;
}

export function EventsPage({ state, onJoin, onCreate, onUpdate, onDelete }: {
  state: NexusState;
  onJoin: (name: string) => void;
  onCreate: (event: Omit<NexusEvent, "id" | "attendees">) => void;
  onUpdate: (id: string, patch: Partial<NexusEvent>) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  const [focus, setFocus] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EventCategory | "all">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const matches = (occurrence: Occurrence) => {
    if (filter !== "all" && occurrence.category !== filter) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return [occurrence.event.name, occurrence.event.detail, occurrence.event.location ?? ""].some((value) => value.toLowerCase().includes(text));
  };

  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const monthEnd = new Date(focus.getFullYear(), focus.getMonth() + 1, 1);
  const weekStart = startOfWeek(focus);
  const rangeStart = view === "month" ? monthStart : view === "week" ? weekStart : startOfDay(focus);
  const rangeEnd = view === "month" ? monthEnd : view === "week" ? addDays(weekStart, 7) : view === "day" ? addDays(focus, 1) : addDays(focus, 30);

  const rangeOccurrences = useMemo(
    () => occurrencesBetween(state.events, rangeStart, rangeEnd).filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.events, rangeStart.getTime(), rangeEnd.getTime(), query, filter],
  );
  const upcomingCount = useMemo(
    () => occurrencesBetween(state.events, new Date(), addDays(new Date(), 30)).length,
    [state.events],
  );

  const byDay = new Map<string, Occurrence[]>();
  rangeOccurrences.forEach((occurrence) => {
    const key = dateKey(occurrence.start);
    byDay.set(key, [...(byDay.get(key) ?? []), occurrence]);
  });

  const step = (direction: number) => {
    setOpenKey(null);
    setFocus((current) => view === "month" ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
      : view === "week" ? addDays(current, 7 * direction)
      : view === "day" ? addDays(current, direction)
      : addDays(current, 30 * direction));
  };

  const title = view === "month" ? formatDate(focus, { month: "long", year: "numeric" })
    : view === "week" ? `${formatDate(weekStart, { day: "numeric", month: "short" })} – ${formatDate(addDays(weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`
    : view === "day" ? formatDate(focus, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${formatDate(focus, { day: "numeric", month: "short" })} – ${formatDate(addDays(focus, 29), { day: "numeric", month: "short", year: "numeric" })}`;

  const viewLabels: Record<CalendarView, string> = {
    month: tr("Kuukausi", "Month"),
    week: tr("Viikko", "Week"),
    day: tr("Päivä", "Day"),
    agenda: "Agenda",
  };

  const renderRow = (occurrence: Occurrence) => {
    const open = openKey === occurrence.key;
    const info = categoryInfo(occurrence.category);
    return <article className={`ev-row${open ? " is-open" : ""}`} key={occurrence.key} style={{ "--ev-color": info.color } as CSSProperties}>
      <button type="button" className="ev-row-main" aria-expanded={open} onClick={() => setOpenKey(open ? null : occurrence.key)}>
        <span className="ev-time">{formatTime(occurrence.start)}<small>{formatTime(occurrence.end)}</small></span>
        <span className="ev-bar" aria-hidden="true" />
        <span className="ev-copy"><strong>{occurrence.event.name}</strong><span>{categoryLabel(occurrence.category)}{occurrence.event.location ? ` · ${occurrence.event.location}` : ""}{occurrence.event.repeat === "weekly" ? ` · ${tr("viikoittain", "weekly")}` : ""}</span></span>
        <span className="ev-count">{countdown(occurrence, now)}</span>
        {occurrence.event.rsvp && <span className={`ev-rsvp-badge rsvp-${occurrence.event.rsvp}`}>{occurrence.event.rsvp === "going" ? "✓" : occurrence.event.rsvp === "maybe" ? "?" : "×"}</span>}
      </button>
      {open && <EventDetails occurrence={occurrence} joined={state.joinedEvents.includes(occurrence.event.name)} onJoin={onJoin} onUpdate={onUpdate} onDelete={(id) => { setOpenKey(null); onDelete(id); }} />}
    </article>;
  };

  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const weekdays = Array.from({ length: 7 }, (_, index) => formatDate(new Date(2024, 0, 1 + index), { weekday: "short" }));
  const todayKey = dateKey(new Date());
  const focusKey = dateKey(focus);

  const openOccurrence = view === "week" ? rangeOccurrences.find((occurrence) => occurrence.key === openKey) : undefined;

  const agendaDays = [...byDay.entries()];

  return <>
    <div className="page-heading"><div><div className="eyebrow">MAKE IT A MOMENT</div><h1>Events &amp; Calendar</h1><p>{tr("Luo tapahtumia ja ilmoittaudu mukaan. Tiedot tallentuvat laitteellesi.", "Create events and sign up. Your data is stored on your device.")}</p></div><div className="heading-action"><button className="button button-primary" onClick={() => setShowForm((shown) => !shown)}><Plus size={16} /> {showForm ? tr("Sulje lomake", "Close form") : tr("Luo tapahtuma", "Create event")}</button></div></div>
    <div className={`ev-layout${showForm ? " has-form" : ""}`}>
    {showForm && <EventForm onCancel={() => setShowForm(false)} onSubmit={(event) => { onCreate(event); setQuery(""); setFilter("all"); setFocus(startOfDay(new Date(event.startsAt))); setOpenKey(null); setShowForm(false); }} />}
    <div className="ev-main">
    <section className="event-hero"><div className="event-date-tile"><span>NEXUS</span><strong>{upcomingCount}</strong><small>{tr("30 PV", "30 DAYS")}</small></div><div><span className="feature-tag"><CalendarDays size={13} /> YOUR NEXT MOMENT</span><h2>Meet. Make. Play.</h2><p>{tr("Ilmoittaudu tapaamisiin tai järjestä omasi.", "Sign up for meetups or host your own.")}</p></div></section>

    <div className="ev-toolbar">
      <div className="ev-tabs" role="tablist" aria-label={tr("Kalenterinäkymä", "Calendar view")}>
        {(["month", "week", "day", "agenda"] as CalendarView[]).map((item) => <button type="button" role="tab" aria-selected={view === item} className={view === item ? "is-active" : ""} key={item} onClick={() => { setView(item); setOpenKey(null); }}>{viewLabels[item]}</button>)}
      </div>
      <div className="ev-nav">
        <button type="button" className="icon-button subtle" aria-label={tr("Edellinen", "Previous")} onClick={() => step(-1)}><ChevronLeft size={16} /></button>
        <h3>{title}</h3>
        <button type="button" className="icon-button subtle" aria-label={tr("Seuraava", "Next")} onClick={() => step(1)}><ChevronRight size={16} /></button>
        <button type="button" className="button button-secondary calendar-today" onClick={() => { setFocus(startOfDay(new Date())); setOpenKey(null); }}>{tr("Tänään", "Today")}</button>
      </div>
    </div>

    <div className="ev-filters">
      <label className="ev-search"><Search size={14} /><input type="search" value={query} placeholder={tr("Hae tapahtumia...", "Search events...")} aria-label={tr("Hae tapahtumia", "Search events")} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="ev-chips" role="group" aria-label={tr("Suodata kategorian mukaan", "Filter by category")}>
        <button type="button" className={`ev-chip${filter === "all" ? " is-active" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{tr("Kaikki", "All")}</button>
        {CATEGORIES.map((item) => <button type="button" className={`ev-chip${filter === item.id ? " is-active" : ""}`} aria-pressed={filter === item.id} key={item.id} style={{ "--ev-color": item.color } as CSSProperties} onClick={() => setFilter(item.id)}><i aria-hidden="true" />{`${item.emoji} ${tr(item.fi, item.en)}`}</button>)}
      </div>
    </div>

    {view === "month" && <>
      <section className="event-calendar ev-month">
        <div className="event-calendar-grid" role="group" aria-label={title}>
          {weekdays.map((weekday, index) => <span className="event-calendar-weekday" key={`${weekday}-${index}`}>{weekday}</span>)}
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - firstWeekday + 1;
            if (day < 1 || day > daysInMonth) return <span className="event-calendar-blank" key={`blank-${index}`} />;
            const date = new Date(focus.getFullYear(), focus.getMonth(), day);
            const key = dateKey(date);
            const dayEvents = byDay.get(key) ?? [];
            const categories = [...new Set(dayEvents.map((occurrence) => occurrence.category))];
            const label = `${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}${key === todayKey ? `, ${tr("tänään", "today")}` : ""}${dayEvents.length ? `, ${dayEvents.length} ${tr("tapahtumaa", dayEvents.length === 1 ? "event" : "events")}` : ""}`;
            return <button type="button" className={`event-calendar-day${key === todayKey ? " is-today" : ""}${key === focusKey ? " is-selected" : ""}${dayEvents.length ? " has-events" : ""}`} aria-pressed={key === focusKey} aria-label={label} key={key} onClick={() => { setFocus(date); setOpenKey(null); }}>
              <span>{day}</span>
              {categories.length > 0 && <span className="event-calendar-dots" aria-hidden="true">{categories.map((category) => <i key={category} style={{ background: categoryInfo(category).color }} />)}</span>}
            </button>;
          })}
        </div>
      </section>
      <div className="event-filter-row selected-events-heading"><div><div className="eyebrow">{tr("VALITTU PÄIVÄ", "SELECTED DAY")}</div><h2>{formatDate(focus, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2></div><span className="soft-label">{(byDay.get(focusKey) ?? []).length} {tr("tapahtumaa", "events")}</span></div>
      <section className="ev-list">{(byDay.get(focusKey) ?? []).map(renderRow)}{!(byDay.get(focusKey) ?? []).length && <p className="empty-inline">{tr("Ei tapahtumia valittuna päivänä. Valitse kalenterista toinen päivä.", "No events on the selected day. Pick another day from the calendar.")}</p>}</section>
    </>}

    {view === "week" && <>
      <section className="ev-week" aria-label={title}>
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(weekStart, index);
          const key = dateKey(date);
          const items = byDay.get(key) ?? [];
          return <div className={`ev-week-col${key === todayKey ? " is-today" : ""}`} key={key}>
            <button type="button" className="ev-week-head" onClick={() => { setFocus(date); setView("day"); setOpenKey(null); }}><small>{formatDate(date, { weekday: "short" })}</small><strong>{date.getDate()}</strong></button>
            <div className="ev-week-items">
              {items.map((occurrence) => <button type="button" className={`ev-block${openKey === occurrence.key ? " is-open" : ""}`} key={occurrence.key} style={{ "--ev-color": categoryInfo(occurrence.category).color } as CSSProperties} onClick={() => setOpenKey(openKey === occurrence.key ? null : occurrence.key)}><small>{formatTime(occurrence.start)}</small><strong>{occurrence.event.name}</strong></button>)}
              {!items.length && <span className="ev-week-empty">–</span>}
            </div>
          </div>;
        })}
      </section>
      {openOccurrence && <section className="ev-list">{renderRow(openOccurrence)}</section>}
    </>}

    {view === "day" && <section className="ev-list">{rangeOccurrences.map(renderRow)}{!rangeOccurrences.length && <p className="empty-inline">{tr("Ei tapahtumia tälle päivälle.", "No events for this day.")}</p>}</section>}

    {view === "agenda" && <section className="ev-agenda">
      {agendaDays.map(([key, items]) => {
        const date = items[0].start;
        return <div className={`ev-agenda-day${key === todayKey ? " is-today" : ""}`} key={key}>
          <div className="ev-agenda-date"><strong>{date.getDate()}</strong><small>{formatDate(date, { weekday: "short", month: "short" })}</small></div>
          <div className="ev-agenda-items">{items.map(renderRow)}</div>
        </div>;
      })}
      {!agendaDays.length && <p className="empty-inline">{tr("Ei tapahtumia seuraavan 30 päivän aikana.", "No events in the next 30 days.")}</p>}
    </section>}

    <p className="local-note">{tr("Tapahtumat ja osallistumiset ovat paikallisia tällä laitteella.", "Events and attendance are stored locally on this device.")}</p>
        </div>
        </div>
      </>;
}
