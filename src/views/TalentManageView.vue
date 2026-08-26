<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- Row 1: Search box full width -->
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="mainSearchQuery"
          placeholder="搜索天赋名、天赋详细..."
          class="talent-search-input"
        />
      </div>

      <!-- Row 2: 4 action buttons equally distributed -->
      <div class="talent-buttons-row">
        <button class="talent-action-btn" @click="openAddCharModal">添加角色</button>
        <button class="talent-action-btn" @click="openBatchDeleteModal">删除角色</button>
        <button class="talent-action-btn" @click="expandAllCards">全部展开</button>
        <button class="talent-action-btn" @click="collapseAllCards">全部收起</button>
      </div>

      <div class="talent-overview-trigger" @click="openTalentOverviewModal">
        <span>天赋总览：{{ totalUniqueTalentCount }}</span>
        <img src="/ui/right.svg" class="overview-arrow-icon" />
      </div>
    </div>


    <div class="sandbox-role-list" ref="sortableListRef">
      <div
        v-for="(card, cardIdx) in filteredAddedCards"
        :key="card.instanceId"
        class="sandbox-role-card"
      >
        <!-- 角色头部：翻转展开箭头逻辑 -->
        <div class="card-header-summary" @click="toggleCardExpand(card)">
            <div class="summary-left-info">
              <img src="/ui/drag.svg" class="drag-handle" />
              <div class="char-header-avatar-wrap">
                <img
                  :src="`/Header/${card.baseInfo.id}.png`"
                  class="char-header-avatar-img game-sprite"
                  @error="handleIconError"
                />
              </div>
              <span
                :class="`wish-rarity-color-${getRarityNum(card.baseInfo.step)}`"
                class="char-name-link"
                @click.stop="openCharDetailModal(card.baseInfo)"
              >
                {{ card.baseInfo.displayName }}
              </span>
              <span class="stat-badge">{{ countTotalTalents(card) }}天赋</span>
              <div class="summary-stats-badges">
                <span class="stat-badge">{{ card.talentPages.length }}页</span>
              </div>
            </div>
          <div class="summary-right-actions">
            <img
              src="/ui/up.svg"
              class="collapse-icon"
              :class="{ 'expanded-flip': card.isExpanded }"
            />
          </div>
        </div>

        <div v-if="card.isExpanded" class="card-body-detail">
          <div class="slots-container" v-if="card.talentPages[card.activePageIdx]">
            <div
              v-for="(slot, sIdx) in card.talentPages[card.activePageIdx].slots"
              :key="sIdx"
              class="talent-slot-row"
            >
              <div v-if="!slot.talent" class="empty-slot-placeholder">
                <span class="empty-hint-text">未添加天赋</span>
                <button class="slot-plus-btn" @click="openTalentSelectModal(card.instanceId, card.activePageIdx, sIdx)">
                  <img src="/ui/plus.svg" class="plus-icon" />
                </button>
              </div>
              <!-- 天赋槽：来源标签移到减号左侧，天赋名右侧新增折叠箭头 -->
              <div v-else class="filled-slot-block">
                <div class="fs-top">
                  <div class="fs-name-wrap">
                    <span class="fs-name" :style="{ color: getTalentStepConfig(slot.talent.step).color }">
                      {{ slot.talent.name }}
                    </span>
                    <!-- 天赋详情折叠箭头 -->
                    <img
                      src="/ui/up.svg"
                      class="talent-collapse-icon"
                      :class="{ 'expanded-flip': !slot.talentExpand }"
                      @click.stop="slot.talentExpand = !slot.talentExpand"
                    />
                  </div>
                  <!-- 来源标签 fs-tag 挪到减号左边 -->
                  <div class="fs-right-group">
                    <span class="fs-tag">{{ slot.talent.sourceLabel }}</span>
                    <button class="slot-minus-btn" @click="openConfirmDeleteSlot(slot)">
                      <img src="/ui/minus.svg" class="minus-icon" />
                    </button>
                  </div>
                </div>
                <!-- 天赋描述：默认隐藏，箭头控制显隐 -->
                <div v-show="slot.talentExpand" class="fs-effect">{{ slot.talent.formattedEffect }}</div>
              </div>
            </div>
          </div>

          <div class="talent-page-tabs-row">
            <div class="tabs-flex">
              <span
                v-for="(page, pIdx) in card.talentPages"
                :key="pIdx"
                :class="['page-tab-item', { 'active': card.activePageIdx === pIdx }]"
                @click="card.activePageIdx = pIdx"
              >
                页 {{ pIdx + 1 }}
              </span>
              <button
                v-if="card.talentPages.length < 4"
                class="tab-add-circle-btn"
                @click="addTalentPage(card)"
              >
                <img src="/ui/plus.svg" class="plus-icon" />
              </button>
              <button
                v-if="card.talentPages.length > 1"
                class="tab-minus-circle-btn"
                @click="openDeletePageModal(card)"
              >
                <span>-</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredAddedCards.length === 0" class="sandbox-empty-state">
        <div class="placeholder-icon"></div>
        <div v-if="mainSearchQuery.trim()" class="placeholder-title">未搜索到相关天赋</div>
        <div v-else class="placeholder-title">目前还没添加角色</div>
        <div v-if="!mainSearchQuery.trim()" class="placeholder-desc">请点击"添加角色"开始配置天赋吧！</div>
      </div>
    </div>

    <!-- 添加角色弹窗 -->
    <div v-if="charModalVisible" class="modal-overlay" @click.self="closeCharModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>添加角色 <span class="modal-title-count">(共 {{ allCharacters.length }} 个角色)</span></h3>
          <button class="modal-close-x" @click="closeCharModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="talent-search-box modal-search-box-override">
            <img src="/ui/search.svg" class="search-icon" />
            <input
              type="text"
              v-model="charSearchQuery"
              placeholder="搜索角色名(支持模糊匹配，如: 星射)..."
              class="talent-search-input"
            />
          </div>
          <div v-if="suggestedCharacters.length > 0" class="char-suggest-bar">
            <div class="suggest-header" @click="suggestExpanded = !suggestExpanded">
              <span class="suggest-title">是否查找角色：</span>
              <img src="/ui/up.svg" class="collapse-icon" :class="{ 'expanded-flip': !suggestExpanded }" />
            </div>
            <div v-if="suggestExpanded" class="suggest-tags-list">
              <span
                v-for="char in suggestedCharacters"
                :key="char.id"
                :class="['suggest-char-tag', `wish-rarity-color-${getRarityNum(char.step)}`]"
                @click="addCharacterCard(char)"
              >
                {{ char.displayName }}
              </span>
            </div>
          </div>
          <div class="modal-scroll-list">
            <div
              v-for="char in pagedModalCharacters"
              :key="char.id"
              :class="['modal-char-row', `wish-rarity-color-${getRarityNum(char.step)}`]"
              @click="addCharacterCard(char)"
            >
              <div class="mcr-main">
                <div class="mcr-left">
                  <div class="char-header-avatar-wrap mini">
                    <img
                      :src="`/Header/${char.id}.png`"
                      class="char-header-avatar-img game-sprite"
                      @error="handleIconError"
                    />
                  </div>
                  <span class="mcr-name">{{ char.displayName }}</span>
                </div>
                <div class="mcr-badges">
                  <span class="h-lbl label-job" v-if="char.class">{{ char.class }}</span>
                  <span class="h-lbl label-race" v-if="char.type">{{ char.type }}</span>
                  <span class="h-lbl label-attr" v-if="char.element">{{ char.element }}</span>
                </div>
              </div>
            </div>
            <div ref="loadMoreCharSentinel" class="load-more-sentinel" v-if="pagedModalCharacters.length < filteredModalCharacters.length">
              <div class="loading-spinner"></div>
              <span>正在加载更多角色...</span>
            </div>
            <div v-if="filteredModalCharacters.length > 0 && pagedModalCharacters.length >= filteredModalCharacters.length" class="no-more-data">
              — 已加载全部可用角色 —
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 选择天赋弹窗 -->
    <div v-if="talentModalVisible" class="modal-overlay" @click.self="closeTalentModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>
            添加天赋
            <span class="modal-title-count">
              (已筛选 {{ filteredModalTalents.length }} / 共 {{ modalBaseTalentCount }} 个天赋)
            </span>
          </h3>
          <button class="modal-close-x" @click="closeTalentModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="talent-search-box modal-search-box-override">
            <img src="/ui/search.svg" class="search-icon" />
            <input
              type="text"
              v-model="talentSearchQuery"
              placeholder="搜索天赋名称/效果/来源标签..."
              class="talent-search-input"
            />
          </div>
          <!-- 专属/未实装天赋已通过 showExclusiveTalent 变量在代码中控制，默认隐藏 -->
          <div class="modal-scroll-list">
            <div
              v-for="t in pagedModalTalents"
              :key="t.uid"
              class="talent-modal-row"
              @click="selectTalentForSlot(t)"
            >
              <div class="mtr-top">
                <span class="mtr-name" :style="{ color: getTalentStepConfig(t.step).color }">
                  {{ t.name }}
                </span>
                <span class="mtr-tag">{{ t.sourceLabel }}</span>
              </div>
              <div class="mtr-effect">{{ t.formattedEffect }}</div>
            </div>
            <div ref="loadMoreSentinel" class="load-more-sentinel" v-if="pagedModalTalents.length < filteredModalTalents.length">
              <div class="loading-spinner"></div>
              <span>正在加载更多天赋...</span>
            </div>
            <div v-if="filteredModalTalents.length > 0 && pagedModalTalents.length >= filteredModalTalents.length" class="no-more-data">
              — 已加载全部可用天赋 —
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色详情弹窗 -->
    <div v-if="detailModalVisible" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>天赋来源: {{ currentDetailChar?.displayName }}</h3>
          <button class="modal-close-x" @click="closeDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-display-card">
            <div class="detail-hero-left">
              <div class="char-header-avatar-wrap">
                <img
                  :src="`/Header/${currentDetailChar?.id}.png`"
                  class="char-header-avatar-img game-sprite"
                  @error="handleIconError"
                />
              </div>
              <span :class="`wish-rarity-color-${getRarityNum(currentDetailChar?.step)}`" class="hero-name-span">
                {{ currentDetailChar?.displayName }}
              </span>
            </div>
            <div class="hero-labels-container">
              <span v-if="currentDetailChar?.class" class="h-lbl label-job">{{ currentDetailChar.class }}</span>
              <span v-if="currentDetailChar?.type" class="h-lbl label-race">{{ currentDetailChar.type }}</span>
              <span v-if="currentDetailChar?.element" class="h-lbl label-attr">{{ currentDetailChar.element }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除天赋页弹窗 -->
    <div v-if="showDeletePageModal" class="modal-overlay" @click.self="showDeletePageModal = false">
      <div class="modal-window info-modal">
        <div class="modal-header">
          <h3>选择要删除的天赋页</h3>
          <button class="modal-close-x" @click="showDeletePageModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="del-page-list">
            <label
              v-for="(page, pIdx) in targetDelCard?.talentPages"
              :key="pIdx"
              class="del-page-card-item"
              :class="{ active: targetDelPageIdx === pIdx }"
            >
              <input
                type="radio"
                v-model.number="targetDelPageIdx"
                :value="pIdx"
                name="delPageRadio"
                hidden
              />
              <span>页 {{ pIdx + 1 }}</span>
            </label>
          </div>
          <p class="del-warning-text">删除后无法恢复</p>
          <div class="del-btn-wrap">
            <button class="btn-cancel" @click="showDeletePageModal = false">取消</button>
            <button class="btn-del-confirm" @click="confirmDeletePage">确认删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除角色确认弹窗 -->
    <div v-if="showDeleteCharModal" class="modal-overlay" @click.self="closeDeleteCharModal">
      <div class="modal-window info-modal">
        <div class="modal-header">
          <h3>确认删除该角色</h3>
          <button class="modal-close-x" @click="closeDeleteCharModal">✕</button>
        </div>
        <div class="modal-body">
          <p class="del-warning-text">删除后该角色所有天赋页、配置将全部清空，无法恢复</p>
          <div class="del-btn-wrap">
            <button class="btn-cancel" @click="closeDeleteCharModal">取消</button>
            <button class="btn-del-confirm" @click="confirmDeleteChar">确认删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量删除角色弹窗 -->
    <div v-if="showBatchDeleteModal" class="modal-overlay" @click.self="closeBatchDeleteModal">
      <div class="modal-window info-modal">
        <div class="modal-header">
          <h3>选择要删除的角色</h3>
          <button class="modal-close-x" @click="closeBatchDeleteModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="addedCards.length === 0" class="batch-delete-empty">
            <p>暂无已添加的角色</p>
          </div>
          <div v-else class="batch-delete-list">
            <label
              v-for="(card, idx) in addedCards"
              :key="card.instanceId"
              class="batch-delete-item"
              :class="{ checked: batchDeleteSelection[idx] }"
            >
              <input type="checkbox" v-model="batchDeleteSelection[idx]" hidden />
              <span class="batch-check-box">{{ batchDeleteSelection[idx] ? '✓' : '' }}</span>
              <div class="char-header-avatar-wrap mini">
                <img
                  :src="`/Header/${card.baseInfo.id}.png`"
                  class="char-header-avatar-img game-sprite"
                  @error="handleIconError"
                />
              </div>
              <span :class="`wish-rarity-color-${getRarityNum(card.baseInfo.step)}`" class="batch-char-name">{{ card.baseInfo.displayName }}</span>
              <span class="h-lbl batch-talent-num">{{ countTotalTalents(card) }}天赋</span>
            </label>
          </div>
          <div class="del-btn-wrap" v-if="addedCards.length > 0">
            <button class="btn-cancel" @click="closeBatchDeleteModal">取消</button>
            <button class="btn-del-confirm" @click="confirmBatchDelete" :disabled="!hasBatchDeleteSelection">
              删除选中 ({{ selectedBatchDeleteCount }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 天赋总览弹窗 -->
    <div v-if="talentOverviewModalVisible" class="modal-overlay" @click.self="closeTalentOverviewModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>天赋总览 ({{ totalUniqueTalentCount }})</h3>
          <button class="modal-close-x" @click="closeTalentOverviewModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="Object.keys(groupedTalentOverview).length === 0" style="text-align:center;padding:30px 0;color:var(--text-sub)">
            暂无天赋配置
          </div>
          <div v-else class="talent-ov-list">
            <div v-for="(tInfo, tName) in groupedTalentOverview" :key="tName" class="talent-ov-group">
              <div class="talent-ov-group-header" @click="toggleOverviewExpand(tName)">
                <span class="talent-ov-name" :style="{ color: getTalentStepConfig(tInfo._talentStep).color }">{{ tName }}</span>
                <span class="talent-ov-count-badge">{{ tInfo._totalCount }}</span>
                <img src="/ui/up.svg" class="collapse-icon" :class="{ 'expanded-flip': overviewExpanded[tName] }" />
              </div>
              <div v-if="overviewExpanded[tName]" class="talent-ov-group-body">
                <div v-for="(entry, eIdx) in tInfo._entries" :key="eIdx" class="matched-hero-card">
                  <div class="hero-left">
                    <div class="char-header-avatar-wrap mini">
                      <img
                        :src="`/Header/${entry.charId}.png`"
                        class="char-header-avatar-img game-sprite"
                        @error="handleIconError"
                      />
                    </div>
                    <span :class="`wish-rarity-color-${entry.rarityNum}`" class="hero-name-span">{{ entry.charName }}</span>
                    <div class="hero-labels-container">
                      <span class="h-lbl label-page">页{{ entry.pageIdx + 1 }}</span>
                      <span class="h-lbl label-count">×{{ entry.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除天赋确认弹窗 -->
    <div v-if="confirmDeleteSlotModal" class="modal-overlay" @click.self="cancelDeleteSlot">
      <div class="modal-window info-modal" style="max-width:360px">
        <div class="modal-header">
          <h3>删除天赋</h3>
          <button class="modal-close-x" @click="cancelDeleteSlot">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;gap:8px">
          <p style="margin:8px 0;font-size:15px;color:var(--text-main);font-weight:500">是否确认删除</p>
          <p style="margin:0 0 12px 0;font-size:13px;color:#ef4444">删除后无法恢复</p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn-cancel" @click="cancelDeleteSlot">取消</button>
            <button class="btn-del-confirm" @click="confirmDeleteSlot">确认删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息弹窗 -->
    <div v-if="showTalentMsgModal" class="modal-overlay" @click.self="closeTalentMsgModal">
      <div class="modal-window info-modal">
        <div class="modal-header">
          <h3>{{ talentMsgTitle }}</h3>
          <button class="modal-close-x" @click="closeTalentMsgModal">✕</button>
        </div>
        <div class="modal-body">
          <p :style="{ color: talentMsgType === 'error' ? '#ef4444' : '#10b981', fontWeight: 700, textAlign: 'center', margin: '12px 0 16px 0', fontSize: '14px' }">
            {{ talentMsgText }}
          </p>
          <div class="del-btn-wrap">
            <button class="btn-cancel" @click="closeTalentMsgModal">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <input type="file" ref="talentFileInput" @change="handleTalentDataImport" accept=".json" style="display:none" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import Sortable from 'sortablejs'
import * as configUtil from '@/utils/configTableUtil.js'
import { exportData, importData } from '@/utils/dataTransfer.js'
import rawRoles from '@/assets/Role.json'
import rawTalents from '@/assets/Talent.json'

import { getVisibleCharacters, isCharacterBlocked, isTalentVisible, getVisibleRaceNames } from '@/utils/characterFilter'

const allCharacters = ref([])
const allTalents = ref([])

const mainSearchQuery = ref('')
const charSearchQuery = ref('')
const talentSearchQuery = ref('')
// 是否显示专属/未实装天赋（来源以"专属("开头的天赋），默认隐藏
const showExclusiveTalent = ref(false)

const charModalVisible = ref(false)
const talentModalVisible = ref(false)
const detailModalVisible = ref(false)
const suggestExpanded = ref(true)

const currentDetailChar = ref(null)
const talentDisplayLimit = ref(20)
const charDisplayLimit = ref(20)
const PAGE_SIZE = 20
const loadMoreSentinel = ref(null)
const loadMoreCharSentinel = ref(null)
const sortableListRef = ref(null)
let sortableInstance = null
let charObserver = null

const showDeletePageModal = ref(false)
const targetDelCard = ref(null)
const targetDelPageIdx = ref(null)

// 删除角色弹窗
const showDeleteCharModal = ref(false)
const targetDeleteCharIdx = ref(null)

// 批量删除角色弹窗
const showBatchDeleteModal = ref(false)
const batchDeleteSelection = ref([])

// 天赋总览
const talentOverviewModalVisible = ref(false)
const overviewExpanded = reactive({})
const toggleOverviewExpand = (tName) => {
  overviewExpanded[tName] = !overviewExpanded[tName]
}
const openTalentOverviewModal = () => { talentOverviewModalVisible.value = true }
const closeTalentOverviewModal = () => { talentOverviewModalVisible.value = false }

// 导入导出
const talentFileInput = ref(null)

// 消息弹窗
const showTalentMsgModal = ref(false)
const talentMsgTitle = ref('')
const talentMsgText = ref('')
const talentMsgType = ref('info')
const showTalentMessage = (title, text, type = 'info') => {
  talentMsgTitle.value = title
  talentMsgText.value = text
  talentMsgType.value = type
  showTalentMsgModal.value = true
}
const closeTalentMsgModal = () => { showTalentMsgModal.value = false }

let observer = null

const activeSlotTracker = reactive({
  instanceId: null,
  pageIdx: null,
  slotIdx: null
})

const handleIconError = (e) => {
  e.target.src = '/Header/M00000.png'
}


// 本地持久化
const STORAGE_KEY = 'talent_manager_data'
const OLD_STORAGE_KEY = 'talent_sandbox_data'
const loadLocalData = () => {
  let cache = localStorage.getItem(STORAGE_KEY)
  if (!cache) {
    cache = localStorage.getItem(OLD_STORAGE_KEY)
    if (cache) {
      localStorage.setItem(STORAGE_KEY, cache)
      localStorage.removeItem(OLD_STORAGE_KEY)
    }
  }
  if (cache) {
    try {
      const parsed = JSON.parse(cache)
      addedCards.value = (parsed || []).filter(card => {
        if (!card) return false
        const charId = card.charId || (card.baseInfo && card.baseInfo.id)
        return !isCharacterBlocked(charId)
      })
    } catch (e) {
      addedCards.value = []
    }
  }
}

/** 检测并转换紧凑格式（在角色和天赋数据就绪后调用） */
const ensureCardFormat = () => {
  const raw = addedCards.value
  if (!Array.isArray(raw) || raw.length === 0) return
  if (!raw[0].charId) return // 已经是完整格式
  // 紧凑格式 -> 重建
  const rebuilt = raw.map(item => {
    const char = allCharacters.value.find(c => c.id === item.charId)
    if (!char) return null
    const card = {
      instanceId: 'char_' + Date.now() + Math.random().toString(36).substr(2, 5),
      baseInfo: char,
      isExpanded: false,
      activePageIdx: 0,
      talentPages: (item.talentPages || []).map(page => ({
        slots: (page.slots || []).map(s => {
          if (s && s.id) {
            const talent = allTalents.value.find(t => t.uid === s.id)
            return { talent: talent || null, talentExpand: false }
          }
          return { talent: null, talentExpand: false }
        })
      }))
    }
    card.talentPages.forEach(p => {
      while (p.slots.length < 4) p.slots.push({ talent: null, talentExpand: false })
    })
    if (card.talentPages.length === 0) {
      card.talentPages.push({
        slots: [
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false }
        ]
      })
    }
    return card
  }).filter(Boolean)
  addedCards.value = rebuilt
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rebuilt))
}
const saveLocalData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addedCards.value))
}
const addedCards = ref([])
watch(addedCards, () => saveLocalData(), { deep: true })

