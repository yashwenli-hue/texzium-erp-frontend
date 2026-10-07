const PATHS: Record<string, string> = {
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-4 4"/>',
  funnel: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  building: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M9 12h.01M15 12h.01M9 8h.01M15 8h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 12 0v1"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M16 3.5a3 3 0 0 1 0 7M22 21v-1a5 5 0 0 0-3.5-4.8"/>',
  pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  checksq: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  notepad: '<path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5M9 12h6M9 16h4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M4 4h16l-6 8v6l-4 2v-8z"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.1z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  wa: '<path d="M3 21l1.6-4.8A9 9 0 1 1 8.5 20L3 21z"/><path d="M8.5 9.5c0 3.5 3 6.5 6.5 6.5"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  pin: '<path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/>',
  brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  percent: '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="m5 19 14-14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  drag: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  sortAsc: '<path d="M3 6h13M3 12h9M3 18h5M18 9l3-3 3 3M21 6v14"/>',
  sortDesc: '<path d="M3 6h13M3 12h9M3 18h5M18 15l3 3 3-3M21 6v12"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  collapse: '<path d="M11 17 6 12l5-5"/><path d="M18 17l-5-5 5-5"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/>',
  receipt: '<path d="M6 2h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  barChart: '<path d="M4 20V10M12 20V4M20 20v-7"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const d = PATHS[name] ?? "";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
