<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 搜索栏与地图折叠面板按键 -->
      <div class="equip-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索地块名称或描述..."
            class="talent-search-input"
          />
        </div>
        
        <button class="filter-toggle-btn" @click="tagsExpanded = !tagsExpanded">
          <span class="filter-toggle-text">筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
        </button>
      </div>

      <!-- 展开后的地图标签筛选面板 (对齐 EquipView.vue) -->
      <div v-show="tagsExpanded" class="filter-panel">
        <div class="filter-row" style="align-items: flex-start;">
          <span class="filter-label">地图</span>
          <div class="filter-options grid-5-cols">
            <span
              :class="['tag', selectedMap === 'all' ? 'active' : '']"
              @click="selectedMap = 'all'"
            >
              全部地图
            </span>
            <span
              v-for="map in mapList"
              :key="map"
              :class="['tag', selectedMap === map ? 'active' : '']"
              @click="selectedMap = map"
            >
              {{ map }}
            </span>
          </div>
        </div>
      </div>

      <!-- 类型切换按键 (分段控制器风格，已移除“全部”按键，点击已激活Tab可取消) -->
      <div class="tabs-section flex-col-layout">
        <div class="tabs-group">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-btn', { active: activeTab === tab.id }]"
            @click="switchTab(tab.id)"
          >
            {{ tab.name }}
          </button>
        </div>
        <!-- 装备地块专属注释提示 banner -->
        <div v-if="activeTab === 'equip'" class="tab-tip-banner animate-fade-in">
          (宝箱和绿、蓝、紫、橙装备地块)
        </div>
      </div>
    </div>

    <!-- 列表展示区 (按地图大卡片展示全部地块，支持滚动加载地图) -->
    <div class="block-list-scroll" ref="listContainer" @scroll="handleScroll">
      <div v-for="mapName in activeMaps" :key="mapName" class="section-card">
        <!-- 地图大卡片标题 -->
        <div class="section-header">
          <span class="section-dot" style="background-color: var(--primary);"></span>
          <h3 class="section-title">{{ mapName }}</h3>
        </div>
        
        <!-- 情况 A：在单一类型切换模式下，不显示类别标题，直接渲染单网格 -->
        <template v-if="activeTab !== 'all'">
          <div class="spot-grid">
            <div
              v-for="spot in sortSpots(getMapSpots(mapName))"
              :key="spot.IDs + '_' + spot.AreaName"
              class="spot-item-card"
              :style="getCardStyle(spot)"
              @click="openDetail(spot)"
            >
              <div class="spot-icon-slot-wrapper">
                <div class="spot-icon-slot" :style="getIconContainerStyle(spot)">
                  <img
                    :src="`/AreaBlock/${spot.IDs}.png`"
                    :alt="spot.Name"
                    class="spot-icon-img game-sprite"
                  />
                </div>
              </div>
              <div class="spot-card-name" :style="{ color: getSpotColor(spot) }">
                {{ spot.Name }}
              </div>
              <!-- 概率显示通过 showProbability 控制开关，默认隐藏 -->
              <div v-if="showProbability" class="spot-card-probability" :style="{ color: getSpotColor(spot) }">
                {{ getSpotProbability(spot) }}
              </div>
            </div>
          </div>
        </template>
        
        <!-- 情况 B：在“全部”模式下，按照 基础、装备、奇遇、特殊 四大分类区分开展示 -->
        <template v-else>
          <div
            v-for="cat in categories"
            :key="cat.id"
            v-show="getMapSpotsByCategory(mapName, cat.id).length > 0"
            class="cat-sub-group"
          >
            <div class="cat-sub-title">
              <span class="cat-sub-dot" :style="{ backgroundColor: cat.color }"></span>
              {{ cat.name }}
            </div>
            <div class="spot-grid">
              <div
                v-for="spot in getSortedMapSpotsByCategory(mapName, cat.id)"
                :key="spot.IDs + '_' + spot.AreaName"
                class="spot-item-card"
                :style="getCardStyle(spot)"
                @click="openDetail(spot)"
              >
                <div class="spot-icon-slot-wrapper">
                  <div class="spot-icon-slot" :style="getIconContainerStyle(spot)">
                    <img
                      :src="`/AreaBlock/${spot.IDs}.png`"
                      :alt="spot.Name"
                      class="spot-icon-img game-sprite"
                    />
                  </div>
                </div>
                <div class="spot-card-name" :style="{ color: getSpotColor(spot) }">
                  {{ spot.Name }}
                </div>
                <!-- 概率显示通过 showProbability 控制开关，默认隐藏 -->
                <div v-if="showProbability" class="spot-card-probability" :style="{ color: getSpotColor(spot) }">
                  {{ getSpotProbability(spot) }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
      
      <div v-if="activeMaps.length === 0" class="no-results-hint">
        没有找到符合条件的地块数据
      </div>
    </div>

    <!-- 地块详细弹窗 (DungeonRelicsView 同步卡片风格) -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetail">
      <div class="relic-detail-window">
        <div class="relic-modal-header">
          <h2 class="centered-modal-title" :style="{ color: getTabColor(detailModal.data) }">
            {{ detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetail">✕</button>
        </div>

        <div class="relic-modal-body" ref="modalBodyRef">
          <!-- 上部预览区：完全居中大图，右侧绝对定位地块轮廓（仅当不是特殊地块时显示轮廓） -->
          <div 
            class="relic-detail-preview flex-row-layout" 
            :style="{ backgroundColor: getTabLightBg(detailModal.data) }"
          >
            <!-- 绝对居中的大图 -->
            <div class="preview-img-container">
              <img 
                :src="`/AreaBlock/${detailModal.data.IDs}.png`" 
                class="relic-detail-img large-detail-img game-sprite" 
              />
            </div>
            
            <!-- 绝对定位到右侧的地块轮廓 (特殊地块不显示) -->
            <div 
              v-if="!isSpecialBlock(detailModal.data) && detailModal.data.SpotShape" 
              class="preview-shape-container"
            >
              <div class="shape-label-tag">地块轮廓</div>
              <div class="mini-shape-grid">
                <div
                  v-for="(row, rIdx) in detailModal.data.SpotShape.split(',')"
                  :key="rIdx"
                  class="shape-row"
                >
                  <div
                    v-for="(cell, cIdx) in row"
                    :key="cIdx"
                    :class="['shape-cell', cell === '1' ? 'filled' : 'empty']"
                    :style="{ backgroundColor: cell === '1' ? getTabColor(detailModal.data) : 'transparent' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 地块描述 -->
          <div class="relic-description-box" v-if="detailModal.data.Description">
            <p class="relic-description-text">{{ detailModal.data.Description }}</p>
          </div>

          <!-- 详细属性网格 (三列对齐风格) -->
          <div class="relic-details-grid">
            <div class="relic-detail-stat">
              <span class="stat-label">地块大小</span>
              <span class="stat-value">{{ detailModal.data.SpotSize }} 格</span>
            </div>
            <div v-if="showProbability" class="relic-detail-stat">
              <span class="stat-label">地块概率</span>
              <span class="stat-value font-bold" :style="{ color: getTabColor(detailModal.data) }">
                {{ getSpotProbability(detailModal.data) }}
              </span>
            </div>
            <div class="relic-detail-stat" v-if="getSpotTab(detailModal.data) !== 'special' && getSuffix(detailModal.data.IDs) !== '000'">
              <span class="stat-label">体力消耗</span>
              <span class="stat-value">{{ getSpotStaminaVal(detailModal.data) }}</span>
            </div>
            <div 
              v-if="shouldShowExploreTime(detailModal.data)"
              class="relic-detail-stat clickable" 
              @click="toggleTimeDetails"
              title="点击查看各等级段探索时间"
            >
              <span class="stat-label text-wrap-label">
                <span>最高等级</span>
                <span>探索时间</span>
              </span>
              <span class="stat-value highlight-blue">
                {{ getMaxExploreTimeStr(detailModal.data) }}
              </span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">最低难度</span>
              <span class="stat-value">{{ detailModal.data.MinDiffi }}</span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">所属区域</span>
              <span class="stat-value">{{ detailModal.data.AreaType }}</span>
            </div>
            <div class="relic-detail-stat">
              <span class="stat-label">所属地图</span>
              <span class="stat-value">{{ detailModal.data.AreaName }}</span>
            </div>
            <div class="relic-detail-stat span-3" v-if="detailModal.data.IngredientLimit && detailModal.data.IngredientLimit !== '无'">
              <span class="stat-label">产出素材</span>
              <span class="stat-value">{{ detailModal.data.IngredientLimit }}</span>
            </div>
          </div>

          <!-- 折叠展现的所有等级段探索时间 -->
          <div v-if="showTimeDetails && shouldShowExploreTime(detailModal.data)" class="time-details-panel">
            <div class="time-panel-header">
              <div class="time-panel-title">各等级段探索时间 (体力消耗: {{ getSpotStaminaVal(detailModal.data) }})</div>
              <div class="time-panel-tip">（点击“最高等级探索时间”可收起）</div>
            </div>
            <div class="time-ranges-list">
              <div 
                v-for="range in levelRanges" 
                :key="range.label"
                :class="['time-range-item', { active: isCurrentRange(range, detailModal.data.AreaName) }]"
              >
                <span class="range-label">{{ range.label }}</span>
                <span class="range-value-blue">
                  {{ formatTime(getSpotStaminaVal(detailModal.data) * 0.5 * range.scale) }}
                </span>
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>


<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import areaSpotData from '../assets/AreaSpotDataTable.json'

// 提取完整数据
const allSpots = ref(areaSpotData.DataTable || [])

// 地图列表
const mapList = [
  '新生平原',
  '广袤草原',
  '铁血高地',
  '迷失森林',
  '幽暗密林',
  '清凉沙滩',
  '遗忘之海',
  '废弃矿洞',
  '洞穴深处',
  '荒凉戈壁',
  '无尽荒漠',
  '极寒冰原',
  '熔岩通道',
  '枯木丛林'
]

// 子类别定义 (在全部展示模式下，地图大卡片内划分的二级标签)
const categories = [
  { id: 'basic', name: '基础地块', color: '#3b82f6' },
  { id: 'equip', name: '装备地块 (宝箱和绿、蓝、紫、橙装备地块)', color: '#f43f5e' },
  { id: 'event', name: '奇遇地块', color: '#0ea5e9' },
  { id: 'special', name: '特殊地块', color: '#dc2626' }
]

// 选项状态
const searchQuery = ref('')
const selectedMap = ref('all') // 默认展示全部地图数据
const activeTab = ref('all') // 默认 tab 选择 'all' (代表全部分类合并展示)
const tagsExpanded = ref(false)
const listContainer = ref(null)
const displayMapLimit = ref(3) // 懒加载：初始仅渲染 3 张地图，随着滚动加载更多地图

// =================== 开发自用配置开关 ===================
// 控制是否在主页面地块卡片上显示“概率”。
const showProbability = ref(true)

// =================== 排序与显示顺序配置 (支持在此修改地块的前后排列顺序) ===================
const basicGreen = ['000', '001', '002', '101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303']
const basicBlue = ['111', '121', '211', '311']
const basicPurple = ['221', '321']
const basicOrange = ['331']
const equipSuffixes = ['003', '004', '005', '006', '007']
const eventSuffixes = ['008', '016', '014', '011', '013', '012', '009', '010']
const specialSuffixes = ['421']

// 详情弹窗状态
const detailModal = ref({ visible: false, data: {} })
const showTimeDetails = ref(false)
const modalBodyRef = ref(null)

// Tabs 定义 (已移除“全部”按键，只保留 4 个切换标签，选中可再次点击取消)
const tabs = [
  { id: 'basic', name: '基础地块' },
  { id: 'equip', name: '装备地块' },
  { id: 'event', name: '奇遇地块' },
  { id: 'special', name: '特殊地块' }
]

// 获取后缀
const getSuffix = (ids) => {
  if (!ids) return ''
  const parts = ids.split('_')
  return parts[parts.length - 1]
}

// 品质色彩动态获取
const getStepColorConfig = (step) => {
  const map = {
    'SS': {
      color: '#f43f5e',
      textColor: '#e11d48',
      borderColor: 'rgba(244, 63, 94, 0.15)',
      lightBg: 'rgba(244, 63, 94, 0.04)'
    },
    'S': {
      color: '#f97316',
      textColor: '#ea580c',
      borderColor: 'rgba(249, 115, 22, 0.15)',
      lightBg: 'rgba(249, 115, 22, 0.04)'
    },
    'A': {
      color: '#a855f7',
      textColor: '#7e22ce',
      borderColor: 'rgba(168, 85, 247, 0.15)',
      lightBg: 'rgba(168, 85, 247, 0.15)'
    },
    'B': {
      color: '#3b82f6',
      textColor: '#2563eb',
      borderColor: 'rgba(59, 130, 246, 0.15)',
      lightBg: 'rgba(59, 130, 246, 0.04)'
    },
    'C': {
      color: '#10b981',
      textColor: '#059669',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      lightBg: 'rgba(16, 185, 129, 0.04)'
    }
  }
  return map[step] || {
    color: '#10b981',
    textColor: '#059669',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    lightBg: 'rgba(16, 185, 129, 0.04)'
  }
}

// 标签与分组解析规则
const getSpotConfig = (spot) => {
  const suffix = getSuffix(spot.IDs)
  if (suffix === '015') return null // 废弃

  if (basicGreen.includes(suffix)) return { tab: 'basic', sub: 'green', label: '普通地块' }
  if (basicBlue.includes(suffix)) return { tab: 'basic', sub: 'blue', label: '蓝地块' }
  if (basicPurple.includes(suffix)) return { tab: 'basic', sub: 'purple', label: '紫地块' }
  if (basicOrange.includes(suffix)) return { tab: 'basic', sub: 'orange', label: '橙地块' }
  if (equipSuffixes.includes(suffix)) return { tab: 'equip', sub: 'equip', label: '宝箱与装备地块(必出宝箱，绿，蓝，紫，橙装备)' }
  if (eventSuffixes.includes(suffix)) return { tab: 'event', sub: 'event', label: '奇遇与事件' }
  if (specialSuffixes.includes(suffix)) return { tab: 'special', sub: 'special', label: '特殊地块' }

  return null
}

// 动态卡片颜色与背景
const getSpotColor = (spot) => {
  if (!spot) return '#10b981'
  return getStepColorConfig(spot.MinBattleStep).textColor
}

const getCardStyle = (spot) => {
  if (!spot) return {}
  const cfg = getStepColorConfig(spot.MinBattleStep)
  return {
    borderColor: cfg.borderColor,
    backgroundColor: cfg.lightBg
  }
}

// 是否为特殊地块 (421)
const isSpecialBlock = (spot) => {
  if (!spot) return false
  const suffix = getSuffix(spot.IDs)
  return suffix === '421'
}

// 获取详情弹窗颜色
const getTabColor = (spot) => {
  if (!spot) return 'var(--text-main)'
  return getStepColorConfig(spot.MinBattleStep).textColor
}

// 获取详情弹窗浅底色
const getTabLightBg = (spot) => {
  if (!spot) return 'rgba(100, 116, 139, 0.1)'
  return getStepColorConfig(spot.MinBattleStep).lightBg
}

// 根据地图和搜索词过滤的全部地块
const filteredSpots = computed(() => {
  return allSpots.value.filter((spot) => {
    // 排除 015 废弃地块
    if (getSuffix(spot.IDs) === '015') return false

    // 地图筛选 (仅当不是 'all' 时才过滤)
    if (selectedMap.value !== 'all' && spot.AreaName !== selectedMap.value) return false

    // 关键字搜索
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const nameMatch = spot.Name && spot.Name.toLowerCase().includes(query)
      const descMatch = spot.Description && spot.Description.toLowerCase().includes(query)
      const suffixMatch = getSuffix(spot.IDs).includes(query)
      if (!nameMatch && !descMatch && !suffixMatch) return false
    }

    return true
  })
})

// 计算指定地图的总权重 (排除 Weight 0 与 015 废弃地块)
const getMapTotalWeight = (mapName) => {
  const spotsInMap = allSpots.value.filter(s => s && s.AreaName === mapName && getSuffix(s.IDs) !== '015')
  return spotsInMap.reduce((sum, s) => sum + (s.Weight || 0), 0)
}

// 概率计算 (自适应精度格式化：>= 0.01% 保留 2 位，>= 0.001% 保留 3 位，更小保留 4 位，避免极小概率被四舍五入为 0.00%)
const getSpotProbability = (spot) => {
  if (!spot) return '0.00%'
  if (getSuffix(spot.IDs) === '000') return '100.00%' // 营地初始点必出
  if (spot.Weight === 0) return '0.00%'

  const totalW = getMapTotalWeight(spot.AreaName)
  if (totalW === 0) return '0.00%'
  const pct = (spot.Weight / totalW) * 100
  if (pct >= 0.01) {
    return pct.toFixed(2) + '%'
  }
  if (pct >= 0.001) {
    return pct.toFixed(3) + '%'
  }
  return pct.toFixed(4) + '%'
}

// 各地图对应的最高等级
const mapMaxLevels = {
  '新生平原': 100,
  '广袤草原': 110,
  '铁血高地': 130,
  '迷失森林': 120,
  '幽暗密林': 160,
  '清凉沙滩': 140,
  '遗忘之海': 200,
  '废弃矿洞': 140,
  '洞穴深处': 180,
  '荒凉戈壁': 170,
  '无尽荒漠': 210,
  '枯木丛林': 220,
  '极寒冰原': 110,
  '熔岩通道': 140
}

// 时间系数分段
const levelRanges = [
  { label: '1 ~ 10 级', scale: 5, range: [1, 10] },
  { label: '11 ~ 20 级', scale: 10, range: [11, 20] },
  { label: '21 ~ 30 级', scale: 20, range: [21, 30] },
  { label: '31 ~ 40 级', scale: 40, range: [31, 40] },
  { label: '41 ~ 50 级', scale: 60, range: [41, 50] },
  { label: '51 ~ 100 级', scale: 90, range: [51, 100] },
  { label: '101 级及以上', scale: 120, range: [101, 999] }
]

// 获取指定等级对应的时间系数
const getTimeScale = (lvl) => {
  if (lvl <= 10) return 5
  if (lvl <= 20) return 10
  if (lvl <= 30) return 20
  if (lvl <= 40) return 40
  if (lvl <= 50) return 60
  if (lvl <= 100) return 90
  return 120
}

// 格式化时间分钟数：小于60分钟显示分钟；大于60分钟显示小时与分钟；整除只显示小时
const formatTime = (minutes) => {
  if (minutes <= 0) return '0分钟'
  if (minutes < 60) return minutes + '分钟'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return hrs + '小时'
  return `${hrs}小时${mins}分钟`
}

// 获取地块所在的类别标签
const getSpotTab = (spot) => {
  const cfg = getSpotConfig(spot)
  return cfg ? cfg.tab : ''
}

// 解析地块体力消耗数值
const getSpotStaminaVal = (spot) => {
  if (!spot) return 0
  const suffix = getSuffix(spot.IDs)
  const tab = getSpotTab(spot)
  
  if (tab === 'special') return 0
  
  if (tab === 'basic') {
    if (suffix === '000') return 0
    if (suffix === '001' || suffix === '002') return 1
    return (spot.SpotSize || 0) * 2
  }
  
  if (tab === 'equip' || tab === 'event') {
    return 1
  }
  
  return 0
}

// 判断是否需要展示探索时间
const shouldShowExploreTime = (spot) => {
  if (!spot) return false
  const tab = getSpotTab(spot)
  if (tab !== 'basic') return false
  const suffix = getSuffix(spot.IDs)
  return suffix !== '000' && suffix !== '001' && suffix !== '002'
}

// 获取最高等级副本的探索时间字符串
const getMaxExploreTimeStr = (spot) => {
  if (!spot) return '0分钟'
  const stamina = getSpotStaminaVal(spot)
  if (stamina === 0) return '0分钟'
  const maxLvl = mapMaxLevels[spot.AreaName] || 1
  const scale = getTimeScale(maxLvl)
  const totalMinutes = stamina * 0.5 * scale
  return formatTime(totalMinutes)
}

// 判断当前等级段是否对应当前地图的最高等级本段
const isCurrentRange = (range, mapName) => {
  const maxLvl = mapMaxLevels[mapName] || 0
  return maxLvl >= range.range[0] && maxLvl <= range.range[1]
}

// 动态图格宽高样式生成
const getIconContainerStyle = (spot) => {
  if (!spot || !spot.SpotShape) return { width: '30px', height: '30px' }
  const rows = spot.SpotShape.split(',')
  if (rows.length === 0 || !rows[0]) return { width: '30px', height: '30px' }
  const numRows = rows.length
  const numCols = rows[0].length
  
  // 基准格点高度宽度换算
  let baseSize = 26
  if (numCols > 3 || numRows > 3) {
    baseSize = 20
  }
  
  return {
    width: `${numCols * baseSize}px`,
    height: `${numRows * baseSize}px`
  }
}

// 获取某个特定地图下的符合过滤条件的地块
const getMapSpots = (mapName) => {
  let spots = filteredSpots.value.filter(spot => spot.AreaName === mapName)
  
  // 分类筛选
  if (activeTab.value !== 'all') {
    spots = spots.filter(spot => {
      const config = getSpotConfig(spot)
      return config && config.tab === activeTab.value
    })
  }
  return spots
}

// 根据分类获取指定地图下的地块（全地图全部标签模式下的二级拆分）
const getMapSpotsByCategory = (mapName, catId) => {
  const spots = filteredSpots.value.filter(spot => spot.AreaName === mapName)
  return spots.filter(spot => {
    const config = getSpotConfig(spot)
    return config && config.tab === catId
  })
}

// 对分类展示的地块进行排序（使用统一排序算法，完美尊重后缀配置排列顺序）
const getSortedMapSpotsByCategory = (mapName, catId) => {
  const spots = getMapSpotsByCategory(mapName, catId)
  return sortSpots(spots)
}

// 将地块按照基础地块（橙紫、蓝绿）、装备、奇遇、特殊的优先级顺序以及其后缀定义顺序进行排序
const sortSpots = (spots) => {
  return [...spots].sort((a, b) => {
    const cfgA = getSpotConfig(a)
    const cfgB = getSpotConfig(b)
    
    const tabOrder = { 'basic': 1, 'equip': 2, 'event': 3, 'special': 4 }
    const tabA = cfgA ? cfgA.tab : 'special'
    const tabB = cfgB ? cfgB.tab : 'special'
    
    if (tabA !== tabB) {
      return (tabOrder[tabA] || 9) - (tabOrder[tabB] || 9)
    }
    
    const suffixA = getSuffix(a.IDs)
    const suffixB = getSuffix(b.IDs)
    
    if (tabA === 'basic') {
      const subOrder = { 'orange': 1, 'purple': 2, 'blue': 3, 'green': 4 }
      const subA = cfgA ? cfgA.sub : 'green'
      const subB = cfgB ? cfgB.sub : 'green'
      if (subA !== subB) {
        return (subOrder[subA] || 9) - (subOrder[subB] || 9)
      }
      
      const arr = subA === 'orange' ? basicOrange 
                : subA === 'purple' ? basicPurple 
                : subA === 'blue' ? basicBlue 
                : basicGreen
      return arr.indexOf(suffixA) - arr.indexOf(suffixB)
    }
    
    if (tabA === 'equip') {
      return equipSuffixes.indexOf(suffixA) - equipSuffixes.indexOf(suffixB)
    }
    
    if (tabA === 'event') {
      return eventSuffixes.indexOf(suffixA) - eventSuffixes.indexOf(suffixB)
    }
    
    if (tabA === 'special') {
      return specialSuffixes.indexOf(suffixA) - specialSuffixes.indexOf(suffixB)
    }
    
    return 0
  })
}

// 动态计算当前可见的地图列表（支持地图级别懒加载，已排除无地块的空地图）
const activeMaps = computed(() => {
  if (selectedMap.value !== 'all') {
    return [selectedMap.value]
  }
  
  const mapsWithData = mapList.filter(mapName => {
    const spots = allSpots.value.filter(spot => {
      if (getSuffix(spot.IDs) === '015') return false
      if (spot.AreaName !== mapName) return false
      
      // 类别过滤
      if (activeTab.value !== 'all') {
        const config = getSpotConfig(spot)
        if (!config || config.tab !== activeTab.value) return false
      }
      
      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        const nameMatch = spot.Name && spot.Name.toLowerCase().includes(query)
        const descMatch = spot.Description && spot.Description.toLowerCase().includes(query)
        const suffixMatch = getSuffix(spot.IDs).includes(query)
        if (!nameMatch && !descMatch && !suffixMatch) return false
      }
      return true
    })
    return spots.length > 0
  })
  
  return mapsWithData.slice(0, displayMapLimit.value)
})

// 递归自动加载更多地图直至容器出现滚动条（解决无滚动条时无法继续滚动的死锁问题）
const checkAndLoadMore = () => {
  if (selectedMap.value !== 'all') return
  setTimeout(() => {
    const el = listContainer.value
    if (el) {
      // 如果可滚动高度与可视区域高度差小于 50px（无滚动条或滚动已触底）
      if (el.scrollHeight <= el.clientHeight + 50) {
        // 算出所有符合当前条件的地图总数
        const totalMatchingMaps = mapList.filter(mapName => {
          const spots = allSpots.value.filter(spot => {
            if (getSuffix(spot.IDs) === '015') return false
            if (spot.AreaName !== mapName) return false
            
            // 类别过滤
            if (activeTab.value !== 'all') {
              const config = getSpotConfig(spot)
              if (!config || config.tab !== activeTab.value) return false
            }
            
            // 搜索过滤
            if (searchQuery.value) {
              const query = searchQuery.value.toLowerCase()
              const nameMatch = spot.Name && spot.Name.toLowerCase().includes(query)
              const descMatch = spot.Description && spot.Description.toLowerCase().includes(query)
              const suffixMatch = getSuffix(spot.IDs).includes(query)
              if (!nameMatch && !descMatch && !suffixMatch) return false
            }
            return true
          })
          return spots.length > 0
        }).length

        if (displayMapLimit.value < totalMatchingMaps) {
          displayMapLimit.value += 2
          checkAndLoadMore() // 递归检查
        }
      }
    }
  }, 120)
}

// 懒加载：触底时自动渲染更多地图卡片
const handleScroll = (e) => {
  const el = e.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
    if (selectedMap.value === 'all') {
      displayMapLimit.value += 2
      // 触底加载后，防备加载的卡片由于被筛选导致仍不能撑出滚动条，进行二次检测
      checkAndLoadMore()
    }
  }
}