// 工具函数
const getTalentSourceLabel = (talent, allChars = []) => {
  return configUtil.getTalentSourceLabel(talent, allChars)
}
const getTalentStepConfig = (step = '') => {
  const TalentStepConfig = {
    S: { weight: 4, color: '#f97316', label: 'S' },
    A: { weight: 3, color: '#a855f7', label: 'A' },
    B: { weight: 2, color: '#60a5fa', label: 'B' },
    C: { weight: 1, color: '#10b981', label: 'C' },
    '': { weight: 0, color: '#94a3b8', label: '未知' }
  }
  return TalentStepConfig[String(step).toUpperCase()] ?? TalentStepConfig['']
}
const sortTalentAllQuality = (talentArr = []) => {
  const nameMap = new Map()
  talentArr.forEach(item => {
    const name = item.name || '无名天赋'
    if (!nameMap.has(name)) nameMap.set(name, [])
    nameMap.get(name).push(item)
  })
  const final = []
  nameMap.forEach(list => {
    list.sort((a, b) => {
      const wa = getTalentStepConfig(a.step).weight
      const wb = getTalentStepConfig(b.step).weight
      return wb - wa
    })
    final.push(...list)
  })
  return final
}
const fuzzyMatch = (target = '', query = '') => {
  const t = target.toLowerCase()
  const q = query.trim().toLowerCase()
  if (!q) return true
  return t.includes(q) || q.split('').every(char => t.includes(char))
}
const getRarityNum = (step = 'C') => {
  const map = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 }
  return map[step.toUpperCase()] ?? 0
}

