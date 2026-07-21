import { contextBridge } from 'electron'

// 桌面端不再通过 IPC 调用本地 DB
// 所有数据请求走 HTTP 到独立后端服务（packages/server）
// 渲染进程直接 import { api } from '@zhibook/shared/api' 即可
// 此 preload 仅保留 contextBridge 安全通道（暂无额外能力需要暴露）

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('__zhibook__', {
    platform: 'desktop',
    version: '0.1.0'
  })
}