// 重置滚动
const resetScroll = () => {
  if (listContainer.value) listContainer.value.scrollTop = 0
}

const switchTab = (tabId) => {
  // 再次点击高亮分类 Tab 可以直接取消高亮，回到 all (全部汇总)
  if (activeTab.value === tabId) {
    activeTab.value = 'all'
  } else {
    activeTab.value = tabId
  }
  resetScroll()
}

// 当条件变化时重置懒加载数量及滚动条
watch([selectedMap, searchQuery, activeTab], () => {
  displayMapLimit.value = 3
  resetScroll()
  checkAndLoadMore()
})

onMounted(() => {
  checkAndLoadMore()
})

// 弹窗交互
const openDetail = (spot) => {
  detailModal.value = { visible: true, data: spot }
}

const closeDetail = () => {
  detailModal.value = { visible: false, data: {} }
  showTimeDetails.value = false
}

const toggleTimeDetails = async () => {
  showTimeDetails.value = !showTimeDetails.value
  if (showTimeDetails.value) {
    await nextTick()
    if (modalBodyRef.value) {
      modalBodyRef.value.scrollTo({
        top: modalBodyRef.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  }
}
</script>

<style scoped>
/* ===== 页面与布局基准对齐 ===== */
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

/* ===== 搜索栏与地图下拉筛选 (对齐 EquipView.vue) ===== */
.equip-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  flex: 1;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
}

.talent-search-box:focus-within {
  border-color: #409eff;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  opacity: 0.7;
  flex-shrink: 0;
}

.talent-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
}

/* ===== 筛选按键与折叠面板 (统一标准) ===== */
.filter-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 12px;
  height: 42px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-main);
}