// 筛选计算属性
const filteredAddedCards = computed(() => {
  const q = mainSearchQuery.value.trim()
  if (!q) return addedCards.value
  // Match by character name first
  const nameMatched = addedCards.value.filter(card =>
    fuzzyMatch(card.baseInfo.displayName, q)
  )
  // Then match by talent name or formattedEffect
  const talentMatched = addedCards.value.filter(card => {
    if (fuzzyMatch(card.baseInfo.displayName, q)) return false
    return card.talentPages.some(page =>
      page.slots.some(slot =>
        slot.talent && (fuzzyMatch(slot.talent.name, q) || fuzzyMatch(slot.talent.formattedEffect, q))
      )
    )
  })
  return [...nameMatched, ...talentMatched]
})
const suggestedCharacters = computed(() => {
  const q = charSearchQuery.value.trim()
  if (!q) return []
  return allCharacters.value.filter(c => fuzzyMatch(c.displayName, q))
})
const filteredModalCharacters = computed(() => {
  const q = charSearchQuery.value.trim()
  let list = allCharacters.value
  // 模糊筛选
  if (q) {
    list = list.filter(c => fuzzyMatch(c.displayName, q))
  }
  // 排序：先品质权重降序 → 基础本名分组 → 本体优先
  return list.sort((charA, charB) => {
    // 1. 获取品质权重
    const getWeight = (step) => {
      const map = { S:4, A:3, B:2, C:1 }
      return map[String(step).toUpperCase()] ?? 0
    }
    const wA = getWeight(charA.step)
    const wB = getWeight(charB.step)
    // 品质不同，高权重靠前
    if (wB !== wA) return wB - wA

    // 2. 提取基础本名：剥离 [xxx] 异化前缀
    const getBaseName = (name) => {
      const match = name.match(/^\[.+?\](.+)/)
      return match ? match[1] : name
    }
    const baseA = getBaseName(charA.displayName)
    const baseB = getBaseName(charB.displayName)
    // 基础名不同，按文字升序
    if (baseA !== baseB) return baseA.localeCompare(baseB)

    // 3. 同名：本体在前，异化在后（带[]的异化排后面）
    const isAlienA = /^\[.+?\]/.test(charA.displayName)
    const isAlienB = /^\[.+?\]/.test(charB.displayName)
    if (isAlienA !== isAlienB) return isAlienA ? 1 : -1

    // 同名同类型，按完整名称文字排序
    return charA.displayName.localeCompare(charB.displayName)
  })
})
const pagedModalCharacters = computed(() => {
  return filteredModalCharacters.value.slice(0, charDisplayLimit.value)
})
// 排除专属天赋后的底数（用于显示"共 X 个天赋"）
const modalBaseTalentCount = computed(() => {
  if (showExclusiveTalent.value) return allTalents.value.length
  return allTalents.value.filter(t => !t.sourceLabel.startsWith('专属(')).length
})

