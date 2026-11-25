import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Pixel size; the 24 px grid scales to it. */
  size?: number;
};

/** Every icon: 24 px grid, 1.6 px stroke, round caps and joins, drawn in the text color. Decorative unless given a title. */
function icon(name: string, paths: ReactNode) {
  function Icon({ size = 18, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        data-icon={name}
        {...rest}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = `${name}Icon`;
  return Icon;
}

export const ShuffleIcon = icon(
  "shuffle",
  <>
    <path d="M3 7h3.5c2.5 0 4 1.5 5.5 5s3 5 5.5 5H21" />
    <path d="M3 17h3.5c1.4 0 2.4-.4 3.3-1.2M14.2 8.2C15 7.4 16 7 17.5 7H21" />
    <path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" />
  </>,
);
export const LockIcon = icon(
  "lock",
  <>
    <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);
export const UnlockIcon = icon(
  "unlock",
  <>
    <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 7.7-1.5" />
  </>,
);
export const UndoIcon = icon(
  "undo",
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </>,
);
export const RedoIcon = icon(
  "redo",
  <>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </>,
);
export const ExportIcon = icon(
  "export",
  <>
    <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
    <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
  </>,
);
export const LibraryIcon = icon(
  "library",
  <>
    <rect x="3.5" y="4" width="17" height="4.5" rx="1.8" />
    <rect x="3.5" y="10" width="17" height="4.5" rx="1.8" />
    <rect x="3.5" y="16" width="17" height="4.5" rx="1.8" />
  </>,
);
export const VibeIcon = icon(
  "vibe",
  <>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="2" fill="var(--surface, #fff)" />
    <circle cx="15" cy="12" r="2" fill="var(--surface, #fff)" />
    <circle cx="8" cy="17" r="2" fill="var(--surface, #fff)" />
  </>,
);
export const EyedropperIcon = icon(
  "eyedropper",
  <>
    <path d="m14.5 6.5 3 3" />
    <path d="m16 4.5 1-1a2.1 2.1 0 0 1 3 3l-1 1-3-3Z" />
    <path d="M15.5 7.5 6 17l-1 3.5L8.5 19.5 18 10" />
  </>,
);
export const CopyIcon = icon(
  "copy",
  <>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 9V6.2A2.2 2.2 0 0 0 12.8 4H6.2A2.2 2.2 0 0 0 4 6.2v6.6A2.2 2.2 0 0 0 6.2 15H9" />
  </>,
);
export const CheckIcon = icon("check", <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const WarningIcon = icon(
  "warning",
  <>
    <path d="M12 4.5 21 20H3L12 4.5Z" />
    <path d="M12 10.5v4" />
    <path d="M12 17.4v.1" />
  </>,
);
export const CloseIcon = icon("close", <path d="m6 6 12 12M18 6 6 18" />);
export const MoreIcon = icon(
  "more",
  <>
    <circle cx="5.5" cy="12" r=".6" />
    <circle cx="12" cy="12" r=".6" />
    <circle cx="18.5" cy="12" r=".6" />
  </>,
);

export const ICONS = {
  shuffle: ShuffleIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  undo: UndoIcon,
  redo: RedoIcon,
  export: ExportIcon,
  library: LibraryIcon,
  vibe: VibeIcon,
  eyedropper: EyedropperIcon,
  copy: CopyIcon,
  check: CheckIcon,
  warning: WarningIcon,
  close: CloseIcon,
  more: MoreIcon,
} as const;
