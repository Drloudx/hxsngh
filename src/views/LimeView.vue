<template>
  <div class="talent-container" :style="colorPaletteVars">
    <div class="talent-search-wrapper">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索莱姆名称或描述..."
          class="talent-search-input"
        />
      </div>

      <!-- 统一的筛选卡片 -->
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

    <!-- 莱姆列表 -->
    <div class="lime-grid-container">
      <div
        v-for="lime in filteredLimes"
        :key="lime.IDs"
        class="lime-grid-card"
      >
        <div
          class="lime-avatar-slot"
          :style="{ backgroundImage: `url(${getFramePath(lime.Step)})` }"
          @click="openDetailModal(lime)"
        >
          <img :src="`/lime/${lime.IDs}.png`" :alt="lime.Name" class="lime-avatar-img" />
        </div>

        <div class="lime-card-name-label" :class="lime.Step.toLowerCase()">
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

    <!-- 详情弹窗 -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-window lime-detail-window">
        <div class="game-modal-header">
          <div class="header-badges-container">
            <span v-for="(tag, i) in getHeaderBadges(detailModal.data)" :key="i" class="area-type-badge">
              {{ tag }}
            </span>
          </div>
          <h2 class="centered-modal-title">{{ detailModal.data.Name }}</h2>
          <button class="game-modal-close" @click="closeDetailModal">✕</button>
        </div>

        <div class="game-modal-body">
          <div class="detail-card-preview" :style="{ backgroundImage: `url(${getFramePath(detailModal.data.Step)})` }">
            <img :src="`/lime/${detailModal.data.IDs}.png`" class="detail-lime-avatar" />
          </div>

          <div class="detail-description-box">
            <p class="description-text">{{ detailModal.data.Description }}</p>
          </div>

          <div class="detail-reward-box">
            <span class="reward-title">发现时：</span>
            <span class="reward-content">
              {{ parseRewardName(detailModal.data.RewardIDs) }} +{{ detailModal.data.RewardNum }}
            </span>
          </div>

          <!-- 来源展示（纯文字形式，已处理“世界”和“多区域逗号分隔”） -->
          <div class="detail-source-box">
            <span class="source-title">来源：</span>
            <span class="source-content">{{ getLimeSourceMaps(detailModal.data) }}</span>
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
  '--blue': '#7FAECB',
  '--green': '#79C37A'
}

// 初始化时尝试从本地存储读取，如果读取不到再用空数组
const myOwnedList = ref(JSON.parse(localStorage.getItem('my_owned_limes')) || [])

// 监听从 App 的导入数据事件，刷新拥有列表
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
      return weightA - weightB
    }
    return a.IDs.localeCompare(b.IDs)
  })
})

// 解析新表的 Type 标签（去掉“星界”）
const mapTypesList = computed(() => {
  const maps = worldMapData.DataTable || worldMapData || []
  const types = maps
    .map(m => m.Type)
    .filter(t => t && t !== '星界')
  return Array.from(new Set(types))
})

// 根据单个 Type 获取所有属于该类型的地图名称
const getMapsByType = (type) => {
  if (!type) return []
  const maps = worldMapData.DataTable || worldMapData || []
  return maps.filter(m => m.Type === type).map(m => m.Name)
}

// 解析弹窗里莱姆对应的地图来源纯文字
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

const getFramePath = (step) => {
  const stepMap = {
    'C': 'mid_int_laimu_0001.png',
    'B': 'mid_int_laimu_0002.png',
    'A': 'mid_int_laimu_0003.png',
    'S': 'mid_int_laimu_0004.png',
    'SS': 'mid_int_laimu_0005.png'
  }
  return `/limeui/${stepMap[step] || 'mid_int_laimu_0001.png'}`
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

const parseRewardName = (rewardIdStr) => {
  if (!rewardIdStr) return '无'
  return rewardIdStr.includes(',') ? rewardIdStr.split(',')[1] : rewardIdStr
}

const toggleBgTag = (name) => {
  activeBgTag.value = activeBgTag.value === name ? null : name
}
const toggleTagsExpand = () => {
  tagsExpanded.value = !tagsExpanded.value
}

// 多维复合过滤逻辑
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
}

