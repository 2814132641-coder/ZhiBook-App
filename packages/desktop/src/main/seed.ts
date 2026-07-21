import type { Database } from 'sql.js'

interface SeedCategory {
  name: string
  icon: string
  color: string
  children: { name: string; icon: string }[]
}

/**
 * 全场景花销分类（2026-07-18 扩展版）
 * - 10 个一级
 * - 76 个二级（覆盖早午晚/外卖/聚餐；公共交通网约车私家车；母婴宠物奢侈品；兴趣班学历教育；人情罚款退税等）
 */
const SEED: SeedCategory[] = [
  {
    name: '餐饮',
    icon: '🍜',
    color: '#FF8C42',
    children: [
      { name: '早餐', icon: '🥞' },
      { name: '午餐', icon: '🍱' },
      { name: '晚餐', icon: '🍝' },
      { name: '外卖', icon: '🥡' },
      { name: '买菜', icon: '🥬' },
      { name: '零食饮料', icon: '🍫' },
      { name: '咖啡奶茶', icon: '☕' },
      { name: '水果', icon: '🍎' },
      { name: '烘焙甜品', icon: '🍰' },
      { name: '聚餐请客', icon: '🍻' }
    ]
  },
  {
    name: '交通',
    icon: '🚗',
    color: '#4A90E2',
    children: [
      { name: '公交地铁', icon: '🚌' },
      { name: '打车租车', icon: '🚕' },
      { name: '网约车', icon: '🚖' },
      { name: '私家车油费', icon: '⛽' },
      { name: '火车飞机', icon: '✈️' },
      { name: '停车过路', icon: '🅿️' },
      { name: '共享单车', icon: '🚲' }
    ]
  },
  {
    name: '购物',
    icon: '🛍️',
    color: '#E056A0',
    children: [
      { name: '日用百货', icon: '🧴' },
      { name: '服装鞋帽', icon: '👕' },
      { name: '数码电器', icon: '📱' },
      { name: '美妆个护', icon: '💄' },
      { name: '礼物', icon: '🎁' },
      { name: '母婴用品', icon: '🍼' },
      { name: '宠物用品', icon: '🐾' },
      { name: '烟酒', icon: '🚬' },
      { name: '运动户外', icon: '⚽' },
      { name: '图书', icon: '📚' },
      { name: '家具家电', icon: '🛋️' },
      { name: '奢侈品', icon: '💎' }
    ]
  },
  {
    name: '居住',
    icon: '🏠',
    color: '#7B61FF',
    children: [
      { name: '房租房贷', icon: '🏘️' },
      { name: '水电燃气', icon: '💡' },
      { name: '物业费', icon: '🧾' },
      { name: '家居用品', icon: '🛋️' },
      { name: '维修', icon: '🪛' },
      { name: '宽带网费', icon: '📡' },
      { name: '家政服务', icon: '🧹' }
    ]
  },
  {
    name: '娱乐',
    icon: '🎬',
    color: '#FFD93D',
    children: [
      { name: '影音会员', icon: '🎵' },
      { name: '游戏充值', icon: '🎮' },
      { name: '运动健身', icon: '🏋️' },
      { name: '旅行出游', icon: '✈️' },
      { name: '演出展览', icon: '🎭' },
      { name: '按摩美容', icon: '💆' },
      { name: '玩具桌游', icon: '🧩' },
      { name: '宠物(猫狗)', icon: '🐶' },
      { name: 'KTV酒吧', icon: '🎤' }
    ]
  },
  {
    name: '医疗',
    icon: '💊',
    color: '#6BCB77',
    children: [
      { name: '药品', icon: '💊' },
      { name: '门诊', icon: '🩺' },
      { name: '住院', icon: '🏥' },
      { name: '保健品', icon: '🧘' },
      { name: '医保保险', icon: '🛡️' },
      { name: '体检', icon: '🧬' }
    ]
  },
  {
    name: '教育',
    icon: '📚',
    color: '#5B8DEF',
    children: [
      { name: '书籍', icon: '📖' },
      { name: '培训课程', icon: '🎓' },
      { name: '文具', icon: '✏️' },
      { name: '子女教育', icon: '👶' },
      { name: '考试', icon: '📝' },
      { name: '学历教育', icon: '🏫' },
      { name: '兴趣班', icon: '🎨' }
    ]
  },
  {
    name: '通讯',
    icon: '📱',
    color: '#6E7B8B',
    children: [
      { name: '话费', icon: '☎️' },
      { name: '宽带', icon: '📡' },
      { name: '流量包', icon: '📶' },
      { name: '软件订阅', icon: '💻' },
      { name: '硬件维修', icon: '🔧' }
    ]
  },
  {
    name: '金融',
    icon: '💰',
    color: '#B85042',
    children: [
      { name: '银行手续费', icon: '🏦' },
      { name: '利息支出', icon: '📈' },
      { name: '转账红包', icon: '🧧' },
      { name: '投资亏损', icon: '📉' },
      { name: '保险续费', icon: '🛡️' }
    ]
  },
  {
    name: '其他',
    icon: '📦',
    color: '#B8BCC8',
    children: [
      { name: '人情往来', icon: '🤝' },
      { name: '捐赠', icon: '❤️' },
      { name: '罚款', icon: '⚠️' },
      { name: '其他杂项', icon: '📦' },
      { name: '出差报账', icon: '✈️' },
      { name: '退款', icon: '↩️' },
      { name: '税费', icon: '💸' },
      { name: '家庭服务', icon: '👨‍👩‍👧' }
    ]
  }
]

export function seedCategories(db: Database): void {
  let sort = 0
  for (const cat of SEED) {
    const stmt = db.prepare('INSERT INTO categories (parent_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
    stmt.run([null, cat.name, cat.icon, cat.color, sort++])
    stmt.free()
    const idRes = db.exec('SELECT last_insert_rowid() AS id')
    const parentId = idRes[0].values[0][0] as number

    let childSort = 0
    for (const child of cat.children) {
      const cstmt = db.prepare('INSERT INTO categories (parent_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
      cstmt.run([parentId, child.name, child.icon, cat.color, childSort++])
      cstmt.free()
    }
  }
}