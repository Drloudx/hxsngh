<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 搜索栏与次筛/筛选按钮（统一为天赋筛选工具一模一样的样式） -->
      <div class="talent-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索符文名、效果、材质、机制..."
            class="talent-search-input"
          />
        </div>

        <button class="sub-filter-btn" :class="{ active: showSubSearch }" @click="showSubSearch = !showSubSearch">
          <span class="filter-toggle-text">次筛</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !showSubSearch }" />
        </button>

        <button class="filter-toggle-btn" :class="{ active: tagsExpanded }" @click="tagsExpanded = !tagsExpanded">
          <span class="filter-toggle-text">筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
        </button>
      </div>

      <!-- 二次筛选输入框 -->
      <Transition name="slide-fade">
        <div v-show="showSubSearch" class="sub-search-box">
          <img src="/ui/search.svg" class="sub-search-icon" />
          <input
            type="text"
            v-model="subSearchQuery"
            placeholder="结果内二次筛选..."
            class="sub-search-input"
          />
          <button v-if="subSearchQuery" class="clear-search-btn" @click="subSearchQuery = ''">✕</button>
        </div>
      </Transition>

      <!-- 筛选面板（一模一样复刻商人的筛选样式与交互） -->
      <Transition name="slide-fade">
        <div v-show="tagsExpanded" class="filter-panel">
          <!-- 1. 品阶筛选 -->
          <div class="filter-row">
            <span class="filter-label">品阶：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedStep === 'all' }"
                @click="selectedStep = 'all'"
              >
                全部
              </button>
              <button
                v-for="stepOpt in stepFilterOptions"
                :key="stepOpt.value"
                class="filter-btn step-btn"
                :class="[`step-btn-${stepOpt.value}`, { active: selectedStep === stepOpt.value }]"
                @click="toggleStep(stepOpt.value)"
              >
                {{ stepOpt.label }}
              </button>
            </div>
          </div>

          <!-- 2. 材质筛选 -->
          <div class="filter-row">
            <span class="filter-label">材质：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedMaterial === 'all' }"
                @click="selectedMaterial = 'all'"
              >
                全部
              </button>
              <button
                v-for="mat in materialList"
                :key="mat"
                class="filter-btn"
                :class="{ active: selectedMaterial === mat }"
                @click="toggleMaterial(mat)"
              >
                {{ mat }}
              </button>
            </div>
          </div>

          <!-- 3. 核心机制/效果筛选 -->
          <div class="filter-row">
            <span class="filter-label">效果：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedEffect === 'all' }"
                @click="selectedEffect = 'all'"
              >
                全部
              </button>
              <button
                v-for="eff in effectList"
                :key="eff"
                class="filter-btn"
                :class="{ active: selectedEffect === eff }"
                @click="toggleEffect(eff)"
              >
                {{ eff }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 概览与检索数量统计栏 -->
      <div class="summary-stat-bar">
        <div class="summary-left">
          <span>检索数量：<strong class="stat-highlight">{{ filteredRunes.length }}</strong></span>
        </div>
        <div class="summary-right">
          <span v-if="selectedMaterial !== 'all'" class="filter-tag-pill">
            材质: {{ selectedMaterial }} <span class="tag-remove" @click="selectedMaterial = 'all'">✕</span>
          </span>
          <span v-if="selectedEffect !== 'all'" class="filter-tag-pill">
            效果: {{ selectedEffect }} <span class="tag-remove" @click="selectedEffect = 'all'">✕</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 符文列表主体 -->
    <div class="rune-content-body">
      <!-- 符文卡片网格 -->
      <div class="runes-grid">
        <div
          v-for="rune in filteredRunes"
          :key="rune.IDs"
          class="rune-card"
          :style="{ borderColor: getStepBorderColor(rune.Step) }"
          @click="openRuneDetail(rune)"
        >
          <div class="rune-card-top">
            <!-- 符文图标 -->
            <div class="rune-avatar-box" :style="{ background: getStepBg(rune.Step) }">
              <img :src="getRuneIcon(rune.IDs)" :alt="rune.Name" class="rune-img game-sprite" />
            </div>

            <!-- 标题和品阶：拼上【效果/机制】 -->
            <div class="rune-title-info">
              <div class="rune-name-row">
                <span class="rune-name" :style="{ color: getStepColor(rune.Step) }">
                  【{{ rune.Effect }}】{{ rune.Name }}
                </span>
                <span class="step-pill" :style="{ background: getStepBg(rune.Step), color: getStepColor(rune.Step) }">
                  {{ getStepName(rune.Step) }}
                </span>
              </div>

              <!-- 材质与机制胶囊（纯名称） -->
              <div class="rune-meta-row">
                <span class="meta-badge mat-badge" @click.stop="toggleMaterial(rune.Material)">
                  {{ rune.Material }}
                </span>
                <span class="meta-badge eff-badge" @click.stop="toggleEffect(rune.Effect)">
                  {{ rune.Effect }}
                </span>
              </div>
            </div>
          </div>

          <!-- 外层卡片效果：展示映射后的4项共鸣效果（共鸣1~4） -->
          <div class="rune-resonance-box">
            <div class="resonance-item">
              <span class="res-badge">共鸣1</span>
              <span class="res-text">{{ rune.Description }}</span>
            </div>
            <div class="resonance-item">
              <span class="res-badge">共鸣2</span>
              <span class="res-text">{{ getResolvedResonance(rune, 1) }}</span>
            </div>
            <div class="resonance-item">
              <span class="res-badge">共鸣3</span>
              <span class="res-text">{{ getResolvedResonance(rune, 2) }}</span>
            </div>
            <div class="resonance-item">
              <span class="res-badge">共鸣4</span>
              <span class="res-text">{{ getResolvedResonance(rune, 3) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 符文详情弹窗 -->
    <div v-if="selectedRune" class="custom-modal-overlay" @click.self="selectedRune = null">
      <div class="custom-modal-card rune-modal-card">
        <div class="modal-header">
          <h3>【{{ selectedRune.Effect }}】{{ selectedRune.Name }}</h3>
          <button class="modal-close-btn" @click="selectedRune = null">✕</button>
        </div>

        <div class="modal-body rune-modal-body">
          <div class="modal-avatar-area">
            <div class="modal-rune-avatar" :style="{ background: getStepBg(selectedRune.Step) }">
              <img :src="getRuneIcon(selectedRune.IDs)" :alt="selectedRune.Name" class="game-sprite" />
            </div>
            <div class="modal-rune-main-info">
              <div class="modal-name-row">
                <span class="modal-rune-name" :style="{ color: getStepColor(selectedRune.Step) }">
                  【{{ selectedRune.Effect }}】{{ selectedRune.Name }}
                </span>
                <span class="step-pill" :style="{ background: getStepBg(selectedRune.Step), color: getStepColor(selectedRune.Step) }">
                  {{ getStepName(selectedRune.Step) }}
                </span>
              </div>
              <div class="modal-meta-row">
                <span class="meta-badge mat-badge">{{ selectedRune.Material }}</span>
                <span class="meta-badge eff-badge">{{ selectedRune.Effect }}</span>
              </div>
            </div>
          </div>

          <!-- 相同材质共鸣提示行（中性柔和样式，不标蓝） -->
          <div class="material-resonance-hint">
            【{{ selectedRune.Material }}】相同材质的符文会产生共鸣
          </div>

          <!-- 符文效果（共鸣1~4） -->
          <div class="modal-section-card">
            <div class="section-title">符文效果</div>
            <div class="modal-resonance-list">
              <div class="modal-resonance-item">
                <span class="res-badge">共鸣1</span>
                <span class="res-text">{{ selectedRune.Description }}</span>
              </div>
              <div class="modal-resonance-item">
                <span class="res-badge">共鸣2</span>
                <span class="res-text">{{ getResolvedResonance(selectedRune, 1) }}</span>
              </div>
              <div class="modal-resonance-item">
                <span class="res-badge">共鸣3</span>
                <span class="res-text">{{ getResolvedResonance(selectedRune, 2) }}</span>
              </div>
              <div class="modal-resonance-item">
                <span class="res-badge">共鸣4</span>
                <span class="res-text">{{ getResolvedResonance(selectedRune, 3) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="selectedRune = null">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import runeData from '@/assets/Rune.json'
import runeMaterialData from '@/assets/Rune_Material.json'

// 基础数据
const allRunes = computed(() => runeData.DataTable || runeData || [])
const runeMaterials = computed(() => runeMaterialData.DataTable || runeMaterialData || [])

// 材质对照映射表
const materialMap = computed(() => {
  const map = {}
  runeMaterials.value.forEach(m => {
    map[m.Material] = m
  })
  return map
})

// 数值翻倍函数（针对基础效果+200%映射）
const doubleDescription = (desc) => {
  if (!desc) return ''
  return desc.replace(/(\d+(\.\d+)?)/g, (match) => {
    const num = parseFloat(match)
    return (num * 2).toString()
  })
}

// 动态解析共鸣效果：
// - "基础效果+100%" -> 映射为和共鸣1一样的属性 (rune.Description)
// - "基础效果+200%" -> 映射为共鸣1属性数值翻倍 (doubleDescription)
// - 其余文字 -> 保留专属机制描述
const getResolvedResonance = (rune, resIndex) => {
  if (!rune) return '-'
  const m = materialMap.value[rune.Material]
  if (!m) return '-'
  const raw = resIndex === 1 ? m.Resonance1 : resIndex === 2 ? m.Resonance2 : m.Resonance3
  if (!raw) return '-'
  if (raw === '基础效果+100%') {
    return rune.Description
  }
  if (raw === '基础效果+200%') {
    return doubleDescription(rune.Description)
  }
  return raw
}

// 搜索与次筛
const searchQuery = ref('')
const subSearchQuery = ref('')
const showSubSearch = ref(false)
const tagsExpanded = ref(true)

// 筛选状态
const selectedStep = ref('all')
const selectedMaterial = ref('all')
const selectedEffect = ref('all')

// 选项列表
const stepFilterOptions = [
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]

const materialList = computed(() => {
  const mats = new Set()
  allRunes.value.forEach(r => r.Material && mats.add(r.Material))
  return Array.from(mats)
})

const effectList = computed(() => {
  const effs = new Set()
  allRunes.value.forEach(r => r.Effect && effs.add(r.Effect))
  return Array.from(effs)
})

// 筛选切换
const toggleStep = (step) => {
  selectedStep.value = selectedStep.value === step ? 'all' : step
}

const toggleMaterial = (mat) => {
  selectedMaterial.value = selectedMaterial.value === mat ? 'all' : mat
}

const toggleEffect = (eff) => {
  selectedEffect.value = selectedEffect.value === eff ? 'all' : eff
}

// 符文过滤计算
const filteredRunes = computed(() => {
  let list = allRunes.value

  // 1. 品阶
  if (selectedStep.value !== 'all') {
    list = list.filter(r => r.Step === selectedStep.value)
  }

  // 2. 材质
  if (selectedMaterial.value !== 'all') {
    list = list.filter(r => r.Material === selectedMaterial.value)
  }

  // 3. 核心机制
  if (selectedEffect.value !== 'all') {
    list = list.filter(r => r.Effect === selectedEffect.value)
  }

  // 4. 主搜索（支持符文名、材质前缀、描述、材质、效果、共鸣效果匹配）
  // 4. 主搜索（支持符文名、机制/效果前缀、材质前缀、描述、共鸣效果匹配）
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r => {
      const fullEffectName = `【${r.Effect}】${r.Name}`.toLowerCase()
      const fullMatName = `【${r.Material}】${r.Name}`.toLowerCase()
      const name = (r.Name || '').toLowerCase()
      const desc = (r.Description || '').toLowerCase()
      const mat = (r.Material || '').toLowerCase()
      const eff = (r.Effect || '').toLowerCase()
      const res1 = getResolvedResonance(r, 1).toLowerCase()
      const res2 = getResolvedResonance(r, 2).toLowerCase()
      const res3 = getResolvedResonance(r, 3).toLowerCase()
      return fullEffectName.includes(q) || fullMatName.includes(q) || name.includes(q) || desc.includes(q) || mat.includes(q) || eff.includes(q) || res1.includes(q) || res2.includes(q) || res3.includes(q)
    })
  }

  // 5. 次级搜索
  if (showSubSearch.value && subSearchQuery.value.trim()) {
    const sq = subSearchQuery.value.trim().toLowerCase()
    list = list.filter(r => {
      const fullEffectName = `【${r.Effect}】${r.Name}`.toLowerCase()
      const fullMatName = `【${r.Material}】${r.Name}`.toLowerCase()
      const name = (r.Name || '').toLowerCase()
      const desc = (r.Description || '').toLowerCase()
      const mat = (r.Material || '').toLowerCase()
      const eff = (r.Effect || '').toLowerCase()
      const res1 = getResolvedResonance(r, 1).toLowerCase()
      const res2 = getResolvedResonance(r, 2).toLowerCase()
      const res3 = getResolvedResonance(r, 3).toLowerCase()
      return fullEffectName.includes(sq) || fullMatName.includes(sq) || name.includes(sq) || desc.includes(sq) || mat.includes(sq) || eff.includes(sq) || res1.includes(sq) || res2.includes(sq) || res3.includes(sq)
    })
  }

  // 排序：先按品阶 (S > A > B > C)，同阶按名称自然排序
  const stepWeights = { S: 4, A: 3, B: 2, C: 1 }
  return [...list].sort((a, b) => {
    const sw = (stepWeights[b.Step] || 0) - (stepWeights[a.Step] || 0)
    if (sw !== 0) return sw
    return (a.IDs || '').localeCompare(b.IDs || '')
  })
})

// 弹窗状态
const selectedRune = ref(null)
const openRuneDetail = (rune) => {
  selectedRune.value = rune
}

// 辅助方法
const getStepName = (step) => {
  switch (step) {
    case 'SS': return '神话'
    case 'S':  return '传说'
    case 'A':  return '史诗'
    case 'B':  return '稀有'
    case 'C':  return '普通'
    default:   return step
  }
}

const getStepColor = (step) => {
  switch (step) {
    case 'SS': return '#f43f5e'
    case 'S':  return '#f97316'
    case 'A':  return '#a855f7'
    case 'B':  return '#3b82f6'
    case 'C':  return '#10b981'
    default:   return '#6b7280'
  }
}

const getStepBorderColor = (step) => {
  switch (step) {
    case 'SS': return 'rgba(244, 63, 94, 0.4)'
    case 'S':  return 'rgba(249, 115, 22, 0.4)'
    case 'A':  return 'rgba(168, 85, 247, 0.4)'
    case 'B':  return 'rgba(59, 130, 246, 0.35)'
    case 'C':  return 'rgba(16, 185, 129, 0.3)'
    default:   return 'var(--border-color)'
  }
}

const getStepBg = (step) => {
  switch (step) {
    case 'SS': return 'rgba(244, 63, 94, 0.12)'
    case 'S':  return 'rgba(249, 115, 22, 0.12)'
    case 'A':  return 'rgba(168, 85, 247, 0.12)'
    case 'B':  return 'rgba(59, 130, 246, 0.12)'
    case 'C':  return 'rgba(16, 185, 129, 0.12)'
    default:   return 'rgba(107, 114, 128, 0.12)'
  }
}

const getRuneIcon = (id) => {
  return `/Rune/${id}.png`
}
</script>

<style scoped>
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
  font-family: 'HarmonyOS Sans SC', sans-serif;
}

.talent-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 10px;
}

/* ===== 搜索栏与次筛按钮（100% 复刻 TalentView 规范） ===== */
.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex: 1;
  min-width: 0;
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
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
  min-width: 0;
}

