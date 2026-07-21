<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@zhibook/shared'

const exporting = ref(false)

async function exportCsv() {
  exporting.value = true
  try {
    const r = await api.settings.exportCSV()
    uni.showToast({ title: '已导出 CSV', icon: 'success' })
    console.log('CSV path:', r.path)
  } catch (e) {
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    exporting.value = false
  }
}

function clearAll() {
  uni.showModal({
    title: '清空所有数据？',
    content: '将永久删除所有流水。建议先导出 CSV 备份。',
    successText: '永久删除',
    cancelText: '取消',
    success: async () => {
      try {
        await api.settings.clearAll()
        uni.showToast({ title: '已清空', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '清空失败', icon: 'none' })
      }
    }
  })
}
</script>

<template>
  <view class="settings">
    <view class="card">
      <view class="row" @click="exportCsv">
        <text>导出全部记录为 CSV</text>
        <text class="arrow">›</text>
      </view>
      <view class="row danger" @click="clearAll">
        <text>清空所有数据</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="about">
      <text class="brand">轻账</text>
      <text class="desc">本地化、轻量、个人记账工具 · v0.1.0</text>
      <text class="tip">数据 100% 存在你的电脑本地 · 通过后端服务通信</text>
    </view>
  </view>
</template>

<style scoped>
.settings {
  padding: 24rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.row {
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #F2F4F6;
  font-size: 30rpx;
  color: #1D1D1F;
}

.row:last-child {
  border-bottom: none;
}

.row.danger {
  color: #EF4444;
}

.arrow {
  color: #C7C7CC;
  font-size: 32rpx;
}

.about {
  text-align: center;
  padding: 48rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.brand {
  font-size: 40rpx;
  font-weight: 700;
  color: #006D5B;
}

.desc {
  font-size: 26rpx;
  color: #86868B;
}

.tip {
  font-size: 22rpx;
  color: #C7C7CC;
}
</style>