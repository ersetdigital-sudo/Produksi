import type { ReactNode } from "react";

export type IconName =
  | "home"
  | "grid"
  | "box"
  | "swap"
  | "calendar"
  | "ring"
  | "flask"
  | "receipt"
  | "wrench"
  | "sliders"
  | "panel"
  | "plus"
  | "x"
  | "search"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "check"
  | "check-circle"
  | "alert-triangle"
  | "octagon-x"
  | "info"
  | "arrow-up"
  | "arrow-down"
  | "arrow-left"
  | "doc"
  | "camera"
  | "image"
  | "trash"
  | "printer"
  | "play"
  | "bookmark"
  | "pencil"
  | "clock"
  | "user"
  | "refresh"
  | "package"
  | "tag"
  | "scale"
  | "coins"
  | "external"
  | "eye"
  | "grip";

const paths: Record<IconName, ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  swap: <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h3" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </>
  ),
  flask: (
    <>
      <path d="M9 4h6M10 4v5L5 19a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 19l-5-10V4" />
      <path d="M7.5 14h9" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 10l-2 2 2 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12 5 5 9-10" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  "octagon-x": (
    <>
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
  "arrow-down": <path d="M12 5v14M6 13l6 6 6-6" />,
  "arrow-left": <path d="M19 12H5M11 18l-6-6 6-6" />,
  doc: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 11h6M9 15h4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m4 16 4-4 4 4 3-3 5 5" />
      <circle cx="15" cy="9.5" r="1.5" />
    </>
  ),
  trash: (
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  ),
  printer: <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" />,
  play: <path d="M8 5v14l11-7z" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  package: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5" />
    </>
  ),
  tag: (
    <>
      <path d="M20 13 13 20l-9-9V3h8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M6 21h12M4 7h16" />
      <path d="M4 7 1.5 13h5zM20 7l-2.5 6h5z" />
    </>
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M14.5 6.2A5.5 5.5 0 1 1 17.8 14M7 9h4M9 7v4" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  grip: (
    <path
      d="M9 6v.01M9 12v.01M9 18v.01M15 6v.01M15 12v.01M15 18v.01"
      strokeWidth="2.5"
    />
  ),
};

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  label?: string;
};

export function Icon({
  name,
  size,
  className,
  strokeWidth,
  label,
}: IconProps) {
  return (
    <svg
      className={className ? `i ${className}` : "i"}
      viewBox="0 0 24 24"
      style={size ? { width: size, height: size } : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...(strokeWidth ? { strokeWidth } : {})}
    >
      {paths[name]}
    </svg>
  );
}
