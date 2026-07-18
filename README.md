# 轻账 (light-ledger)

> 一款运行在 Windows 上的本地化、轻量、个人记账工具

![status](https://img.shields.io/badge/status-MVP%20ready-success)
![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TS%20%2B%20sql.js-blue)

## 特性

- 🎯 **二级分类**：10 大类 + 35 小类（开箱即用，可在「设置」中增删改）
- 💰 **记一笔**：金额、分类、备注、时间，3 次点击完成
- 📋 **历史**：按月筛选 / 关键字搜索 / 编辑 / 删除
- 📊 **月度报表**：合计 + 笔数 + 日均 + 分类饼图 + Top 5 柱状图
- ⚙️ **设置**：分类管理 / CSV 导出 / 数据清空
- 🔒 **100% 本地**：数据存于 `%APPDATA%/light-ledger/light-ledger.db`，不联网、不上传、不注册

## 技术栈

- **Electron 32** + **React 18** + **TypeScript 5** + **Vite 5**（electron-vite）
- **Ant Design 5** UI 组件 + **ECharts 5** 图表
- **sql.js**（WASM SQLite） + 自定义持久化
- **electron-builder** 25 NSIS 打包

> 注意：原计划用 `better-sqlite3`，因系统缺 Python + VS Build Tools，**改为 sql.js**（纯 WASM，零原生编译）。

## 开发

```bash
npm install
npm run dev          # 开发模式（Electron + 热更新）
```

## 打包

```bash
# 设镜像（网络受限时）
export ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://registry.npmmirror.com/-/binary/electron-builder-binaries/

npm run dist         # 生成 .exe 安装包到 release/
npm run dist:dir     # 仅打目录（调试用）
```

> ⚠️ 已成功打包：`release/0.1.0/win-unpacked/轻账.exe`（178 MB）。试启动 OK。详见 [docs/PACKAGING.md](./docs/PACKAGING.md)。

## 目录结构

```
d:/记账App/
├── claude.md                   # 项目长期记忆（产品+协作约定）
├── README.md                   # 本文件
├── docs/
│   ├── superpowers/specs/      # 设计文档
│   └── PACKAGING.md            # 打包指南
├── src/
│   ├── main/                   # Electron 主进程
│   │   ├── index.ts            # 应用生命周期
│   │   ├── db.ts               # sql.js 连接 + 持久化
│   │   ├── seed.ts             # 默认分类种子
│   │   └── ipc/                # IPC handlers
│   │       ├── records.ts
│   │       ├── categories.ts
│   │       ├── stats.ts
│   │       └── settings.ts
│   ├── preload/index.ts        # contextBridge 暴露 window.api
│   ├── shared/types.ts         # 主/渲两端共用类型
│   └── renderer/               # 渲染进程（React）
│       ├── index.html
│       └── src/
│           ├── main.tsx        # 入口 + Ant Design ConfigProvider
│           ├── App.tsx         # HashRouter + 4 个 Tab
│           ├── components/     # 共享组件（AppLayout、EditRecordModal）
│           ├── pages/          # Home / History / Report / Settings
│           ├── store/          # Zustand（categories）
│           ├── utils/          # 格式化工具
│           └── styles/         # 全局样式
├── electron.vite.config.ts
├── electron-builder.yml
├── tsconfig.json / .node.json / .web.json
└── package.json
```

## 数据位置

Windows：

```
%APPDATA%/light-ledger/light-ledger.db
```

（即 `C:/Users/<你>/AppData/Roaming/light-ledger/light-ledger.db`）

## 许可

仅供个人使用。MIT。