.sub-filter-btn, .filter-toggle-btn {
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

.sub-filter-btn:hover, .filter-toggle-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.sub-filter-btn.active, .filter-toggle-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark-mode .sub-filter-btn.active, .dark-mode .filter-toggle-btn.active {
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

/* 二次筛选输入框（与 TalentView 100% 一致） */
.sub-search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
}

.sub-search-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  margin-right: 8px;
  opacity: 0.6;
}

.sub-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--text-main);
  font-family: inherit;
}

/* ===== 筛选折叠面板（100% 一致复刻 GambleShopView 样式与交互） ===== */
.filter-panel {
  margin-top: 6px;
  margin-bottom: 6px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
}

.filter-label {
  color: var(--text-sub);
  white-space: nowrap;
  padding-top: 4px;
  width: 52px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.filter-btn {
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 12px;
  color: var(--text-main);
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.filter-btn.active {
  background: rgba(59, 130, 246, 0.15) !important;
  color: #3b82f6 !important;
  font-weight: bold;
}

/* 品阶特定按钮高亮（复刻商人的 active 风格） */
.step-btn-SS.active { background: rgba(239, 68, 68, 0.15) !important; color: #ef4444 !important; font-weight: bold; }
.step-btn-S.active  { background: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; font-weight: bold; }
.step-btn-A.active  { background: rgba(168, 85, 247, 0.15) !important; color: #a855f7 !important; font-weight: bold; }
.step-btn-B.active  { background: rgba(59, 130, 246, 0.15) !important; color: #3b82f6 !important; font-weight: bold; }
.step-btn-C.active  { background: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; font-weight: bold; }

/* 概览与检索数量统计栏 */
.summary-stat-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-main);
  margin-top: 4px;
}

.summary-left, .summary-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-highlight {
  color: #3b82f6;
  font-weight: 800;
}

.filter-tag-pill {
  font-size: 11px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag-remove {
  cursor: pointer;
  font-size: 10px;
  opacity: 0.7;
}

.tag-remove:hover {
  opacity: 1;
}

/* 符文列表主体 */
.rune-content-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 24px;
  padding-right: 2px;
}

/* 符文卡片网格 */
.runes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 10px;
}

.rune-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.rune-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.rune-card-top {
  display: flex;
  gap: 10px;
  align-items: center;
}

.rune-avatar-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px;
}

.rune-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.rune-title-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.rune-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rune-name {
  font-size: 15px;
  font-weight: 800;
}

.step-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
}

