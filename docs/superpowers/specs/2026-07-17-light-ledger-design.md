# 轻账 — 产品设计文档（2026-07-17）

> 本文档由 brainstorming + 设计过程沉淀。
> 配套实施计划：`C:\Users\28141\.claude\plans\app-claude-md-dazzling-hanrahan.md`

## 一、产品定位

**产品名**：轻账  
**目标平台**：Windows 10/11  
**打包形态**：单 `.exe`，双击即可运行  
**数据存储**：**纯本地**，单用户，SQLite 文件存于用户数据目录  
**MVP 功能**：记账 · 历史查询 · 月度统计/报表  
**视觉风格**：现代简约专业（薄荷记账风）

### 核心价值

- **轻**：单 exe 安装、启动快、界面克制无广告
- **账**：完整记录每一笔花销，支持二级分类
- **本地**：数据 100% 存在本机，不联网、不上传、不注册

### 反原则（明确不做）

- ❌ 账户体系 / 登录注册
- ❌ 云同步、社交、分享
- ❌ 内购、广告、推荐理财
- ❌ 强制升级 / 数据上采集

## 二、目标用户与场景

- **主用户**：25–45 岁、有稳定收入、想控制花销但不想折腾复杂理财 App 的个人用户
- **典型场景**：
  - 午餐花了 28 元 → 打开轻账 → 选「餐饮-日常三餐」→ 存
  - 月底想看这个月钱花在哪 → 打开「月度报表」→ 看到饼图
  - 手滑记错了 → 进入「历史」→ 长按该条 → 编辑/删除

## 三、核心功能（MVP 范围）

### 3.1 记一笔
- 字段：金额（必填，人民币，最多两位小数）· 分类（必填，二级）· 备注（可选，最多 50 字）· 时间（默认当前，可改）
- 交互：主页一个大输入框 + 数字键盘 + 分类选择器 + 保存

### 3.2 历史列表
- 按时间倒序展示所有记录
- 支持按月份筛选、按分类筛选、关键字搜索（备注/分类）
- 单条：编辑、删除（删除需二次确认）

### 3.3 月度报表
- 顶部：本月支出合计、笔数、日均
- 中部：分类饼图（ECharts）
- 底部：分类排行柱状图（Top 5）
- 月份选择器可切换

### 3.4 设置
- 分类管理（一级不可删，二级可增删改）
- 数据导出（CSV，BOM 头，Excel 友好）
- 数据清空（二次确认）
- 关于页

## 四、花销分类体系

### 4.1 一级大类（10 个）

| # | 一级 | 图标 | 颜色 |
|---|---|---|---|
| 1 | 餐饮 | 🍜 | #E67E22 |
| 2 | 交通 | 🚗 | #3498DB |
| 3 | 购物 | 🛍️ | #9B59B6 |
| 4 | 居住 | 🏠 | #16A085 |
| 5 | 娱乐 | 🎬 | #E74C3C |
| 6 | 医疗 | 💊 | #1ABC9C |
| 7 | 教育 | 📚 | #F39C12 |
| 8 | 通讯 | 📱 | #34495E |
| 9 | 金融 | 💰 | #C0392B |
| 10 | 其他 | 📦 | #95A5A6 |

### 4.2 二级小类（35 个）

| 一级 | 二级 |
|---|---|
| 餐饮 | 日常三餐 · 外卖 · 咖啡奶茶 · 聚餐聚会 · 零食水果 |
| 交通 | 公共交通 · 打车/网约车 · 加油/充电 · 停车/过路 · 维修保养 |
| 购物 | 日用百货 · 服装鞋帽 · 数码电器 · 美妆个护 · 礼物 |
| 居住 | 房租/房贷 · 水电燃气 · 物业费 · 家居用品 · 维修 |
| 娱乐 | 影音会员 · 游戏充值 · 运动健身 · 旅行出游 · 演出展览 |
| 医疗 | 药品 · 门诊 · 体检 · 保健 · 保险 |
| 教育 | 书籍 · 课程培训 · 文具 · 子女教育 · 考试 |
| 通讯 | 话费 · 宽带 · 流量包 · 软件订阅 |
| 金融 | 银行手续费 · 利息支出 · 转账红包 · 投资亏损 |
| 其他 | 人情往来 · 捐赠 · 罚款 · 其他杂项 |