/* ===== 搜索栏组件 ===== */
.talent-search-wrapper {
  background: var(--bg);
  padding: 10px 0;
  margin-bottom: 0;
  box-sizing: border-box;
  position: sticky;
  top: calc(var(--header-padding-top) + 64px);
  z-index: 999;
  width: 100%;
}

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
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
}

/* ===== 筛选面板卡片统一配置 ===== */
.name-tags-section {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
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

/* ===== 莱姆卡片区域 ===== */
.lime-grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px 12px;
  width: 100%;
  padding-top: 14px;
}

.lime-grid-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lime-avatar-slot {
  width: 100%;
  aspect-ratio: 0.802 / 1;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 10% 10% 18% 10%;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.lime-avatar-slot:hover {
  transform: scale(1.03);
}

.lime-avatar-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
}

.lime-card-name-label {
  font-size: 13px;
  margin-top: 6px;
  text-align: center;
  font-weight: 700;
}
.lime-card-name-label.ss { color: var(--red); }
.lime-card-name-label.s  { color: var(--gold); }
.lime-card-name-label.a  { color: var(--purple); }
.lime-card-name-label.b  { color: var(--blue); }
.lime-card-name-label.c  { color: var(--green); }

/* ===== 核心修复：复选勾选标签深色模式适配 ===== */
.owned-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  margin-top: 5px;
  padding: 2px 7px;
  border-radius: 5px;
  font-weight: 600;
  /* 基础绿色主题：浅色下是明亮绿，深色模式下利用内联半透明防止晃眼 */
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.25);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.owned-status-tag .checkbox-box {
  width: 10px;
  height: 10px;
  border: 1px solid #16a34a;
  border-radius: 2px;
  margin-right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.owned-status-tag .checkbox-box::after {
  content: "✓";
  font-size: 9px;
  font-weight: bold;
  color: #16a34a;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 未拥有状态下的深色模式适配 */
.owned-status-tag.not-owned {
  background: rgba(220, 38, 38, 0.12);
  color: #ef4444;
  border-color: rgba(220, 38, 38, 0.25);
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

/* ===== 详细内容弹窗布局与名字居中 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.lime-detail-window {
  background: #ece4d3;
  width: 90%;
  max-width: 380px;
  border: 4px solid #7d6756;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-modal-header {
  background: #bfb299;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  border-bottom: 2px solid #7d6756;
  position: relative;
  min-height: 24px;
}

.header-badges-container {
  display: flex;
  gap: 4px;
  z-index: 2;
}

.area-type-badge {
  background: #3f95e6;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  white-space: nowrap;
}

.centered-modal-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 16px;
  color: #31261d;
  font-weight: bold;
  white-space: nowrap;
  text-align: center;
  z-index: 1;
}

.game-modal-close {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 18px;
  color: #5d4f43;
  cursor: pointer;
  z-index: 2;
}

.game-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-card-preview {
  width: 135px;
  height: 168px;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 10px 18px 10px;
  box-sizing: border-box;
}

.detail-lime-avatar {
  width: 95%;
  height: 95%;
  object-fit: contain;
}

.detail-description-box {
  width: 100%;
  background: #f5f0e6;
  border: 1px solid #d2c7b5;
  border-radius: 6px;
  padding: 10px 12px;
  margin-top: 14px;
  box-sizing: border-box;
}

.description-text {
  margin: 0;
  font-size: 13px;
  color: #554433;
  line-height: 1.5;
}

.detail-reward-box {
  width: 100%;
  background: #f5f0e6;
  border: 1px solid #d2c7b5;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.reward-title {
  font-size: 13px;
  color: #705b49;
  font-weight: bold;
}
.reward-content {
  font-size: 13px;
  color: #1a8844;
  font-weight: bold;
}

/* 弹窗最后一行纯文本来源样式 */
.detail-source-box {
  width: 100%;
  margin-top: 10px;
  padding: 2px 4px;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
}
.source-title {
  font-weight: bold;
  color: #705b49;
}
.source-content {
  color: #554433;
}

.no-data {
  grid-column: span 4;
  text-align: center;
  padding: 40px 0;
  color: var(--text-sub);
}
</style>