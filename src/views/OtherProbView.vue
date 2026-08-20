<template>
  <div class="other-prob-container">
    <div class="other-prob-sticky-top">
      <!-- 顶部主标签页切换（商人/宝库同款卡片样式，无图标，无小字） -->
      <div class="main-tab-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="main-tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="main-tab-title">{{ tab.name }}</span>
        </button>
      </div>
    </div>

    <div class="prob-content-body">
      <!-- ==================== TAB 1: 委托概率 ==================== -->
      <div v-if="activeTab === 'commission'" class="tab-panel commission-panel">
        <!-- 委托全局品阶分布看板 -->
        <div class="info-card">
          <div class="card-title">任务概率</div>
          <div class="commission-compact-bar">
            <div v-for="s in commissionStepStats" :key="s.step" class="compact-stat-item">
              <span class="step-pill" :style="{ background: s.bg, color: s.color }">{{ s.name }}</span>
              <span class="compact-percent" :style="{ color: s.color }">{{ s.percent }}</span>
            </div>
          </div>

          <div class="mechanic-tip-box">
            <div class="mechanic-title">刷新规则</div>
            <p class="mechanic-desc">
              每次完成或刷新任务后，下一次刷出高阶任务的几率大幅提高：<br />
              • 上次是 <strong>普通</strong>：下次有 <strong>50%</strong> 几率保底出 <strong>≥ 稀有</strong> 任务。<br />
              • 上次是 <strong>稀有</strong>：下次有 <strong>20%</strong> 几率保底出 <strong>≥ 史诗</strong> 任务。<br />
              • 上次是 <strong>史诗</strong>：下次有 <strong>10%</strong> 几率直接保底出 <strong>传说</strong> 任务！
            </p>
            <div class="mechanic-title" style="margin-top: 10px;">角色派遣加成</div>
            <p class="mechanic-desc">
              <strong>1. 耗时减免机制</strong>：每派遣 1 名角色，任务耗时减少 10%，<strong>满编 5 人耗时直接减半（-50% 耗时，例如紫色任务从 12 小时降至 6 小时）</strong>！<br />
              <strong>2. 奖励数量机制）</strong>：每多派 1 名角色就多结算 1 次独立掉落，<strong>派满 5 人直接拿 6 份独立奖励</strong>（例如装备任务拿 6 件装备，素材任务拿 180 个素材）！<br />
              <strong>3. 奖励品质加成</strong>：派遣的角色品质越高，掉落物品的品质概率越高（5人效果直接累加）：<br />
              • <strong>派传说角色</strong>：做普通任务每人提供奖励品质概率 <strong>稀有 +4%、史诗 +2%</strong>；做稀有任务提供 <strong>史诗 +2%、传说 +1%</strong>；做史诗任务提供 <strong>传说 +1%</strong>。<br />
              • <strong>派史诗角色</strong>：做普通任务每人提供奖励品质概率 <strong>稀有 +2%、史诗 +1%</strong>；做稀有任务提供 <strong>史诗 +1%</strong>。<br />
              • <strong>派稀有角色</strong>：做普通任务每人提供奖励品质概率 <strong>稀有 +1%</strong>。
            </p>
          </div>
        </div>

        <!-- 委托筛选控制栏 -->
        <div class="filter-bar">
          <div class="filter-group">
            <span class="filter-title">分类：</span>
            <button
              v-for="cat in taskCategories"
              :key="cat"
              class="filter-btn"
              :class="{ active: selectedTaskCat === cat }"
              @click="selectedTaskCat = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div class="filter-group">
            <span class="filter-title">品阶：</span>
            <button
              v-for="st in taskStepFilters"
              :key="st.value"
              class="filter-btn"
              :class="[`step-filter-${st.value}`, { active: selectedTaskStep === st.value }]"
              @click="selectedTaskStep = st.value"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <!-- 委托任务卡片网格 -->
        <div class="tasks-grid">
          <div
            v-for="task in filteredTasks"
            :key="task.IDs"
            class="task-card"
          >
            <div class="task-card-header">
              <div class="task-title-box">
                <span class="step-pill" :style="{ background: getStepConfig(task.TaskStep).lightBg, color: getStepConfig(task.TaskStep).color }">
                  {{ getStepChineseName(task.TaskStep) }}
                </span>
                <span class="task-name" :style="{ color: getStepConfig(task.TaskStep).color }">{{ task.Name }}</span>
              </div>
              <span class="task-prob-badge">
                概率 <strong>{{ getTaskProb(task.Weight) }}</strong>
              </span>
            </div>

            <div class="task-card-body">
              <div class="task-info-row">
                <span class="info-label">任务奖励：</span>
                <span class="info-val reward-val">{{ formatTaskReward(task.Reward) }}</span>
              </div>
              <div class="task-info-row">
                <span class="info-label">任务耗时：</span>
                <span class="info-val">满人 {{ (task.Time * 0.5 / 60) }} 小时（基础 {{ (task.Time / 60) }} 小时）</span>
              </div>
              <div class="task-info-row role-possi-row">
                <span class="info-label">角色加成：</span>
                <div class="possi-list">
                  <div
                    v-for="(line, idx) in getRolePossiLines(task)"
                    :key="idx"
                    class="possi-line"
                  >
                    {{ line }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 3: 地图红概率 ==================== -->
      <div v-if="activeTab === 'redEquip'" class="tab-panel red-equip-panel">
        <!-- 核心概率卡片 -->
        <div class="info-card">
          <div class="card-title">红装概率</div>
          <div class="commission-compact-bar">
            <div class="compact-stat-item">
              <span class="step-pill" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">普通 / 稀有怪</span>
              <span class="compact-percent" style="color: #3b82f6;">0.00%</span>
            </div>
            <div class="compact-stat-item">
              <span class="step-pill" style="background: rgba(168, 85, 247, 0.15); color: #a855f7;">史诗怪</span>
              <span class="compact-percent" style="color: #a855f7;">0.01%</span>
            </div>
            <div class="compact-stat-item">
              <span class="step-pill" style="background: rgba(249, 115, 22, 0.15); color: #f97316;">传说怪</span>
              <span class="compact-percent" style="color: #f97316;">0.10%</span>
            </div>
          </div>

          <div class="mechanic-tip-box" style="margin-top: 10px;">
            <div class="mechanic-title">红装掉落规则</div>
            <p class="mechanic-desc">
              1. 史诗或传说怪物可触发掉落，史诗怪掉落率为 0.01%，传说怪掉落率为 0.10%。<br />
              2. 触发掉落后，从当前地图所属专属红装（1件）和世界通用红装【贤者之石】（1件）中抽取一个（各 50% 概率）。<br />
              3. 每只怪物完全独立结算，无保底。
            </p>
          </div>
        </div>

        <!-- 各地图红装 -->
        <div class="info-card">
          <div class="card-title-row">
            <div class="card-title">各地图红装</div>
            <input
              type="text"
              v-model="redSearchQuery"
              placeholder="搜索红装或地图..."
              class="red-search-input"
            />
          </div>

          <div class="red-equips-grid">
            <div
              v-for="equip in filteredRedEquips"
              :key="equip.IDs"
              class="red-equip-card"
            >
              <div class="red-card-left">
                <div class="red-equip-avatar-box">
                  <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="red-equip-img game-sprite" />
                </div>
              </div>
              <div class="red-card-right">
                <div class="red-equip-header">
                  <span class="red-equip-name">{{ equip.Name }}</span>
                  <span class="red-map-badge">{{ equip.AreaName === '不限' ? '全地图通用' : equip.AreaName }}</span>
                </div>
                <div class="red-tags-row">
                  <span class="meta-tag type-tag">{{ equip.Type }}</span>
                  <span class="meta-tag class-tag">{{ equip.Class }}</span>
                  <span class="meta-tag drop-tag">池占比: 50%</span>
                </div>
                <div class="red-rates-row">
                  <span>史诗怪掉落: <strong>0.005%</strong></span>
                  <span>传说怪掉落: <strong>0.05%</strong></span>
                </div>
                <p class="red-desc">{{ equip.Description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import taskData from '@/assets/Task.json'
import equipData from '@/assets/Equip.json'

const formatUnifiedProb = (pct) => {
  if (pct >= 1) return pct.toFixed(2) + '%'
  if (pct >= 0.1) return pct.toFixed(3) + '%'
  return pct.toFixed(4) + '%'
}

// 2个标签页切换定义（商人/宝库同款样式，不加图标）
const tabs = [
  { id: 'commission', name: '委托概率' },
  { id: 'redEquip', name: '地图红概率' }
]

const activeTab = ref('commission')

// ==================== TAB 1: 委托数据 ====================
const rawTasks = computed(() => taskData.DataTable || taskData || [])

const totalCommissionWeight = computed(() => {
  return rawTasks.value.reduce((acc, t) => acc + (Number(t.Weight) || 0), 0)
})

const commissionStepStats = computed(() => {
  const total = totalCommissionWeight.value || 1
  const steps = [
    { step: 'C', name: '普通', desc: '悬赏/物资/地城/秘境', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    { step: 'B', name: '稀有', desc: '悬赏/物资/地城/秘境', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    { step: 'A', name: '史诗', desc: '含挖掘秘宝史诗神石', bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
    { step: 'S', name: '传说', desc: '传说神石/装备/符文', bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }
  ]
  return steps.map(s => {
    const weight = rawTasks.value
      .filter(t => t.TaskStep === s.step)
      .reduce((acc, t) => acc + (Number(t.Weight) || 0), 0)
    const ratio = weight / total
    const percent = formatUnifiedProb(ratio * 100)
    return {
      ...s,
      weight,
      percent
    }
  })
})

const taskCategories = ['全部', '完成悬赏', '采集物资', '挑战地城', '探索秘境', '挖掘秘宝']
const selectedTaskCat = ref('全部')

const taskStepFilters = [
  { label: '全部', value: 'all' },
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]
const selectedTaskStep = ref('all')

const getStepChineseName = (step) => {
  switch (step) {
    case 'SS': return '神话'
    case 'S':  return '传说'
    case 'A':  return '史诗'
    case 'B':  return '稀有'
    case 'C':  return '普通'
    default:   return step
  }
}

const formatTaskReward = (reward) => {
  if (!reward) return ''
  const mapped = reward
    .replace(/SS阶/g, '神话')
    .replace(/S阶/g, '传说')
    .replace(/A阶/g, '史诗')
    .replace(/B阶/g, '稀有')
    .replace(/C阶/g, '普通')
  
  if (mapped.includes('×30')) {
    return mapped.replace('×30', '× 30 ~ 180（满人180个）')
  }
  if (mapped.includes('×1')) {
    if (mapped.includes('装备')) {
      return mapped.replace('×1', '× 1 ~ 6 件（满人6件）')
    }
    return mapped.replace('×1', '× 1 ~ 6（满人6个）')
  }
  return mapped
}

const getRolePossiLines = (task) => {
  if (!task || !task.SRolePossi) return ['无额外加成']
  const parts = task.SRolePossi.split(',').map(Number)
  if (parts.every(p => p === 0) || task.TaskStep === 'S') {
    return ['基础 100% 传说产出']
  }
  if (task.TaskStep === 'C') {
    return [
      '传说角色：稀有 +4% / 史诗 +2%',
      '史诗角色：稀有 +2% / 史诗 +1%',
      '稀有角色：稀有 +1%'
    ]
  }
  if (task.TaskStep === 'B') {
    return [
      '传说角色：史诗 +2% / 传说 +1%',
      '史诗角色：史诗 +1%'
    ]
  }
  if (task.TaskStep === 'A') {
    return [
      '传说角色：传说 +1%'
    ]
  }
  return ['派遣高阶角色可跨阶暴击高品质道具']
}

const getStepConfig = (step) => {
  switch (step) {
    case 'SS': return { color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.15)' }
    case 'S':  return { color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.15)' }
    case 'A':  return { color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.15)' }
    case 'B':  return { color: '#3b82f6', lightBg: 'rgba(59, 130, 246, 0.15)' }
    case 'C':  return { color: '#10b981', lightBg: 'rgba(168, 185, 129, 0.15)' }
    default:   return { color: '#6b7280', lightBg: 'rgba(107, 114, 128, 0.15)' }
  }
}

const getTaskProb = (weight) => {
  if (!weight || !totalCommissionWeight.value) return '0.00%'
  const pct = (weight / totalCommissionWeight.value) * 100
  return formatUnifiedProb(pct)
}

const STEP_PRIORITY = { 'SS': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1 }

const filteredTasks = computed(() => {
  const list = rawTasks.value.filter(t => {
    if (selectedTaskCat.value !== '全部' && t.Name !== selectedTaskCat.value) return false
    if (selectedTaskStep.value !== 'all' && t.TaskStep !== selectedTaskStep.value) return false
    return true
  })
  // 同一种任务高阶放前面（按品阶降序排列 S -> A -> B -> C）
  return [...list].sort((a, b) => (STEP_PRIORITY[b.TaskStep] || 0) - (STEP_PRIORITY[a.TaskStep] || 0))
})

// ==================== TAB 3: 地图红装数据 ====================
const redSearchQuery = ref('')

const allRedEquips = computed(() => {
  const equips = equipData.DataTable || equipData || []
  return equips.filter(e => e.Step === 'SS')
})

const filteredRedEquips = computed(() => {
  const q = redSearchQuery.value.trim().toLowerCase()
  if (!q) return allRedEquips.value
  return allRedEquips.value.filter(e => {
    return e.Name.toLowerCase().includes(q) ||
      (e.AreaName && e.AreaName.toLowerCase().includes(q)) ||
      (e.Description && e.Description.toLowerCase().includes(q))
  })
})
</script>

<style scoped>
.other-prob-container {
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

.other-prob-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 8px;
}

/* 主标签页切换（商人/宝库同款风格） */
.main-tab-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.main-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  text-align: center;
}

.main-tab-btn:hover {
  border-color: #3b82f6;
}

.main-tab-btn.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.main-tab-text-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.main-tab-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.main-tab-btn.active .main-tab-title {
  color: #3b82f6;
}

.main-tab-desc {
  font-size: 11px;
  color: var(--text-sub);
}

/* 内容区域 */
.prob-content-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
  padding-right: 2px;
}

.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

/* 规则网格 */
.rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.rule-item {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-label {
  font-size: 12px;
  color: var(--text-sub);
}

.rule-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.rule-desc {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
}

.highlight-energy {
  color: #3b82f6;
}

/* 模拟器样式 */
.sim-slider-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.energy-text {
  font-size: 18px;
  color: #3b82f6;
}

.step-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.energy-slider {
  width: 100%;
  cursor: pointer;
  accent-color: #3b82f6;
}

.quick-btns-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.quick-label {
  color: var(--text-sub);
  font-weight: 600;
}

.quick-btn {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.reset-btn {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
  color: #ef4444;
}

.sim-result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 4px;
}

.result-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.res-label {
  font-size: 11px;
  color: var(--text-sub);
}

.res-val {
  font-size: 15px;
  font-weight: 700;
}

.time-val { color: #3b82f6; font-family: monospace; }
.gold-val { color: #16a34a; }
.gem-val { color: #8b5cf6; }
.special-val { color: #f97316; font-size: 13px; }

/* 表格样式 */
.table-container {
  overflow-x: auto;
}

.prob-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  font-size: 13px;
}

.prob-table th, .prob-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-color);
}

.prob-table th {
  background: var(--bg);
  color: var(--text-sub);
  font-weight: 600;
}

.step-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

/* 委托看板 */
.commission-compact-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 12px 24px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
}

.compact-stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.compact-percent {
  font-size: 15px;
  font-weight: 800;
}

/* 机制说明框 */
.mechanic-tip-box {
  background: var(--bg);
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.6;
}

.mechanic-title {
  font-weight: 700;
  color: #f97316;
  margin-bottom: 4px;
}

.mechanic-desc code {
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
  color: #3b82f6;
}

/* 筛选工具栏 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
}

.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.filter-btn {
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 10px;
  color: var(--text-main);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.filter-btn.active {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: 700;
}

.step-filter-S.active { background: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; }
.step-filter-A.active { background: rgba(168, 85, 247, 0.15) !important; color: #a855f7 !important; }
.step-filter-B.active { background: rgba(59, 130, 246, 0.15) !important; color: #3b82f6 !important; }
.step-filter-C.active { background: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; }

/* 任务卡片网格 */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.task-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: transform 0.15s ease;
}

.task-card:hover {
  transform: translateY(-2px);
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.task-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-name {
  font-size: 14px;
  font-weight: 700;
}

.task-prob-badge {
  font-size: 11px;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-radius: 6px;
  padding: 2px 7px;
  font-weight: 600;
}

.task-prob-badge strong {
  color: #3b82f6;
  font-weight: 700;
}

.task-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.task-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-possi-row {
  align-items: flex-start;
  gap: 8px;
  margin-top: 2px;
}

.info-label {
  color: var(--text-sub);
  white-space: nowrap;
}

.reward-val {
  font-weight: 700;
  color: #16a34a;
}

.possi-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex: 1;
}

.possi-line {
  color: #8b5cf6;
  font-size: 11px;
  line-height: 1.35;
  text-align: right;
}

/* 红装概率 */
.red-prob-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.red-prob-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.monster-step-title {
  font-size: 13px;
  font-weight: 700;
}

.prob-num {
  font-size: 24px;
  font-weight: 800;
}

.highlight-purple { color: #a855f7; }
.highlight-orange { color: #f97316; }
.highlight-red { color: #f43f5e; }
.zero { color: #6b7280; }

.prob-sub {
  font-size: 11px;
  color: var(--text-sub);
}

/* 红装模拟器 */
.red-sim-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.sim-counter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.sim-counter-label {
  font-weight: 600;
}

.counter-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cnt-btn {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-main);
  font-weight: 700;
}

.cnt-input {
  width: 50px;
  text-align: center;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-main);
  font-weight: 700;
}

.sim-calc-result {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 10px;
  padding: 8px 14px;
}

.calc-label {
  font-size: 13px;
  font-weight: 700;
}

.calc-rate {
  font-size: 18px;
  font-weight: 800;
  color: #f43f5e;
}

.calc-sub {
  font-size: 11px;
  color: var(--text-sub);
}

/* 红装卡片一览 */
.red-search-input {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text-main);
  outline: none;
}

.red-equips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.red-equip-card {
  background: var(--bg);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.red-equip-avatar-box {
  width: 60px;
  height: 60px;
  background: rgba(244, 63, 94, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 6px;
}

.red-equip-img,
.game-sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.red-card-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.red-equip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.red-equip-name {
  font-size: 15px;
  font-weight: 800;
  color: #f43f5e;
}

.red-map-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.red-tags-row {
  display: flex;
  gap: 6px;
}

.meta-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.type-tag { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.class-tag { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
.drop-tag { background: rgba(244, 63, 94, 0.12); color: #f43f5e; }

.red-rates-row {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-sub);
}

.red-rates-row strong {
  color: var(--text-main);
}

.red-desc {
  margin: 0;
  font-size: 11px;
  color: var(--text-sub);
  line-height: 1.4;
  font-style: italic;
}

@media (max-width: 600px) {
  /* 3个页面的统计与规则卡片手机端统一改为一行2个 */
  .rule-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }
  
  .sim-result-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }
  
  .commission-stat-row {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }
  
  .red-prob-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }

  .stat-pill {
    padding: 8px 10px;
    gap: 4px;
  }

  .pill-ratio {
    font-size: 16px;
  }

  .rule-item {
    padding: 8px 10px;
  }

  .rule-value {
    font-size: 14px;
  }

  .red-prob-box {
    padding: 10px 8px;
  }

  .prob-num {
    font-size: 20px;
  }
}
</style>
