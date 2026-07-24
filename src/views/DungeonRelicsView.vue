<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 顶部栏: 搜索框 -->
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索遗物名称、描述..."
          class="talent-search-input"
        />
      </div>

      <!-- 排序控制栏 -->
      <div class="sorting-section">
        <span class="sorting-label">排序方式：</span>
        <div class="sorting-group">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            :class="['sort-btn', { active: sortBy === opt.value }]"
            @click="sortBy = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 遗物 4 列网格列表 -->
    <div class="relics-grid-container">
      <div
        v-for="relic in filteredRelics"
        :key="relic.IDs"
        class="relics-grid-card"
        @click="openDetailModal(relic)"
      >
        <div 
          class="relic-icon-slot" 
          :style="{ backgroundColor: getStepConfig(relic.Step).lightBg }"
        >
          <img :src="`/DungeonRelics/${relic.IDs}.png`" :alt="relic.Name" class="relic-icon-img" />
        </div>

        <div class="relic-card-name" :style="{ color: getStepConfig(relic.Step).color }">
          {{ relic.Name }}
        </div>

        <div class="relic-card-stats">
          <div class="stat-line">价值: {{ relic.Value }}</div>
          <div class="stat-line">重复: {{ relic.ExtraValue }}</div>
        </div>
      </div>

      <div v-if="filteredRelics.length === 0" class="no-data">
        未找到匹配的遗物数据
      </div>
    </div>

    <!-- 详细说明弹窗 (现代卡片风格) -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetailModal">
      <div class="relic-detail-window">
        <div class="relic-modal-header">
          <h2 class="centered-modal-title" :style="{ color: getStepConfig(detailModal.data.Step).color }">
            {{ detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetailModal">✕</button>
        </div>

        <div class="relic-modal-body">
          <div class="relic-detail-preview" :style="{ backgroundColor: getStepConfig(detailModal.data.Step).lightBg }">
            <img :src="`/DungeonRelics/${detailModal.data.IDs}.png`" class="relic-detail-img" />
          </div>

          <div class="relic-details-grid">
            <div class="relic-detail-stat">
              <span class="stat-label">自身价值：</span>
              <span class="stat-value" :style="{ color: getStepConfig(detailModal.data.Step).color }">{{ detailModal.data.Value }}</span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">重复提升：</span>
              <span class="stat-value">+{{ detailModal.data.ExtraValue }}</span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">最低关卡：</span>
              <span class="stat-value">{{ detailModal.data.MinLevel }}关</span>
            </div>
          </div>

          <div class="relic-description-box">
            <p class="relic-description-text">{{ detailModal.data.Description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import relicData from '@/assets/DungeonRelicDataTable.json'

const sortOptions = [
  { label: '按稀有度', value: 'Step' },
  { label: '按自身价值', value: 'Value' },
  { label: '按重复价值', value: 'ExtraValue' }
]

const sortBy = ref('Step')
const searchQuery = ref('')
const detailModal = ref({ visible: false, data: {} })

// 预设品质色彩搭配
const getStepConfig = (step) => {
  const map = {
    'SS': { label: 'SS', color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.1)' },  // red
    'S': { label: 'S', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.1)' },   // gold
    'A': { label: 'A', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.1)' },  // purple
    'B': { label: 'B', color: '#60a5fa', lightBg: 'rgba(96, 165, 250, 0.1)' }   // blue
  }
  return map[step] || { label: step, color: '#64748b', lightBg: 'rgba(100, 116, 139, 0.1)' }
}

const rawRelics = computed(() => {
  return relicData.DataTable || relicData || []
})

// 核心多重排序逻辑
const sortedRelics = computed(() => {
  const list = [...rawRelics.value]
  const priority = { 'SS': 4, 'S': 3, 'A': 2, 'B': 1 }

  list.sort((a, b) => {
    if (sortBy.value === 'Step') {
      const pA = priority[a.Step] || 0
      const pB = priority[b.Step] || 0
      if (pA !== pB) return pB - pA // 品质降序
      return a.IDs.localeCompare(b.IDs) // ID fallback
    } else if (sortBy.value === 'Value') {
      if (b.Value !== a.Value) return b.Value - a.Value
      const pA = priority[a.Step] || 0
      const pB = priority[b.Step] || 0
      if (pA !== pB) return pB - pA
      return a.IDs.localeCompare(b.IDs)
    } else if (sortBy.value === 'ExtraValue') {
      if (b.ExtraValue !== a.ExtraValue) return b.ExtraValue - a.ExtraValue
      const pA = priority[a.Step] || 0
      const pB = priority[b.Step] || 0
      if (pA !== pB) return pB - pA
      return a.IDs.localeCompare(b.IDs)
    }
    return 0
  })

  return list
})

// 搜索过滤逻辑
const filteredRelics = computed(() => {
  return sortedRelics.value.filter(item => {
    const q = searchQuery.value.trim().toLowerCase()
    return !q ||
           item.Name.toLowerCase().includes(q) ||
           (item.Description && item.Description.toLowerCase().includes(q))
  })
})

const openDetailModal = (relic) => {
  detailModal.value = { visible: true, data: relic }
}

const closeDetailModal = () => {
  detailModal.value = { visible: false, data: {} }
}
</script>

<style scoped>
/* ===== 容器基准 ===== */
.talent-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.talent-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 10px;
}

/* ===== 搜索框 ===== */
.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex-shrink: 0;
}
.talent-search-box:focus-within {
  border-color: #409eff;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.7;
}

.talent-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-main);
  font-family: inherit;
}

/* ===== 排序控制栏 ===== */
.sorting-section {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sorting-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.sorting-group {
  display: flex;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.sort-btn {
  min-width: 80px;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.sort-btn:hover {
  color: var(--text-main);
}
.sort-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

/* ===== 网格列表 ===== */
.relics-grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  gap: 14px 10px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
}

.relics-grid-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
  min-width: 0;
}
.relics-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

/* 图标槽位 */
.relic-icon-slot {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 10%;
  transition: transform 0.15s ease;
}
.relic-icon-slot:hover {
  transform: scale(1.05);
}

.relic-icon-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 遗物名字 */
.relic-card-name {
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* 价值状态 */
.relic-card-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
  width: 100%;
  text-align: left;
  padding-left: 1px;
  box-sizing: border-box;
}

.stat-line {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 500;
}

/* ===== 详细内容网格弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.relic-detail-window {
  background: var(--card-bg);
  width: 90%;
  max-width: 360px;
  border-radius: 20px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.relic-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  min-height: 24px;
}

.centered-modal-title {
  margin: 0 auto;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}

.relic-modal-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
}
.relic-modal-close:hover {
  color: #ef4444;
}

.relic-modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.relic-detail-preview {
  width: 110px;
  height: 110px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

.relic-detail-img {
  width: 95%;
  height: 95%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.relic-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}

.relic-detail-stat {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 600;
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.relic-description-box {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-sizing: border-box;
}

.relic-description-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
  text-align: left;
}

.no-data {
  grid-column: span 4;
  text-align: center;
  padding: 40px;
  color: var(--text-sub);
  font-size: 14px;
}
</style>