.filter-toggle-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-toggle-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark-mode .filter-toggle-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600;
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: rotate(180deg);
}

/* 筛选面板 */
.filter-panel {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grid-5-cols {
  display: grid !important;
  grid-template-columns: repeat(5, 1fr) !important;
  gap: 6px !important;
  flex: 1;
  min-width: 0;
}

.grid-5-cols .tag {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 0 !important;
}

@media (max-width: 600px) {
  .grid-5-cols {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
  width: 55px;
  flex-shrink: 0;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag {
  padding: 3px 8px;
  background: var(--bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  transition: all 0.15s ease;
  user-select: none;
}
@media (hover: hover) {
  .tag:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}
.tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
}
.dark-mode .tag.active {
  background: rgba(59, 130, 246, 0.2);
}

/* ===== 分段选择卡片 (对齐 EquipView sorting-section) ===== */
.tabs-section {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tabs-section.flex-col-layout {
  flex-direction: column;
  gap: 6px;
}

.tab-tip-banner {
  font-size: 13px; /* 字体大小调大，更清晰显眼 */
  color: #f43f5e;
  font-weight: 700;
  text-align: center;
  padding: 4px 10px;
  width: 100%;
  box-sizing: border-box;
  background: rgba(244, 63, 94, 0.04);
  border: 1px dashed rgba(244, 63, 94, 0.15);
  border-radius: 6px;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.tabs-group {
  display: flex;
  width: 100%;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 2px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ===== 滚动及区块样式 ===== */
.block-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
  min-height: 0;
  overscroll-behavior: contain;
  padding-bottom: 20px;
}

/* 地图大卡片样式 */
.section-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 8px;
}

.section-dot {
  width: 4px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

/* 二级子分类的分隔样式 */
.cat-sub-group {
  margin-top: 10px;
  margin-bottom: 14px;
}

.cat-sub-group:last-child {
  margin-bottom: 4px;
}

.cat-sub-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-sub);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-align: left;
}

.cat-sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

/* ===== 宫格网格对齐 (微型极简网格，稍微放大一些) ===== */
.spot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); /* 宽度从 62px 放大到 72px */
  gap: 10px 8px;
}

.spot-item-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 4px; /* 适当放宽内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
  min-width: 0;
}

.spot-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

/* 图标居中对齐槽位 */
.spot-icon-slot-wrapper {
  width: 100%;
  height: 42px; /* 稍微放大 */
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.spot-icon-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  transition: transform 0.15s ease;
}

.spot-icon-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.spot-item-card:hover .spot-icon-img {
  transform: scale(1.08);
}

/* 文字与爆率 */
.spot-card-name {
  font-size: 11px; /* 字体增大到 11px */
  font-weight: 700;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spot-card-probability {
  font-size: 9.5px;
  font-weight: 800;
  text-align: center;
  line-height: 1.1;
  margin-top: 2px;
}

.no-results-hint {
  text-align: center;
  padding: 24px;
  color: var(--text-sub);
  font-size: 13px;
}

/* 像素风 CSS 解决方案（推荐最近邻算法锐化） */
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* ===== 详细说明弹窗 (现代卡片风格 - 对齐 DungeonRelicsView) ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--modal-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center; /* 恢复垂直居中对齐，使其在未展开时拥有合适的位置 */
  justify-content: center;
  z-index: 999;
}

.relic-detail-window {
  width: 90%;
  max-width: 440px;
  max-height: calc(100vh - 140px); /* 限制最高高度，确保在展开拉长时，上下仍能各留出至少 70px 空间避开顶部栏 */
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  animation: modalEnter 0.2s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
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
  gap: 16px;
  box-sizing: border-box;
  overflow-y: auto; /* 支持垂直滚动 */
  flex: 1; /* 撑开容器使其能正常发生滚动 */
}

/* 详情上部预览：缩小容器高度以消除大片空余空间，双栏流式布局防止遮挡 */
.relic-detail-preview {
  width: 100%;
  height: 130px; /* 缩减高度，消除空余空间 */
  border-radius: 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 10px 16px;
  flex-shrink: 0; /* 防止垂直压缩 */
}

.flex-row-layout {
  /* 使用标准 Flex 布局流 */
  display: flex;
  flex-direction: row;
}

.preview-img-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1; /* 占据剩余可用空间，自动弹性收缩，百分之百防止与右侧轮廓发生遮挡 */
  height: 100%;
  z-index: 1;
  min-width: 0;
}