const filteredModalTalents = computed(() => {
  let list = allTalents.value
  // 不显示专属/未实装天赋（来源以"专属("开头），除非开关打开
  if (!showExclusiveTalent.value) {
    list = list.filter(t => !t.sourceLabel.startsWith('专属('))
  }
  const q = talentSearchQuery.value.trim()
  if (!q) return list
  return list.filter(t =>
    fuzzyMatch(t.name, q) || fuzzyMatch(t.formattedEffect, q) || fuzzyMatch(t.sourceLabel, q)
  )
})
const pagedModalTalents = computed(() => {
  return filteredModalTalents.value.slice(0, talentDisplayLimit.value)
})

// 角色弹窗操作
const openAddCharModal = () => {
  charSearchQuery.value = ''
  charDisplayLimit.value = PAGE_SIZE
  suggestExpanded.value = true
  charModalVisible.value = true
}
const closeCharModal = () => { charModalVisible.value = false }
const addCharacterCard = (char) => {
  addedCards.value.push({
    instanceId: 'char_' + Date.now() + Math.random().toString(36).substr(2, 5),
    baseInfo: char,
    isExpanded: false,
    activePageIdx: 0,
    talentPages: [
      {
        slots: [
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false },
          { talent: null, talentExpand: false }
        ]
      }
    ]
  })
  closeCharModal()
}
const toggleCardExpand = (card) => {
  card.isExpanded = !card.isExpanded
}
const deleteCard = (idx) => {
  addedCards.value.splice(idx, 1)
}

