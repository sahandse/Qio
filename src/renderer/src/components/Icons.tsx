import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/** Rendered sizes sit on the 16px grid; strokes are 1.5 at every size. */
export const ICON = { xs: 12, sm: 14, md: 16, lg: 20, xl: 22 } as const

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
  </Icon>
)

export const PauseIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="7" y="5.5" width="3.4" height="13" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" fill="currentColor" stroke="none" />
  </Icon>
)

export const NextIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none" />
    <rect x="16.6" y="5.5" width="2.2" height="13" rx="1.1" fill="currentColor" stroke="none" />
  </Icon>
)

export const PrevIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 5.5v13l-9-6.5z" fill="currentColor" stroke="none" />
    <rect x="5.2" y="5.5" width="2.2" height="13" rx="1.1" fill="currentColor" stroke="none" />
  </Icon>
)

export const MusicIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="7" cy="17" r="2.6" />
    <circle cx="17.5" cy="15" r="2.6" />
    <path d="M9.6 17V7.4l10.5-2.2V15" />
  </Icon>
)

export const LyricsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 7h9M5 11.5h7M5 16h4.5M16.5 9.5c1.7.6 2.5 2 2.5 4.2 0 2-.9 3.4-2.6 4" />
  </Icon>
)

export const TimerIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.8v4l2.4 1.6M9.4 3h5.2M12 3v3" />
  </Icon>
)

export const WaterIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.5s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z" />
  </Icon>
)

export const ShelfIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.2l1.6 2.2h7.7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
  </Icon>
)

export const TodoIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7.5l2 2 3.2-3.5M4 16.5l2 2 3.2-3.5M12.5 7.8h7M12.5 17h7" />
  </Icon>
)

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="2.9" />
    <path d="M12 3.5v2.1M12 18.4v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3.5 12h2.1M18.4 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
)

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Icon>
)

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.8 7h14.4M9.5 7V5.2h5V7M6.6 7l.9 12h9l.9-12M10.2 10.6v5M13.8 10.6v5" />
  </Icon>
)

export const FolderOpenIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 8.2V6.5a1.8 1.8 0 0 1 1.8-1.8h3l1.5 2h6.9a1.8 1.8 0 0 1 1.8 1.8v1.4M4.2 9.9h15.4l-1.6 7.4a2 2 0 0 1-2 1.6H6.8a2 2 0 0 1-2-1.6z" />
  </Icon>
)

export const VolumeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4z" />
    <path d="M14.8 9a4 4 0 0 1 0 6M17.6 6.6a7.4 7.4 0 0 1 0 10.8" />
  </Icon>
)

export const MuteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4z" />
    <path d="M15 9.8l4.4 4.4M19.4 9.8L15 14.2" />
  </Icon>
)

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
  </Icon>
)

export const KeyboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="6.5" width="18" height="11" rx="2" />
    <path d="M6.4 10h.01M9.8 10h.01M13.2 10h.01M16.6 10h.01M7.6 13.6h8.8" />
  </Icon>
)

export const BatteryIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="8" width="15.5" height="8" rx="2.2" />
    <path d="M21 10.6v2.8" />
  </Icon>
)

export const BoltIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13.4 3.5L6.8 13h4l-.9 7.5L17.2 11h-4z" />
  </Icon>
)

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.5 13.5a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3M13.5 10.5a3.6 3.6 0 0 0-5.1 0L5.8 13a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3" />
  </Icon>
)

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.4" />
    <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    <path d="M7.6 13.6h.01M12 13.6h.01M16.4 13.6h.01M7.6 17h.01M12 17h.01" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />
  </Icon>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 6.5L9 12l5.5 5.5" />
  </Icon>
)

export const ResetIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12a7 7 0 1 1-2.1-5M19 4.5V9h-4.5" />
  </Icon>
)

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
    <path d="M15.5 8.5v-2A2 2 0 0 0 13.5 4.5h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5.5 12.5l4.2 4.2L18.5 8" strokeWidth={2.4} />
  </Icon>
)

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 19.5l.9-4.2L15.9 4.8a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.7 18.6z" />
    <path d="M13.8 6.9l3.3 3.3" />
  </Icon>
)

export const HeadphonesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="3.5" y="13.5" width="4" height="6.5" rx="2" />
    <rect x="16.5" y="13.5" width="4" height="6.5" rx="2" />
  </Icon>
)

export const WifiIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.6 16.4a4 4 0 0 1 4.8 0" />
    <path d="M12 19.4h.01" />
  </Icon>
)

export const TextCardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4.5" width="16" height="15" rx="2.4" />
    <path d="M8 9h8M8 12.5h8M8 16h5" />
  </Icon>
)

export const NoteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 5.5h14v9.2L14.7 19H5z" />
    <path d="M19 14.7h-4.3V19" />
    <path d="M8.4 9.2h7.2M8.4 12.2h4.6" />
  </Icon>
)

export const PinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9.2 4.4h5.6l-.7 5.2 3 3.2H6.9l3-3.2z" />
    <path d="M12 12.8V19.5" />
  </Icon>
)

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.1 10.3a5.9 5.9 0 0 1 11.8 0c0 3.5 1 5.1 1.8 6.1.3.4 0 1-.5 1H4.8c-.5 0-.8-.6-.5-1 .8-1 1.8-2.6 1.8-6.1z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Icon>
)

export const SparklesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11.4 3.8l1.45 4.05 4.05 1.45-4.05 1.45L11.4 14.8l-1.45-4.05L5.9 9.3l4.05-1.45z" />
    <path d="M18 14.2l.75 1.95 1.95.75-1.95.75-.75 1.95-.75-1.95-1.95-.75 1.95-.75z" />
    <path d="M5.4 16.2l.55 1.35 1.35.55-1.35.55-.55 1.35-.55-1.35-1.35-.55 1.35-.55z" />
  </Icon>
)

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 11.2v5M12 8.1h.01" />
  </Icon>
)

