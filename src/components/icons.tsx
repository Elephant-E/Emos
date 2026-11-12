import type { SVGProps } from 'react'
type IconProps = SVGProps<SVGSVGElement> & { size?: number }
function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
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
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2" width="4.8" height="4.8" rx="1.3" />
    <rect x="9.2" y="2" width="4.8" height="4.8" rx="1.3" />
    <rect x="2" y="9.2" width="4.8" height="4.8" rx="1.3" />
    <rect x="9.2" y="9.2" width="4.8" height="4.8" rx="1.3" />
  </Svg>
)
export const IconFilm = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.6" />
    <path d="M5.2 3v10M10.8 3v10M2 6.4h3.2M10.8 6.4H14M2 9.6h3.2M10.8 9.6H14" />
  </Svg>
)
export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.2 9V4.6c0-.8.6-1.4 1.4-1.4h8.8c.8 0 1.4.6 1.4 1.4V9" />
    <path d="M2.2 9h3.1l.9 1.5h3.6L10.7 9h3.1v2.4c0 .8-.6 1.4-1.4 1.4H3.6c-.8 0-1.4-.6-1.4-1.4z" />
  </Svg>
)
export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.7 2.3H3.5c-.7 0-1.2.5-1.2 1.2v4.2c0 .3.1.6.4.9l5.2 5.2c.5.5 1.2.5 1.7 0l3.9-3.9c.5-.5.5-1.2 0-1.7L8.6 2.7a1.2 1.2 0 0 0-.9-.4Z" />
    <circle cx="5.7" cy="5.7" r=".95" />
  </Svg>
)
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.2 3.4 4v4.1c0 2.9 1.9 4.7 4.6 5.7 2.7-1 4.6-2.8 4.6-5.7V4z" />
  </Svg>
)
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.95" cy="6.95" r="4.2" />
    <path d="m10.15 10.15 3.1 3.1" />
  </Svg>
)
export const IconPlus = (p: IconProps) => (
  <Svg size={13} strokeWidth={1.7} {...p}>
    <path d="M8 2.5v11M2.5 8h11" />
  </Svg>
)
export const IconLeft = (p: IconProps) => (
  <Svg size={12} {...p}>
    <path d="M10 3.5 5.5 8l4.5 4.5" />
  </Svg>
)
export const IconRight = (p: IconProps) => (
  <Svg size={12} {...p}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Svg>
)
export const IconDots = (p: IconProps) => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="3" cy="7" r="1.1" />
    <circle cx="7" cy="7" r="1.1" />
    <circle cx="11" cy="7" r="1.1" />
  </svg>
)
export const IconAlert = (p: IconProps) => (
  <Svg size={22} {...p}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 4.8v3.6M8 11.1v.1" />
  </Svg>
)
export const IconEmpty = (p: IconProps) => (
  <Svg size={22} {...p}>
    <path d="M2.4 8.6 4 4.4c.2-.5.7-.8 1.2-.8h5.6c.5 0 1 .3 1.2.8l1.6 4.2" />
    <path d="M2.4 8.6h3l.8 1.4h3.6l.8-1.4h3v2.6c0 .7-.6 1.3-1.3 1.3H3.7c-.7 0-1.3-.6-1.3-1.3z" />
  </Svg>
)
export const IconLogo = ({ size = 18, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...rest}>
    <g transform="translate(0 0.95)">
      <path d="M9 1.4c1.45 3.5 3.15 5.2 6.65 6.65-3.5 1.45-5.2 3.15-6.65 6.65-1.45-3.5-3.15-5.2-6.65-6.65C5.85 6.6 7.55 4.9 9 1.4Z" />
    </g>
  </svg>
)

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 10.6V2.8M5.2 5.4 8 2.6l2.8 2.8" />
    <path d="M2.4 9.6v2.6c0 .7.6 1.3 1.3 1.3h8.6c.7 0 1.3-.6 1.3-1.3V9.6" />
  </Svg>
)

