<script setup>
import { ref, computed, onMounted } from 'vue'
import allData from '../assets/data.json'
import { imageMatcher } from '../utils/imageMatcher'

const props = defineProps({
  showGifs: Boolean,
  engineStatus: String
})

const filterCols = ['星级', '职业', '种族', '属性', '地区']
const selectedTags = ref([])
const isMatchingLoading = ref(false)
const fileInput = ref(null)

const unownedChars = ref([])
const showResultModal = ref(false)
const matchResultTags = ref([])
const showWishModal = ref(false)
const showErrorModal = ref(false)
const errorModalMessage = ref('')
const searchQuery = ref('')
const expandedGroups = ref([3, 2, 1, 0])

onMounted(() => {
  const savedUnowned = localStorage.getItem('unowned_characters')
  if (savedUnowned) {
    try { unownedChars.value = JSON.parse(savedUnowned) } catch(e) {}
  }
})

const rarityMap = { 3: '传说', 2: '史诗', 1: '稀有', 0: '普通' }
const wishGroups = computed(() => [3, 2, 1, 0].map(r => ({ title: rarityMap[r], rarity: r, characters: allData.filter(c => c.稀有度 === r) })))

const toggleUnowned = (name) => {
  const idx = unownedChars.value.indexOf(name)
  if (idx >= 0) {
    unownedChars.value.splice(idx, 1)
  } else {
    unownedChars.value.push(name)
  }
  localStorage.setItem('unowned_characters', JSON.stringify(unownedChars.value))
}

const isUnowned = (name) => unownedChars.value.indexOf(name) >= 0

const filteredWishGroups = computed(() => {
  if (!searchQuery.value) return wishGroups.value
  const q = searchQuery.value
  return wishGroups.value.map(g => ({ ...g, characters: g.characters.filter(c => { let i=0; for(let j=0;j<c.角色名.length&&i<q.length;j++){if(c.角色名[j]===q[i])i++} return i===q.length; }) }))
})

const toggleGroup = (rarity) => {
  const idx = expandedGroups.value.indexOf(rarity)
  if (idx >= 0) { expandedGroups.value.splice(idx, 1) } else { expandedGroups.value.push(rarity) }
}
const isGroupExpanded = (rarity) => expandedGroups.value.indexOf(rarity) >= 0

const tagsByCol = computed(() => {
  const result = {}
  filterCols.forEach(col => {
    if (col === '星级') {
      result[col] = ['传说', '史诗']
    } else {
      result[col] = [...new Set(allData.map(i => i[col]))].filter(val => val !== undefined && val !== null && String(val).trim() !== '')
    }
  });
  return result
})

const toggleTag = (val) => {
  if (selectedTags.value.includes(val)) {
    selectedTags.value = selectedTags.value.filter(t => t !== val)
  } else {
    selectedTags.value.push(val)
  }
}

const resetTags = () => {
  selectedTags.value = []
}

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isMatchingLoading.value = true
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const img = new Image()
      img.onload = async () => {
        try {
          // 如果全局引擎还没初始化好，则尝试等待初始化
          if (!imageMatcher.isInitialized) {
            await imageMatcher.init()
          }

          const result = await imageMatcher.match(img)
          const { matched } = result

          selectedTags.value = []
          matched.forEach(tag => {
            if (!selectedTags.value.includes(tag)) {
              selectedTags.value.push(tag)
            }
          })

          matchResultTags.value = matched
          showResultModal.value = true

        } catch (err) {
          console.error('Matching failed:', err)
          // 改用弹窗而非 alert
          showErrorModal.value = true
          errorModalMessage.value = `识别失败！\n\n错误原因：${err.message}`
        } finally {
          isMatchingLoading.value = false
        }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  } catch (err) {
    console.error('File upload failed:', err)
    isMatchingLoading.value = false
  }
  event.target.value = ''
}

const isMatch = (role, tag) => {
  if (tag === '传说') return role.稀有度 === 3
  if (tag === '史诗') return role.稀有度 === 2
  return role.职业 === tag || role.种族 === tag || role.属性 === tag || role.地区 === tag
}

