import type { SVGProps } from 'react';

const PATHS = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5',
  replay: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M10 9l5 3-5 3z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  xray: 'M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M8 12h8M12 8v8',
  magnet: 'M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4',
  chat: 'M4 5h16v11H9l-5 4z',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12.5l5 5L20 6.5',
  cross: 'M6 6l12 12M18 6L6 18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-1 .2M20 4v14h-7',
  flask: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7.5v.5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  send: 'M4 12l16-8-6 16-2.5-6.5z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  compare: 'M4 4h6v16H4zM14 4h6v16h-6z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8a7 7 0 0 0 7 7z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  question: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  thumbsDown: 'M10 15v4a3 3 0 0 0 3 3l4-9V3H6.7a2 2 0 0 0-2 1.7L3.3 12A2 2 0 0 0 5.3 14H10zM17 3h3v10h-3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, title, ...rest }: { name: IconName; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  const filled = name === 'play' || name === 'pause';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
