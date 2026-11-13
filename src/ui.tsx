import type { MouseEvent, ReactNode } from "react";

export type IconName =
  | "home" | "cards" | "mine" | "book" | "chart" | "settings" | "search" | "bell" | "plus"
  | "arrow" | "flame" | "clock" | "play" | "close" | "check" | "filter" | "star" | "volume"
  | "target" | "trash" | "sparkle" | "grid" | "list" | "upload" | "bookmark" | "user" | "calendar"
  | "edit" | "bolt" | "lock" | "key" | "download" | "refresh" | "alert" | "deck" | "arrow-left" | "eye"
  | "chevron-down" | "chevron-up";

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    cards: <><rect x="4" y="5" width="15" height="16" rx="2" /><path d="M8 5V3h11a2 2 0 0 1 2 2v12h-2" /><path d="M8 10h7M8 14h5" /></>,
    mine: <><path d="M12 3v3M4.2 7.5l2.6 1.4M19.8 7.5l-2.6 1.4M5 17h14" /><path d="M8 17v-5a4 4 0 0 1 8 0v5M7 21h10" /></>,
    book: <><path d="M4 4.5A3.5 3.5 0 0 1 7.5 3H11v16H7.5A3.5 3.5 0 0 0 4 20.5Z" /><path d="M20 4.5A3.5 3.5 0 0 0 16.5 3H13v16h3.5a3.5 3.5 0 0 1 3.5 1.5Z" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    flame: <path d="M12.5 2.5c.7 4.2-3.8 5.3-2 9 1-1.5 2-2 3.5-2.5.2 3 2.5 3.7 2.5 6.5a4.5 4.5 0 0 1-9 0c0-4 3-6 5-13Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    play: <path d="m9 7 8 5-8 5Z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z" />,
    volume: <><path d="M4 9v6h4l5 4V5L8 9Z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    sparkle: <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15H9v-3L18.5 2.5Z" /></>,
    bolt: <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8Z" />,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4M12 16v2" /></>,
    key: <><path d="M21 15a2 2 0 0 1-2 2h-2l-1 1v2l-2 2H2v-5a2 2 0 0 1 2-2h6l4-4" /><circle cx="17" cy="15" r="1" /></>,
    download: <><path d="M12 17v-7M7 12l5 5 5-5M4 20h16" /></>,
    refresh: <><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15A9 9 0 0 1 5.64 19.36" /></>,
    alert: <><path d="M12 2L2 20h20L12 2Z" /><path d="M12 9v4M12 17h.01" /></>,
    deck: <><rect x="3" y="3" width="9" height="9" /><rect x="12" y="3" width="9" height="9" /><rect x="3" y="12" width="9" height="9" /><rect x="12" y="12" width="9" height="9" /></>,
    "arrow-left": <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    "chevron-up": <path d="m18 15-6-6-6 6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Button({
  children, className = "", onClick, ariaLabel, ariaExpanded, ariaPressed, title, type = "button", disabled, style,
}: {
  children: ReactNode; className?: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; ariaLabel?: string; ariaExpanded?: boolean; ariaPressed?: boolean; title?: string; type?: "button" | "submit"; disabled?: boolean; style?: React.CSSProperties;
}) {
  return <button type={type} className={className} onClick={onClick} aria-label={ariaLabel} aria-expanded={ariaExpanded} aria-pressed={ariaPressed} title={title} disabled={disabled} style={style}>{children}</button>;
}

export function PageHead({ eyebrow, title, accent, copy, children }: { eyebrow: string; title: string; accent?: string; copy: string; children?: ReactNode }) {
  return (
    <section className="pg-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title} {accent && <span>{accent}</span>}</h1>
        <p className="welcome-copy">{copy}</p>
      </div>
      {children && <div className="pg-head-actions">{children}</div>}
    </section>
  );
}

export function Tabs<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="pg-tabs" role="tablist">
      {items.map((it) => (
        <button key={it} type="button" role="tab" aria-selected={value === it} className={value === it ? "on" : ""} onClick={() => onChange(it)}>{it}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`pg-toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)}><i /></button>;
}