const getCombos = (arr, n) => {
  let res = []
  const f = (s, p) => {
    if (p.length === n) { res.push(p); return; }
    for (let i = s; i < arr.length; i++) f(i + 1, [...p, arr[i]]);
  }
  f(0, []); return res;
}

const filteredResults = computed(() => {
  if (selectedTags.value.length === 0) return []

  let combos = []
  for (let i = 1; i <= Math.min(selectedTags.value.length, 3); i++) {
    combos.push(...getCombos(selectedTags.value, i))
  }

  return combos.map(c => {
    let f = allData.filter(r => c.every(tag => isMatch(r, tag)))
    if (f.length === 0) return null
    let minR = Math.min(...f.map(r => r.稀有度))
    let hasGold = f.some(r => r.稀有度 === 3) ? 1 : 0
    let unownedBonus = (minR >= 2 && f.some(r => unownedChars.value.includes(r.角色名))) ? 1000 : 0

    return {
      c,
      f: f.sort((a, b) => b.稀有度 - a.稀有度),
      minR,
      w: minR * 100 + hasGold * 10 + c.length * 0.1 + unownedBonus
    }
  }).filter(x => x).sort((a, b) => b.w - a.w)
})

const statsText = computed(() => {
  if (selectedTags.value.length === 0) return '请点击标签开始'
  const guaranteeCount = filteredResults.value.filter(x => x.minR >= 2).length
  return `分析完毕：发现 ${guaranteeCount} 组保底组合`
})

const getBadge = (minR) => {
  if (minR >= 3) return { text: '顶级招募', class: 'badge-top' }
  if (minR >= 2) return { text: '资深保底', class: 'badge-senior' }
  return null
}

// 暴露给 App.vue 的方法和状态
defineExpose({
  triggerUpload,
  resetTags,
  openWishModal: () => showWishModal.value = true,
  isMatchingLoading
})
</script>

