<template>
  <div class="godstone-container">
    <div class="godstone-sticky-top">
      <!-- 顶部标签页切换（商人/宝库/其他概率同款卡片样式） -->
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

      <!-- TAB 2: 词条大全筛选栏 -->
      <div v-if="activeTab === 'effects'" class="godstone-search-filter-area">
        <div class="talent-search-row">
          <div class="talent-search-box">
            <img src="/ui/search.svg" class="search-icon" />
            <input
              type="text"
              v-model="effectSearchQuery"
              placeholder="搜索词条效果、类型、标签..."
              class="talent-search-input"
            />
            <button v-if="effectSearchQuery" class="clear-btn" @click="effectSearchQuery = ''">✕</button>
          </div>
        </div>

        <div class="filter-panel">
          <!-- 1. 品阶筛选 -->
          <div class="filter-row">
            <span class="filter-label">品阶：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedEffectStep === 'all' }"
                @click="selectedEffectStep = 'all'"
              >
                全部
              </button>
              <button
                v-for="opt in stepFilterOptions"
                :key="opt.value"
                class="filter-btn step-btn"
                :class="[`step-btn-${opt.value}`, { active: selectedEffectStep === opt.value }]"
                @click="selectedEffectStep = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 2. 类型筛选 -->
          <div class="filter-row">
            <span class="filter-label">类型：</span>
            <div class="filter-options">
              <button
                v-for="type in effectTypes"
                :key="type"
                class="filter-btn"
                :class="{ active: selectedEffectType === type }"
                @click="selectedEffectType = type"
              >
                {{ type }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 1: 词条列表 ==================== -->
    <div v-if="activeTab === 'effects'" class="godstone-content-body">
      <div class="effects-stat-bar">
        <span>共匹配到 <strong class="highlight-count">{{ filteredEffects.length }}</strong> 条神石觉醒词条</span>
      </div>

      <div class="effects-grid">
        <div
          v-for="(effect, idx) in filteredEffects"
          :key="effect.IDs"
          class="effect-card"
        >
          <div class="effect-card-header">
            <div class="effect-title-group">
              <span class="step-pill" :style="{ background: getStepBg(effect.Step), color: getStepColor(effect.Step) }">
                {{ getStepName(effect.Step) }}
              </span>
              <span class="effect-type-badge">{{ effect.Type }}</span>
            </div>
          </div>

          <!-- 词条效果文本行与右侧概率展开收起按钮 -->
          <div class="effect-main-body">
            <div class="effect-text-row">
              <div class="effect-text" :style="{ color: getStepColor(effect.Step) }">
                {{ formatEffectText(effect) }}
              </div>
              <button class="prob-toggle-btn" @click="toggleEffectProb(effect, idx)">
                <span>概率</span>
                <span class="toggle-arrow" :class="{ 'is-open': isProbExpanded(effect.IDs) }">▼</span>
              </button>
            </div>

            <!-- 概率面板（默认收起） -->
            <div v-if="isProbExpanded(effect.IDs)" class="effect-prob-info-block">
              <div class="prob-header-tip">基础</div>

              <div class="prob-line-item">
                <span class="prob-item-title">无色神石概率：</span>
                <span class="prob-item-val base-prob-badge">{{ getAffixProb(effect, 'C').base }}</span>
              </div>

              <div v-if="getTargetStoneName(effect.Type)" class="prob-line-item">
                <span class="prob-item-title">【<span class="stone-highlight-blue">{{ getTargetStoneName(effect.Type) }}</span>】概率：</span>
                <span class="prob-item-val target-prob-badge">{{ getAffixProb(effect, 'C').target }}</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">其他神石概率：</span>
                <span class="prob-item-val other-prob-badge">{{ getAffixProb(effect, 'C').other }}</span>
              </div>

              <div class="prob-header-tip" style="margin-top: 6px;">
                <span>无色神石 / </span>
                <span class="stone-highlight-blue">【{{ getTargetStoneName(effect.Type) || '对应神石' }}】</span>
                <span> / 其他</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">绿色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-c">{{ getAwakeProbFormatted(effect, 'C') }}</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">蓝色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-b">{{ getAwakeProbFormatted(effect, 'B') }}</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">紫色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-a">{{ getAwakeProbFormatted(effect, 'A') }}</span>
              </div>

              <div class="prob-header-tip" style="margin-top: 6px;">
                <div>已有相同词条时</div>
                <div style="margin-top: 2px;">
                  <span>无色神石 / </span>
                  <span class="stone-highlight-blue">【{{ getTargetStoneName(effect.Type) || '对应神石' }}】</span>
                  <span> / 其他</span>
                </div>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">绿色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-c">{{ getSameAwakeProbFormatted(effect, 'C') }}</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">蓝色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-b">{{ getSameAwakeProbFormatted(effect, 'B') }}</span>
              </div>

              <div class="prob-line-item">
                <span class="prob-item-title">紫色觉醒石概率：</span>
                <span class="prob-item-val awake-badge-a">{{ getSameAwakeProbFormatted(effect, 'A') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 2: 神石图鉴 ==================== -->
    <div v-if="activeTab === 'stones'" class="godstone-content-body">
      <!-- 神石卡片网格 -->
      <div class="stones-grid">
        <div
          v-for="stone in godStones"
          :key="stone.IDs"
          class="stone-card"
          :style="{ borderColor: getStepColor(stone.Step) }"
          @click="openStoneDetail(stone)"
        >
          <div class="stone-card-left">
            <div class="stone-avatar-box" :style="{ background: getStepBg(stone.Step) }">
              <img :src="getStoneIcon(stone.IDs)" :alt="stone.Name" class="stone-img game-sprite" />
            </div>
          </div>

          <div class="stone-card-right">
            <div class="stone-header">
              <span class="stone-name" :style="{ color: getStepColor(stone.Step) }">{{ stone.Name }}</span>
              <span class="step-pill" :style="{ background: getStepBg(stone.Step), color: getStepColor(stone.Step) }">
                {{ getStepName(stone.Step) }}
              </span>
            </div>

            <div class="stone-tags-row">
              <span class="meta-tag tag-type">{{ stone.Tag }}</span>
              <span class="meta-tag tag-prob">概率 {{ getStoneDropProb(stone) }}</span>
            </div>

            <p class="stone-desc">{{ formatStoneDesc(stone) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 神石详情弹窗 -->
    <div v-if="selectedStone" class="custom-modal-overlay" @click.self="selectedStone = null">
      <div class="custom-modal-card stone-modal-card">
        <div class="modal-header">
          <h3>{{ selectedStone.Name }}</h3>
          <button class="modal-close-btn" @click="selectedStone = null">✕</button>
        </div>

        <div class="modal-body stone-modal-body">
          <div class="modal-avatar-area">
            <div class="modal-stone-avatar" :style="{ background: getStepBg(selectedStone.Step) }">
              <img :src="getStoneIcon(selectedStone.IDs)" :alt="selectedStone.Name" class="game-sprite" />
            </div>
            <div class="modal-stone-main-info">
              <div class="modal-name-row">
                <span class="modal-stone-name" :style="{ color: getStepColor(selectedStone.Step) }">{{ selectedStone.Name }}</span>
                <span class="step-pill" :style="{ background: getStepBg(selectedStone.Step), color: getStepColor(selectedStone.Step) }">
                  {{ getStepName(selectedStone.Step) }}
                </span>
              </div>
              <div class="modal-tag-row">
                <span class="meta-tag tag-type">{{ selectedStone.Tag }}</span>
                <span class="meta-tag tag-prob">概率 {{ getStoneDropProb(selectedStone) }}</span>
              </div>
            </div>
          </div>

          <div class="modal-desc-box">
            <div class="modal-section-title">神石特性</div>
            <p class="modal-desc-content">{{ formatStoneDesc(selectedStone) }}</p>
          </div>

          <div class="modal-desc-box">
            <div class="modal-section-title">词条加成</div>
            <p class="modal-desc-content">
              <template v-if="selectedStone.Tag === '通用'">
                无色神石无特定偏向，全类型词条均按基础出率等概率生成。
              </template>
              <template v-else>
                【<strong>{{ selectedStone.Tag }}</strong>】相关词条出现概率提升 50%。
              </template>
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="selectedStone = null">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import godStoneData from '@/assets/Godstone.json'
import godStoneEffectData from '@/assets/GodstoneEffect.json'

const tabs = [
  { id: 'effects', name: '词条列表' },
  { id: 'stones', name: '神石图鉴' }
]
const activeTab = ref('effects')

// 基础数据
const godStones = computed(() => {
  const raw = godStoneData.DataTable || godStoneData || []
  const stepOrder = { S: 4, A: 3, B: 2, C: 1 }
  return [...raw].sort((a, b) => (stepOrder[b.Step] || 0) - (stepOrder[a.Step] || 0))
})

const totalStoneWeight = computed(() => {
  const raw = godStoneData.DataTable || godStoneData || []
  return raw.reduce((sum, s) => sum + (s.Weight || 0), 0)
})

const getStoneDropProb = (stone) => {
  if (!totalStoneWeight.value || !stone.Weight) return '0%'
  const p = (stone.Weight / totalStoneWeight.value) * 100
  return p.toFixed(2) + '%'
}

const allEffects = computed(() => godStoneEffectData.DataTable || godStoneEffectData || [])

// 词条大全筛选状态
const effectSearchQuery = ref('')
const selectedEffectType = ref('全部')
const selectedEffectStep = ref('all')

const effectTypes = ['全部', '数值', '攻击', '防御', '治疗', '抗性', '增益', '减益']
const stepFilterOptions = [
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]

// 过滤后的词条（默认按出品阶降序排列：传说 -> 史诗 -> 稀有 -> 普通）
const filteredEffects = computed(() => {
  let list = allEffects.value

  // 类型过滤
  if (selectedEffectType.value !== '全部') {
    list = list.filter(e => e.Type === selectedEffectType.value)
  }

  // 品阶过滤
  if (selectedEffectStep.value !== 'all') {
    list = list.filter(e => e.Step === selectedEffectStep.value)
  }

  // 搜索过滤
  if (effectSearchQuery.value.trim()) {
    const q = effectSearchQuery.value.trim().toLowerCase()
    list = list.filter(e => {
      const effectStr = (e.Effect || '').toLowerCase()
      const typeStr = (e.Type || '').toLowerCase()
      const tagStr = ((e.PositiveTags || '') + ' ' + (e.FilterTags || '')).toLowerCase()
      return effectStr.includes(q) || typeStr.includes(q) || tagStr.includes(q)
    })
  }

  // 按品阶降序 (S -> A -> B -> C)
  const stepRankOrder = { S: 4, A: 3, B: 2, C: 1 }
  return [...list].sort((a, b) => (stepRankOrder[b.Step] || 0) - (stepRankOrder[a.Step] || 0))
})

// 弹窗状态
const selectedStone = ref(null)
const openStoneDetail = (stone) => {
  selectedStone.value = stone
}

// 概率面板展开/收起状态（默认收起，点击时同行的卡片联动同时展开/收起）
const expandedEffects = ref(new Set())
const toggleEffectProb = (effect, idx) => {
  const isCurrentlyOpen = isProbExpanded(effect.IDs)
  const next = new Set(expandedEffects.value)

  // 找出同行配对的卡片 (按 2 列排版)
  const partnerIdx = (idx % 2 === 0) ? idx + 1 : idx - 1
  const partner = filteredEffects.value[partnerIdx]

  if (isCurrentlyOpen) {
    next.delete(effect.IDs)
    if (partner) next.delete(partner.IDs)
  } else {
    next.add(effect.IDs)
    if (partner) next.add(partner.IDs)
  }
  expandedEffects.value = next
}
const isProbExpanded = (id) => {
  return expandedEffects.value.has(id)
}

// 辅助工具方法
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

const getStepIndexName = (idx) => {
  const names = ['普通', '稀有', '史诗', '传说']
  return names[idx] || `阶段${idx + 1}`
}

const getStepIndexColor = (idx) => {
  const colors = ['#10b981', '#3b82f6', '#a855f7', '#f97316']
  return colors[idx] || '#6b7280'
}

const getStoneIcon = (id) => {
  return `/GodStone/${id}.png`
}

const formatStoneDesc = (stone) => {
  if (!stone.Description) return ''
  return stone.Description.replace('{0}', stone.Tag || '')
}

// 属性类型与专属神石映射
const typeToStoneMap = {
  '数值': { name: '洁白神石', tag: '数值' },
  '防御': { name: '钴蓝神石', tag: '防御' },
  '治疗': { name: '翠绿神石', tag: '治疗' },
  '攻击': { name: '绯红神石', tag: '攻击' },
  '抗性': { name: '黑曜神石', tag: '抗性' },
  '增益': { name: '金黄神石', tag: '增益' },
  '减益': { name: '暗紫神石', tag: '减益' }
}

const getTargetStoneName = (type) => {
  return typeToStoneMap[type]?.name || ''
}

// 缓存总基础权重（无色神石）
const totalBaseWeight = computed(() => {
  return allEffects.value.reduce((acc, cur) => acc + (cur.Weight || 0), 0)
})

// 格式化概率显示（小数值自适应高精度）
const formatProbPercent = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0%'
  if (num >= 1) return num.toFixed(2) + '%'
  if (num >= 0.1) return num.toFixed(3) + '%'
  return num.toFixed(4) + '%'
}

// 7 种偏向神石的属性类型与位阶等级映射
const allStoneTypes = ['数值', '攻击', '防御', '治疗', '抗性', '增益', '减益']
const stepRankMap = { 'C': 0, 'B': 1, 'A': 2, 'S': 3 }

// 计算特定觉醒石门槛与特定神石偏向下的有效总权重池
const getPoolWeightCached = (reqStep, boostType) => {
  const minRank = stepRankMap[reqStep] || 0
  return allEffects.value
    .filter(e => (stepRankMap[e.Step] || 0) >= minRank)
    .reduce((sum, e) => {
      let w = e.Weight || 0
      if (boostType && e.Type === boostType) w *= 1.5
      return sum + w
    }, 0)
}

// 计算同位阶总权重
const getStepPoolWeight = (step, boostType) => {
  return allEffects.value
    .filter(e => e.Step === step)
    .reduce((sum, e) => {
      let w = e.Weight || 0
      if (boostType && e.Type === boostType) w *= 1.5
      return sum + w
    }, 0)
}

// 计算词条在：无色神石、对应专属神石、其他神石以及同位阶连携(25%)下的真实出率
const getAffixProb = (effect, reqStep) => {
  const minRank = stepRankMap[reqStep] || 0
  const eRank = stepRankMap[effect.Step] || 0
  if (eRank < minRank) {
    return {
      base: '0%', target: '0%', other: '0%',
      sameBase: '0%', sameTarget: '0%', sameOther: '0%'
    }
  }

  // 1. 无色神石（无任何Tag加成）
  const basePool = getPoolWeightCached(reqStep, null)
  const pBase = basePool && effect.Weight ? (effect.Weight / basePool) * 100 : 0
  const stepBasePool = getStepPoolWeight(effect.Step, null)
  const pStepBase = basePool && stepBasePool ? stepBasePool / basePool : 0
  const pWithinStepBase = stepBasePool && effect.Weight ? effect.Weight / stepBasePool : 0
  const pSameBase = (pStepBase * (0.25 + 0.75 * pWithinStepBase)) * 100

  // 2. 对应专属神石（本词条所属Tag权重*1.5）
  const targetPool = getPoolWeightCached(reqStep, effect.Type)
  const pTarget = targetPool && effect.Weight ? ((effect.Weight * 1.5) / targetPool) * 100 : 0
  const stepTargetPool = getStepPoolWeight(effect.Step, effect.Type)
  const pStepTarget = targetPool && stepTargetPool ? stepTargetPool / targetPool : 0
  const pWithinStepTarget = stepTargetPool && effect.Weight ? (effect.Weight * 1.5) / stepTargetPool : 0
  const pSameTarget = (pStepTarget * (0.25 + 0.75 * pWithinStepTarget)) * 100

  // 3. 其他神石（偏向非本Tag的其他神石）
  const otherTypes = allStoneTypes.filter(t => t !== effect.Type)
  const avgOtherPool = otherTypes.length > 0
    ? otherTypes.reduce((acc, t) => acc + getPoolWeightCached(reqStep, t), 0) / otherTypes.length
    : basePool
  const pOther = avgOtherPool && effect.Weight ? (effect.Weight / avgOtherPool) * 100 : 0
  const avgOtherStepPool = otherTypes.length > 0
    ? otherTypes.reduce((acc, t) => acc + getStepPoolWeight(effect.Step, t), 0) / otherTypes.length
    : stepBasePool
  const pStepOther = avgOtherPool && avgOtherStepPool ? avgOtherStepPool / avgOtherPool : 0
  const pWithinStepOther = avgOtherStepPool && effect.Weight ? effect.Weight / avgOtherStepPool : 0
  const pSameOther = (pStepOther * (0.25 + 0.75 * pWithinStepOther)) * 100

  return {
    base: formatProbPercent(pBase),
    target: formatProbPercent(pTarget),
    other: formatProbPercent(pOther),
    sameBase: formatProbPercent(pSameBase),
    sameTarget: formatProbPercent(pSameTarget),
    sameOther: formatProbPercent(pSameOther)
  }
}

// 格式化觉醒石概率：无色 / 对应 / 其他
const getAwakeProbFormatted = (effect, reqStep) => {
  const p = getAffixProb(effect, reqStep)
  if (p.base === '0%' && p.target === '0%' && p.other === '0%') {
    return '0% / 0% / 0%'
  }
  return `${p.base} / ${p.target} / ${p.other}`
}

// 格式化已有相同词条时的觉醒石概率：无色 / 对应 / 其他
const getSameAwakeProbFormatted = (effect, reqStep) => {
  const p = getAffixProb(effect, reqStep)
  if (p.sameBase === '0%' && p.sameTarget === '0%' && p.sameOther === '0%') {
    return '0% / 0% / 0%'
  }
  return `${p.sameBase} / ${p.sameTarget} / ${p.sameOther}`
}

const formatEffectText = (effect) => {
  if (!effect.Effect) return ''
  let text = effect.Effect

  const cleanValues = (valStr) => {
    if (!valStr) return ''
    const parts = valStr.split(',').map(s => s.trim()).filter(Boolean)
    // 去除重复的档位数值，例如 4,4,4,8 -> 4/8，5,5,10,15 -> 5/10/15
    const uniqueParts = [...new Set(parts)]
    return uniqueParts.join('/')
  }

  const val0Str = cleanValues(effect.Value0)
  const val1Str = cleanValues(effect.Value1)
  const val2Str = cleanValues(effect.Value2)

  if (val0Str) text = text.replace('{0}', val0Str)
  if (val1Str) text = text.replace('{1}', val1Str)
  if (val2Str) text = text.replace('{2}', val2Str)

  return text
}

const getStepCombinedValue = (effect, idx) => {
  const parts0 = effect.Value0 ? effect.Value0.split(',').map(s => s.trim()) : []
  const parts1 = effect.Value1 ? effect.Value1.split(',').map(s => s.trim()) : []
  const val0 = parts0[idx] !== undefined ? parts0[idx] : (parts0[0] || '')
  if (parts1.length > 0) {
    const val1 = parts1[idx] !== undefined ? parts1[idx] : (parts1[0] || '')
    return `${val0}, ${val1}`
  }
  return val0
}

// 计算各数值档位的合并概率
const getValueProbabilities = (effect) => {
  if (!effect.Value0) return []
  const parts0 = effect.Value0.split(',').map(s => s.trim())
  const parts1 = effect.Value1 ? effect.Value1.split(',').map(s => s.trim()) : []

  // 4 档位概率权重: 前3档各占 30%，满值第4档占 10% (合计 100%)
  const tierProbs = [30.0, 30.0, 30.0, 10.0]

  // 合并相同数值的概率
  const map = new Map()
  for (let i = 0; i < 4; i++) {
    const v0 = parts0[i] !== undefined ? parts0[i] : (parts0[0] || '')
    let valStr = v0
    if (parts1.length > 0) {
      const v1 = parts1[i] !== undefined ? parts1[i] : (parts1[0] || '')
      valStr = `${v0}, ${v1}`
    }
    const currentProb = map.get(valStr) || 0
    map.set(valStr, currentProb + tierProbs[i])
  }

  const result = []
  map.forEach((prob, val) => {
    result.push({
      val,
      prob: Math.round(prob) + '%'
    })
  })
  return result
}

const getTagsList = (effect) => {
  const tags = []
  if (effect.FilterTags) {
    effect.FilterTags.split(',').forEach(t => t.trim() && tags.push(t.trim()))
  }
  if (effect.PositiveTags) {
    effect.PositiveTags.split(',').forEach(t => t.trim() && !tags.includes(t.trim()) && tags.push(t.trim()))
  }
  return tags
}
</script>

<style scoped>
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.godstone-container {
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

.godstone-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 8px;
}

/* 主标签页切换（其他概率/商人同款风格） */
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

.main-tab-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.main-tab-btn.active .main-tab-title {
  color: #3b82f6;
}

/* 搜索与筛选工具栏 */
/* ===== 搜索栏（100% 统一 TalentView 规范） ===== */
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
  position: relative;
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
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
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

/* 内容区域 */
.godstone-content-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
  padding-right: 2px;
}

.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.official-rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.official-rule-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--text-main);
}

.rule-bullet {
  color: #f97316;
  font-weight: bold;
  flex-shrink: 0;
}

.rule-txt {
  flex: 1;
}

.step-color-S { color: #f97316; font-weight: 700; }
.step-color-A { color: #a855f7; font-weight: 700; }
.step-color-B { color: #3b82f6; font-weight: 700; }
.step-color-C { color: #10b981; font-weight: 700; }

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.summary-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}

/* 神石卡片网格 */
.stones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}

.stone-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.stone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.stone-avatar-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px;
}

.stone-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.stone-card-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.stone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stone-name {
  font-size: 15px;
  font-weight: 800;
}

.step-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.stone-tags-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.meta-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

.tag-type {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  font-weight: 700;
}

.tag-prob {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  font-weight: 700;
}

.stone-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.4;
}

/* 词条大全样式 */
.effects-stat-bar {
  font-size: 12px;
  color: var(--text-sub);
  padding: 0 4px;
}

.highlight-count {
  color: #3b82f6;
  font-weight: 700;
}

.effects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 10px;
}