// 天赋页操作
const addTalentPage = (card) => {
  if (card.talentPages.length >= 4) return
  card.talentPages.push({
    slots: [ { talent: null }, { talent: null }, { talent: null }, { talent: null } ]
  })
  card.activePageIdx = card.talentPages.length - 1
}
const removeTalentPage = (card, pIdx) => {
  card.talentPages.splice(pIdx, 1)
  if (card.activePageIdx >= card.talentPages.length) {
    card.activePageIdx = card.talentPages.length - 1
  }
}

// 天赋选择弹窗
const openTalentSelectModal = (instanceId, pageIdx, slotIdx) => {
  activeSlotTracker.instanceId = instanceId
  activeSlotTracker.pageIdx = pageIdx
  activeSlotTracker.slotIdx = slotIdx
  talentSearchQuery.value = ''
  talentDisplayLimit.value = PAGE_SIZE
  talentModalVisible.value = true
}
const closeTalentModal = () => { talentModalVisible.value = false }
const selectTalentForSlot = (talent) => {
  const card = addedCards.value.find(c => c.instanceId === activeSlotTracker.instanceId)
  if (card && card.talentPages[activeSlotTracker.pageIdx]) {
    const slot = card.talentPages[activeSlotTracker.pageIdx].slots[activeSlotTracker.slotIdx]
    slot.talent = talent
    slot.talentExpand = false // 新增：选中天赋默认收起详情
  }
  closeTalentModal()
}
const confirmDeleteSlotModal = ref(false)
const pendingSlotToDelete = ref(null)
const openConfirmDeleteSlot = (slot) => {
  pendingSlotToDelete.value = slot
  confirmDeleteSlotModal.value = true
}
const confirmDeleteSlot = () => {
  if (pendingSlotToDelete.value) {
    pendingSlotToDelete.value.talent = null
    pendingSlotToDelete.value = null
  }
  confirmDeleteSlotModal.value = false
}
const cancelDeleteSlot = () => {
  pendingSlotToDelete.value = null
  confirmDeleteSlotModal.value = false
}

// 角色详情弹窗
const openCharDetailModal = (baseInfo) => {
  currentDetailChar.value = baseInfo
  detailModalVisible.value = true
}
const closeDetailModal = () => { detailModalVisible.value = false }

// 统计总天赋数量
const countTotalTalents = (card) => {
  let count = 0
  card.talentPages.forEach(p => {
    p.slots.forEach(s => { if (s.talent) count++ })
  })
  return count
}

// 删除天赋页弹窗
const openDeletePageModal = (card) => {
  targetDelCard.value = card
  targetDelPageIdx.value = 0
  showDeletePageModal.value = true
}
const confirmDeletePage = () => {
  if (!targetDelCard.value || targetDelPageIdx.value === null) return
  const card = targetDelCard.value
  removeTalentPage(card, targetDelPageIdx.value)
  showDeletePageModal.value = false
  targetDelCard.value = null
  targetDelPageIdx.value = null
}


// 打开删除角色确认弹窗
const openDeleteCharModal = (idx) => {
  targetDeleteCharIdx.value = idx
  showDeleteCharModal.value = true
}
// 确认删除角色
const confirmDeleteChar = () => {
  if (targetDeleteCharIdx.value === null) return
  addedCards.value.splice(targetDeleteCharIdx.value, 1)
  // 关闭弹窗、清空索引
  showDeleteCharModal.value = false
  targetDeleteCharIdx.value = null
}
// 关闭删除弹窗
const closeDeleteCharModal = () => {
  showDeleteCharModal.value = false
  targetDeleteCharIdx.value = null
}

// ===== 批量删除 =====
const openBatchDeleteModal = () => {
  batchDeleteSelection.value = addedCards.value.map(() => false)
  showBatchDeleteModal.value = true
}
const closeBatchDeleteModal = () => {
  showBatchDeleteModal.value = false
}
const hasBatchDeleteSelection = computed(() => batchDeleteSelection.value.some(v => v))
const selectedBatchDeleteCount = computed(() => batchDeleteSelection.value.filter(v => v).length)
const confirmBatchDelete = () => {
  const indices = batchDeleteSelection.value
    .map((sel, idx) => sel ? idx : -1)
    .filter(idx => idx >= 0)
    .sort((a, b) => b - a)
  indices.forEach(idx => addedCards.value.splice(idx, 1))
  closeBatchDeleteModal()
}

// ===== 全部展开/收起 =====
const expandAllCards = () => {
  addedCards.value.forEach(card => {
    card.isExpanded = true
    card.talentPages.forEach(p => {
      p.slots.forEach(s => {
        if (s.talent) s.talentExpand = true
      })
    })
  })
}
const collapseAllCards = () => {
  addedCards.value.forEach(card => {
    card.isExpanded = false
    card.talentPages.forEach(p => {
      p.slots.forEach(s => {
        if (s.talent) s.talentExpand = false
      })
    })
  })
}

const totalUniqueTalentCount = computed(() => {
  let count = 0
  addedCards.value.forEach(card => {
    card.talentPages.forEach(p => {
      p.slots.forEach(s => { if (s.talent) count++ })
    })
  })
  return count
})
const groupedTalentOverview = computed(() => {
  const groups = {}
  addedCards.value.forEach(card => {
    card.talentPages.forEach((page, pIdx) => {
      page.slots.forEach(slot => {
        if (slot.talent && slot.talent.name) {
          const name = slot.talent.name
          if (!groups[name]) {
            groups[name] = { _totalCount: 0, _expanded: false, _entries: [], _talentStep: slot.talent.step || '' }
          }
          groups[name]._totalCount++
          const existing = groups[name]._entries.find(
            e => e.charName === card.baseInfo.displayName && e.pageIdx === pIdx
          )
          if (existing) {
            existing.count++
          } else {
            groups[name]._entries.push({
              charId: card.baseInfo.id,
              charName: card.baseInfo.displayName,
              pageIdx: pIdx,
              count: 1,
              rarityNum: getRarityNum(card.baseInfo.step)
            })
          }
        }
      })
    })
  })
  return groups
})