<template>
  <div class="recruit-view">
    <!-- 给 filter-section 添加动态类，用于控制底部间距 -->
    <div class="filter-section" :class="{ 'no-gifs': !showGifs }">
      <div v-for="col in filterCols" :key="col" class="filter-group">
        <div class="filter-label">{{ col }}</div>
        <template v-if="col === '星级'">
          <div class="tags-container tags-row">
            <div class="tags-inner">
              <span
                v-for="val in tagsByCol[col]"
                :key="val"
                class="tag"
                :class="{
                    active: selectedTags.includes(val),
                    'tag-rarity-3': val === '传说',
                    'tag-rarity-2': val === '史诗'
                }"
                @click="toggleTag(val)"
              >
                {{ val }}
              </span>
            </div>
            <span class="tag wish-btn" @click="showWishModal = true">
              <i class="wish-btn-icon"></i>
              <span>心愿</span>
            </span>
          </div>
        </template>
        <template v-else>
          <div class="tags-container">
            <span
              v-for="val in tagsByCol[col]"
              :key="val"
              class="tag"
              :class="{
                  active: selectedTags.includes(val),
                  'tag-rarity-3': val === '传说',
                  'tag-rarity-2': val === '史诗'
              }"
              @click="toggleTag(val)"
            >
              {{ val }}
            </span>
          </div>
        </template>
      </div>

      <!-- GIF 容器，使用 v-show 控制显隐 -->
      <div class="footer-gifs" v-show="showGifs">
        <div class="gifs-center-wrapper">
          <div class="gif-group left-group">
            <img src="/gif/cb.gif" alt="lzx" class="bottom-gif game-sprite" />
            <img src="/gif/cl.gif" alt="cl" class="bottom-gif game-sprite" />
          </div>
          <img src="/gif/rest.gif" alt="rest" class="bottom-gif center-gif game-sprite" />
          <div class="gif-group right-group">
            <img src="/gif/xs.gif" alt="ysgz" class="bottom-gif game-sprite" />
            <img src="/gif/ysgz.gif" alt="hfmn" class="bottom-gif game-sprite" />
          </div>
        </div>
      </div>
    </div>

    <div class="content-area">
      <div class="result-stats">{{ statsText }}</div>

      <div id="resultsArea">
      <template v-if="selectedTags.length === 0">
        <div class="no-data">未选择任何标签</div>
      </template>
      <template v-else-if="filteredResults.length === 0">
        <div class="no-data">无匹配组合</div>
      </template>
      <template v-else>
        <div v-for="(item, index) in filteredResults" :key="index" class="combo-card">
          <div class="combo-header">
            <div class="combo-tags-box">
              <span class="tag-count-badge"> {{ item.c.length }}词条 </span>
              <template v-for="(t, idx) in item.c" :key="t">
                <span class="combo-name-blue">{{ t }}</span>
                <span v-if="idx < item.c.length - 1" class="plus-sign">+</span>
              </template>
            </div>
            <div class="status-right">
              <span v-if="getBadge(item.minR)" class="badge-guarantee" :class="getBadge(item.minR).class">
                {{ getBadge(item.minR).text }}
              </span>
              <span class="people-count">{{ item.f.length }}人</span>
            </div>
          </div>
          <table class="result-table">
            <thead>
              <tr>
                <th class="col-name">角色</th>
                <th class="col-other">职业</th>
                <th class="col-other">种族</th>
                <th class="col-other">属性</th>
                <th class="col-other">地区</th>
                <th class="col-rarity">★</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in item.f" :key="r.角色名">
                <td class="col-name" :class="'rarity-' + r.稀有度">
                  {{ r.角色名 }}<img v-if="isUnowned(r.角色名)" src="/mid_ico_map_0001.png" class="unowned-icon" />
                </td>
                <td class="col-other">{{ r.职业 }}</td>
                <td class="col-other">{{ r.种族 }}</td>
                <td class="col-other">{{ r.属性 }}</td>
                <td class="col-other">{{ r.地区 }}</td>
                <td class="col-rarity" :class="'rarity-' + r.稀有度">{{ r.稀有度 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
    </div>

    <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none">

    <!-- 识别结果弹窗 -->
    <div v-if="showResultModal" class="custom-modal-overlay" @click.self="showResultModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>识别结果</h3>
        </div>
        <div class="modal-body">
          <p class="modal-title-text">匹配完毕！</p>
          <p class="modal-sub-text">成功匹配的标签：</p>
          <div class="modal-tags-grid">
            <template v-if="matchResultTags.length > 0">
              <span
                v-for="tag in matchResultTags"
                :key="tag"
                class="tag active"
                :class="{
                  'tag-rarity-3': tag === '传说',
                  'tag-rarity-2': tag === '史诗'
                }"
              >
                {{ tag }}
              </span>
            </template>
            <span v-else class="no-tag-hint">无</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showResultModal = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 心愿招募弹窗 -->
    <div v-if="showWishModal" class="custom-modal-overlay" @click.self="showWishModal = false">
      <div class="custom-modal-card wish-modal-card">
        <div class="modal-header">
          <h3>心愿招募</h3>
        </div>
        <div class="modal-body wish-modal-body">
          <div class="wish-search-box">
            <img src="/ui/search.svg" class="search-icon" />
            <input type="text" v-model="searchQuery" placeholder="搜索角色名称..." class="wish-search-input" />
          </div>
          <p class="wish-tip-text">可标记未拥有的角色，当保底组合出现标记角色后，当前组合会进行置顶</p>
          <div v-for="group in filteredWishGroups" :key="group.rarity" class="wish-group">
            <div class="wish-group-title" :class="'wish-title-' + group.rarity" @click="toggleGroup(group.rarity)">
              <span>{{ group.title }}</span>
              <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !isGroupExpanded(group.rarity) }" />
            </div>
            <div v-if="isGroupExpanded(group.rarity)" class="wish-tags-container">
              <span
                v-for="char in group.characters"
                :key="char.角色名"
                class="wish-tag"
                :class="'wish-tag-rarity-' + group.rarity + (isUnowned(char.角色名) ? ' wish-tag-unowned' : '')"
                @click="toggleUnowned(char.角色名)"
              >
                {{ char.角色名 }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showWishModal = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 识别错误弹窗 -->
    <div v-if="showErrorModal" class="custom-modal-overlay" @click.self="showErrorModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>识别失败</h3>
        </div>
        <div class="modal-body">
          <p class="modal-title-text" style="color:#ef4444;font-size:16px;white-space:pre-line">{{ errorModalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showErrorModal = false">确定</button>
        </div>
      </div>
    </div>
    <!-- 底部悬浮操作按钮胶囊 -->
    <div class="bottom-action-pill">
      <button class="pill-btn pill-btn-secondary" @click="resetTags">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        重置
      </button>
      <button class="pill-btn pill-btn-primary" @click="triggerUpload" :disabled="isMatchingLoading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        {{ isMatchingLoading ? '识别中...' : '上传截图' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.recruit-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.filter-section {
  position: relative;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 15px;
  padding-bottom: 30px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  transition: padding-bottom 0.2s ease;
  flex-shrink: 0;
}

.filter-section.no-gifs { padding-bottom: 15px; }
.filter-group { margin-bottom: 10px; display: flex; align-items: flex-start; }
.filter-label { font-weight: 600; width: 50px; color: var(--text-sub); font-size: 13px; padding-top: 6px; flex-shrink: 0; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; }

.tag {
  padding: 4px 10px;
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.tag.active { background: #dbeafe; color: var(--primary); border-color: var(--primary); font-weight: 600; }
.dark-mode .tag.active { background: rgba(59, 130, 246, 0.2); }
.tag-rarity-3.active { background: #ffedd5; color: var(--gold); border-color: var(--gold); }
.dark-mode .tag-rarity-3.active { background: rgba(249, 115, 22, 0.2); }
.tag-rarity-2.active { background: #f3e8ff; color: var(--purple); border-color: var(--purple); }
.dark-mode .tag-rarity-2.active { background: rgba(168, 85, 247, 0.2); }

.result-stats {
  flex-shrink: 0;
  margin-bottom: 15px;
  font-size: 13px;
  padding: 10px 15px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
  border-left: 4px solid var(--primary);
}

#resultsArea {
  flex: 1;
}

.dark-mode .result-stats { background: rgba(59, 130, 246, 0.1); color: #93c5fd; }

.combo-card {
  width: 100%;
  background: var(--card-bg);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-color);
}

.combo-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 8px;
}

.combo-tags-box { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; flex: 1; min-width: 200px; }
.tag-count-badge { background: var(--text-sub); color: #fff; padding: 2px 6px; border-radius: 12px; font-size: 10px; flex-shrink: 0; margin-right: 4px; }
.combo-name-blue { color: var(--primary); font-weight: bold; background: #eff6ff; padding: 2px 8px; border-radius: 4px; font-size: 13px; white-space: nowrap; }
.dark-mode .combo-name-blue { background: rgba(59, 130, 246, 0.2); }
.plus-sign { color: var(--text-sub); font-size: 12px; }
.status-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.badge-guarantee { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #fff; white-space: nowrap; }
.badge-top { background: #f97316; }
.badge-senior { background: #a855f7; }
.people-count { color: var(--text-sub); font-size: 11px; white-space: nowrap; }

.result-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.result-table th { background: var(--bg); color: var(--text-sub); font-size: 11px; text-align: left; padding: 8px 12px; font-weight: 400; }
.result-table td { padding: 10px 12px; font-size: 13px; border-top: 1px solid var(--border-color); white-space: nowrap; color: var(--text-main); }
.col-name { width: 30%; font-weight: 600; }
.col-other { width: 14%; }
.result-table th.col-rarity, .result-table td.col-rarity { text-align: center; width: 40px; }
.result-table td.rarity-3 { color: var(--gold); font-weight: bold; }
.result-table td.rarity-2 { color: var(--purple); font-weight: bold; }
.result-table td.rarity-1 { color: #3b82f6; font-weight: bold; }
.result-table td.rarity-0 { color: #79C37A; font-weight: bold; }

.no-data { text-align: center; padding: 50px; color: var(--text-sub); background: var(--card-bg); border-radius: 12px; font-size: 14px; border: 1px solid var(--border-color); }

.footer-gifs {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0 15px;
  z-index: 5;
  pointer-events: none;
}

.gifs-center-wrapper {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px; /* 左右 gif 离篝火 10px */
}

.gif-group {
  display: flex;
  align-items: flex-end;
  gap: 14px;
}

.bottom-gif {
  height: 40px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
  transition: transform 0.3s ease;
  pointer-events: auto;
}

.bottom-gif:hover { transform: scale(1.1) translateY(-5px); }
.left-group { justify-content: flex-end; }
.right-group { justify-content: flex-start; }

.center-gif {
  align-self: flex-end;
  margin-bottom: 0; /* 去掉篝火底部的 2px */
}

/* 像素画抗模糊清晰渲染 */
img.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 心愿招募弹窗相关样式 */
.wish-modal-card { max-width: 500px !important; }
.wish-modal-body { max-height: 420px; overflow-y: auto; text-align: left !important; padding: 16px 20px !important; }
.wish-group { margin-bottom: 20px; }
.wish-group-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid var(--border-color); }
.wish-title-3 { color: #f97316; }
.wish-title-2 { color: #a855f7; }
.wish-title-1 { color: #3b82f6; }
.wish-title-0 { color: #79C37A; }
.wish-tags-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.wish-tag { text-align: center; padding: 5px 4px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; border: 1.5px solid transparent; transition: all 0.2s ease; user-select: none; min-width: 0; }
.wish-tag-rarity-3 { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
.wish-tag-rarity-2 { background: #faf5ff; color: #7e22ce; border-color: #e9d5ff; }
.wish-tag-rarity-1 { background: #f0f9ff; color: #1d4ed8; border-color: #bae6fd; }
.wish-tag-rarity-0 { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.dark-mode .wish-tag-rarity-3 { background: rgba(249, 115, 22, 0.15); color: #fb923c; border-color: rgba(249, 115, 22, 0.3); }
.dark-mode .wish-tag-rarity-2 { background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }
.dark-mode .wish-tag-rarity-1 { background: rgba(127, 174, 203, 0.15); color: #93c5fd; border-color: rgba(127, 174, 203, 0.3); }
.dark-mode .wish-tag-rarity-0 { background: rgba(127, 174, 203, 0.15); color: #93c5fd; border-color: rgba(127, 174, 203, 0.3); }
.wish-tag.wish-tag-unowned {  font-weight: 700; }
.wish-tag-rarity-3.wish-tag-unowned { background: #f97316; color: #fff; border-color: #f97316; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.3); }
.wish-tag-rarity-2.wish-tag-unowned { background: #a855f7; color: #fff; border-color: #a855f7; box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3); }
.wish-tag-rarity-1.wish-tag-unowned { background: #3b82f6; color: #fff; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(127, 174, 203, 0.3); }
.wish-tag-rarity-0.wish-tag-unowned { background: #79C37A; color: #fff; border-color: #79C37A; box-shadow: 0 0 0 2px rgba(121, 195, 122, 0.3); }
.unowned-icon { width: 16px; height: 16px; vertical-align: middle; margin-left: 4px; }
.wish-search-box { display: flex; align-items: center; margin-bottom: 14px; background: var(--bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 10px; }
.search-icon { width: 16px; height: 16px; filter: var(--icon-filter); margin-right: 8px; flex-shrink: 0; }
.wish-search-input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: var(--text-main); font-family: inherit; }
.wish-search-input::placeholder { color: var(--text-sub); }
.collapse-icon { width: 14px; height: 14px; transition: transform 0.25s ease; margin-left: auto; filter: var(--icon-filter); flex-shrink: 0; }
.collapse-icon.collapsed { transform: rotate(180deg); }
/* 识别结果弹窗标签容器 */
.modal-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: var(--bg);
  border-radius: 8px;
  margin: 16px 0;
}
.modal-tags-grid .tag {
  margin: 0;
}

/* 心愿招募按钮：嵌入星级标签行右侧 */
/* 星级行：左侧标签，右侧心愿按钮 */
.tags-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.tags-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wish-btn {
  display: inline-flex;
  align-items: center;
  gap: 0px;
  background-color: #fbede5;
  color: #cf7155;
  border: 1px solid #f0cec4;
  border-radius: 6px;
  font-weight: 800;
  font-size: 15px;
  padding: 3px 8px 3px 3px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.wish-btn:hover {
  background-color: #f7e0d3;
}
.dark-mode .wish-btn {
  background-color: rgba(207, 113, 85, 0.15);
  color: #e58b73;
  border: 1px solid rgba(240, 206, 196, 0.3);
}
.dark-mode .wish-btn:hover {
  background-color: rgba(207, 113, 85, 0.25);
}
.wish-btn-icon {
  display: block;
  width: 20px;
  height: 20px;
  background: #cf7155;
  mask: url(/ui/wish.svg) no-repeat center / contain;
  -webkit-mask: url(/ui/wish.svg) no-repeat center / contain;
  transition: background 0.2s ease;
}
.dark-mode .wish-btn-icon {
  background: #e58b73;
}
.wish-tip-text {
  font-size: 13px;
  color: var(--text-sub);
  margin: 6px 0 14px 0;
  line-height: 1.5;
}
.dark-mode .wish-tip-text {
  color: #a1aebf;
}

/* ========================================= */
/* 底部悬浮操作按钮胶囊 (同时配置暗色模式适配)  */
/* ========================================= */
.bottom-action-pill {
  position: fixed;
  bottom: 80px; /* 默认距离底部，避开手势区且防止与回到顶部按钮重合 */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  width: 90%; 
  max-width: 300px; /* 针对手机屏幕的最合适宽度 */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 100px; 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 800;
  box-sizing: border-box;
  transition: all 0.3s;
}

.dark-mode .bottom-action-pill {
  background: rgba(30, 41, 59, 0.85); /* 适配暗黑模式 */
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.pill-btn {
  border: none;
  padding: 10px 0;
  border-radius: 50px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap; 
}

.pill-btn:active {
  transform: scale(0.96);
  filter: brightness(0.95);
}

.pill-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pill-btn-primary {
  flex: 2; 
  background: #e1f4e8;
  color: #42a16d;
  border: 1px solid #addabd;
}

.dark-mode .pill-btn-primary {
  background: rgba(66, 161, 109, 0.15);
  color: #52c48a;
  border: 1px solid rgba(173, 218, 189, 0.3);
}

.pill-btn-secondary {
  flex: 1; 
  background: #fbe0e2;
  color: #c76772;
  border: 1px solid #f0bcc1;
}

.dark-mode .pill-btn-secondary {
  background: rgba(199, 103, 114, 0.15);
  color: #e07b88;
  border: 1px solid rgba(240, 188, 193, 0.3);
}

@media screen and (min-width: 1024px) {
  .bottom-action-pill {
    bottom: 40px; /* 电脑端稍微贴底 */
    gap: 10px;
    padding: 10px;
    max-width: 400px;
  }
  .pill-btn {
    padding: 12px 0; 
  }
}

@media screen and (max-width: 600px) {
  .bottom-action-pill {
    bottom: 20px; /* 移到最下方，避免与菜单按键重叠 */
    padding: 6px;
    max-width: 230px; /* 缩窄宽度 */
  }
  .pill-btn {
    padding: 8px 0;
    font-size: 14px; /* 字号缩小 */
    gap: 4px;
  }
  .pill-btn svg {
    width: 15px;
    height: 15px;
  }
}
</style>
