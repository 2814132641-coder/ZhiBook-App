import type { Database } from 'sql.js'

interface SeedCategory {
  name: string
  icon: string
  color: string
  children: { name: string; icon: string }[]
}

// 10 个一级 + 35 个二级
const SEED: SeedCategory[] = [
  { name: '餐饮', icon: '🍜', color: '#E67E22', children: [
    { name: '日常三餐', icon: '🍚' },
    { name: '外卖', icon: '🥡' },
    { name: '咖啡奶茶', icon: '☕' },
    { name: '聚餐聚会', icon: '🍻' },
    { name: '零食水果', icon: '🍎' }
  ]},
  { name: '交通', icon: '🚗', color: '#3498DB', children: [
    { name: '公共交通', icon: '🚌' },
    { name: '打车/网约车', icon: '🚕' },
    { name: '加油/充电', icon: '⛽' },
    { name: '停车/过路', icon: '🅿️' },
    { name: '维修保养', icon: '🔧' }
  ]},
  { name: '购物', icon: '🛍️', color: '#9B59B6', children: [
    { name: '日用百货', icon: '🧴' },
    { name: '服装鞋帽', icon: '👕' },
    { name: '数码电器', icon: '📱' },
    { name: '美妆个护', icon: '💄' },
    { name: '礼物', icon: '🎁' }
  ]},
  { name: '居住', icon: '🏠', color: '#16A085', children: [
    { name: '房租/房贷', icon: '🏘️' },
    { name: '水电燃气', icon: '💡' },
    { name: '物业费', icon: '🧾' },
    { name: '家居用品', icon: '🛋️' },
    { name: '维修', icon: '🪛' }
  ]},
  { name: '娱乐', icon: '🎬', color: '#E74C3C', children: [
    { name: '影音会员', icon: '🎵' },
    { name: '游戏充值', icon: '🎮' },
    { name: '运动健身', icon: '🏋️' },
    { name: '旅行出游', icon: '✈️' },
    { name: '演出展览', icon: '🎭' }
  ]},
  { name: '医疗', icon: '💊', color: '#1ABC9C', children: [
    { name: '药品', icon: '💊' },
    { name: '门诊', icon: '🩺' },
    { name: '体检', icon: '🧬' },
    { name: '保健', icon: '🧘' },
    { name: '保险', icon: '🛡️' }
  ]},
  { name: '教育', icon: '📚', color: '#F39C12', children: [
    { name: '书籍', icon: '📖' },
    { name: '课程培训', icon: '🎓' },
    { name: '文具', icon: '✏️' },
    { name: '子女教育', icon: '👶' },
    { name: '考试', icon: '📝' }
  ]},
  { name: '通讯', icon: '📱', color: '#34495E', children: [
    { name: '话费', icon: '☎️' },
    { name: '宽带', icon: '📡' },
    { name: '流量包', icon: '📶' },
    { name: '软件订阅', icon: '💻' }
  ]},
  { name: '金融', icon: '💰', color: '#C0392B', children: [
    { name: '银行手续费', icon: '🏦' },
    { name: '利息支出', icon: '📈' },
    { name: '转账红包', icon: '🧧' },
    { name: '投资亏损', icon: '📉' }
  ]},
  { name: '其他', icon: '📦', color: '#95A5A6', children: [
    { name: '人情往来', icon: '🤝' },
    { name: '捐赠', icon: '❤️' },
    { name: '罚款', icon: '⚠️' },
    { name: '其他杂项', icon: '📦' }
  ]}
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