/* 放大图片尺寸，填充容器高度，保持像素锐利 */
.large-detail-img {
  width: 100%;
  height: 100%;
  max-width: 200px; /* 强制小分辨率横版图片拉伸放大，填满容器 */
  max-height: 110px;
  object-fit: contain;
}

/* 右侧轮廓容器：流式并排防止遮挡，不再采用绝对定位 */
.preview-shape-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
  background: var(--card-bg);
  padding: 6px;
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 禁止缩小轮廓 */
  margin-left: 12px; /* 留出一定的横向安全间距 */
}

.shape-label-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-sub);
  margin-bottom: 4px;
}

.mini-shape-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg);
  padding: 4px;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  width: fit-content;
}

.shape-row {
  display: flex;
  gap: 2px;
}

.shape-cell {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.shape-cell.empty {
  background: transparent;
}

/* 描述文本框 */
.relic-description-box {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-sizing: border-box;
  flex-shrink: 0; /* 防止垂直压缩 */
}

.relic-description-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
  text-align: left;
}

/* 详细属性网格 (三列对齐风格) */
.relic-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  flex-shrink: 0; /* 防止垂直压缩 */
}

.relic-detail-stat {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.relic-detail-stat.span-3 {
  grid-column: span 3;
}

.stat-label {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 600;
}

.text-wrap-label {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  text-align: center;
  line-height: 1.2;
}

.text-wrap-label span {
  display: inline-block;
  white-space: nowrap;
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  text-align: center;
}

.stat-value.font-bold {
  font-weight: 900;
}

.relic-detail-stat.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.relic-detail-stat.clickable:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.highlight-blue {
  color: #2563eb !important;
  font-weight: 800;
  text-decoration: underline dotted;
}

/* 时间详情面板 */
.time-details-panel {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  box-sizing: border-box;
  flex-shrink: 0; /* 防止垂直压缩 */
}

.time-panel-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 10px;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 6px;
}

.time-panel-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-main);
}

.time-panel-tip {
  font-size: 10px;
  color: var(--text-sub);
}

.time-ranges-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-range-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  font-size: 12px;
}

.time-range-item.active {
  border-color: #2563eb;
  background: rgba(59, 130, 246, 0.05);
}

.range-label {
  font-weight: 700;
  color: var(--text-main);
}

.time-range-item.active .range-label::after {
  content: " (当前地图上限)";
  font-size: 10px;
  color: #2563eb;
  font-weight: normal;
}

.range-value-blue {
  color: #2563eb;
  font-weight: 800;
}
</style>