## 五、UI/UX 规范

### 5.1 视觉
- 主色：墨绿 `#2E7D5B`（强调、金额）
- 辅色：浅米色背景 `#FAFAF7` + 深灰文字 `#2C3E50`
- 警示：支出红 `#E74C3C`，收入（后续）绿 `#27AE60`
- 圆角 8 px，阴影克制（0 1px 3px rgba(0,0,0,0.06)）
- 字体：系统默认（Segoe UI / 苹方），金额用稍粗字重

### 5.2 布局
- 顶部 Tab：🏠 主页 · 📋 历史 · 📊 报表 · ⚙️ 设置
- 主页中心：金额输入框（大字号）+ 分类网格 + 备注 + 保存
- 全局：金额一律右对齐，显示 `¥` 前缀

### 5.3 交互
- 启动到主页 < 2 s
- 记一笔操作 ≤ 3 次点击完成
- 删除/清空类危险操作必须二次确认

## 六、技术栈与架构（实施期调整后）

| 层 | 技术 | 备注 |
|---|---|---|
| 桌面壳 | Electron 32 | 跨平台桌面运行时 |
| 渲染层 | React 18 + TypeScript 5 | UI 框架 |
| 构建 | Vite 5 (electron-vite) | — |
| UI 组件 | Ant Design 5 | — |
| 图表 | ECharts 5 (echarts-for-react) | 饼图 + 柱状图 |
| 数据库 | SQLite | 本地文件 |
| DB 驱动 | **sql.js** ⚠️ | 替代 better-sqlite3，因环境缺 Python + VS Build Tools |
| 路由 | React Router 6 (HashRouter) | Tab 切换 |
| 状态 | Zustand 5 | 分类 store |
| 打包 | electron-builder 25 | NSIS 安装器 |

### 进程架构

```
┌─────────────────────────────────────────────┐
│            Electron Main (Node)             │
│  - sql.js (WASM)  → SQLite 文件（手动持久化）│
│  - IPC handlers  → 暴露 CRUD/统计给渲染进程 │
│  - 应用生命周期、菜单、托盘、打包           │
└──────────────┬──────────────────────────────┘
               │ contextBridge + ipcRenderer
┌──────────────▼──────────────────────────────┐
│          Electron Renderer (React)          │
│  - React 18 + TS + Ant Design               │
│  - Zustand store                            │
│  - 4 个 Tab：主页/历史/报表/设置            │
└─────────────────────────────────────────────┘
```

**安全模型**：contextIsolation: true，nodeIntegration: false。渲染端只能通过 `window.api.*` 调用主进程能力。

### sql.js 持久化策略

- 启动：`fs.readFile` 加载 db 文件 → `new SQL.Database(uint8Array)`
- 写操作：执行 SQL 后立即 `db.export()` → `fs.writeFile` 写回
- 关闭：app `before-quit` 时再次持久化

## 七、数据模型

```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES categories(id),
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  note        TEXT,
  occurred_at TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_records_occurred_at ON records(occurred_at);
CREATE INDEX idx_records_category    ON records(category_id);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

种子：首次启动写入 10 一级 + 35 二级分类。

## 八、风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| GitHub 网络不稳 | 模板 / 二进制下载失败 | 用 ELECTRON_MIRROR 指向 npmmirror，或手动放 zip |
| 缺 Python + VS Build Tools | native module 编译失败 | 选 sql.js（WASM），零原生依赖 |
| Electron 体积 150-250MB | 用户犹豫 | 文案说明"轻"指体验，不指体积 |
| 中文输入兼容性 | Windows IME | 用 Ant Design Input，默认良好 |

## 九、范围之外（YAGNI · 暂不做）

- 多账户 / 多人 / 登录
- 云同步 / 备份
- 预算提醒
- 收入 / 转账
- 投资、负债、信用卡账单
- 移动端、Mac、Linux
- 主题切换（先做亮色，迭代 v2 再做暗色）