<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatAmount } from '@zhibook/shared'
import { useAppStore } from '../../store/app'

const store = useAppStore()
const records = ref(store.records)

onMounted(async () => {
  await store.loadCategories()
  await store.loadRecords()
  records.value = store.records
})

async function onRefresh() {
  await store.loadRecords()
  records.value = store.records
}

async function onDelete(id: number) {
  await store.deleteRecord(id)
  records.value = store.records
  uni.showToast({ title: '已删除', icon: 'success' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <view class="history">
    <view v-if="records.value.length === 0" class="empty">
      <text>暂无记录</text>
    </view>
    <view v-for="item in records.value" :key="item.id" class="card">
      <view class="row">
        <view class="icon" :style="{ background: item.categoryColor ?? '#95A5A6' }">
          <text>{{ item.categoryIcon ?? '📦' }}</text>
        </view>
        <view class="meta">
          <text class="cat">{{ item.categoryName ?? '未知' }}</text>
          <text v-if="item.note" class="note">{{ item.note }}</text>
          <text class="time">{{ formatDate(item.occurredAt) }}</text>
        </view>
        <view class="amount-col">
          <text class="amount">-{{ formatAmount(item.amount) }}</text>
          <text class="del" @click="onDelete(item.id)">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.history {
  padding: 24rpx;
}

.empty {
  text-align: center;
  padding: 200rpx 0;
  color: #95A5A6;
  font-size: 28rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 40rpx;
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.cat {
  font-size: 30rpx;
  color: #86868B;
}

.note {
  font-size: 30rpx;
  color: #1D1D1F;
}

.time {
  font-size: 22rpx;
  color: #95A5A6;
}

.amount-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #EF4444;
}

.del {
  font-size: 22rpx;
  color: #EF4444;
  text-decoration: underline;
}
</style>