// ===== 导入导出 =====
const exportTalentManagerData = () => {
  const compact = addedCards.value.map(card => {
    const talentPages = card.talentPages.map(page => ({
      slots: page.slots.map(slot => slot.talent ? { id: slot.talent.uid } : null)
    }))
    return { charId: card.baseInfo.id, talentPages }
  })
  exportData({
    _type: 'talent-manage',
    data: compact
  }, `talent_manager_data_${new Date().toISOString().slice(0, 10)}.json`)
}
const triggerTalentDataImport = () => {
  talentFileInput.value?.click()
}
const handleTalentDataImport = async (event) => {
  try {
    const result = await importData(event)
    if (!result || result._type !== 'talent-manage' || !Array.isArray(result.data)) {
      throw new Error('数据格式错误：缺少 _type 或 data 字段')
    }
    // 从紧凑格式重建卡片
    const rebuilt = []
    for (const item of result.data) {
      const char = allCharacters.value.find(c => c.id === item.charId)
      if (!char) continue
      const card = {
        instanceId: 'char_' + Date.now() + Math.random().toString(36).substr(2, 5),
        baseInfo: char,
        isExpanded: false,
        activePageIdx: 0,
        talentPages: (item.talentPages || []).map(page => ({
          slots: (page.slots || []).map(s => {
            if (s && s.id) {
              const talent = allTalents.value.find(t => t.uid === s.id)
              return { talent: talent || null, talentExpand: false }
            }
            return { talent: null, talentExpand: false }
          })
        }))
      }
      // 确保每个页至少有4个槽位
      card.talentPages.forEach(p => {
        while (p.slots.length < 4) p.slots.push({ talent: null, talentExpand: false })
      })
      if (card.talentPages.length === 0) {
        card.talentPages.push({
          slots: [
            { talent: null, talentExpand: false },
            { talent: null, talentExpand: false },
            { talent: null, talentExpand: false },
            { talent: null, talentExpand: false }
          ]
        })
      }
      rebuilt.push(card)
    }
    addedCards.value = rebuilt
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addedCards.value))
    showTalentMessage('提示', `导入成功！共导入 ${rebuilt.length} 个角色`, 'success')
  } catch (err) {
    showTalentMessage('导入失败', '导入失败：' + err.message, 'error')
  }
}

// 外部导入事件监听
const handleExternalTalentImport = () => { loadLocalData(); ensureCardFormat() }

// 滚动加载监听
watch(loadMoreSentinel, (el) => {
  if (el && observer) observer.observe(el)
})
watch(loadMoreCharSentinel, (el) => {
  if (el && charObserver) charObserver.observe(el)
})
watch(talentSearchQuery, () => { talentDisplayLimit.value = PAGE_SIZE })
watch(charSearchQuery, () => { charDisplayLimit.value = PAGE_SIZE })

// 搜索天赋时自动展开匹配的角色卡片并定位到对应天赋页
watch(mainSearchQuery, (q) => {
  if (!q.trim()) return
  addedCards.value.forEach(card => {
    let matched = false
    card.talentPages.forEach((page, pIdx) => {
      page.slots.forEach(slot => {
        if (slot.talent && (fuzzyMatch(slot.talent.name, q) || fuzzyMatch(slot.talent.formattedEffect, q))) {
          matched = true
          card.activePageIdx = pIdx
        }
      })
    })
    if (matched) card.isExpanded = true
  })
})
const initObserver = () => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && talentDisplayLimit.value < filteredModalTalents.value.length) {
      setTimeout(() => { talentDisplayLimit.value += PAGE_SIZE }, 100)
    }
  }, { rootMargin: '80px' })
}

const initCharObserver = () => {
  charObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && charDisplayLimit.value < filteredModalCharacters.value.length) {
      setTimeout(() => { charDisplayLimit.value += PAGE_SIZE }, 100)
    }
  }, { rootMargin: '80px' })
}

onMounted(() => {
  initObserver()
  initCharObserver()
  loadLocalData()
  if (typeof window !== 'undefined' && !window.buildNotes) {
    window.buildNotes = () => ""
  }
  // 预处理原始数据，修复变量提升报错
  const rawRoleArr = configUtil.extractDataArray(rawRoles)
  const rawTalentArr = configUtil.extractDataArray(rawTalents)
  const fullDatasets = {
    supportList: [],
    skillList: [],
    talentList: rawTalentArr,
    relicList: [],
    noteList: []
  }
  const fullCharacters = getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, fullDatasets))
  allCharacters.value = fullCharacters
  const visibleRaceNames = getVisibleRaceNames(fullCharacters)
  // 天赋预处理
  const cleanTalentList = rawTalentArr.map((t, idx) => {
    const base = {
      uid: t.IDs || t.Id || t.TalentID || `t_${idx}`,
      name: t.Name || t.TalentName || t.天赋名称 || '未命名天赋',
      step: t.Step || t.TalentStep || t.品质 || t.品阶 || '',
      Race: t.Race || '',
      Class: t.Class || '',
      Element: t.Element || '',
      SpecifyRoleIDs: t.SpecifyRoleIDs || '',
      Value0: t.Value0 ?? 0,
      Value1: t.Value1 ?? 0,
      Value2: t.Value2 ?? 0,
      formattedEffect: configUtil.replacePlaceholders(t.Effect || '', [t.Value0, t.Value1, t.Value2])
    }
    base.sourceLabel = configUtil.getTalentSourceLabel(base, allCharacters.value)
    return base
  }).filter(t => isTalentVisible(t, allCharacters.value, visibleRaceNames))
  allTalents.value = sortTalentAllQuality(cleanTalentList)
  // 如果 localStorage 存的是紧凑格式，现在角色和天赋数据就绪了，重建完整卡片
  ensureCardFormat()
  window.addEventListener('talent-manager-data-imported', handleExternalTalentImport)

  // 初始化拖拽排序
  nextTick(() => {
    if (!sortableListRef.value) return
    sortableInstance = new Sortable(sortableListRef.value, {
      handle: '.drag-handle',
      animation: 300,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      forceFallback: true,
      fallbackOnBody: true,
      scroll: true,
      scrollSensitivity: 60,
      fallbackClass: 'sortable-fallback',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: (evt) => {
        const oldIdx = evt.oldIndex
        const newIdx = evt.newIndex
        if (oldIdx === undefined || newIdx === undefined || oldIdx === newIdx) return
        const item = addedCards.value.splice(oldIdx, 1)[0]
        addedCards.value.splice(newIdx, 0, item)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(addedCards.value))
      }
    })
  })
})
onUnmounted(() => {
  if (observer) observer.disconnect()
  if (charObserver) charObserver.disconnect()
  if (sortableInstance) sortableInstance.destroy()
  window.removeEventListener('talent-manager-data-imported', handleExternalTalentImport)
})
defineExpose({ exportTalentManagerData, triggerTalentDataImport })
</script>

<style scoped>
/* 全局容器 */
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
.sandbox-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* Buttons row: 4 buttons equally distributed */
.talent-buttons-row {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}
.talent-action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--primary);
  border: 1.5px solid var(--primary);
  border-radius: 10px;
  padding: 0 6px;
  height: 28px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.talent-action-btn:first-child { margin-left: 10px; }
