<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatAmount, currentMonth } from '@zhibook/shared'
import { api } from '@zhibook/shared'
import type { MonthlySummary } from '@zhibook/shared'

const month = ref(currentMonth())
const summary = ref<MonthlySummary | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    summary.value = await api.stats.monthlySummary(month.value)
  } catch (e) {
    console.error('[report] failed', e)
  } finally {
    loading.value = false
  }
}

function changeMonth(e: any) {
  const v = e.detail.value // YYYY-MM
  if (v) {
    month.value = v
    load()
  }
}

onMounted(load)
</script>

<template>
  <view class="report">
    <view class="picker">
      <picker mode="date" fields="month" :value="month" @change="changeMonth">
        <view class="picker-btn">
          <text>{{ month }}</text>
          <text class="arrow">▾</text>
        </view>
      </picker>
    </view>

    <view v-if="summary" class="stats">
      <view class="stat">
        <text class="label">本月支出</text>
        <text class="value primary">{{ formatAmount(summary.total) }}</text>
      </view>
      <view class="stat">
        <text class="label">笔数</text>
        <text class="value">{{ summary.count }}</text>
      </view>
      <view class="stat">
        <text class="label">日均</text>
        <text class="value">{{ formatAmount(summary.avgPerDay) }}</text>
      </view>
    </view>

    <view v-if="summary && summary.byCategory.length > 0" class="ranking">
      <text class="title">分类排行</text>
      <view v-for="c in summary.byCategory" :key="c.categoryId" class="rank-row">
        <view class="dot" :style="{ background: c.categoryColor }" />
        <text class="rank-name">{{ c.categoryIcon }} {{ c.categoryName }}</text>
        <text class="rank-amount">{{ formatAmount(c.amount) }}</text>
      </view>
    </view>
    <view v-else class="empty">
      <text>本月暂无数据</text>
    </view>
  </view>
</template>

<style scoped>
.report {
  padding: 24rpx;
}

.picker {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
}

.picker-btn {
  background: #FFFFFF;
  padding: 16rpx 32rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  color: #1D1D1F;
}

.arrow {
  color: #86868B;
}

.stats {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.label {
  font-size: 24rpx;
  color: #86868B;
}

.value {
  font-size: 36rpx;
  font-weight: 600;
  color: #1D1D1F;
}

.value.primary {
  color: #006D5B;
}

.ranking {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
}

.title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1D1D1F;
  margin-bottom: 16rpx;
  display: block;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.rank-name {
  flex: 1;
  font-size: 28rpx;
  color: #1D1D1F;
}

.rank-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #1D1D1F;
}

.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #95A5A6;
  font-size: 28rpx;
}
</style>