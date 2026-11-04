<template>
  <div class="dex-container">
    <div class="dex-inner">
      <div class="dex-hero">
        <div class="dex-hero-title">世界图鉴等级计算器</div>
        <div class="dex-hero-sub">输入当前等级与经验，算出离「理论满级」还差多少</div>
      </div>

      <!-- 输入 -->
      <div class="dex-card">
        <div class="dex-input-row">
          <label class="dex-field">
            <span class="dex-field-label">当前等级</span>
            <input v-model.number="inLevel" type="number" min="1" class="dex-input" placeholder="212" />
          </label>
          <label class="dex-field">
            <span class="dex-field-label">当前经验</span>
            <input v-model.number="inExp" type="number" min="0" class="dex-input" placeholder="3560" />
          </label>
        </div>
        <div class="dex-hint">游戏内「世界图鉴」中间那条：212级 (3560/8000)</div>
      </div>

      <!-- 结果 -->
      <div v-if="result" class="dex-card result-card">
        <div class="res-top">
          <div>
            <div class="res-lv">Lv {{ result.level }}</div>
            <div class="res-exp">{{ result.remain }} / {{ result.need }}</div>
          </div>
          <div class="res-total">
            <span class="res-total-label">当前总经验</span>
            <span class="res-total-value">{{ fmt(result.total) }}</span>
          </div>
        </div>
        <div class="dex-progress-bg">
          <div class="dex-progress-fill" :style="{ width: result.pct + '%' }"></div>
        </div>

        <div class="res-compare">
          <div class="cmp-item">
            <span class="cmp-label">当前总经验</span>
            <strong>{{ fmt(result.total) }}</strong>
          </div>
          <div class="cmp-item">
            <span class="cmp-label">理论满级总经验</span>
            <strong class="primary">{{ fmt(theory.totals.max) }}</strong>
          </div>
          <div class="cmp-item highlight">
            <span class="cmp-label">还差经验</span>
            <strong class="warn">{{ fmt(result.gap) }}</strong>
          </div>
        </div>

        <div class="dex-conclusion" :class="result.gap <= 0 ? 'done' : ''">
          <template v-if="result.gap > 0">
            距 Lv{{ theory.levels.max[0] }} 还差
            <strong>{{ result.levelGap }}</strong> 级（还需
            <strong>{{ fmt(result.gap) }}</strong> 经验）
          </template>
          <template v-else>
            已达到理论满级 Lv{{ theory.levels.max[0] }} 🎉
          </template>
        </div>
      </div>

      <!-- 装备明细 -->
      <div class="dex-section-title">装备（按品质）</div>
      <div class="dex-table-wrap">
        <table class="dex-table">
          <thead>
            <tr>
              <th>品质</th>
              <th>数量</th>
              <th>收集</th>
              <th>升星</th>
              <th>传承</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in equipDetail" :key="d.step">
              <td class="step-cell" :style="{ color: stepColor(d.step) }">
                {{ stepName(d.step) }}
              </td>
              <td class="num">{{ d.count }}</td>
              <td>{{ fmt(d.collectExp) }}</td>
              <td>{{ fmt(d.starExp) }}</td>
              <td>{{ fmt(d.heritageExpMax) }}</td>
              <td class="num strong">{{ fmt(d.collectExp + d.starExp + d.heritageExpMax) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="foot-label">装备合计</td>
              <td class="num">{{ equipSum.count }}</td>
              <td>{{ fmt(equipSum.collect) }}</td>
              <td>{{ fmt(equipSum.star) }}</td>
              <td>{{ fmt(equipSum.heritage) }}</td>
              <td class="num strong">{{ fmt(equipSum.total) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 其它三类 -->
      <div class="dex-section-title">角色 / 符文 / 莱姆</div>
      <div class="dex-table-wrap">
        <table class="dex-table">
          <thead>
            <tr>
              <th>类别</th>
              <th>品质</th>
              <th>数量</th>
              <th>收集</th>
              <th>升星</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="src in otherSources" :key="src.key">
              <tr v-for="d in src.detail" :key="src.key + d.step">
                <td>{{ src.label }}</td>
                <td class="step-cell" :style="{ color: stepColor(d.step) }">
                  {{ stepName(d.step) }}
                </td>
                <td class="num">{{ d.count }}</td>
                <td>{{ fmt(d.collectExp) }}</td>
                <td>{{ fmt(d.starExp) }}</td>
                <td class="num strong">{{ fmt(d.collectExp + d.starExp) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 总计 -->
      <div class="dex-section-title">理论满级总经验</div>
      <div class="dex-breakdown">
        <div class="dex-breakdown-head">
          <span>类别</span>
          <span>收集</span>
          <span>升星</span>
          <span>传承</span>
          <span>合计</span>
        </div>
        <div v-for="s in theory.sources" :key="s.key" class="dex-breakdown-row">
          <span class="bd-label">{{ s.label }}</span>
          <span class="bd-num">{{ fmt(s.collect) }}</span>
          <span class="bd-num">{{ fmt(s.star) }}</span>
          <span class="bd-num">{{ s.hasHeritage ? fmt(s.heritageMax) : '—' }}</span>
          <span class="bd-num bd-sum">
            {{ fmt(s.collect + s.star + (s.hasHeritage ? s.heritageMax : 0)) }}
          </span>
        </div>
        <div class="dex-breakdown-row total">
          <span class="bd-label">合计</span>
          <span class="bd-num">{{ fmt(theory.totals.collect) }}</span>
          <span class="bd-num">{{ fmt(theory.totals.star) }}</span>
          <span class="bd-num">{{ fmt(theory.totals.heritageMax) }}</span>
          <span class="bd-num bd-sum">{{ fmt(theory.totals.max) }}</span>
        </div>
      </div>

      <!-- 等级表 -->
      <div class="dex-section-title">等级经验表</div>
      <div class="dex-table-wrap">
        <table class="dex-table">
          <thead>
            <tr><th>等级段</th><th>每级所需</th><th>累计到段末</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in expRows" :key="row.range">
              <td>{{ row.range }}</td>
              <td class="num">{{ fmt(row.need) }}</td>
              <td class="num">{{ row.cum === null ? '—' : fmt(row.cum) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="dex-note">
        <div class="dex-note-title">口径说明</div>
        <ul>
          <li><strong>收集</strong>：点亮图鉴一次给分（绿 20 / 蓝 40 / 紫 120 / 橙 480 / 红 2400）。</li>
          <li><strong>升星</strong>：每升 1 星给收集的一半。<strong>角色</strong>上限 5 星，初始绿/蓝 1 星、紫 2 星、橙 3 星 → 分别可升 <strong>4 / 4 / 3 / 2</strong> 次；<strong>装备/符文/莱姆</strong>上限 3 星，各升 3 次。</li>
          <li><strong>传承</strong>：每件装备限 1 次，按收集的<strong>全额</strong>给分。</li>
          <li>角色初始 5 人不给收集经验，已扣除。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import theoryData from '@/assets/dex_theory.json'

const theory = theoryData

const inLevel = ref(null)
const inExp = ref(null)

const stepName = (s) => ({ C: '绿', B: '蓝', A: '紫', S: '橙', SS: '红' }[s] || s)
const stepColor = (s) => ({
  C: '#10b981', B: '#3b82f6', A: '#a855f7', S: '#f97316', SS: '#ef4444',
}[s] || 'inherit')

const equipSrc = computed(() => theory.sources.find((s) => s.key === 'Equip'))
const equipDetail = computed(() => (equipSrc.value ? equipSrc.value.detail : []))
const otherSources = computed(() => theory.sources.filter((s) => s.key !== 'Equip'))

const equipSum = computed(() => {
  const list = equipDetail.value
  return {
    count: list.reduce((a, d) => a + d.count, 0),
    collect: list.reduce((a, d) => a + d.collectExp, 0),
    star: list.reduce((a, d) => a + d.starExp, 0),
    heritage: list.reduce((a, d) => a + d.heritageExpMax, 0),
    total: list.reduce((a, d) => a + d.collectExp + d.starExp + d.heritageExpMax, 0),
  }
})

// 等级换算
const needForLevel = (lv) => {
  for (const [lo, hi, v] of theory.exp_table) if (lv >= lo && lv <= hi) return v
  return 8000
}
const totalToLevel = (lv) => {
  let sum = 0
  for (let i = 1; i < lv; i++) sum += needForLevel(i)
  return sum
}

const result = computed(() => {
  const lv = Number(inLevel.value)
  if (!Number.isFinite(lv) || lv < 1) return null
  const cur = Number.isFinite(Number(inExp.value)) ? Number(inExp.value) : 0
  const total = totalToLevel(lv) + cur
  const needNow = needForLevel(lv)
  const gap = Math.max(0, theory.totals.max - total)

  // 等级差：当前等级 → 满级等级，直接相减
  const levelGap = Math.max(0, theory.levels.max[0] - lv)

  // 还差几级「经验量」：从当前等级逐级往上加，加到补足 gap 为止（仅作参考，用于验证）
  let levelsNeeded = 0
  if (gap > 0) {
    let acc = 0
    let l = lv
    while (acc < gap && levelsNeeded < 500) {
      acc += needForLevel(l)
      l++
      levelsNeeded++
    }
  }

  return {
    level: lv,
    remain: cur,
    need: needNow,
    total,
    gap,
    levelGap,
    levelsNeeded,
    pct: needNow > 0 ? Math.min(100, (cur / needNow) * 100) : 0,
  }
})

const expRows = computed(() => {
  const rows = []
  for (const [lo, hi, needV] of theory.exp_table) {
    const unbounded = hi > 1000
    rows.push({
      range: unbounded ? `${lo} 及以上` : `${lo} - ${hi}`,
      need: needV,
      cum: unbounded ? null : totalToLevel(hi + 1),
    })
  }
  return rows
})

const fmt = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('en-US')
}
</script>

<style scoped>
.dex-container {
  width: 100%; max-width: 820px; margin: 0 auto; padding: 0;
  box-sizing: border-box; display: flex; flex-direction: column;
  flex: 1; min-height: 0; overflow-y: auto;
  font-family: 'HarmonyOS Sans SC', sans-serif;
}
.dex-inner { padding: 4px 2px 28px; }

.dex-hero {
  background: linear-gradient(135deg, rgba(59,130,246,.10), rgba(168,85,247,.10));
  border: 1px solid var(--border-color); border-radius: 14px;
  padding: 16px 18px; margin-bottom: 14px;
}
.dex-hero-title { font-size: 17px; font-weight: 800; color: var(--text-main); }
.dex-hero-sub { font-size: 12px; color: var(--text-sub); margin-top: 4px; }

.dex-card {
  background: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 14px 16px;
}
.dex-input-row { display: flex; gap: 12px; }
.dex-field { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.dex-field-label { font-size: 12px; font-weight: 700; color: var(--text-sub); }
.dex-input {
  width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 15px;
  font-family: inherit; color: var(--text-main); background: var(--bg);
  border: 1px solid var(--border-color); border-radius: 8px; outline: none;
}
.dex-input:focus { border-color: var(--primary); }
.dex-hint { font-size: 11px; color: var(--text-sub); margin-top: 8px; opacity: .8; }

.result-card { margin-top: 12px; }
.res-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.res-lv { font-size: 19px; font-weight: 800; color: var(--primary); }
.res-exp { font-size: 12px; color: var(--text-sub); font-variant-numeric: tabular-nums; }
.res-total { text-align: right; }
.res-total-label { display: block; font-size: 11px; color: var(--text-sub); }
.res-total-value {
  font-size: 17px; font-weight: 800; color: var(--text-main); font-variant-numeric: tabular-nums;
}
.dex-progress-bg { height: 8px; background: var(--bg); border-radius: 5px; overflow: hidden; }
.dex-progress-fill {
  height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 5px; transition: width .25s ease;
}
.res-compare { display: flex; gap: 8px; margin-top: 12px; }
.cmp-item {
  flex: 1; background: var(--bg); border-radius: 9px; padding: 9px 10px;
  display: flex; flex-direction: column; gap: 3px;
}
.cmp-item.highlight { background: rgba(249,115,22,.08); }
.cmp-label { font-size: 10.5px; color: var(--text-sub); }
.cmp-item strong {
  font-size: 14px; color: var(--text-main); font-variant-numeric: tabular-nums;
}
.cmp-item strong.primary { color: #8b5cf6; }
.cmp-item strong.warn { color: #f97316; }

.dex-conclusion {
  margin-top: 12px; padding: 10px 12px; border-radius: 9px;
  background: rgba(249,115,22,.08); border: 1px solid rgba(249,115,22,.25);
  font-size: 12.5px; color: var(--text-main); line-height: 1.75;
}
.dex-conclusion.done {
  background: rgba(16,185,129,.09); border-color: rgba(16,185,129,.28);
}

.dex-section-title {
  margin: 20px 0 8px; font-size: 14px; font-weight: 800; color: var(--text-main);
  padding-left: 8px; border-left: 3px solid var(--primary);
}

.dex-table-wrap {
  background: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 12px; overflow-x: auto;
}
.dex-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dex-table th {
  background: var(--bg); color: var(--text-sub); font-size: 11px; font-weight: 700;
  padding: 8px 6px; text-align: right; white-space: nowrap;
}
.dex-table th:first-child, .dex-table td:first-child { text-align: left; padding-left: 12px; }
.dex-table td {
  padding: 7px 6px; border-top: 1px solid var(--border-color);
  color: var(--text-sub); text-align: right; font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dex-table td:first-child { color: var(--text-main); font-weight: 600; }
.dex-table tfoot td {
  border-top: 2px solid var(--border-color);
  font-weight: 800; color: var(--text-main); background: rgba(59,130,246,.05);
}
.foot-label { padding-left: 12px; }
.step-cell { font-weight: 800 !important; }
.num { color: var(--text-main) !important; }
.strong { font-weight: 700; }

.dex-breakdown {
  background: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 12px; overflow: hidden; font-size: 12px;
}
.dex-breakdown-head, .dex-breakdown-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1.1fr;
  padding: 8px 12px; gap: 4px;
}
.dex-breakdown-head {
  background: var(--bg); font-weight: 700; color: var(--text-sub); font-size: 11px;
}
.dex-breakdown-row { border-top: 1px solid var(--border-color); }
.dex-breakdown-row.total { font-weight: 800; background: rgba(59,130,246,.05); }
.bd-label { color: var(--text-main); font-weight: 700; }
.bd-num { text-align: right; color: var(--text-sub); font-variant-numeric: tabular-nums; }
.bd-sum { color: var(--text-main); font-weight: 700; }

.dex-note {
  margin: 20px 0 8px; padding: 12px 14px; background: var(--bg);
  border-radius: 10px; font-size: 11.5px; color: var(--text-sub); line-height: 1.85;
}
.dex-note-title { font-weight: 800; color: var(--text-main); margin-bottom: 6px; }
.dex-note ul { margin: 0; padding-left: 16px; }
</style>
