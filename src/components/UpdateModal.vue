<script setup>
import { ref } from 'vue'
import { setSkipUpdateDate } from '../utils/version'

const props = defineProps({
  show: Boolean,
  updateInfo: Object
})

const emit = defineEmits(['close'])

const downloadProgress = ref(0)
const downloadStatus = ref('idle') // 'idle' | 'downloading' | 'complete' | 'error'
const updateError = ref('')

const setUpUpdateCallbacks = () => {
  window.__updateProgress = (d, t) => {
    if (t > 0) {
      downloadProgress.value = Math.round(d / t * 100)
    } else {
      downloadProgress.value = 99
    }
  }
  window.__updateComplete = () => {
    downloadStatus.value = 'complete'
    downloadProgress.value = 100
  }
  window.__updateError = (m) => {
    downloadStatus.value = 'error'
    updateError.value = m
    downloadProgress.value = 0
  }
}

const startDownload = () => {
  if (!props.updateInfo?.apkUrl) return
  downloadStatus.value = 'downloading'
  downloadProgress.value = 0
  setUpUpdateCallbacks()
  window.__downloadUrl = props.updateInfo.apkUrl
}

const skipUpdateToday = () => {
  setSkipUpdateDate()
  emit('close')
}
</script>

<template>
  <div v-if="show" class="custom-modal-overlay" @click.self="$emit('close')">
    <div class="custom-modal-card update-modal-card">
      <div class="modal-header">
        <h3>发现新版本</h3>
      </div>
      <div class="modal-body update-modal-body">
        <div class="update-version" v-if="updateInfo">{{ updateInfo.version }}</div>

        <div class="update-changelog-wrapper" v-if="updateInfo && updateInfo.body">
          <div class="update-changelog">{{ updateInfo.body }}</div>
        </div>

        <div class="update-progress-container" v-if="downloadStatus === 'downloading'">
          <div class="update-progress-bar">
            <div class="update-progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <div class="update-progress-text">正在下载: {{ downloadProgress }}%</div>
        </div>

        <div class="update-status-msg success" v-if="downloadStatus === 'complete'">
          ✨ 下载完成，正在准备安装...
        </div>
        <div class="update-status-msg error" v-if="downloadStatus === 'error'">
          ❌ 下载失败: {{ updateError }}
        </div>
      </div>

      <div class="modal-footer update-footer">
        <button class="update-skip-btn" @click="skipUpdateToday">今日不提醒</button>

        <button class="modal-btn-confirm" @click="startDownload" v-if="downloadStatus === 'idle'">更新</button>
        <button class="modal-btn-confirm" @click="startDownload" v-else-if="downloadStatus === 'complete'">重新更新</button>
        <button class="modal-btn-confirm btn-retry" @click="startDownload" v-else-if="downloadStatus === 'error'">重试</button>
        <button class="modal-btn-confirm btn-disabled" disabled v-else>
          {{ downloadProgress > 0 ? '下载中 ' + downloadProgress + "%" : "准备中..." }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 弹窗特化卡片宽度与最大高度 */
.update-modal-card {
  max-width: 360px;
  display: flex;
  flex-direction: column;
}

.update-modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* 版本号现代高亮标签 */
.update-version {
  font-family: 'HarmonyOS_Bold', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 16px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}
.dark-mode .update-version {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

/* 更新日志滚动容器（防止日志太长撑爆弹窗） */
.update-changelog-wrapper {
  width: 100%;
  max-height: 160px;
  overflow-y: auto;
  background: var(--bg);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  text-align: left;
}

.update-changelog {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
}

/* 进度条精细化设计 */
.update-progress-container {
  width: 100%;
  margin-top: 6px;
}

.update-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.update-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #60a5fa);
  border-radius: 3px;
  transition: width 0.2s ease-out;
}

.update-progress-text {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 6px;
  font-weight: 500;
}

/* 状态通知 */
.update-status-msg {
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}
.update-status-msg.success { color: var(--success); }
.update-status-msg.error { color: #ef4444; }

/* 底部按钮布局微调 */
.update-footer {
  padding: 0 20px 20px 20px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}

.update-footer button {
  flex: 1;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 跳过按钮：轻量级次要按钮样式 */
.update-skip-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-sub);
}
.update-skip-btn:hover {
  background: var(--dropdown-hover);
  color: var(--text-main);
}

/* 错误重试状态 */
.btn-retry {
  background: #f97316 !important;
}

/* 禁用状态（下载中） */
.btn-disabled {
  background: var(--border-color) !important;
  color: var(--text-sub) !important;
  cursor: not-allowed !important;
}
</style>