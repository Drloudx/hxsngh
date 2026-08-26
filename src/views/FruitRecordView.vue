<template>
  <div class="fruit-record-container">
    <!-- 顶部概览数据卡片 -->
    <div class="fruit-sticky-top">
      <div class="stats-overview-grid">
        <!-- 统计1：总获取大果数量（差值累加） -->
        <div class="stat-card total-stat-card">
          <div class="stat-card-icon-wrap">
            <img src="/Shop/D00002_001.png" class="fruit-icon-img pulse-anim" alt="大果" />
          </div>
          <div class="stat-card-info">
            <div class="stat-title-row">
              <span class="stat-label">总获取</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-number highlight-gold">{{ totalFruitCount }}</span>
              <span class="stat-unit">个</span>
            </div>
          </div>
        </div>

        <!-- 统计2：每天平均数量 -->
        <div class="stat-card avg-stat-card">
          <div class="stat-card-icon-wrap">
            <img src="/Shop/D00002_001.png" class="fruit-icon-img" alt="大果" />
          </div>
          <div class="stat-card-info">
            <div class="stat-title-row">
              <span class="stat-label">每天平均</span>
            </div>
            <div class="stat-value-row">
              <span class="stat-number highlight-blue">{{ averageFruitCount }}</span>
              <span class="stat-unit">个/天</span>
            </div>
          </div>
        </div>

        <!-- 统计3：本周日均数量 -->
        <div class="stat-card week-avg-stat-card">
          <div class="stat-card-icon-wrap">
            <img src="/Shop/D00002_001.png" class="fruit-icon-img" alt="大果" />
          </div>
          <div class="stat-card-info">
            <div class="stat-title-row">
              <span class="stat-label">本周日均</span>
            </div>
            <div class="stat-value-row">
              <span
                class="stat-number highlight-green"
              >{{ thisWeekAverageFruitCount }}</span>
              <span class="stat-unit">个/天</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 次要数据统计条 -->
      <div class="secondary-stats-bar">
        <div class="mini-stat-item">
          <span class="mini-stat-label">总消耗</span>
          <span class="mini-stat-val consumption-mini-val">{{ totalConsumedFruitCount }} 个</span>
        </div>
        <div class="mini-stat-divider"></div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">净变化</span>
          <span
            class="mini-stat-val"
            :class="netFruitChange < 0 ? 'negative-mini-val' : 'positive-mini-val'"
          >{{ netFruitChange > 0 ? `+${netFruitChange}` : netFruitChange }} 个</span>
        </div>
        <div class="mini-stat-divider"></div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">已记录</span>
          <span class="mini-stat-val">{{ records.length }} 天</span>
        </div>
        <div class="mini-stat-divider"></div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">本周新增</span>
          <span class="mini-stat-val">{{ thisWeekFruitCount }} 个</span>
        </div>
        <div class="mini-stat-divider"></div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">本月新增</span>
          <span class="mini-stat-val">{{ thisMonthFruitCount }} 个</span>
        </div>
        <div class="mini-stat-divider"></div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">日增峰值</span>
          <span class="mini-stat-val">{{ maxSingleDayCount }} 个</span>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="fruit-main-content">
      <!-- 今日打卡卡片 -->
      <div class="card-box today-input-card">
        <div class="card-header">
          <div class="header-left">
            <img src="/Shop/D00002_001.png" class="header-fruit-icon" />
            <span class="card-main-title">今日大果记录</span>
            <span class="today-date-badge">{{ todayDateString }} ({{ todayWeekday }})</span>
          </div>

          <div v-if="todayRecord" class="today-status-badge recorded">
            <span class="status-dot"></span> 已记录
          </div>
          <div v-else class="today-status-badge unrecorded">
            <span class="status-dot"></span> 今日待记录
          </div>
        </div>

        <div class="card-body">
          <div class="input-main-row">
            <div class="input-main-header">
              <div class="input-label-group">
                <img src="/Shop/D00002_001.png" class="label-fruit-img" />
                <span class="input-label-text">今日数量：</span>
              </div>
              <button
                type="button"
                class="fill-yesterday-btn"
                :disabled="!previousInputRecord"
                @click="fillPreviousInputCount"
              >
                上一次输入数量
              </button>
            </div>

            <div class="quantity-fields-row">
              <div class="input-field-wrapper quantity-field-wrapper">
                <span class="input-field-prefix">当前</span>
                <input
                  type="number"
                  v-model.number="todayInputCount"
                  placeholder="输入数量"
                  min="0"
                  step="1"
                  class="fruit-number-input"
                  @keyup.enter="saveTodayRecord"
                />
                <span class="input-suffix">个</span>
              </div>
              <div class="input-field-wrapper quantity-field-wrapper">
                <span class="input-field-prefix consumed-field-prefix">消耗</span>
                <input
                  type="number"
                  v-model.number="todayInputConsumed"
                  placeholder="累计"
                  min="0"
                  step="1"
                  class="fruit-number-input consumed-number-input"
                />
                <span class="input-suffix">个</span>
              </div>
            </div>
          </div>

          <!-- 差值动态计算提示 -->
          <div v-if="todayDiffPreview" class="today-diff-hint" :class="todayDiffPreview.type">
            <span class="diff-hint-text">{{ todayDiffPreview.text }}</span>
          </div>

          <div class="today-auto-consume-note">
            提示：当天已有记录时，若当前数量低于上次保存数量，系统会自动将差额计入今日消耗；如需修改，请直接编辑消耗数值。
          </div>

          <label class="spread-option-row today-spread-option">
            <input
              v-model="todayInputSpreadAcrossDays"
              type="checkbox"
              class="spread-option-input"
            />
            <span class="spread-option-copy">
              <span class="spread-option-title">间断天数均摊</span>
              <span class="spread-option-desc">跨天未记录时，按间隔天数分摊获取</span>
            </span>
          </label>

          <!-- 快捷加减按钮组 -->
          <div class="quick-buttons-row">
            <button class="quick-btn plus" @click="quickAdjustToday(1)">+1</button>
            <button class="quick-btn plus" @click="quickAdjustToday(5)">+5</button>
            <button class="quick-btn plus" @click="quickAdjustToday(10)">+10</button>
            <button class="quick-btn plus" @click="quickAdjustToday(20)">+20</button>
            <button class="quick-btn minus" :disabled="!todayInputCount" @click="quickAdjustToday(-1)">-1</button>
            <button class="quick-btn clear" :disabled="!todayInputCount" @click="todayInputCount = 0">清零</button>
          </div>

          <!-- 可选备注 -->
          <div class="today-remark-row">
            <div v-if="todayRecord && todayRecord.remark" class="current-remark-tip">
              已记录：{{ todayRecord.remark }}
            </div>
            <input
              type="text"
              v-model="todayInputRemark"
              placeholder="备注（如：商人*20、宝库*20）"
              class="fruit-remark-input"
              maxlength="50"
            />
          </div>

          <!-- 保存按钮 -->
          <div class="action-btn-row">
            <button class="save-primary-btn" @click="saveTodayRecord">
              <span v-if="saveSuccessFeedback" class="btn-check-icon">✓</span>
              <span>{{ saveSuccessFeedback ? '已保存！' : (todayRecord ? '更新今日记录' : '保存今日记录') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 历史记录工具栏与列表 -->
      <div class="history-section-header">
        <div class="section-title-wrap">
          <span class="section-title">历史打卡记录</span>
          <span class="section-subtitle">(共 {{ records.length }} 天)</span>
        </div>
        <div class="section-actions-wrap">
          <button class="tool-btn add-btn" @click="openAddCustomModal">
            <span>+ 补录其他日期</span>
          </button>
          <button class="tool-btn sort-btn" @click="toggleSortOrder">
            <span>{{ sortOrder === 'desc' ? '最新在前 ↓' : '最早在前 ↑' }}</span>
          </button>
        </div>
      </div>

      <!-- 搜索与筛选栏 -->
      <div class="history-search-row">
        <div class="search-input-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索日期、备注或数量..."
            class="history-search-input"
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
        </div>
        <div class="data-manage-dropdown-btn-wrap">
          <button class="tool-btn-sub" @click="showDataManageModal = true">
            <span>数据管理</span>
          </button>
        </div>
      </div>

      <!-- 历史记录列表：按月份与周次折叠归档 -->
      <div v-if="filteredDisplayList.length > 0" class="history-archive-list">
        <section
          v-for="monthGroup in archiveGroups"
          :key="monthGroup.key"
          class="archive-month-section"
        >
          <button
            type="button"
            class="archive-month-toggle"
            :class="{ expanded: isArchiveExpanded(monthGroup.key) }"
            :aria-expanded="isArchiveExpanded(monthGroup.key)"
            @click="toggleArchive(monthGroup.key)"
          >
            <span class="archive-period-icon month-icon">月</span>
            <span class="archive-title-box">
              <span class="archive-title">{{ monthGroup.label }}</span>
              <span v-if="monthGroup.isCurrent" class="archive-current-tag">本月</span>
              <span v-else class="archive-closed-tag">已归档</span>
            </span>
            <span class="archive-meta">{{ monthGroup.recordCount }} 天记录</span>
            <span class="archive-chevron" aria-hidden="true">⌄</span>
          </button>

          <div v-if="isArchiveExpanded(monthGroup.key)" class="archive-month-body">
            <section
              v-for="weekGroup in monthGroup.weeks"
              :key="weekGroup.key"
              class="archive-week-section"
            >
              <button
                type="button"
                class="archive-week-toggle"
                :class="{ expanded: isArchiveExpanded(weekGroup.key), current: weekGroup.isCurrent }"
                :aria-expanded="isArchiveExpanded(weekGroup.key)"
                @click="toggleArchive(weekGroup.key)"
              >
                <span class="archive-period-icon week-icon">周</span>
                <span class="archive-title-box">
                  <span class="archive-title">{{ weekGroup.label }}</span>
                  <span class="archive-week-range">{{ weekGroup.range }}</span>
                  <span v-if="!weekGroup.isCurrent" class="archive-closed-tag">已归档</span>
                </span>
                <span class="archive-meta">{{ weekGroup.recordCount }} 天</span>
                <span class="archive-chevron" aria-hidden="true">⌄</span>
              </button>

              <div v-if="isArchiveExpanded(weekGroup.key)" class="archive-week-body">
                <div class="history-list">
                  <template v-for="item in weekGroup.items" :key="item.id">
          <!-- 1. 漏记平摊特殊条目 -->
          <div v-if="item.type === 'gap'" class="history-item-card gap-special-card">
            <div class="item-left-info">
              <div class="item-date-row">
                <span class="gap-tag-pill">漏记平摊</span>
                <span class="item-date gap-date-text">{{ item.dateRangeStr }}</span>
                <span class="item-weekday-tag">{{ item.missingDaysCount }}天未记</span>
              </div>
              <div class="item-inventory-row gap-detail-row">
                <span class="inventory-val">{{ item.prevCount }} → {{ item.currCount }}</span>
                <span class="gap-calc-explain">
                  （获取 +{{ item.totalAcquired }}，消耗 {{ item.totalConsumed }}，净变化 {{ formatSignedNumber(item.totalDiff) }}）
                </span>
              </div>
            </div>

            <div class="item-right-content">
              <div v-if="item.isPositive" class="item-count-badge gain">
                <img src="/Shop/D00002_001.png" class="badge-fruit-icon" />
                <span class="badge-count-num">日均 +{{ item.formattedAvg }}</span>
              </div>
              <div v-else class="item-count-badge used">
                <img src="/Shop/D00002_001.png" class="badge-fruit-icon" />
                <span class="badge-count-num used">日均 {{ Math.round(item.totalDiff / item.totalSpanDays) }}</span>
              </div>
            </div>
          </div>

          <!-- 2. 普通每日记录条目 -->
          <div
            v-else
            class="history-item-card"
            :class="{ 'is-today-item': item.date === todayDateString }"
          >
            <div class="item-left-info">
              <div class="item-date-row">
                <span class="item-date">{{ item.date }}</span>
                <span class="item-weekday-tag">{{ getWeekdayString(item.date) }}</span>
                <span v-if="item.date === todayDateString" class="item-today-tag">今天</span>
              </div>
              <div class="item-inventory-row">
                <span class="inventory-label">当前数量：</span>
                <span class="inventory-val">{{ item.count }}</span>
                <span v-if="item.daysSpan > 1 && item.spreadAcrossDays && item.status === 'gain'" class="gap-calc-explain">（跨 {{ item.daysSpan }} 天均摊）</span>
                <span v-else-if="item.daysSpan > 1 && !item.spreadAcrossDays" class="gap-calc-explain">（跨 {{ item.daysSpan }} 天，未均摊）</span>
                <span v-if="item.consumed > 0" class="record-flow-note">
                  获取 +{{ item.acquired }} · 消耗 {{ item.consumed }}
                </span>
                <span v-if="item.remark" class="item-remark-inline">
                  <span class="remark-label">备注：</span>{{ item.remark }}
                </span>
              </div>
            </div>

            <div class="item-right-content">
              <!-- 首日基准值 -->
              <div v-if="item.isBase" class="item-badge-base">
                <span class="badge-text">初始基准</span>
              </div>
              <!-- 有效获取（差值 > 0） -->
              <div v-else-if="item.status === 'gain'" class="item-count-badge gain">
                <img src="/Shop/D00002_001.png" class="badge-fruit-icon" />
                <span class="badge-count-num">+{{ item.formattedGain }}</span>
              </div>
              <!-- 差值为负（消耗，不计入获取） -->
              <div v-else-if="item.status === 'used'" class="item-count-badge used">
                <img src="/Shop/D00002_001.png" class="badge-fruit-icon" />
                <span class="badge-count-num used">{{ item.diff }}</span>
              </div>
              <!-- 差值为0 -->
              <div v-else class="item-count-badge zero">
                <span class="badge-zero-num">+0</span>
              </div>

              <div class="item-actions">
                <button class="item-action-btn edit-btn" title="编辑" @click="openEditModal(item)">
                  <span class="action-symbol" aria-hidden="true">✎</span>
                </button>
                <button class="item-action-btn del-btn" title="删除" @click="openDeleteConfirm(item)">
                  <span class="action-symbol delete-symbol" aria-hidden="true">×</span>
                </button>
              </div>
            </div>
          </div>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state-box">
        <div class="empty-icon-wrap">
          <img src="/Shop/D00002_001.png" class="empty-fruit-img" />
        </div>
        <div class="empty-title">{{ searchQuery ? '未找到匹配的打卡记录' : '暂无大果打卡记录' }}</div>
        <div class="empty-desc">
          {{ searchQuery ? '请尝试更换搜索关键词' : '在上方输入今天的当前数量，从第二天起即可自动计算获取差值！' }}
        </div>
      </div>
    </div>

    <!-- 弹窗1：补录/新增/编辑记录弹窗 -->
    <div v-if="customModalVisible" class="custom-modal-overlay" @click.self="closeCustomModal">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>{{ editingRecord ? '编辑大果记录' : '补录大果记录' }}</h3>
          <button class="modal-close-x" @click="closeCustomModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-form-group">
            <label class="modal-form-label">打卡日期：</label>
            <input
              type="date"
              v-model="customForm.date"
              class="modal-date-input"
              :disabled="editingRecord"
            />
          </div>

          <div class="modal-form-group">
            <label class="modal-form-label">当前数量：</label>
            <div class="modal-input-wrapper">
              <img src="/Shop/D00002_001.png" class="modal-fruit-icon" />
              <input
                type="number"
                v-model.number="customForm.count"
                placeholder="请输入当前数量"
                min="0"
                step="1"
                class="modal-number-input"
              />
              <span class="modal-input-unit">个</span>
            </div>
          </div>

          <div class="modal-form-group">
            <label class="modal-form-label">今日累计消耗：</label>
            <div class="modal-input-wrapper consumed-modal-wrapper">
              <input
                type="number"
                v-model.number="customForm.consumed"
                placeholder="0"
                min="0"
                step="1"
                class="modal-number-input"
              />
              <span class="modal-input-unit">个</span>
            </div>
          </div>

          <label class="spread-option-row modal-spread-option">
            <input
              v-model="customForm.spreadAcrossDays"
              type="checkbox"
              class="spread-option-input"
            />
            <span class="spread-option-copy">
              <span class="spread-option-title">间断天数均摊</span>
              <span class="spread-option-desc">未上线时取消，获取计入本次记录日</span>
            </span>
          </label>

          <!-- 弹窗快捷按钮 -->
          <div class="modal-quick-btns">
            <button class="quick-btn plus" @click="adjustModalCount(1)">+1</button>
            <button class="quick-btn plus" @click="adjustModalCount(2)">+2</button>
            <button class="quick-btn plus" @click="adjustModalCount(5)">+5</button>
            <button class="quick-btn minus" :disabled="!customForm.count" @click="adjustModalCount(-1)">-1</button>
          </div>

          <div class="modal-form-group">
            <label class="modal-form-label">备注说明（可选）：</label>
            <div v-if="editingRecord && customForm.existingRemark" class="modal-current-remark">
              当前备注：{{ customForm.existingRemark }}
            </div>
            <input
              type="text"
              v-model="customForm.remark"
              placeholder="来源备注（如：商人*20、宝库*20）"
              class="modal-text-input"
              maxlength="50"
            />
          </div>

          <div v-if="dateConflictWarning" class="modal-warning-tip">
            ⚠️ 提示：该日期已有记录（当前数量：{{ dateConflictCount }}个），保存后数量会更新，备注会自动合并。
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeCustomModal">取消</button>
          <button class="modal-btn-confirm" @click="saveCustomRecord">保存记录</button>
        </div>
      </div>
    </div>

    <!-- 弹窗2：删除单条记录确认 -->
    <div v-if="deleteModalVisible" class="custom-modal-overlay" @click.self="deleteModalVisible = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>删除记录确认</h3>
          <button class="modal-close-x" @click="deleteModalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-confirm-text">
          确定要删除 <strong>{{ targetDeleteItem?.date }}</strong> 的大果打卡记录（当前数量：<strong>{{ targetDeleteItem?.count }}</strong> 个）吗？
          </p>
          <p class="del-warning-sub">删除后历史差值将重新计算。</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="deleteModalVisible = false">取消</button>
          <button class="modal-btn-danger" @click="confirmDeleteRecord">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 弹窗3：数据管理弹窗（导入、导出、清空） -->
    <div v-if="showDataManageModal" class="custom-modal-overlay" @click.self="showDataManageModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>大果记录数据管理</h3>
          <button class="modal-close-x" @click="showDataManageModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="data-manage-btn-list">
            <button class="manage-action-card-btn" @click="exportFruitData">
              <div class="manage-btn-text-box">
                <span class="manage-btn-title">导出大果记录</span>
                <span class="manage-btn-desc">将全部 {{ records.length }} 条打卡数据导出为 JSON 文件</span>
              </div>
            </button>

            <button class="manage-action-card-btn" @click="triggerFruitImport">
              <div class="manage-btn-text-box">
                <span class="manage-btn-title">导入大果记录</span>
                <span class="manage-btn-desc">从 JSON 文件导入打卡数据</span>
              </div>
            </button>

            <button class="manage-action-card-btn danger" @click="showClearAllModal = true">
              <div class="manage-btn-text-box">
                <span class="manage-btn-title danger-text">清空所有记录</span>
                <span class="manage-btn-desc">删除本地存储的所有大果打卡记录</span>
              </div>
            </button>
          </div>
          <input
            type="file"
            ref="importFileInput"
            accept=".json"
            style="display: none"
            @change="handleFruitImport"
          />
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showDataManageModal = false">完成</button>
        </div>
      </div>
    </div>

    <!-- 弹窗4：清空所有记录二次确认 -->
    <div v-if="showClearAllModal" class="custom-modal-overlay" @click.self="showClearAllModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3 class="danger-text">⚠️ 警告：清空全部记录</h3>
          <button class="modal-close-x" @click="showClearAllModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-confirm-text">
            您确定要清空全部 <strong>{{ records.length }}</strong> 条大果打卡记录吗？
          </p>
          <p class="del-warning-sub">该操作将永久删除所有历史统计数据且不可逆，建议先导出备份！</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="showClearAllModal = false">取消</button>
          <button class="modal-btn-danger" @click="confirmClearAll">确定清空</button>
        </div>
      </div>
    </div>

    <!-- 提示消息 Toast -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast-popup">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { exportData, importData } from '../utils/dataTransfer'

const STORAGE_KEY = 'fruit_record_data'

// 记录数据列表（存储格式：[{ date, count, consumed, spreadAcrossDays, remark }]）
const records = ref([])
const searchQuery = ref('')
const sortOrder = ref('desc') // 'desc' (最新在前) | 'asc' (最早在前)
const archiveExpansionState = ref(new Map())
const toastMessage = ref('')
const saveSuccessFeedback = ref(false)

// 今日数据相关
const todayInputCount = ref(0)
const todayInputConsumed = ref(0)
const todayConsumedBaseline = ref(0)
const todayInputSpreadAcrossDays = ref(true)
const todayInputRemark = ref('')

// 弹窗状态
const customModalVisible = ref(false)
const editingRecord = ref(false)
const customForm = ref({
  date: '',
  count: 1,
  consumed: '',
  spreadAcrossDays: true,
  remark: '',
  existingRemark: '',
  existingConsumed: 0
})

const deleteModalVisible = ref(false)
const targetDeleteItem = ref(null)

const showDataManageModal = ref(false)
const showClearAllModal = ref(false)
const importFileInput = ref(null)

// 格式化当前日期 YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayDateString = computed(() => getLocalDateString())

// 计算两日期相差天数
const getDaysDiff = (d1Str, d2Str) => {
  const [y1, m1, day1] = d1Str.split('-').map(Number)
  const [y2, m2, day2] = d2Str.split('-').map(Number)
  const d1 = new Date(y1, m1 - 1, day1)
  const d2 = new Date(y2, m2 - 1, day2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

const getNextDateString = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  return getLocalDateString(dt)
}

const getPrevDateString = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return getLocalDateString(dt)
}

// 归档辅助：按自然周的周一作为周归档标识
const getWeekStartDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dayOfWeek = dt.getDay() || 7
  dt.setDate(dt.getDate() - dayOfWeek + 1)
  return getLocalDateString(dt)
}

const getWeekEndDate = (weekStartDate) => {
  const [y, m, d] = weekStartDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 6)
  return getLocalDateString(dt)
}