.talent-action-btn:last-child { margin-right: 10px; }
.talent-action-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}
/* 四个按键各自 hover 颜色 */
.talent-action-btn:nth-child(2):hover { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.talent-action-btn:nth-child(3):hover { border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.08); }
.talent-action-btn:nth-child(4):hover { border-color: #64748b; color: #64748b; background: rgba(100, 116, 139, 0.08); }

/* Talent overview trigger — 卡片样式 */
.talent-overview-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 14px 5px 14px; cursor: pointer; user-select: none; flex-shrink: 0;
  font-size: 15px; color: var(--text-main); font-weight: 700;
  background: #f1f5f9; border-radius: 12px; margin-top: 10px;
  border: 1px solid var(--border-color); transition: background 0.2s;
}
.dark-mode .talent-overview-trigger { background: rgba(255,255,255,0.04); }
.talent-overview-trigger:hover { background: #e8edf4; }
.dark-mode .talent-overview-trigger:hover { background: rgba(255,255,255,0.08); }
.overview-arrow-icon { width: 16px; height: 16px; filter: var(--icon-filter); opacity: 0.5; }

/* 天赋总览弹窗 — 参考 TalentView 来源弹窗 */
.talent-ov-list { display: flex; flex-direction: column; gap: 6px; }
.talent-ov-group { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.talent-ov-group-header {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  cursor: pointer; user-select: none; background: var(--card-bg);
}
.talent-ov-group-header:hover { background: var(--bg); }
.talent-ov-name { flex: 1; font-size: 14px; font-weight: 600; text-align: left; }
.talent-ov-count-badge {
  font-size: 11px; font-weight: 600; background: var(--bg);
  color: var(--text-main); border: 1px solid var(--border-color);
  padding: 2px 10px; border-radius: 10px;
}
.talent-ov-group-body {
  border-top: 1px solid var(--border-color); padding: 8px 12px;
  background: var(--bg); display: flex; flex-direction: column; gap: 6px;
}

/* matched-hero-card 风格 — 从 TalentView 迁移 */
.talent-ov-group-body .matched-hero-card {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 8px 12px;
}
.talent-ov-group-body .matched-hero-card:hover { background: var(--bg); }
.talent-ov-group-body .hero-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.talent-ov-group-body .hero-name-span { font-size: 14px; font-weight: 600; }
.talent-ov-group-body .hero-labels-container { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.talent-ov-group-body .h-lbl {
  font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px;
  border: 1px solid transparent;
}
.talent-ov-group-body .label-page { background-color: #eff6ff; color: #2563eb; border-color: #dbeafe; }
.talent-ov-group-body .label-count { background-color: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.dark-mode .talent-ov-group-body .label-page { background: rgba(37,99,235,0.2); color: #93c5fd; border-color: rgba(37,99,235,0.3); }
.dark-mode .talent-ov-group-body .label-count { background: rgba(22,163,74,0.2); color: #86efac; border-color: rgba(22,163,74,0.3); }
.dark-mode .talent-ov-group-body .matched-hero-card { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
.dark-mode .talent-ov-group-body .matched-hero-card:hover { background: rgba(255,255,255,0.08); }

/* Batch delete list */
.batch-delete-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 40vh;
  overflow-y: auto;
}
.batch-delete-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.batch-delete-item:hover {
  background: #f8fafc;
}
.batch-delete-item.checked {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
}
.batch-check-box {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  transition: all 0.15s;
}
.batch-delete-item.checked .batch-check-box {
  border-color: #ef4444;
  background: #ef4444;
}
.batch-char-name {
  font-size: 14px;
  font-weight: 600;
  margin-right: 4px;
}
.batch-talent-num {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
  background-color: #eff6ff;
  color: #2563eb;
  border-color: #dbeafe;
}
.dark-mode .batch-talent-num {
  background: rgba(37, 99, 235, 0.2);
  color: #93c5fd;
  border-color: rgba(37, 99, 235, 0.3);
}
.batch-delete-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-sub);
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
  transition: border-color 0.2s ease;
  flex: 1;
  height: 42px;
  box-sizing: border-box;
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
.modal-search-box-override {
  width: 100%;
  flex: none;
}
.modal-title-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub);
  margin-left: 6px;
}

/* 角色卡片列表 */
.sandbox-role-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0px 2px 2px 2px;
  overflow-y: auto;
  padding-bottom: 15px;
  flex: 1;
  min-height: 0;
}
.sandbox-role-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
  flex-shrink: 0;
}
.card-header-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 12px 8px;
  cursor: pointer;
  user-select: none;
}
.card-header-summary:hover {
  background: rgba(0, 0, 0, 0.015);
}
.drag-handle {
  width: 20px; height: 20px; cursor: grab; flex-shrink: 0;
  filter: var(--icon-filter); opacity: 0.4; transition: opacity 0.2s;
  touch-action: none;
}
.drag-handle:hover { opacity: 0.8; }

/* 角色头像样式 */
.char-header-avatar-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.char-header-avatar-wrap.mini {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.char-header-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transform: scale(1.4) translateY(2px);
}

img.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.mcr-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-hero-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-left-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.char-name-link {
  font-size: 16px;
  cursor: help;
}
.summary-stats-badges {
  display: flex;
  gap: 6px;
}
.stat-badge {
  font-size: 11px;
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}
.summary-right-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.collapse-icon {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.expanded-flip {
  transform: rotate(180deg);
}
.card-body-detail {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background: rgba(248, 250, 252, 0.4);
}
.slots-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.talent-slot-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.empty-slot-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 8px 12px;
}
.empty-hint-text {
  font-size: 13px;
  color: #94a3b8;
}
.slot-plus-btn, .slot-minus-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  cursor: pointer;
}
.slot-plus-btn:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
.slot-minus-btn:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
.plus-icon, .minus-icon { width: 12px; height: 12px; filter: var(--icon-filter); }
.filled-slot-block {
  flex: 1;
  background: #f8faff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
}
/* 天赋行头部弹性布局 */
.fs-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 10px;
}
/* 天赋名称 + 折叠箭头一行 */
.fs-name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
/* 右侧：来源标签 + 删除按钮 紧贴排列 */
.fs-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 天赋折叠箭头样式 */
.talent-collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  cursor: pointer;
  transition: transform 0.2s ease;
}
/* 天赋展开时箭头向下翻转 */
.talent-collapse-icon.expanded-flip {
  transform: rotate(180deg);
}
/* 角色头部箭头翻转规则修正：展开状态旋转180，原图up.svg，展开后朝下 */
.collapse-icon.expanded-flip {
  transform: rotate(180deg);
}
/* 天赋描述间距 */
.fs-effect {
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
  margin-top: 6px;
}
.fs-name { font-size: 14px; font-weight: 600; }
.fs-tag { font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; }


