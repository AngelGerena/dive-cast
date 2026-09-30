const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z',
  plus: 'M12 5v14M5 12h14',
  log: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  users: 'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M15 14.5c2.6 0 4.8 1.6 5.8 4.5',
  back: 'M15 5l-7 7 7 7',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  check: 'M5 12l5 5 9-10',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 8v5M12 16v.5',
  thermo: 'M10 4a2 2 0 1 1 4 0v10a4 4 0 1 1-4 0zM12 10v7',
  waves: 'M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 20c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  close: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  calendar: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'
};

export function Icon({ name, size = 22, stroke = 1.8 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