const formatArchiveShortDate = (dateStr) => {
  if (!dateStr) return ''
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`
}

// 星期几辅助函数
const getWeekdayString = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3) return ''
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[d.getDay()] || ''
}

const todayWeekday = computed(() => getWeekdayString(todayDateString.value))

// 今日已保存的记录（如果有）
const todayRecord = computed(() => {
  return records.value.find(r => r.date === todayDateString.value)
})

// 初始化与同步今日输入框
const syncTodayInput = () => {
  const found = todayRecord.value
  if (found) {
    todayInputCount.value = found.count ?? 0
    // 消耗输入框显示今日累计值，保存时可直接改为 0 或其他累计值
    todayInputConsumed.value = getRecordConsumed(found)
    todayConsumedBaseline.value = getRecordConsumed(found)
    todayInputSpreadAcrossDays.value = shouldSpreadAcrossDays(found)
    // 旧备注单独展示，备注输入框只填写本次要追加的内容，避免重复累加
    todayInputRemark.value = ''
  } else {
    // 新的一天保持空白，避免上一条数量干扰本次输入；需要时手动填充上一条数量。
    todayInputCount.value = 0
    todayInputConsumed.value = 0
    todayConsumedBaseline.value = 0
    todayInputSpreadAcrossDays.value = true
    todayInputRemark.value = ''
  }
}

const getRecordConsumed = (record) => Math.max(0, Math.floor(Number(record?.consumed) || 0))
// 旧记录没有该字段时默认保持原来的均摊行为。
const shouldSpreadAcrossDays = (record) => record?.spreadAcrossDays !== false

const getIntervalMetrics = (previousRecord, currentRecord) => {
  const netChange = (Number(currentRecord.count) || 0) - (Number(previousRecord.count) || 0)
  const hasExplicitConsumed = Object.prototype.hasOwnProperty.call(currentRecord || {}, 'consumed')
  const enteredConsumed = hasExplicitConsumed ? getRecordConsumed(currentRecord) : null
  const inferredConsumed = Math.max(0, -netChange)
  // 新数据中的 consumed=0 是用户明确设置的值；旧 JSON 没有该字段时才自动推算。
  const consumed = hasExplicitConsumed ? enteredConsumed : inferredConsumed
  const acquired = Math.max(0, netChange + consumed)

  return {
    netChange,
    consumed,
    acquired
  }
}

const formatSignedNumber = (value) => {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

// ===== 核心机制：差值计算 + 漏记区间平摊 =====
const processedListWithGaps = computed(() => {
  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return []

  const result = []

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (i === 0) {
      // 第一天初始基准
      result.push({
        type: 'record',
        id: `rec_${item.date}`,
        date: item.date,
        count: item.count,
        consumed: getRecordConsumed(item),
        remark: item.remark,
        spreadAcrossDays: shouldSpreadAcrossDays(item),
        isBase: true,
        diff: 0,
        gain: 0,
        daysSpan: 1,
        status: 'base'
      })
      continue
    }

    const prev = sorted[i - 1]
    const daysSpan = getDaysDiff(prev.date, item.date)
    const metrics = getIntervalMetrics(prev, item)
    const diff = metrics.netChange
    const spreadAcrossDays = shouldSpreadAcrossDays(item)

    if (daysSpan > 1 && spreadAcrossDays) {
      // 中间漏了天数（daysSpan > 1）
      const missingDaysCount = daysSpan - 1
      const startMissingDate = getNextDateString(prev.date)
      const endMissingDate = getPrevDateString(item.date)
      const isPositive = metrics.acquired > 0
      const avgGain = isPositive ? metrics.acquired / daysSpan : 0
      const formattedAvg = String(Math.round(avgGain))

      // 插入中间漏记的平摊特殊条目
      result.push({
        type: 'gap',
        id: `gap_${prev.date}_${item.date}`,
        date: endMissingDate,
        startDate: startMissingDate,
        endDate: endMissingDate,
        dateRangeStr: startMissingDate === endMissingDate ? startMissingDate : `${startMissingDate} ~ ${endMissingDate}`,
        missingDaysCount,
        totalSpanDays: daysSpan,
        totalDiff: diff,
        totalAcquired: metrics.acquired,
        totalConsumed: metrics.consumed,
        avgGain,
        formattedAvg,
        isPositive,
        status: isPositive ? 'gain' : (diff < 0 ? 'used' : 'zero'),
        prevDate: prev.date,
        currDate: item.date,
        prevCount: prev.count,
        currCount: item.count
      })

      // 当日记录（显示平摊后的日均增量）
      result.push({
        type: 'record',
        id: `rec_${item.date}`,
        date: item.date,
        count: item.count,
        consumed: metrics.consumed,
        remark: item.remark,
        spreadAcrossDays: true,
        isBase: false,
        diff,
        gain: isPositive ? avgGain : 0,
        formattedGain: isPositive ? formattedAvg : String(diff),
        totalIntervalGain: isPositive ? metrics.acquired : 0,
        acquired: metrics.acquired,
        daysSpan,
        status: isPositive ? 'gain' : (diff < 0 ? 'used' : 'zero')
      })
    } else {
      // 连续无漏记
      const isPositive = metrics.acquired > 0
      result.push({
        type: 'record',
        id: `rec_${item.date}`,
        date: item.date,
        count: item.count,
        remark: item.remark,
        spreadAcrossDays,
        isBase: false,
        diff,
        gain: isPositive ? metrics.acquired : 0,
        acquired: metrics.acquired,
        consumed: metrics.consumed,
        formattedGain: isPositive ? String(metrics.acquired) : String(diff),
        daysSpan: spreadAcrossDays ? 1 : daysSpan,
        status: isPositive ? 'gain' : (diff < 0 ? 'used' : 'zero')
      })
    }
  }

  return result
})

// 已获取大果总数量（所有区间的有效正增长总和）
const totalFruitCount = computed(() => {
  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    total += getIntervalMetrics(sorted[i - 1], sorted[i]).acquired
  }
  return total
})

const totalConsumedFruitCount = computed(() => {
  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    total += getIntervalMetrics(sorted[i - 1], sorted[i]).consumed
  }
  return total
})

const netFruitChange = computed(() => totalFruitCount.value - totalConsumedFruitCount.value)

// 有效增长天数（平摊包含漏记区间的实际天数跨度）
const validGainDaysCount = computed(() => {
  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let days = 0
  for (let i = 1; i < sorted.length; i++) {
    const metrics = getIntervalMetrics(sorted[i - 1], sorted[i])
    if (metrics.acquired > 0) {
      const span = getDaysDiff(sorted[i - 1].date, sorted[i].date)
      days += shouldSpreadAcrossDays(sorted[i]) ? span : 1
    }
  }
  return days
})

// 每天平均数量：总获取 / 平摊后的有效增长天数
const averageFruitCount = computed(() => {
  if (validGainDaysCount.value === 0) return '0'
  const avg = totalFruitCount.value / validGainDaysCount.value
  return String(Math.round(avg))
})

// 本周获取
const thisWeekFruitCount = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const mondayStr = getLocalDateString(monday)

  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let sum = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].date >= mondayStr && sorted[i].date <= todayDateString.value) {
      sum += getIntervalMetrics(sorted[i - 1], sorted[i]).acquired
    }
  }
  return sum
})

// 本周有效获取天数：只统计本周实际产生获取的区间；间断区间按是否均摊决定天数。
const thisWeekValidGainDaysCount = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const mondayStr = getLocalDateString(monday)

  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let days = 0
  for (let i = 1; i < sorted.length; i++) {
    const previousRecord = sorted[i - 1]
    const currentRecord = sorted[i]
    if (currentRecord.date < mondayStr || currentRecord.date > todayDateString.value) continue

    const metrics = getIntervalMetrics(previousRecord, currentRecord)
    if (metrics.acquired > 0) {
      const span = getDaysDiff(previousRecord.date, currentRecord.date)
      days += shouldSpreadAcrossDays(currentRecord) ? span : 1
    }
  }
  return days
})

// 本周日均数量：本周获取 / 本周有效获取天数，不把今天尚未记录的日期算进去。
const thisWeekAverageFruitCount = computed(() => {
  if (thisWeekValidGainDaysCount.value === 0) return '0'
  const avg = thisWeekFruitCount.value / thisWeekValidGainDaysCount.value
  return String(Math.round(avg))
})

// 本月获取
const thisMonthFruitCount = computed(() => {
  const prefix = todayDateString.value.slice(0, 7)
  const sorted = [...records.value].sort((a, b) => a.date.localeCompare(b.date))
  let sum = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].date.startsWith(prefix)) {
      sum += getIntervalMetrics(sorted[i - 1], sorted[i]).acquired
    }
  }
  return sum
})

// 单日最高获取（平摊后单日真实峰值）
const maxSingleDayCount = computed(() => {
  const gains = processedListWithGaps.value
    .filter(item => item.status === 'gain')
    .map(item => item.gain || item.avgGain || 0)
  if (gains.length === 0) return 0
  const max = Math.max(0, ...gains)
  return String(Math.round(max))
})

// 获取“上一次输入”：今天已有记录时使用今天最后保存的数量，否则使用最近历史记录
const previousInputRecord = computed(() => {
  if (todayRecord.value) return todayRecord.value

  const date = todayDateString.value
  const previousRecords = records.value
    .filter(r => r.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
  return previousRecords.length > 0 ? previousRecords[0] : null
})

const fillPreviousInputCount = () => {
  if (previousInputRecord.value) {
    todayInputCount.value = previousInputRecord.value.count
    showToast(`已填入 ${previousInputRecord.value.date} 数量：${previousInputRecord.value.count}`)
  } else {
    showToast('暂无上一日记录可填充')
  }
}

// 今日差值实时预览
const todayDiffPreview = computed(() => {
  if (todayInputCount.value === '' || todayInputCount.value === null || todayInputCount.value === undefined) {
    return null
  }
  const count = Number(todayInputCount.value)
  if (isNaN(count)) return null

  const date = todayDateString.value
  
  // 查找在今天之前最近的一条记录
  const previousRecords = records.value
    .filter(r => r.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
  const prev = previousRecords[0]
  const existingToday = todayRecord.value
  const enteredConsumed = Math.max(0, Math.floor(Number(todayInputConsumed.value) || 0))
  const consumedWasEdited = enteredConsumed !== todayConsumedBaseline.value
  const sameDayDecrease = existingToday
    ? Math.max(0, (Number(existingToday.count) || 0) - count)
    : 0
  const automaticConsumed = existingToday
    ? getRecordConsumed(existingToday) + sameDayDecrease
    : enteredConsumed
  const estimatedConsumed = consumedWasEdited ? enteredConsumed : automaticConsumed

  if (!prev) {
    const otherRecords = records.value.filter(r => r.date !== date)
    if (!existingToday && otherRecords.length === 0) {
      return { type: 'base', text: '首日记录：作为初始基准值（不计入获取与平均）' }
    }

    if (sameDayDecrease > 0 || enteredConsumed > 0) {
      return { type: 'used', text: `获取 0 个，消耗 ${estimatedConsumed} 个，净变化 ${formatSignedNumber(-sameDayDecrease)}` }
    }
    return null
  }

  const daysSpan = getDaysDiff(prev.date, date)
  const diff = count - prev.count
  const consumed = consumedWasEdited
    ? enteredConsumed
    : Math.max(estimatedConsumed, Math.max(0, -diff))
  const acquired = Math.max(0, diff + consumed)
  const spreadAcrossDays = todayInputSpreadAcrossDays.value

  if (acquired > 0) {
    if (daysSpan > 1 && spreadAcrossDays) {
      const avg = Math.round(acquired / daysSpan)
      return { type: 'gain', text: `获取 +${acquired} 个，消耗 ${consumed} 个，净变化 ${formatSignedNumber(diff)}，跨 ${daysSpan} 天日均 +${avg} 个` }
    } else if (daysSpan > 1) {
      return { type: 'gain', text: `获取 +${acquired} 个，消耗 ${consumed} 个，净变化 ${formatSignedNumber(diff)}，跨 ${daysSpan} 天未均摊` }
    } else {
      return { type: 'gain', text: `获取 +${acquired} 个，消耗 ${consumed} 个，净变化 ${formatSignedNumber(diff)}` }
    }
  } else if (diff < 0) {
    return { type: 'used', text: `获取 0 个，消耗 ${consumed} 个，净变化 ${formatSignedNumber(diff)}` }
  } else {
    return { type: 'zero', text: `较上一记录（${prev.date}：${prev.count}）无变动 (+0)` }
  }
})

// 过滤与排序后的显示列表（包含漏记平摊条目）
const filteredDisplayList = computed(() => {
  let list = [...processedListWithGaps.value]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r => {
      if (r.type === 'gap') {
        return r.dateRangeStr.toLowerCase().includes(q) || String(r.totalDiff).includes(q) || String(r.formattedAvg).includes(q)
      } else {
        const matchDate = r.date && r.date.toLowerCase().includes(q)
        const matchRemark = r.remark && r.remark.toLowerCase().includes(q)
        const matchCount = String(r.count).includes(q)
        const matchWeekday = getWeekdayString(r.date).toLowerCase().includes(q)
        return matchDate || matchRemark || matchCount || matchWeekday
      }
    })
  }

  list.sort((a, b) => {
    const dateA = a.date || a.endDate || ''
    const dateB = b.date || b.endDate || ''
    if (sortOrder.value === 'desc') {
      if (dateB === dateA) {
        // 同一日期下让 gap 排在下面
        return a.type === 'gap' ? 1 : -1
      }
      return dateB.localeCompare(dateA)
    } else {
      if (dateA === dateB) {
        return a.type === 'gap' ? -1 : 1
      }
      return dateA.localeCompare(dateB)
    }
  })

  return list
})

// 历史归档分组：月归档下再按周归档，gap 条目只作为展示项不重复计入天数
const archiveGroups = computed(() => {
  const monthMap = new Map()

  filteredDisplayList.value.forEach(item => {
    const archiveDate = item.type === 'gap' ? (item.endDate || item.date) : item.date
    if (!archiveDate) return

    const monthKey = archiveDate.slice(0, 7)
    const weekStart = getWeekStartDate(archiveDate)
    const weekKey = `${monthKey}:${weekStart}`

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: `month:${monthKey}`,
        monthKey,
        items: [],
        weeks: new Map()
      })
    }

    const month = monthMap.get(monthKey)
    month.items.push(item)

    if (!month.weeks.has(weekKey)) {
      month.weeks.set(weekKey, {
        key: `week:${weekStart}`,
        weekStart,
        items: []
      })
    }
    month.weeks.get(weekKey).items.push(item)
  })

  const currentMonthKey = todayDateString.value.slice(0, 7)
  const currentWeekKey = getWeekStartDate(todayDateString.value)

  return Array.from(monthMap.values()).map(month => {
    const [year, monthNumber] = month.monthKey.split('-')
    const weeks = Array.from(month.weeks.values()).map(week => {
      const weekEnd = getWeekEndDate(week.weekStart)
      const isCurrent = week.weekStart === currentWeekKey
      return {
        ...week,
        isCurrent,
        label: isCurrent ? '本周' : `${formatArchiveShortDate(week.weekStart)} - ${formatArchiveShortDate(weekEnd)}`,
        range: isCurrent ? `${formatArchiveShortDate(week.weekStart)} - ${formatArchiveShortDate(weekEnd)}` : '',
        recordCount: week.items.filter(item => item.type !== 'gap').length
      }
    })

    return {
      ...month,
      isCurrent: month.monthKey === currentMonthKey,
      label: `${year}年${monthNumber}月`,
      recordCount: month.items.filter(item => item.type !== 'gap').length,
      weeks
    }
  })
})

const isDefaultArchiveExpanded = (key) => {
  return key === `month:${todayDateString.value.slice(0, 7)}` || key === `week:${getWeekStartDate(todayDateString.value)}`
}

const isArchiveExpanded = (key) => {
  if (searchQuery.value.trim()) return true
  if (archiveExpansionState.value.has(key)) return archiveExpansionState.value.get(key)
  return isDefaultArchiveExpanded(key)
}

const toggleArchive = (key) => {
  const nextState = new Map(archiveExpansionState.value)
  nextState.set(key, !isArchiveExpanded(key))
  archiveExpansionState.value = nextState
}

// 本地存储保存与加载
const saveToLocalStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  } catch (err) {
    console.error('保存大果数据失败:', err)
  }
}

const loadFromLocalStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        records.value = parsed.filter(item => item && item.date && typeof item.count === 'number')
      }
    }
  } catch (err) {
    console.error('读取大果数据失败:', err)
  }
  syncTodayInput()
}

// Toast 提示
const showToast = (msg) => {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = ''
    }
  }, 2200)
}

// 今日操作
const quickAdjustToday = (delta) => {
  const current = Number(todayInputCount.value) || 0
  const next = Math.max(0, current + delta)
  todayInputCount.value = next
}

// 备注按“来源*数量”合并，相同来源累加，不同来源追加；兼容 x、X、*、× 写法
const mergeRemarks = (existingRemark, incomingRemark) => {
  const parseRemark = (remark) => {
    const text = String(remark || '').trim()
    const tokenRegex = /([^,，、;；\n]+?)\s*[xX*×]\s*(\d+(?:\.\d+)?)/g
    const entries = []
    const plainParts = []
    let lastIndex = 0
    let match

    while ((match = tokenRegex.exec(text)) !== null) {
      const plainBefore = text
        .slice(lastIndex, match.index)
        .replace(/^[,，、;；\s]+|[,，、;；\s]+$/g, '')
        .trim()
      if (plainBefore) plainParts.push(plainBefore)

      entries.push({
        source: match[1].trim(),
        amount: Number(match[2])
      })
      lastIndex = tokenRegex.lastIndex
    }

    const plainAfter = text
      .slice(lastIndex)
      .replace(/^[,，、;；\s]+|[,，、;；\s]+$/g, '')
      .trim()
    if (plainAfter) plainParts.push(plainAfter)

    return { entries, plainParts }
  }

  const mergedEntries = []
  const plainParts = []
  const appendRemark = (remark) => {
    const parsed = parseRemark(remark)
    parsed.entries.forEach(entry => {
      const key = entry.source.toLocaleLowerCase()
      const existing = mergedEntries.find(item => item.key === key)
      if (existing) {
        existing.amount += entry.amount
      } else {
        mergedEntries.push({
          key,
          source: entry.source,
          amount: entry.amount
        })
      }
    })
    parsed.plainParts.forEach(part => {
      if (!plainParts.includes(part)) plainParts.push(part)
    })
  }

  appendRemark(existingRemark)
  appendRemark(incomingRemark)

  const formattedEntries = mergedEntries.map(entry => {
    return `${entry.source}*${String(entry.amount)}`
  })

  return [...formattedEntries, ...plainParts].join('，')
}

const normalizeConsumedForRecord = (date, count, consumed, existingRecord = null, consumedWasEdited = false) => {
  const enteredConsumed = Math.max(0, Math.floor(Number(consumed) || 0))
  const previousRecord = records.value
    .filter(record => record.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  // 手动修改累计消耗时，以输入值为准，允许把当天消耗改为 0。
  if (consumedWasEdited) return enteredConsumed

  // 未手动修改消耗时，同一天把当前数量改低的差值自动累加。
  const sameDayDecrease = existingRecord
    ? Math.max(0, (Number(existingRecord.count) || 0) - count)
    : 0
  const accumulatedConsumed = existingRecord
    ? getRecordConsumed(existingRecord) + sameDayDecrease
    : enteredConsumed
  const minimumConsumed = previousRecord
    ? Math.max(0, (Number(previousRecord.count) || 0) - count)
    : 0

  return Math.max(enteredConsumed, accumulatedConsumed, minimumConsumed)
}

const saveTodayRecord = () => {
  const count = Math.max(0, Math.floor(Number(todayInputCount.value) || 0))
  const date = todayDateString.value
  const existingIdx = records.value.findIndex(r => r.date === date)
  const existingRecord = existingIdx !== -1 ? records.value[existingIdx] : null
  const consumedWasEdited = Number(todayInputConsumed.value) !== todayConsumedBaseline.value
  const consumed = normalizeConsumedForRecord(
    date,
    count,
    todayInputConsumed.value,
    existingRecord,
    consumedWasEdited
  )
  const incomingRemark = todayInputRemark.value.trim()

  if (existingIdx !== -1) {
    records.value[existingIdx].count = count
    records.value[existingIdx].consumed = consumed
    records.value[existingIdx].spreadAcrossDays = todayInputSpreadAcrossDays.value
    records.value[existingIdx].remark = mergeRemarks(records.value[existingIdx].remark, incomingRemark)
  } else {
    records.value.unshift({
      date,
      count,
      consumed,
      spreadAcrossDays: todayInputSpreadAcrossDays.value,
      remark: mergeRemarks('', incomingRemark)
    })
  }

  saveToLocalStorage()
  todayInputConsumed.value = consumed
  todayConsumedBaseline.value = consumed
  todayInputRemark.value = ''
  saveSuccessFeedback.value = true
  showToast(existingIdx !== -1 ? '今日大果记录已更新！' : '今日大果记录保存成功！')

  setTimeout(() => {
    saveSuccessFeedback.value = false
  }, 2000)
}

// 自定义/补录弹窗操作
const openAddCustomModal = () => {
  editingRecord.value = false
  const sorted = [...records.value].sort((a, b) => b.date.localeCompare(a.date))
  customForm.value = {
    date: todayDateString.value,
    count: sorted.length > 0 ? sorted[0].count : 0,
    consumed: 0,
    spreadAcrossDays: true,
    remark: '',
    existingRemark: '',
    existingConsumed: 0
  }
  customModalVisible.value = true
}

const openEditModal = (item) => {
  editingRecord.value = true
  customForm.value = {
    date: item.date,
    count: item.count,
    consumed: getRecordConsumed(item),
    spreadAcrossDays: shouldSpreadAcrossDays(item),
    remark: '',
    existingRemark: item.remark || '',
    existingConsumed: getRecordConsumed(item)
  }
  customModalVisible.value = true
}

const closeCustomModal = () => {
  customModalVisible.value = false
}

const adjustModalCount = (delta) => {
  const current = Number(customForm.value.count) || 0
  customForm.value.count = Math.max(0, current + delta)
}

const dateConflictWarning = computed(() => {
  if (editingRecord.value) return false
  if (!customForm.value.date) return false
  return records.value.some(r => r.date === customForm.value.date)
})

const dateConflictCount = computed(() => {
  if (!customForm.value.date) return 0
  const found = records.value.find(r => r.date === customForm.value.date)
  return found ? found.count : 0
})

const saveCustomRecord = () => {
  const { date, count, consumed: inputConsumed, spreadAcrossDays, remark } = customForm.value
  if (!date) {
    showToast('请选择打卡日期！')
    return
  }

  const sanitizedCount = Math.max(0, Math.floor(Number(count) || 0))
  const existingRecord = records.value.find(r => r.date === date) || null
  // 编辑历史记录时，消耗框是最终值；即使填写 0，也不能再被数量差值自动加回。
  const consumedWasEdited = editingRecord.value || Number(inputConsumed) !== Number(customForm.value.existingConsumed)
  const sanitizedConsumed = normalizeConsumedForRecord(
    date,
    sanitizedCount,
    inputConsumed,
    existingRecord,
    consumedWasEdited
  )
  const sanitizedRemark = mergeRemarks(customForm.value.existingRemark, (remark || '').trim())

  const existingIdx = records.value.findIndex(r => r.date === date)
  if (existingIdx !== -1) {
    records.value[existingIdx].count = sanitizedCount
    records.value[existingIdx].consumed = sanitizedConsumed
    records.value[existingIdx].spreadAcrossDays = spreadAcrossDays !== false
    if (!editingRecord.value) {
      records.value[existingIdx].remark = mergeRemarks(records.value[existingIdx].remark, (remark || '').trim())
    } else {
      records.value[existingIdx].remark = sanitizedRemark
    }
  } else {
    records.value.push({
      date,
      count: sanitizedCount,
      consumed: sanitizedConsumed,
      spreadAcrossDays: spreadAcrossDays !== false,
      remark: sanitizedRemark
    })
  }

  saveToLocalStorage()
  if (date === todayDateString.value) {
    syncTodayInput()
  }

  closeCustomModal()
  showToast('打卡记录保存成功！')
}

// 删除单条操作
const openDeleteConfirm = (item) => {
  targetDeleteItem.value = item
  deleteModalVisible.value = true
}

const confirmDeleteRecord = () => {
  if (!targetDeleteItem.value) return
  const delDate = targetDeleteItem.value.date
  records.value = records.value.filter(r => r.date !== delDate)
  saveToLocalStorage()

  if (delDate === todayDateString.value) {
    syncTodayInput()
  }

  deleteModalVisible.value = false
  targetDeleteItem.value = null
  showToast('记录已删除')
}

// 排序切换
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

// 导入导出与清空
const exportFruitData = () => {
  try {
    exportData({
      _type: 'fruit-record',
      data: records.value
    }, `fruit_record_data_${new Date().toISOString().slice(0, 10)}.json`)
    showToast('大果记录已导出！')
  } catch (err) {
    showToast('导出失败：' + err.message)
  }
}

const triggerFruitImport = () => {
  importFileInput.value?.click()
}

const handleFruitImport = async (event) => {
  try {
    const result = await importData(event)
    let importedList = []
    if (Array.isArray(result)) {
      importedList = result
    } else if (result && result._type === 'fruit-record' && Array.isArray(result.data)) {
      importedList = result.data
    } else if (result && Array.isArray(result.data)) {
      importedList = result.data
    } else {
      throw new Error('未识别的数据格式：缺少数据列表')
    }

    // 合并数据
    const dateMap = new Map()
    records.value.forEach(r => dateMap.set(r.date, r))
    importedList.forEach(item => {
      if (item && item.date && typeof item.count === 'number') {
        const existingRecord = dateMap.get(item.date)
        const hasConsumed = Object.prototype.hasOwnProperty.call(item, 'consumed')
        const normalizedRecord = {
          date: item.date,
          count: Math.max(0, Math.floor(item.count)),
          spreadAcrossDays: typeof item.spreadAcrossDays === 'boolean'
            ? item.spreadAcrossDays
            : existingRecord?.spreadAcrossDays !== false,
          remark: item.remark || ''
        }
        if (hasConsumed) {
          normalizedRecord.consumed = Math.max(0, Math.floor(Number(item.consumed) || 0))
        } else if (existingRecord && Object.prototype.hasOwnProperty.call(existingRecord, 'consumed')) {
          normalizedRecord.consumed = getRecordConsumed(existingRecord)
        }
        dateMap.set(item.date, normalizedRecord)
      }
    })

    records.value = Array.from(dateMap.values())
    saveToLocalStorage()
    syncTodayInput()
    showToast(`导入成功！当前共 ${records.value.length} 天记录`)
    showDataManageModal.value = false
  } catch (err) {
    showToast('导入失败：' + err.message)
  }
}

const confirmClearAll = () => {
  records.value = []
  saveToLocalStorage()
  syncTodayInput()
  showClearAllModal.value = false
  showDataManageModal.value = false
  showToast('所有大果记录已清空')
}

// 外部导入事件监听
const handleExternalImport = () => {
  loadFromLocalStorage()
}

onMounted(() => {
  loadFromLocalStorage()
  window.addEventListener('fruit-record-imported', handleExternalImport)
})

onUnmounted(() => {
  window.removeEventListener('fruit-record-imported', handleExternalImport)
})
</script>

<style scoped>
.fruit-record-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 30px;
  width: 100%;
}

/* ===== 顶部概览区域 ===== */
.fruit-sticky-top {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg);
  padding: 4px 0 8px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.stats-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.total-stat-card {
}

.avg-stat-card {
}

.stat-card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fruit-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.pulse-anim {
  animation: fruitPulse 3s infinite ease-in-out;
}

@keyframes fruitPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.stat-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-sub);
  font-weight: 500;
  white-space: nowrap;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.stat-number.highlight-gold {
  color: var(--gold, #f97316);
}

.stat-number.highlight-blue {
  color: var(--primary, #3b82f6);
}

.stat-number.highlight-green {
  color: #10b981;
}

.stat-number.highlight-red {
  color: #ef4444;
}

.stat-unit {
  font-size: 11px;
  color: var(--text-sub);
}

/* 次要统计栏 */
.secondary-stats-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 9px 10px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.025);
}

.mini-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.mini-stat-item + .mini-stat-divider + .mini-stat-item {
  border-left: 1px solid var(--border-color);
}

.mini-stat-label {
  font-size: 10px;
  color: var(--text-sub);
  white-space: nowrap;
}

.mini-stat-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.consumption-mini-val,
.negative-mini-val {
  color: #dc2626;
}

.positive-mini-val {
  color: #059669;
}

.mini-stat-divider {
  display: none;
}

/* ===== 主要内容卡片 ===== */
.fruit-main-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-box {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.today-input-card {
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.header-fruit-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.card-main-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.today-date-badge {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.today-status-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.today-status-badge.recorded {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.today-status-badge.unrecorded {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* 输入区域 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-main-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--border-color);
  padding: 10px 14px;
  border-radius: 12px;
}

.input-main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.quantity-fields-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.quantity-field-wrapper {
  width: 100%;
  min-width: 0;
}

.quantity-field-wrapper .fruit-number-input {
  flex: 1;
  width: 0;
}

.quantity-field-wrapper .consumed-number-input {
  color: #ef4444;
  background: var(--bg);
  border-color: rgba(239, 68, 68, 0.22);
  font-size: 15px;
  padding: 5px 8px;
}

.quantity-field-wrapper .consumed-field-prefix {
  color: #ef4444;
}

.input-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.label-fruit-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.input-label-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.input-right-action-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.fill-yesterday-btn {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: var(--primary, #3b82f6);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.fill-yesterday-btn:hover:not(:disabled) {
  background: var(--primary, #3b82f6);
  color: #ffffff;
}

.fill-yesterday-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--bg);
  border-color: var(--border-color);
  color: var(--text-sub);
}

.input-field-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 140px;
  min-width: 0;
}

.input-field-prefix {
  flex-shrink: 0;
  color: #059669;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.fruit-number-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: var(--card-bg);
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--gold, #f97316);
  text-align: center;
  outline: none;
  transition: border-color 0.2s;
}

.fruit-number-input::-webkit-outer-spin-button,
.fruit-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.fruit-number-input[type=number] {
  -moz-appearance: textfield;
}

.fruit-number-input::placeholder {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sub);
  opacity: 0.65;
}

.fruit-number-input:focus {
  border-color: var(--primary);
}

.input-suffix {
  font-size: 13px;
  color: var(--text-sub);
  font-weight: 600;
}

/* 差值动态提示 */
.today-diff-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.today-diff-hint.gain {
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.today-diff-hint.used {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.today-diff-hint.base,
.today-diff-hint.zero {
  background: var(--bg);
  color: var(--text-sub);
  border: 1px solid var(--border-color);
}

.diff-hint-text {
  font-weight: 600;
}

.today-auto-consume-note {
  padding: 0 4px;
  color: var(--text-sub);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.spread-option-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.04);
  cursor: pointer;
}

.spread-option-input {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  margin: 0;
  accent-color: var(--primary, #3b82f6);
}

.spread-option-copy {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  min-width: 0;
  line-height: 1.35;
}

.spread-option-title {
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
}

.spread-option-desc {
  color: var(--text-sub);
  font-size: 11px;
  overflow-wrap: anywhere;
}

.modal-spread-option {
  margin-top: -2px;
}

/* 快捷按钮 */
.quick-buttons-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.quick-btn {
  min-width: 0;
  width: 100%;
  padding: 6px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--border-color);
  background: var(--bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover:not(:disabled) {
  background: var(--dropdown-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.quick-btn.plus {
  color: var(--primary, #3b82f6);
}

.quick-btn.plus:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--primary, #3b82f6);
}

.quick-btn.minus {
  color: var(--text-sub);
}

.quick-btn.clear {
  color: var(--red, #f43f5e);
}

.quick-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.today-remark-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.current-remark-tip,
.modal-current-remark {
  color: var(--text-sub);
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-radius: 7px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.modal-current-remark {
  margin-top: -1px;
}

.fruit-remark-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-main);
  outline: none;
  box-sizing: border-box;
}

.fruit-remark-input:focus {
  border-color: var(--primary);
}

.action-btn-row {
  display: flex;
  justify-content: flex-end;
}

.save-primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--primary, #3b82f6);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s;
}

.save-primary-btn:hover {
  background: var(--primary, #3b82f6);
  color: #ffffff;
}

.save-primary-btn:active {
  transform: scale(0.98);
}

.save-primary-btn .btn-check-icon {
  font-weight: bold;
}

/* ===== 历史记录头部 ===== */
.history-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.section-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.section-subtitle {
  font-size: 12px;
  color: var(--text-sub);
}

.section-actions-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tool-btn {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn.add-btn {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--primary);
}

.tool-btn.add-btn:hover {
  background: var(--primary);
  color: #fff;
}

.tool-btn.sort-btn:hover {
  background: var(--dropdown-hover);
}

.tool-btn-sub {
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-sub);
  cursor: pointer;
  white-space: nowrap;
}

.tool-btn-sub:hover {
  color: var(--text-main);
  background: var(--dropdown-hover);
}

/* 历史搜索行 */
.history-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.search-input-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 10px;
  gap: 6px;
}

.search-icon {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
  opacity: 0.7;
}

.history-search-input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--text-main);
}

.clear-search-btn {
  background: none;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
}

/* 月/周归档 */
.history-archive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.archive-month-section {
  min-width: 0;
}

.archive-month-toggle,
.archive-week-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background-color 0.15s, border-color 0.15s;
}

.archive-month-toggle {
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--card-bg);
}

.archive-month-toggle:hover,
.archive-week-toggle:hover {
  background: var(--dropdown-hover);
  border-color: rgba(59, 130, 246, 0.25);
}

.archive-month-toggle.expanded {
  border-color: rgba(59, 130, 246, 0.25);
}

.archive-period-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--primary);
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
}

.month-icon {
  width: 28px;
  height: 28px;
  background: rgba(59, 130, 246, 0.1);
}

.week-icon {
  width: 24px;
  height: 24px;
  background: var(--bg);
  border: 1px solid var(--border-color);
}

.archive-title-box {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.archive-title {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.archive-current-tag,
.archive-closed-tag {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 1.3;
  white-space: nowrap;
}

.archive-current-tag {
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
}

.archive-closed-tag {
  color: var(--text-sub);
  background: var(--bg);
}

.archive-meta {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--text-sub);
  font-size: 11px;
  white-space: nowrap;
}

.archive-chevron {
  flex-shrink: 0;
  color: var(--text-sub);
  font-size: 16px;
  line-height: 1;
  transform: rotate(-90deg);
  transition: transform 0.18s ease;
}

.archive-month-toggle.expanded .archive-chevron,
.archive-week-toggle.expanded .archive-chevron {
  transform: rotate(0deg);
}

.archive-month-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid rgba(59, 130, 246, 0.12);
}

.archive-week-section {
  min-width: 0;
}

.archive-week-toggle {
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--bg);
}

.archive-week-toggle.current {
  color: var(--primary);
  border-color: rgba(59, 130, 246, 0.22);
  background: rgba(59, 130, 246, 0.05);
}

.archive-week-toggle.current .week-icon {
  color: var(--primary);
  border-color: rgba(59, 130, 246, 0.2);
}

.archive-week-range {
  color: var(--text-sub);
  font-size: 10px;
  white-space: nowrap;
}

.archive-week-body {
  margin-top: 6px;
  padding-left: 8px;
}

/* 历史列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: transform 0.15s, border-color 0.15s;
}

.history-item-card.is-today-item {
}

/* 漏记平摊特殊条目样式 */
.history-item-card.gap-special-card {
  background: rgba(59, 130, 246, 0.02);
  border: 1px dashed rgba(59, 130, 246, 0.35);
}

.gap-tag-pill {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.gap-date-text {
  font-size: 13px;
  color: var(--text-main);
}

.gap-detail-row {
  white-space: normal;
  word-break: break-all;
  line-height: 1.3;
}

.gap-calc-explain {
  font-size: 11px;
  color: var(--text-sub);
  margin-left: 2px;
}

.item-left-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.item-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.item-date {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  flex-shrink: 0;
}

.item-weekday-tag {
  font-size: 11px;
  color: var(--text-sub);
  background: var(--bg);
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.item-today-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.item-inventory-row {
  font-size: 12px;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  gap: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inventory-label {
  color: var(--text-sub);
}

.inventory-val {
  font-weight: 700;
  color: var(--text-main);
}

.item-remark-inline {
  color: var(--text-sub);
  font-size: 11px;
  margin-left: 2px;
}

.record-flow-note {
  color: #dc2626;
  font-size: 11px;
  margin-left: 4px;
  white-space: nowrap;
}

.remark-label {
  color: var(--text-sub);
  font-weight: 600;
}

.item-right-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* 徽章样式 */
.item-badge-base {
  background: var(--bg);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 20px;
}

.item-badge-base .badge-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.item-count-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
}

.item-count-badge.gain {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.item-count-badge.gain .badge-count-num {
  font-size: 14px;
  font-weight: 800;
  color: #059669;
}

.item-count-badge.used {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.item-count-badge.used .badge-count-num.used {
  font-size: 14px;
  font-weight: 800;
  color: #dc2626;
}

.item-count-badge.zero {
  background: var(--bg);
  border: 1px solid var(--border-color);
}

.badge-zero-num {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.badge-fruit-icon {
  width: 17px;
  height: 17px;
  object-fit: contain;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.item-action-btn .action-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  opacity: 0.8;
}

.action-symbol {
  color: var(--text-sub);
  font-size: 17px;
  line-height: 1;
  font-family: Arial, sans-serif;
}

.delete-symbol {
  font-size: 19px;
}

.item-action-btn:hover {
  background: var(--dropdown-hover);
}

.item-action-btn.del-btn:hover .action-icon {
  filter: invert(34%) sepia(85%) saturate(3015%) hue-rotate(334deg) brightness(98%) contrast(96%) !important;
}

.item-action-btn.del-btn:hover .delete-symbol {
  color: var(--red, #f43f5e);
}

/* 空状态 */
.empty-state-box {
  background: var(--card-bg);
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  padding: 36px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.empty-fruit-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  opacity: 0.75;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.empty-desc {
  font-size: 12px;
  color: var(--text-sub);
  width: 100%;
  max-width: 320px;
  line-height: 1.5;
  text-align: left;
}

/* ===== 通用模态弹窗样式 ===== */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-overlay, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.custom-modal-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-close-x {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.modal-date-input,
.modal-text-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  box-sizing: border-box;
}

.modal-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
}

.modal-fruit-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.modal-number-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 700;
  color: var(--gold, #f97316);
}

.modal-input-unit {
  font-size: 13px;
  color: var(--text-sub);
}

.modal-quick-btns {
  display: flex;
  gap: 6px;
}

.modal-warning-tip {
  font-size: 12px;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  padding: 8px 10px;
  border-radius: 6px;
  line-height: 1.4;
}

.modal-confirm-text {
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.5;
  margin: 0;
}

.del-warning-sub {
  font-size: 12px;
  color: var(--red, #f43f5e);
  margin: 4px 0 0 0;
}

.danger-text {
  color: var(--red, #f43f5e) !important;
}

.modal-footer {
  padding: 12px 18px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--border-color);
  background: var(--bg);
}

.modal-btn-cancel {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.modal-btn-confirm {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.modal-btn-danger {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--red, #f43f5e);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* 数据管理列表 */
.data-manage-btn-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manage-action-card-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.manage-action-card-btn:hover {
  background: var(--dropdown-hover);
  border-color: var(--primary);
}

.manage-action-card-btn.danger:hover {
  border-color: var(--red, #f43f5e);
}

.manage-btn-text-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.manage-btn-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.manage-btn-desc {
  font-size: 11px;
  color: var(--text-sub);
}

/* Toast 提示浮窗 */
.toast-popup {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  z-index: 3000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.dark-mode .toast-popup {
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
}

/* 动画过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式微调 */
/* 与 App.vue 的移动端断点保持一致，兼容部分 Android WebView 返回 481-768px CSS 宽度的设备。 */
@media (max-width: 768px) {
  .stats-overview-grid {
    gap: 6px;
  }
  .stat-card {
    padding: 10px 8px;
    gap: 7px;
    align-items: center;
    flex-direction: column;
    text-align: center;
  }
  .stat-card-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }
  .fruit-icon-img {
    width: 23px;
    height: 23px;
  }
  .stat-number {
    font-size: 18px;
  }
  .stat-card-info {
    width: 100%;
    align-items: center;
  }
  .stat-value-row {
    width: 100%;
    justify-content: center;
  }
  .stat-label {
    font-size: 11px;
  }
  .stat-unit {
    font-size: 10px;
  }
  .secondary-stats-bar {
    padding: 8px 5px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 8px;
  }
  .mini-stat-label {
    font-size: 9px;
  }
  .mini-stat-val {
    font-size: 11px;
  }
  .mini-stat-divider {
    display: none;
  }
  .card-main-title {
    font-size: 15px;
  }
  .today-date-badge {
    font-size: 11px;
    padding: 1px 6px;
  }
  .input-main-row {
    padding: 8px 10px;
    gap: 6px;
    align-items: stretch;
    flex-direction: column;
  }
  .input-main-header {
    justify-content: flex-start;
  }
  .quantity-fields-row {
    gap: 6px;
  }
  .input-label-group {
    gap: 4px;
  }
  .input-label-text {
    font-size: 13px;
    white-space: nowrap;
  }
  .fill-yesterday-btn {
    padding: 4px 6px;
    font-size: 11px;
  }
  .input-right-action-group {
    gap: 4px;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(88px, 0.8fr);
  }
  .input-field-wrapper {
    width: auto;
    min-width: 0;
    flex: 1;
    gap: 3px;
  }
  .input-field-prefix {
    font-size: 11px;
  }
  .quantity-field-wrapper {
    width: 100%;
  }
  .fruit-number-input {
    font-size: 15px;
    padding: 4px 4px;
  }
  .fruit-number-input::placeholder {
    font-size: 11px;
  }
  .input-suffix {
    font-size: 12px;
  }
  .quick-buttons-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .history-item-card {
    align-items: flex-start;
    padding: 10px 12px;
    gap: 8px;
  }
  .history-item-card .item-left-info {
    flex: 1 1 0;
  }
  .history-item-card .item-date-row {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .history-item-card .item-inventory-row {
    align-items: baseline;
    flex-wrap: wrap;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    row-gap: 3px;
  }
  .history-item-card .item-remark-inline {
    flex: 1 1 100%;
    min-width: 0;
    margin-left: 0;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .history-item-card .record-flow-note {
    flex: 1 1 100%;
    margin-left: 0;
  }
  .history-item-card:not(.gap-special-card) .item-date {
    white-space: nowrap;
  }
  .gap-special-card .gap-date-text {
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .gap-special-card .item-weekday-tag {
    white-space: nowrap;
  }
  .history-item-card .item-right-content {
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .history-item-card .item-count-badge,
  .history-item-card .item-badge-base {
    padding: 4px 8px;
  }
  .history-item-card .item-count-badge .badge-count-num,
  .history-item-card .item-count-badge .badge-count-num.used {
    font-size: 13px;
  }
  .history-section-header {
    align-items: flex-start;
  }
  .section-actions-wrap {
    width: 100%;
  }
  .section-actions-wrap .tool-btn {
    flex: 1;
  }
  .history-search-row {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .search-input-box {
    flex-basis: 100%;
  }
  .data-manage-dropdown-btn-wrap,
  .data-manage-dropdown-btn-wrap .tool-btn-sub {
    width: 100%;
  }
}
</style>