export const IconLive = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="1.8" />
    <path d="M4.9 4.9a4.4 4.4 0 0 0 0 6.2M11.1 4.9a4.4 4.4 0 0 1 0 6.2M2.9 2.9a7.2 7.2 0 0 0 0 10.2M13.1 2.9a7.2 7.2 0 0 1 0 10.2" />
  </Svg>
)

export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 5.4h9.2l-.7 7.2c-.05.5-.5.9-1 .9H5.1c-.5 0-.95-.4-1-.9z" />
    <path d="M6 5.4V4a2 2 0 0 1 4 0v1.4" />
  </Svg>
)

export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.6 2.4h8.8v11.2l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4z" />
    <path d="M6 5.6h4M6 8.4h4" />
  </Svg>
)

export const IconRoute = (p: IconProps) => (
  <Svg {...p}>
    {/* 墨迹重心比 viewBox 中心低 0.8，整体上移对齐 */}
    <g transform="translate(0 -0.8)">
      <circle cx="3.6" cy="4" r="1.6" />
      <circle cx="12.4" cy="12" r="1.6" />
      <path d="M5.2 4h3.2a3.2 3.2 0 0 1 0 6.4H5.6a2.4 2.4 0 0 0 0 4.8h1" />
    </g>
  </Svg>
)

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="5.4" r="2.6" />
    <path d="M2.8 13.4c.7-2.4 2.7-3.8 5.2-3.8s4.5 1.4 5.2 3.8" />
  </Svg>
)

export const IconMusic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 12V4.2l6.6-1.4v7.4" />
    <circle cx="4.4" cy="12.2" r="1.8" />
    <circle cx="11" cy="10.6" r="1.8" />
  </Svg>
)

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <g transform="translate(0 -0.6)">
      <rect x="2" y="4.4" width="12" height="8.4" rx="1.6" />
      <path d="M2 7.4h12M10.6 10.6h1.2" />
    </g>
  </Svg>
)

/** 红包：方形信封 + 中间一道扎带 */
export const IconGift = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.2" y="3" width="11.6" height="10" rx="1.6" />
    <path d="M2.2 6.2h11.6M8 6.2V13" />
    <path d="M8 6.2C5.6 6.2 4.4 4.6 4.8 3.4c.5-1.3 2.4-.7 3.2 2.8ZM8 6.2c2.4 0 3.6-1.6 3.2-2.8-.5-1.3-2.4-.7-3.2 2.8Z" />
  </Svg>
)

/** 榜单：三根高低柱 */
export const IconRank = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13V8.4M8 13V3.6M13 13V6.2" />
    <path d="M2 13h12" />
  </Svg>
)

/** 抽奖：礼盒 + 上面的结 */
export const IconLottery = (p: IconProps) => (
  <Svg {...p}>
    <g transform="translate(0 -0.55)">
      <rect x="2.4" y="6.4" width="11.2" height="7" rx="1.2" />
      <path d="M2.4 9.2h11.2M8 6.4V13.4" />
      <path d="M8 6.4C6.2 6.4 5.2 5.2 5.6 4.2c.4-1 1.9-.6 2.4 2.2ZM8 6.4c1.8 0 2.8-1.2 2.4-2.2-.4-1-1.9-.6-2.4 2.2Z" />
    </g>
  </Svg>
)

/** 投票：三行选项 + 一个勾 */
export const IconVote = (p: IconProps) => (
  <Svg {...p}>
    <g transform="translate(-0.5 0)">
      <path d="M3 4.2h4.2M3 8h4.2M3 11.8h4.2" />
      <path d="M9.6 8.2l1.6 1.6 2.8-3.2" />
    </g>
  </Svg>
)

/** 悄悄话：对话气泡 */
export const IconWhisper = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2.6" width="12" height="8.4" rx="2.2" />
    <path d="M5.6 11 4.6 13.4l3.2-1.3" />
  </Svg>
)