.effect-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.effect-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.effect-type-badge {
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
}

.effect-location-badge {
  font-size: 11px;
  color: var(--text-sub);
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 4px;
}

.effect-weight-text {
  font-size: 11px;
  color: var(--text-sub);
}

.effect-main-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-text-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.effect-text {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  flex: 1;
}

.prob-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.prob-toggle-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.toggle-arrow {
  font-size: 9px;
  color: #1e293b;
  transition: transform 0.2s ease;
  display: inline-block;
  line-height: 1;
}

.toggle-arrow.is-open {
  transform: rotate(180deg);
}

.effect-prob-info-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
}

.prob-line-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.prob-item-title {
  color: var(--text-sub);
  font-weight: 600;
}

.prob-item-val {
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.base-prob-badge {
  background: rgba(107, 114, 128, 0.12);
  color: var(--text-main);
}

.target-prob-badge {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.other-prob-badge {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.prob-divider-line {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0 2px;
  opacity: 0.6;
}

.prob-header-tip {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 600;
  line-height: 1.4;
}

.stone-highlight-blue {
  color: #3b82f6 !important;
  font-weight: 700;
}

.prob-item-tip {
  font-size: 11px;
  color: var(--text-sub);
  opacity: 0.8;
}

.prob-tag-bonus {
  font-size: 11px;
  color: #10b981;
  font-weight: 600;
}

.awake-badge-c {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.awake-badge-b {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.awake-badge-a {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.awake-badge-s {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
}

.quality-values-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-color);
}

.quality-box-title {
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 600;
}

.quality-step-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quality-step-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.quality-step-chip.step-c strong { color: #10b981; }
.quality-step-chip.step-b strong { color: #3b82f6; }
.quality-step-chip.step-a strong { color: #a855f7; }
.quality-step-chip.step-s strong { color: #f97316; }

/* 规则板块样式 */
.rules-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 6px;
}

.rule-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.section-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}

/* 弹窗样式 */
.stone-modal-card {
  max-width: 440px !important;
}

.stone-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px !important;
}

.modal-avatar-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-stone-avatar {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.modal-stone-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modal-stone-main-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-stone-name {
  font-size: 17px;
  font-weight: 800;
}

.modal-tag-row {
  display: flex;
  gap: 6px;
}

.modal-desc-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-desc-content {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

/* 移动端两列适配 */
@media (max-width: 600px) {
  .stones-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }

  .stone-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px;
    gap: 8px;
  }

  .stone-avatar-box {
    width: 44px;
    height: 44px;
  }

  .stone-name {
    font-size: 13px;
  }

  .stone-desc {
    font-size: 11px;
  }

  .effects-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