export const TelegramIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.8 4.1L3.6 10.7c-.85.32-.83 1.5.04 1.79l4.3 1.44 1.6 4.6c.29.85 1.38 1 1.9.27l2.15-2.85 4.25 3.08c.7.5 1.68.12 1.86-.72l2.06-12.8c.16-1-.9-1.8-1.86-1.4z" />
    <path d="M8.1 14.1l10.9-8.4-8.1 10.6" />
  </Icon>
)

export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.6 11.4l14.8-6.1-4.7 14.1-3-5.6z" />
    <path d="M11.7 13.8l7.7-8.5" />
  </Icon>
)

export const StopIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="7" y="7" width="10" height="10" rx="2.2" fill="currentColor" stroke="none" />
  </Icon>
)

export const BallIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.3l3.3 2.4-1.3 4h-4l-1.3-4z" />
    <path d="M12 3.6v3.7M4.4 9.5l3.3 2.3M19.6 9.5l-3.3 2.3M6.9 18.8l3.1-3.1M17.1 18.8l-3.1-3.1" />
  </Icon>
)

export const CardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8" y="4.6" width="8" height="14.8" rx="1.8" />
  </Icon>
)

export const SwapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 5.2v12.4M8 5.2L5.4 7.9M8 5.2l2.6 2.7M16 18.8V6.4M16 18.8l2.6-2.7M16 18.8l-2.6-2.7" />
  </Icon>
)

export const VarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" />
    <path d="M8.2 9.4h7.6v5.2H8.2z" />
  </Icon>
)

export const WalkIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="13" cy="4.6" r="1.8" />
    <path d="M12.4 7.4l-1.8 4.4 3 2.6" />
    <path d="M11.6 8.9L8.2 11M14.2 12.6l3.4-.7" />
    <path d="M10.6 11.8L7.8 15.6l1.2 4M16 14.6l1.3 3.1-2.2 2.4" />
  </Icon>
)

export const CoffeeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.6 9.6h11.2v4.6a4.4 4.4 0 0 1-4.4 4.4H9a4.4 4.4 0 0 1-4.4-4.4z" />
    <path d="M15.8 10.8h1.6a2.6 2.6 0 0 1 0 5.2h-1.6" />
    <path d="M8.4 6.6c-.9-.9.7-1.6-.2-2.9M12.2 6.6c-.9-.9.7-1.6-.2-2.9" />
    <path d="M3.4 21h13.6" />
  </Icon>
)

export const CalcIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="3.4" width="14" height="17.2" rx="2.4" />
    <path d="M8.2 7.6h7.6" />
    <path d="M9 12.2h.01M12 12.2h.01M15 12.2h.01M9 15.8h.01M12 15.8h.01M15 15.8h.01" strokeWidth={2.6} />
  </Icon>
)

export const GaugeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 17.6a8.6 8.6 0 1 1 16 0" />
    <path d="M12 17.2l3.4-4.4" />
    <circle cx="12" cy="17.8" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
)

export const DropperIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.6 4.4l1.4-1.4a2.3 2.3 0 0 1 3.2 0l1.8 1.8a2.3 2.3 0 0 1 0 3.2l-1.4 1.4" />
    <path d="M15.2 6.2l2.6 2.6-8 8L6 19.2l-1.6.4.4-1.6 2.4-3.8z" />
  </Icon>
)

export const PenIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 19.5l1-4.2L15.9 4.9a2.2 2.2 0 0 1 3.2 0l.9.9a2.2 2.2 0 0 1 0 3.2L9.6 19.4l-4.1.9z" />
    <path d="M14.2 6.6l3.2 3.2" />
  </Icon>
)

export const ClipboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5.4" y="4.6" width="13.2" height="15.4" rx="2.2" />
    <path d="M9.2 4.6V3.7a1.5 1.5 0 0 1 1.5-1.5h2.6a1.5 1.5 0 0 1 1.5 1.5v.9" />
    <path d="M9 11h6M9 14.6h3.8" />
  </Icon>
)

export const PipetteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.2 3.6l6.2 6.2-2.4 2.4-1-1-6.4 6.4-3.8.9.9-3.8 6.4-6.4-1-1z" />
    <path d="M6.4 17.5L3.8 20.1" />
  </Icon>
)

export const DrawIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13.8 4.6l5.6 5.6-8.2 8.2-3.6.9.9-3.6z" />
    <path d="M3.6 20.4c.6-2.6 1.8-4.2 3.6-5" />
  </Icon>
)

export const CpuIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M10 3.4v3.6M14 3.4v3.6M10 17v3.6M14 17v3.6M3.4 10H7M3.4 14H7M17 10h3.6M17 14h3.6" />
  </Icon>
)

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v9.6M7.6 10L12 14.4 16.4 10" />
    <path d="M4.8 19.6h14.4" />
  </Icon>
)

export const ToolsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19.6 5.8l-2.2 2.2-2.3-.6-.6-2.3 2.2-2.2a5.4 5.4 0 0 0-7.2 6.9l-5.9 5.9a2.05 2.05 0 0 0 2.9 2.9l5.9-5.9a5.4 5.4 0 0 0 6.9-7.2z" />
  </Icon>
)

export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.6" y="3.6" width="7.4" height="7.4" rx="1.8" />
    <rect x="13" y="3.6" width="7.4" height="7.4" rx="1.8" />
    <rect x="3.6" y="13" width="7.4" height="7.4" rx="1.8" />
    <rect x="13" y="13" width="7.4" height="7.4" rx="1.8" />
  </Icon>
)

