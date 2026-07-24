<template>
  <div class="talent-container" :style="colorPaletteVars">
    <div class="talent-sticky-top">
      <!-- 顶部栏: 搜索框 -->
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索莱姆名称或描述..."
          class="talent-search-input"
        />
      </div>

      <!-- 搜索区域: 出现区域筛选 -->
      <div class="name-tags-section">
        <!-- 第一行：状态筛选按钮 + 数量统计 + 展开收起箭头 -->
        <div class="status-filter-row">
          <div class="status-filter-group">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              :class="['status-btn', { active: activeStatus === opt.value }]"
              @click="activeStatus = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- 右侧：数量统计与箭头组合 -->
          <div class="status-right-box">
            <span class="owned-count-display">已拥有：{{ ownedCount }}/{{ totalCount }}</span>
            <div class="collapse-trigger-btn" @click="toggleTagsExpand">
              <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
            </div>
          </div>
        </div>

        <!-- 第二行：出现区域类型筛选标签 -->
        <div v-if="tagsExpanded" class="tags-expanded-content">
          <div class="name-tags-title">出现区域筛选</div>
          <div class="name-tags-grid">
            <span
              v-for="typeObj in mapTypesList"
              :key="typeObj"
              :class="['name-tag', { active: activeBgTag === typeObj }]"
              @click="toggleBgTag(typeObj)"
            >
              {{ typeObj }}
            </span>
          </div>

          <!-- 选择标签后显示包含地图 -->
          <div v-if="activeBgTag && getMapsByType(activeBgTag).length" class="selected-tag-maps-box">
            <span class="tag-maps-label">{{ activeBgTag }}：</span>
            <span class="tag-maps-content">{{ getMapsByType(activeBgTag).join('，') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 莱姆 4 列网格列表 -->
    <div class="lime-grid-container">
      <div
        v-for="lime in filteredLimes"
        :key="lime.IDs"
        class="lime-grid-card"
      >
        <div
          class="lime-avatar-slot"
          :style="{ backgroundColor: getStepConfig(lime.Step).lightBg }"
          @click="openDetailModal(lime)"
        >
          <img :src="`/lime/${lime.IDs}.png`" :alt="lime.Name" class="lime-avatar-img" />
        </div>

        <div class="lime-card-name-label" :style="{ color: getStepConfig(lime.Step).color }">
          {{ lime.Name }}
        </div>

        <div
          class="owned-status-tag"
          :class="{ 'not-owned': !isOwned(lime.IDs) }"
          @click="toggleOwnedStatus(lime.IDs)"
        >
          <span class="checkbox-box"></span>
          <span class="checkbox-text">{{ isOwned(lime.IDs) ? '已拥有' : '未拥有' }}</span>
        </div>
      </div>

      <div v-if="filteredLimes.length === 0" class="no-data">
        未找到匹配的莱姆数据
      </div>
    </div>

    <!-- 详情弹窗 (与遗物详情一致的现代卡片风格) -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetailModal">
      <div class="relic-detail-window">
        <div class="relic-modal-header">
          <div class="header-badges-container">
            <span v-for="(tag, i) in getHeaderBadges(detailModal.data)" :key="i" class="area-type-badge">
              {{ tag }}
            </span>
          </div>
          <h2 class="centered-modal-title" :style="{ color: getStepConfig(detailModal.data.Step).color }">
            {{ detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetailModal">✕</button>
        </div>

        <div class="relic-modal-body">
          <div class="relic-detail-preview" :style="{ backgroundColor: getStepConfig(detailModal.data.Step).lightBg }">
            <img :src="`/lime/${detailModal.data.IDs}.png`" class="relic-detail-img" />
          </div>

          <div class="relic-details-grid grid-2-col">
            <div class="relic-detail-stat">
              <span class="stat-label">发现时奖励：</span>
              <span class="stat-value" style="color: #16a34a;">
                {{ parseRewardName(detailModal.data.RewardIDs) }} +{{ detailModal.data.RewardNum }}
              </span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">出现地图：</span>
              <span class="stat-value" style="word-break: break-all; white-space: normal;" :title="getLimeSourceMaps(detailModal.data)">
                {{ getLimeSourceMaps(detailModal.data) }}
              </span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import limeData from '@/assets/LimeDataTable.json'
import worldMapData from '@/assets/WorldMapDataTable.json'

const colorPaletteVars = {
  '--gold': '#f97316',
  '--red': '#f43f5e',
  '--purple': '#a855f7',
  '--blue': '#60a5fa',
  '--green': '#16a34a'
}

// 预设品质色彩搭配
const getStepConfig = (step) => {
  const map = {
    'SS': { label: 'SS', color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.1)' },
    'S': { label: 'S', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.1)' },
    'A': { label: 'A', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.1)' },
    'B': { label: 'B', color: '#60a5fa', lightBg: 'rgba(96, 165, 250, 0.1)' },
    'C': { label: 'C', color: '#16a34a', lightBg: 'rgba(22, 163, 74, 0.1)' }
  }
  return map[step] || { label: step, color: '#64748b', lightBg: 'rgba(100, 116, 139, 0.1)' }
}

// 初始化时尝试从本地存储读取
const myOwnedList = ref(JSON.parse(localStorage.getItem('my_owned_limes')) || [])

const onLimeDataImported = () => {
  myOwnedList.value = JSON.parse(localStorage.getItem('my_owned_limes')) || []
}

onMounted(() => {
  window.addEventListener('lime-data-imported', onLimeDataImported)
})

onUnmounted(() => {
  window.removeEventListener('lime-data-imported', onLimeDataImported)
})

const isOwned = (id) => {
  return myOwnedList.value.includes(id)
}

const toggleOwnedStatus = (id) => {
  const index = myOwnedList.value.indexOf(id)
  if (index > -1) {
    myOwnedList.value.splice(index, 1)
  } else {
    myOwnedList.value.push(id)
  }
  localStorage.setItem('my_owned_limes', JSON.stringify(myOwnedList.value))
}

const activeStatus = ref('all')
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已拥有', value: 'owned' },
  { label: '未拥有', value: 'unowned' }
]

const STEP_PRIORITY = { 'C': 1, 'B': 2, 'A': 3, 'S': 4, 'SS': 5 }

const rawLimesList = computed(() => {
  return limeData.DataTable || limeData || []
})

const totalCount = computed(() => rawLimesList.value.length)
const ownedCount = computed(() => {
  return rawLimesList.value.filter(item => isOwned(item.IDs)).length
})

const sortedLimes = computed(() => {
  return [...rawLimesList.value].sort((a, b) => {
    const weightA = STEP_PRIORITY[a.Step] || 99
    const weightB = STEP_PRIORITY[b.Step] || 99
    if (weightA !== weightB) {
      return weightA - weightB // 稀有度升序：C > B > A > S > SS
    }
    return a.IDs.localeCompare(b.IDs)
  })
})

const mapTypesList = computed(() => {
  const maps = worldMapData.DataTable || worldMapData || []
  const types = maps
    .map(m => m.Type)
    .filter(t => t && t !== '星界')
  return Array.from(new Set(types))
})

const getMapsByType = (type) => {
  if (!type) return []
  const maps = worldMapData.DataTable || worldMapData || []
  return maps.filter(m => m.Type === type).map(m => m.Name)
}

const getLimeSourceMaps = (limeItem) => {
  if (!limeItem || !limeItem.AreaType) return '未知'
  if (limeItem.AreaType === '世界') {
    return '全部地图'
  }
  const types = limeItem.AreaType.split(/[\s,，]+/).filter(Boolean)
  let allMatchedMaps = []
  types.forEach(t => {
    allMatchedMaps.push(...getMapsByType(t))
  })
  allMatchedMaps = Array.from(new Set(allMatchedMaps))
  return allMatchedMaps.length ? allMatchedMaps.join('，') : limeItem.AreaType
}

const searchQuery = ref('')
const activeBgTag = ref(null)
const tagsExpanded = ref(true)
const detailModal = ref({ visible: false, data: {} })

const parseRewardName = (rewardIdStr) => {
  if (!rewardIdStr) return '无'
  return rewardIdStr.includes(',') ? rewardIdStr.split(',')[1] : rewardIdStr
}

const getHeaderBadges = (item) => {
  if (!item) return []
  const badges = []
  if (item.AreaType && item.AreaType !== '无' && item.AreaType !== '不限') {
    const bgs = item.AreaType.split(/[\s,，]+/).filter(Boolean)
    badges.push(...bgs)
  }
  if (item.Block && item.Block !== '不限' && item.Block !== '能量') {
    badges.push(item.Block)
  }
  if (badges.length === 0 && item.AreaType) {
    badges.push(item.AreaType)
  }
  return badges
}

const toggleBgTag = (name) => {
  activeBgTag.value = activeBgTag.value === name ? null : name
}
const toggleTagsExpand = () => {
  tagsExpanded.value = !tagsExpanded.value
}

const filteredLimes = computed(() => {
  return sortedLimes.value.filter(item => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q ||
                          item.Name.toLowerCase().includes(q) ||
                          (item.Description && item.Description.toLowerCase().includes(q))

    let matchesBg = true
    if (activeBgTag.value) {
      if (item.AreaType === '世界') {
        matchesBg = true
      } else if (item.AreaType) {
        const itemTypes = item.AreaType.split(/[\s,，]+/).filter(Boolean)
        matchesBg = itemTypes.includes(activeBgTag.value)
      } else {
        matchesBg = false
      }
    }

    let matchesStatus = true
    const owned = isOwned(item.IDs)
    if (activeStatus.value === 'owned') {
      matchesStatus = owned
    } else if (activeStatus.value === 'unowned') {
      matchesStatus = !owned
    }

    return matchesSearch && matchesBg && matchesStatus
  })
})

const openDetailModal = (lime) => {
  detailModal.value = { visible: true, data: lime }
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

/* ===== 筛选面板卡片统一配置 ===== */
.name-tags-section {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

/* 第一行：状态组与右侧区域布局 */
.status-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-filter-group {
  display: flex;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.status-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.status-btn:hover {
  color: var(--text-main);
}
.status-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

/* 第一行右边：数量展示 + 箭头盒 */
.status-right-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.owned-count-display {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.collapse-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.collapse-trigger-btn:hover {
  background: rgba(0,0,0,0.03);
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.collapse-icon.collapsed {
  transform: rotate(180deg);
}

/* 第二行区域筛选布局 */
.tags-expanded-content {
  margin-top: 14px;
  border-top: 1px dashed var(--border-color);
  padding-top: 12px;
}

.name-tags-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
  margin-bottom: 8px;
}

.name-tags-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.name-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name-tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

/* 选中标签后显示的包含地图外框样式 */
.selected-tag-maps-box {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}
.tag-maps-label {
  font-weight: bold;
  color: var(--primary);
}
.tag-maps-content {
  color: var(--text-main);
}

/* ===== 莱姆卡片区域 (4列网格) ===== */
.lime-grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  gap: 14px 10px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  padding-top: 4px;
  padding-bottom: 15px;
}

.lime-grid-card {
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
.lime-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.lime-avatar-slot {
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
.lime-avatar-slot:hover {
  transform: scale(1.05);
}

.lime-avatar-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.lime-card-name-label {
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* ===== 勾选标签样式 ===== */
.owned-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  margin-top: 6px;
  padding: 2px 5px;
  border-radius: 5px;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.08);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.15);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;
}

.owned-status-tag .checkbox-box {
  width: 9px;
  height: 9px;
  border: 1px solid #16a34a;
  border-radius: 2px;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
}

.owned-status-tag .checkbox-box::after {
  content: "✓";
  font-size: 8px;
  font-weight: bold;
  color: #16a34a;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.owned-status-tag.not-owned {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border-color: rgba(100, 116, 139, 0.15);
}

.owned-status-tag.not-owned .checkbox-box {
  border-color: #64748b;
}

.owned-status-tag.not-owned .checkbox-box {
  border-color: #ef4444;
}

.owned-status-tag.not-owned .checkbox-box::after {
  display: none;
}

.owned-status-tag:hover {
  filter: brightness(1.15);
  border-color: currentColor;
}

/* ===== 详细内容网格弹窗 (现代卡片风格) ===== */
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
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  pointer-events: none;
  z-index: 1;
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

.grid-2-col {
  grid-template-columns: repeat(2, 1fr) !important;
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
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 600;
  white-space: nowrap;
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  text-align: center;
  width: 100%;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
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

.header-badges-container {
  display: flex;
  gap: 4px;
  z-index: 2;
}

.area-type-badge {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 700;
  white-space: nowrap;
}

.no-data {
  grid-column: span 4;
  text-align: center;
  padding: 40px 0;
  color: var(--text-sub);
}

@media (min-width: 601px) {
  /* 弹窗整体拉大 */
  .relic-detail-window {
    max-width: 480px !important;
  }

  /* 标题与关闭按钮字号加大 */
  .centered-modal-title {
    font-size: 22px !important;
  }
  .relic-modal-close {
    font-size: 22px !important;
  }

  /* 顶部徽章字号加大 */
  .area-type-badge {
    font-size: 12px !important;
    padding: 2px 6px !important;
    border-radius: 6px !important;
  }

  /* 预览图片区域放大 */
  .relic-detail-preview {
    width: 140px !important;
    height: 140px !important;
    border-radius: 20px !important;
    padding: 12px !important;
  }

  /* 属性网格与数值字号放大 */
  .relic-detail-stat {
    padding: 10px 12px !important;
    border-radius: 12px !important;
    gap: 6px !important;
  }
  .stat-label {
    font-size: 13px !important;
  }
  .stat-value {
    font-size: 15px !important;
  }

  /* 描述行与文本内容放大 */
  .relic-description-box {
    padding: 14px 18px !important;
    border-radius: 14px !important;
  }
  .relic-description-text {
    font-size: 15px !important;
    line-height: 1.6 !important;
  }
}
</style>