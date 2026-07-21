<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatAmount, NOTE_FOCUS_NAMES, getNoteHint, pickSmartDefaultChild } from '@zhibook/shared'
import { useAppStore } from '../../store/app'

const store = useAppStore()

const amount = ref<number | null>(null)
const selectedRootId = ref<number | null>(null)
const selectedChildId = ref<number | null>(null)
const note = ref('')
const showNote = ref(false)
const noteHint = ref('添加备注（可选）')
const showSuccess = ref(false)
const saving = ref(false)

onMounted(() => {
  store.loadCategories()
  setTimeout(() => {
    if (selectedRootId.value !== null) return
    const food = store.roots.value.find((r) => r.name === '餐饮') ?? store.roots.value[0]
    if (!food) return
    const children = store.getChildrenOf(food.id)
    const hour = new Date().getHours()
    const smartName = pickSmartDefaultChild(
      food.name,
      children.map((c) => c.name),
      hour
    )
    const smart = children.find((c) => c.name === smartName) ?? children[0]
    selectedRootId.value = food.id
    selectedChildId.value = smart?.id ?? null
  }, 100)
})

const currentChildName = computed(() => store.getById(selectedChildId.value ?? -1)?.name ?? '')

const canSave = computed(() =>
  amount.value !== null && amount.value > 0 && selectedChildId.value !== null && !saving.value
)

function pickRoot(id: number) {
  selectedRootId.value = id
  const children = store.getChildrenOf(id)
  selectedChildId.value = children[0]?.id ?? null
}

function pickChild(id: number) {
  selectedChildId.value = id
  const child = store.getById(id)
  if (child && NOTE_FOCUS_NAMES.has(child.name)) {
    showNote.value = true
    noteHint.value = getNoteHint(child.name)
  }
}

async function handleSave() {
  if (!canSave.value || selectedChildId.value === null || amount.value === null) return
  saving.value = true
  try {
    const created = await store.createRecord({
      amount: amount.value,
      categoryId: selectedChildId.value,
      note: note.value.trim() || null,
      occurredAt: new Date().toISOString().slice(0, 19)
    })
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
      amount.value = null
      note.value = ''
      showNote.value = false
    }, 1400)
    uni.showToast({ title: `已记录 ${formatAmount(created.amount)}`, icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="home">
    <view class="amount-box">
      <text class="currency">¥</text>
      <input
        class="amount-input"
        type="digit"
        :value="amount ?? ''"
        @input="(e) => (amount = Number((e.detail.value || '').replace(/[^\d.]/g, '')) || null)"
        placeholder="0.00"
        placeholder-class="placeholder"
      />
    </view>

    <scroll-view scroll-x class="root-tabs">
      <view
        v-for="cat in store.roots.value"
        :key="cat.id"
        class="root-tab"
        :class="{ active: cat.id === selectedRootId }"
        @click="pickRoot(cat.id)"
      >
        <text class="root-emoji">{{ cat.icon }}</text>
        <text class="root-name">{{ cat.name }}</text>
      </view>
    </scroll-view>

    <view v-if="selectedRootId !== null" class="grid">
      <view
        v-for="cat in store.getChildrenOf(selectedRootId)"
        :key="cat.id"
        class="grid-cell"
        :class="{ active: cat.id === selectedChildId }"
        :style="{
          background: cat.id === selectedChildId ? cat.color : '#F7F8F5',
          borderColor: cat.id === selectedChildId ? cat.color : 'transparent'
        }"
        @click="pickChild(cat.id)"
      >
        <text class="grid-emoji" :class="{ inverted: cat.id === selectedChildId }">
          {{ cat.icon }}
        </text>
        <text class="grid-name" :class="{ inverted: cat.id === selectedChildId }">
          {{ cat.name }}
        </text>
      </view>
    </view>

    <view v-if="!showNote" class="note-toggle" @click="showNote = true">
      <text>{{ noteHint }}</text>
    </view>
    <view v-else class="note-area">
      <textarea
        v-model="note"
        :placeholder="noteHint"
        maxlength="50"
        class="note-input"
      />
    </view>

    <button
      class="save-btn"
      :class="{ disabled: !canSave }"
      :disabled="!canSave"
      @click="handleSave"
    >
      保存这笔花销
    </button>

    <view v-if="showSuccess" class="success-mask">
      <view class="success-circle">✓</view>
      <text class="success-text">已记录 {{ formatAmount(amount ?? 0) }}</text>
    </view>
  </view>
</template>

<style scoped>
.home {
  padding: 24rpx 32rpx 200rpx;
  background: #F7F8FA;
  min-height: 100vh;
}

.amount-box {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8rpx;
  padding: 32rpx 16rpx 40rpx;
  border-bottom: 1rpx solid #EEE;
  background: #FFFFFF;
}

.currency {
  font-size: 44rpx;
  color: #006D5B;
  font-weight: 700;
}

.amount-input {
  flex: 1;
  font-size: 96rpx;
  font-weight: 700;
  color: #006D5B;
  text-align: right;
  background: transparent;
  border: none;
}

.placeholder {
  color: #E0E0E0;
  font-weight: 700;
}

.root-tabs {
  white-space: nowrap;
  padding: 24rpx 0 8rpx;
  display: flex;
}

.root-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 28rpx 20rpx;
  min-width: 128rpx;
  border-bottom: 6rpx solid transparent;
  color: #86868B;
}

.root-tab.active {
  color: #006D5B;
  font-weight: 600;
  border-bottom-color: #006D5B;
}

.root-emoji {
  font-size: 48rpx;
  line-height: 1;
  margin-bottom: 8rpx;
}

.root-name {
  font-size: 28rpx;
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16rpx;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-top: 16rpx;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 8rpx;
  min-height: 140rpx;
  border: 6rpx solid transparent;
  border-radius: 20rpx;
  background: #F7F8F5;
  color: #2C3E50;
  font-size: 24rpx;
}

.grid-cell.active {
  font-weight: 600;
  transform: translateY(-2rpx);
}

.grid-emoji {
  font-size: 52rpx;
  line-height: 1;
}

.grid-emoji.inverted {
  filter: brightness(0) invert(1);
}

.grid-name {
  text-align: center;
  line-height: 1.15;
}

.grid-name.inverted {
  color: #FFFFFF;
}

.note-toggle {
  margin-top: 24rpx;
  padding: 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  text-align: center;
  color: #86868B;
  font-size: 28rpx;
}

.note-area {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
}

.note-input {
  width: 100%;
  height: 100rpx;
  font-size: 28rpx;
}

.save-btn {
  position: fixed;
  right: 48rpx;
  bottom: 48rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: #006D5B;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 40rpx rgba(0, 109, 91, 0.35);
  border: none;
}

.save-btn.disabled {
  background: #BDC3C7;
  box-shadow: none;
}

.success-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 109, 91, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.success-circle {
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: #FFFFFF;
  color: #006D5B;
  font-size: 160rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 32rpx 80rpx rgba(0, 0, 0, 0.18);
}

.success-text {
  margin-top: 48rpx;
  color: #FFFFFF;
  font-size: 56rpx;
  font-weight: 600;
}
</style>