# 打包指南

> 本项目代码 100% 完成、`npm run build` 全过。本指南说明如何在你的环境上把源码打成单 `.exe`。

## 1. 环境准备

- Node.js ≥ 20（推荐 22 LTS）
- npm ≥ 10
- 操作系统：Windows 10/11（64 位）
- 网络：能访问 **GitHub Releases** + **npmmirror / npmjs**

> 不需要 Python / Visual Studio Build Tools。已改用 `sql.js`（纯 WASM）。

## 2. 安装依赖

```bash
cd d:/记账App
npm install
```

如果 `electron` 二进制下载失败，按下面的"备用镜像"一节处理。

## 3. 本地运行（开发模式）

```bash
npm run dev
```

会启动 Electron 窗口，热更新改代码。

## 4. 打包成单 .exe

```bash
npm run dist
```

产物：`release/<version>/轻账 Setup <version>.exe`（约 150–250 MB，含 Electron 运行时）。

可选：仅打包到目录（不打 NSIS 安装器，便于调试）：

```bash
npm run dist:dir
# 产物：release/<version>/win-unpacked/轻账.exe（约 178 MB，可直接双击运行）
```

## 5. 备用镜像（Electron 二进制下载失败时）

`electron-builder` 与 `electron` npm 包在 postinstall 阶段会从 GitHub 下载 Electron 二进制。如该链路不通：

### 方法 A：设 ELECTRON_MIRROR + ELECTRON_BUILDER_BINARIES_MIRROR（最简）

**Bash (Git Bash)：**

```bash
export ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://registry.npmmirror.com/-/binary/electron-builder-binaries/
npm install
npm run dist
```

**PowerShell：**

```powershell
$env:ELECTRON_MIRROR = "https://registry.npmmirror.com/-/binary/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://registry.npmmirror.com/-/binary/electron-builder-binaries/"
npm install
npm run dist
```

### 方法 B：跳过 winCodeSign（Windows 普通权限解压时 macOS 符号链接失败）

Windows 普通用户权限下，`7za` 解压 winCodeSign-2.6.0.7z 中的 macOS 符号链接会失败（`客户端没有所需的特权`）。两种绕开方法：

**B1：在 `electron-builder.yml` 加配置（推荐）**

```yaml
win:
  signAndEditExecutable: false
```

这会跳过 .exe 资源编辑/签名，但**不会**影响最终 .exe 的运行（仅图标用默认 Electron 图标）。

**B2：启用 Windows 开发者模式**

设置 → 更新和安全 → 开发者选项 → 开发者模式。开启后 7za 可以创建符号链接。

> **推荐组合**：方法 A + B1。`electron-builder.yml` 中已默认加了 `signAndEditExecutable: false`。

### 方法 B：手动下载 electron-vX.Y.Z-win32-x64.zip

到 https://registry.npmmirror.com/-/binary/electron/<electron版本号>/ 下载 `electron-v32.3.3-win32-x64.zip`，放到：

```
C:/Users/<你>/AppData/Local/Temp/electron-download-XXXXX/electron-v32.3.3-win32-x64.zip
```

其中 `electron-download-XXXXX` 是任意临时子目录。然后：

```bash
# 设置缓存，让 @electron/get 优先用本地 zip
export ELECTRON_DOWNLOAD_CACHE=C:/Users/<你>/AppData/Local/Temp/electron-download-XXXXX
node node_modules/electron/install.js
```

解压成功后应看到 `node_modules/electron/dist/electron.exe`。

### 方法 C：把镜像设到 npm 全局

```bash
npm config set electron_mirror https://registry.npmmirror.com/-/binary/electron/
```

## 6. 常见问题

### Q: 首次启动报 "Cannot find module sql-wasm.wasm"
A: sql.js 需要把 wasm 文件和 JS 一起打包。打包时 `out/main/chunks/` 附近应能看到 `sql-wasm.wasm`。如果缺失，检查 `src/main/db.ts` 中 `locateFile` 的相对路径。

### Q: 打包后运行报 "ready-to-show" 不触发
A: Windows 下偶发，第一次启动可能需要手动最大化窗口。已在 `main/index.ts` 中加了 `backgroundColor` 缓解。

### Q: 应用启动到主页但一直白屏
A: 打开 DevTools（菜单 → View → Toggle Developer Tools，Ctrl+Shift+I），查看 Console 报错。常见是 CSP 拦截。

## 7. 验收清单

跑一遍确认 MVP：

- [ ] 双击 `轻账 Setup 0.1.0.exe` 完成安装，启动后看到主页
- [ ] 主页输入金额 → 选一级 + 二级分类 → 可选备注 → 时间 → 保存
- [ ] toast 提示「已记录 ¥xx.xx」
- [ ] 进入「历史」Tab，能看到刚保存的记录，能按月份切换、能搜索
- [ ] 进入「报表」Tab，能看到本月支出合计 + 笔数 + 日均 + 饼图 + Top 5 柱状图
- [ ] 进入「设置」Tab，能新增二级分类、修改图标与名称
- [ ] 设置 → 数据 → 导出 CSV，文件保存到下载目录
- [ ] 设置 → 数据 → 清空所有数据（二次确认）
- [ ] 关闭重开 app，所有数据完整保留
- [ ] 卸载 app 不残留用户数据（NSIS 默认卸载脚本会清 userData）

## 8. 数据位置

Windows 数据库文件：

```
%APPDATA%/light-ledger/light-ledger.db
```

（即 `C:/Users/<你>/AppData/Roaming/light-ledger/light-ledger.db`）