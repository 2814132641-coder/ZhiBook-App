/**
 * Web Audio 合成"叮"音反馈（桌面端降级 mobile vibration）
 * 0 依赖、单例 AudioContext、~150ms 时长
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

/**
 * 播放一声清脆的"叮"音（A5, 880Hz, 150ms, 指数衰减）
 * 用户首次与页面交互后调用才有效（Chromium autoplay policy）
 */
export function playSuccessBeep(): void {
  try {
    const ac = getCtx()
    if (ac.state === 'suspended') void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ac.currentTime)
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18)
    osc.connect(gain).connect(ac.destination)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.18)
  } catch {
    // ignore（不支持 Web Audio 时静默失败）
  }
}