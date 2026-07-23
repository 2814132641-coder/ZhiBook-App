/**
 * 智能默认：根据当前时间在「餐饮」一级下选二级
 * - 早餐 05-10 / 午餐 11-14 / 晚餐 17-22 / 其他时间 → 兜底到下一个饭点
 */
export function pickSmartDefaultChild(
  rootName: string,
  childNames: string[],
  hour: number
): string {
  if (rootName === '餐饮') {
    if (hour >= 5 && hour < 10 && childNames.includes('早餐')) return '早餐'
    if (hour >= 11 && hour < 14 && childNames.includes('午餐')) return '午餐'
    if (hour >= 17 && hour < 22 && childNames.includes('晚餐')) return '晚餐'
    // 兜底：选第一个存在的早午晚
    for (const cand of ['早餐', '午餐', '晚餐']) {
      if (childNames.includes(cand)) return cand
    }
  }
  return childNames[0] ?? ''
}

/** 哪些二级被选时，自动展开并聚焦备注输入框 */
export const NOTE_FOCUS_NAMES = new Set([
  '聚餐请客',
  '人情往来',
  '礼物',
  '转账红包',
  '出差报账'
])

/** 按二级名生成"建议备注"文案 */
export function getNoteHint(childName: string): string {
  if (!NOTE_FOCUS_NAMES.has(childName)) return '添加备注（可选）'
  switch (childName) {
    case '聚餐请客':
      return '建议备注：参与者 / 餐厅'
    case '人情往来':
    case '转账红包':
      return '建议备注：对象 / 事项'
    case '礼物':
      return '建议备注：送给谁 / 礼物'
    case '出差报账':
      return '建议备注：项目 / 客户'
    default:
      return '添加备注（可选）'
  }
}