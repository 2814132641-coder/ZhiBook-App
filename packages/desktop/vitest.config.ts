import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        // Electron 入口
        'src/main/index.ts',
        // preload bridge
        'src/preload/**',
        // React 渲染层（不测 UI）
        'src/renderer/src/main.tsx',
        'src/renderer/src/App.tsx',
        'src/renderer/src/pages/**',
        'src/renderer/src/components/**',
        'src/renderer/src/store/**',
      ],
    },
  },
})