.rune-meta-row {
  display: flex;
  gap: 5px;
  align-items: center;
}

.meta-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.mat-badge {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.eff-badge {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

/* 符文卡片内部共鸣效果（共鸣1~4展示） */
.rune-resonance-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resonance-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.45;
}

.res-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  padding: 1px 5px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 1px;
}

.res-text {
  color: var(--text-main);
  font-weight: 500;
  word-break: break-word;
}

/* 详情弹窗 */
.rune-modal-card {
  max-width: 440px !important;
}

.rune-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px !important;
}

.modal-avatar-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-rune-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.modal-rune-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modal-rune-main-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-rune-name {
  font-size: 16px;
  font-weight: 800;
}

.modal-meta-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* 材质共鸣提示行（中性柔和底色与虚线边框，不标蓝） */
.material-resonance-hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
}

.modal-section-card {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-resonance-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-resonance-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
}

/* 移动端单列全宽展示及搜索栏适配 */
@media (max-width: 600px) {
  .talent-search-row {
    gap: 6px;
  }

  .talent-search-box {
    padding: 8px 10px;
  }

  .sub-filter-btn, .filter-toggle-btn {
    padding: 0 8px;
    height: 38px;
    border-radius: 8px;
  }

  .collapse-icon {
    width: 12px;
    height: 12px;
  }

  .runes-grid {
    grid-template-columns: 1fr !important;
    gap: 8px;
  }

  .rune-card {
    padding: 10px 12px;
    gap: 8px;
  }

  .rune-avatar-box {
    width: 40px;
    height: 40px;
  }

  .rune-name {
    font-size: 14px;
  }

  .resonance-item {
    font-size: 12px;
    gap: 6px;
  }

  .res-badge {
    font-size: 10px;
  }
}
</style>