/* 天赋页标签栏 */
.talent-page-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  margin-top: 14px;
  gap: 10px;
}
.tabs-flex { display: flex; align-items: center; gap: 5px; overflow-x: auto; }
.page-tab-item {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
  padding: 6px 14px;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
}
.page-tab-item.active {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}
.tab-add-circle-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.tab-add-circle-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}
.tab-add-circle-btn .plus-icon {
  width: 12px;
  height: 12px;
  filter: var(--icon-filter);
}
.tab-minus-circle-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-main);
  padding: 0 0 0 0;
}
.tab-minus-circle-btn:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}
.tab-minus-circle-btn:hover { color: #ef4444; }

/* 删除弹窗卡片样式 */
.del-page-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  justify-content: center;
}
.del-page-card-item {
  padding: 8px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.18s ease;
  color: var(--primary);
  font-weight: 600;
}
.del-page-card-item.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}
.del-warning-text {
  color:#ef4444;
  font-weight: 700;
  text-align: center;
  margin:12px 0 16px 0;
  font-size:13px;
}
.del-btn-wrap {
  display: flex;
  gap:10px;
  justify-content: center;
  padding-top:4px;
}
.btn-cancel {
  padding:8px 18px;
  border:1px solid var(--border-color);
  border-radius:10px;
  background:transparent;
  cursor:pointer;
  font-size:14px;
}
.btn-del-confirm {
  padding:8px 18px;
  border:none;
  border-radius:10px;
  background:#ef4444;
  color:white;
  cursor:pointer;
  font-size:14px;
}

/* 弹窗通用 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
}
.modal-window {
  background: var(--card-bg);
  width: 92%; max-width: 520px; max-height: 76vh;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--border-color);
}
.info-modal { max-width: 400px; }
.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between;
}
.modal-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-main); display: flex; align-items: center; }
.modal-close-x { background: transparent; border: none; font-size: 16px; color: #94a3b8; cursor: pointer; }
.modal-body { padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

.char-suggest-bar { font-size: 12px; background: rgba(59, 130, 246, 0.04); padding: 10px; border-radius: 10px; }
.suggest-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.suggest-title { color: var(--text-sub); font-weight: 500; }
.suggest-tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.suggest-char-tag {
  background: var(--card-bg); padding: 3px 10px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--border-color); transition: all 0.2s;
}
.suggest-char-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.modal-scroll-list { display: flex; flex-direction: column; gap: 8px; max-height: 40vh; overflow-y: auto; }
.modal-char-row {
  padding: 12px; background: #f8fafc; border: 1px solid var(--border-color);
  border-radius: 12px; cursor: pointer; transition: background 0.15s;
}
.modal-char-row:hover { background: #f1f5f9; }
.mcr-main { display: flex; align-items: center; justify-content: space-between; }
.mcr-name { font-weight: 600; font-size: 14px; }
.mcr-badges { display: flex; gap: 4px; }
.h-lbl { font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 5px; }
.label-job { background-color: #eff6ff; color: #2563eb; }
.label-race { background-color: #f5f3ff; color: #7c3aed; }
.label-attr { background-color: #fff7ed; color: #ea580c; }
.talent-modal-row {
  padding: 12px; background: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.15s;
}
.talent-modal-row:hover { border-color: #3b82f6; background: #f8fafc; }
.mtr-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
.mtr-name { font-size: 14px; font-weight: 600; }
.mtr-tag { font-size: 11px; color: #065f46; background: #d1fae5; padding: 1px 6px; border-radius: 4px; }
.mtr-effect { font-size: 12px; color: var(--text-sub); line-height: 1.4; }

/* 专属天赋显示开关 */
.exclusive-toggle-row { padding: 8px 0; }
.toggle-label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.toggle-label input[type="checkbox"] { display: none; }
.toggle-slider {
  width: 36px; height: 20px; border-radius: 10px; background: #cbd5e1;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.toggle-slider::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s;
}
.toggle-label input:checked + .toggle-slider { background: #3b82f6; }
.toggle-label input:checked + .toggle-slider::after { transform: translateX(16px); }
.toggle-text { font-size: 12px; color: var(--text-sub); }

/* 角色详情弹窗卡片 */
.detail-display-card {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: #f8fafc;
  box-sizing: border-box;
}
.hero-name-span { font-size: 16px; font-weight: 700; }
.hero-labels-container { display: flex; flex-direction: row; gap: 6px; align-items: center; }

.wish-rarity-color-3 { color: #f97316 !important; font-weight: 600; }
.wish-rarity-color-2 { color: #a855f7 !important; font-weight: 600; }
.wish-rarity-color-1 { color: #10b981 !important; font-weight: 600; }
.wish-rarity-color-0 { color: #64748b !important; font-weight: 600; }

.load-more-sentinel { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: var(--text-sub); padding: 14px 0; }
.loading-spinner { width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.no-more-data, .sandbox-empty-state { font-size: 12px; color: var(--text-sub); text-align: center; padding: 20px 0; }
.placeholder-title { font-size: 14px; font-weight: 600; color: #475569; margin: 4px 0; }

/* 暗色适配 */
.dark-mode .sandbox-role-card { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
.dark-mode .card-header-summary:hover { background: rgba(255,255,255,0.05); }
.dark-mode .card-body-detail { background: transparent; border-top-color: rgba(255,255,255,0.08); }
.dark-mode .talent-slot-row { border-bottom-color: rgba(255,255,255,0.05); }
.dark-mode .empty-slot-placeholder { background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.12); }
.dark-mode .empty-hint-text { color: #64748b; }
.dark-mode .filled-slot-block { background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.2); }
.dark-mode .fs-top { border-bottom-color: rgba(255,255,255,0.06); }
.dark-mode .fs-tag { background: rgba(251, 146, 60, 0.15); color: #ffedd5; border-color: rgba(251, 146, 60, 0.3); }
.dark-mode .fs-effect { background: rgba(64, 158, 255, 0.08); color: #e2e8f0; }
.dark-mode .talent-page-tabs-row { border-top-color: rgba(255,255,255,0.08); }
.dark-mode .page-tab-item { background: rgba(255,255,255,0.05); color: #94a3b8; }
.dark-mode .page-tab-item.active { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.dark-mode .tab-add-circle-btn { border-color: rgba(255,255,255,0.2); }
.dark-mode .tab-minus-circle-btn { border-color: rgba(255,255,255,0.2); }
.dark-mode .stat-badge { background: rgba(255,255,255,0.06); color: #94a3b8; }
.dark-mode .modal-char-row, .dark-mode .detail-display-card { background: rgba(255,255,255,0.02); }
.dark-mode .batch-delete-item { border-color: rgba(255,255,255,0.1); }
.dark-mode .batch-delete-item:hover { background: rgba(255,255,255,0.05); }
.dark-mode .batch-delete-item.checked { border-color: #ef4444; background: rgba(239,68,68,0.1); }
.dark-mode .drag-handle { opacity: 0.3; }
</style>

<style>
/* Sortable 拖拽样式（全局，因克隆元素不带 scoped attribute） */
.sortable-ghost { opacity: 1; background: var(--card-bg); border: 2px dashed var(--primary); border-radius: 16px; }
.dark-mode .sortable-ghost { background: rgba(255,255,255,0.03); }
.sortable-drag { z-index: 9999 !important; }
.sortable-fallback { opacity: 1; transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 9999 !important; position: fixed !important; background: var(--card-bg); border-radius: 16px; }
</style>
