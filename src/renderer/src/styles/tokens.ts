/**
 * 「轻账」设计系统 · 设计 Token（2026-07-18）
 * 与 tokens.css 完全对应，可直接用作 antd ConfigProvider theme.token
 *
 * 用法：
 *   import { tokens } from '@/styles/tokens'
 *   <ConfigProvider theme={{ token: tokens.theme }}>...
 */

export const brand = {
  primary: '#006D5B',
  light: '#E6F4F1',
  dark: '#004D40',
  gold: '#D4A373'
} as const

export const text = {
  primary: '#1D1D1F',
  secondary: '#86868B',
  tertiary: '#C7C7CC'
} as const

export const bg = {
  canvas: '#F7F8FA',
  surface: '#FFFFFF',
  elevated: '#FFFFFF'
} as const

export const border = {
  default: '#EBEDF0',
  divider: '#F2F4F6'
} as const

/** 语义化分类色（10 个一级 · 与 seed 数据保持一致） */
export const category = {
  food: '#FF8C42',
  transport: '#4A90E2',
  shopping: '#E056A0',
  living: '#7B61FF',
  fun: '#FFD93D',
  medical: '#6BCB77',
  education: '#5B8DEF',
  comm: '#6E7B8B',
  finance: '#B85042',
  other: '#B8BCC8'
} as const

export const status = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6'
} as const

export const shadow = {
  xs: '0 1px 3px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.06)',
  md: '0 4px 20px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 40px rgba(0, 0, 0, 0.08)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.12)',
  brandSm: '0 4px 14px rgba(0, 109, 91, 0.18)',
  brandMd: '0 8px 28px rgba(0, 109, 91, 0.28)'
} as const

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999
} as const

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48
} as const

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48
} as const

export const fontFamily = {
  sans: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif`,
  mono: `'DIN Alternate', 'Roboto Mono', 'SF Mono', 'Consolas', monospace`,
  display: `'DIN Alternate', 'Oswald', 'Roboto Mono', sans-serif`
} as const

export const ease = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)'
} as const

export const duration = {
  fast: 120,
  normal: 200,
  slow: 360
} as const

/**
 * antd ConfigProvider 直接使用的 theme.token 形态
 */
export const theme = {
  colorPrimary: brand.primary,
  colorInfo: status.info,
  colorSuccess: status.success,
  colorWarning: status.warning,
  colorError: status.danger,
  colorTextBase: text.primary,
  colorBgLayout: bg.canvas,
  colorBgContainer: bg.surface,
  colorBorder: border.default,
  colorBorderSecondary: border.divider,
  colorTextSecondary: text.secondary,
  colorTextTertiary: text.tertiary,
  colorTextPlaceholder: text.tertiary,
  borderRadius: radius.md,
  borderRadiusLG: radius.lg,
  borderRadiusSM: radius.sm,
  borderRadiusXS: radius.xs,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  fontSizeSM: fontSize.sm,
  fontSizeLG: fontSize.lg,
  fontSizeXL: fontSize.xl,
  fontSizeHeading1: fontSize['3xl'],
  fontSizeHeading2: fontSize['2xl'],
  fontSizeHeading3: fontSize.xl,
  motionDurationFast: `${duration.fast}ms`,
  motionDurationMid: `${duration.normal}ms`,
  motionDurationSlow: `${duration.slow}ms`,
  motionEaseOut: ease.outExpo,
  motionEaseInOut: ease.smooth,
  motionEaseBack: ease.bounce
} as const

/** 导出聚合对象 */
export const tokens = {
  brand,
  text,
  bg,
  border,
  category,
  status,
  shadow,
  radius,
  space,
  fontSize,
  fontFamily,
  ease,
  duration,
  theme
} as const

export type Tokens = typeof tokens
