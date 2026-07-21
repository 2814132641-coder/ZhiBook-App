/**
 * 保存成功后的全屏反馈蒙层
 * - 黑色半透明背景
 * - 中心 SVG 对勾（CSS 画线动画）
 * - 「已记录 ¥xx.xx」文字渐入
 * - 1.4s 后自动淡出
 */

import { useEffect } from 'react'

interface Props {
  amount: number
  onDone: () => void
}

export default function SuccessOverlay({ amount, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 109, 91, 0.92)', // 品牌绿半透明
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'overlayIn 0.25s ease-out',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'var(--color-bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
          animation: 'popIn 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)',
          color: 'var(--color-brand)' // SVG 用 currentColor 跟随品牌色
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            style={{
              strokeDasharray: 226,
              strokeDashoffset: 226,
              animation: 'circleDraw 0.4s ease-out forwards',
              transformOrigin: 'center',
              transform: 'rotate(-90deg)'
            }}
          />
          <path
            d="M22 41 L36 55 L60 27"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              strokeDasharray: 70,
              strokeDashoffset: 70,
              animation: 'checkDraw 0.36s 0.18s ease-out forwards'
            }}
          />
        </svg>
      </div>
      <div
        style={{
          marginTop: 24,
          color: 'var(--color-bg-surface)',
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: 1,
          animation: 'fadeUp 0.4s 0.24s ease-out both',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        已记录 ¥{amount.toFixed(2)}
      </div>
    </div>
  )
}