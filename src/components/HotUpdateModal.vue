<script setup>
import { computed, ref } from 'vue'
import { checkHotUpdate, applyHotUpdate } from '../utils/hotupdate'
import { formatFileSize } from '../utils/fileSize'

const props = defineProps({
  preCheckedManifest: Object
})

const emit = defineEmits(['close', 'apply'])

const step = ref(props.preCheckedManifest ? 'available' : 'checking')
const manifest = ref(props.preCheckedManifest || null)
const progress = ref(0)
const errorMsg = ref('')
const packageSizeText = computed(() => formatFileSize(manifest.value?.packageSize))

const startCheck = async () => {
  step.value = 'checking'
  const m = await checkHotUpdate()
  if (m) {
    manifest.value = m
    step.value = 'available'
  } else {
    // 没有可用更新，直接关闭弹窗，不显示"完成"状态
    emit('close')
  }
}

if (!props.preCheckedManifest) startCheck()

const doUpdate = async () => {
  if (!manifest.value) return
  step.value = 'downloading'
  progress.value = 0
  try {
    await applyHotUpdate(manifest.value, (p) => { progress.value = p })
    step.value = 'done'
  } catch (e) {
    errorMsg.value = e.message || '未知错误'
    step.value = 'error'
  }
}

const finish = () => {
  if (step.value === 'checking' || step.value === 'downloading') return
  if (step.value === 'done') emit('apply')
  emit('close')
}
</script>

<template>
  <div v-if="step !== 'idle'" class="custom-modal-overlay" @click.self="finish">
    <div class="custom-modal-card update-modal-card">
      <div class="modal-header">
        <h3>热更新</h3>
      </div>
      <div class="modal-body hotupdate-body">

        <!-- 检查中 -->
        <template v-if="step === 'checking'">
          <div class="hotupdate-status-icon spinning">⟳</div>
          <p class="hotupdate-status-text">正在检查更新…</p>
        </template>

        <!-- 有更新 -->
        <template v-else-if="step === 'available' && manifest">
          <p class="hotupdate-status-text">
            发现新版本 <strong>{{ manifest.version }}</strong>
          </p>
          <div class="hotupdate-package-info">
            <span>热更新包 {{ packageSizeText }}</span>
            <span>建议在稳定网络下更新</span>
          </div>
          <p class="hotupdate-changelog" v-if="manifest.body">{{ manifest.body }}</p>
        </template>

        <!-- 下载中 -->
        <template v-else-if="step === 'downloading'">
          <div class="hotupdate-status-icon spinning">⟳</div>
          <p class="hotupdate-status-text">正在下载热更包…</p>
          <div class="hotupdate-progress-bar">
            <div class="hotupdate-progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="hotupdate-progress-text">{{ progress }}%</p>
        </template>

        <!-- 完成 -->
        <template v-else-if="step === 'done'">
<!--          <div class="hotupdate-status-icon"></div>-->
          <p class="hotupdate-status-text">更新完成，即将刷新页面</p>
        </template>

        <!-- 错误 -->
        <template v-else-if="step === 'error'">
          <div class="hotupdate-status-icon">❌</div>
          <p class="hotupdate-status-text">更新失败</p>
          <p class="hotupdate-error-msg">{{ errorMsg }}</p>
        </template>

      </div>
      <div class="modal-footer-hotupdate">
        <template v-if="step === 'available'">
          <button class="modal-btn-confirm btn-update" @click="doUpdate">立即更新</button>
          <button class="modal-btn-confirm btn-skip" @click="finish">稍后</button>
        </template>
        <template v-else-if="step === 'done'">
          <button class="modal-btn-confirm" @click="finish">确定</button>
        </template>
        <template v-else-if="step === 'error'">
          <button class="modal-btn-confirm btn-retry" @click="doUpdate">重试</button>
          <button class="modal-btn-confirm btn-skip" @click="emit('close')">关闭</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hotupdate-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 20px !important;
  min-height: 120px;
}
.hotupdate-status-icon {
  font-size: 36px;
  line-height: 1;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.hotupdate-status-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  text-align: center;
}
.hotupdate-changelog {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 0;
  width: 100%;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.5;
  text-align: left;
  overflow-wrap: anywhere;
}
.hotupdate-package-info {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.08);
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.4;
}
.hotupdate-package-info span:last-child { text-align: right; }
@media (max-width: 360px) {
  .hotupdate-package-info { flex-direction: column; gap: 2px; }
  .hotupdate-package-info span:last-child { text-align: left; }
}
.hotupdate-progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}
.hotupdate-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #60a5fa);
  border-radius: 4px;
  transition: width 0.2s ease;
}
.hotupdate-progress-text {
  font-size: 12px;
  color: var(--text-sub);
  font-weight: 600;
}
.hotupdate-error-msg {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
  text-align: center;
}
/* 新增一个专门控制热更新弹窗底部的类，防止影响其他公共 modal-footer */
.modal-footer-hotupdate {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px; /* 两个按钮之间的间距 */
  padding: 0 20px 20px 20px;
}
.btn-update {
  background: var(--success) !important;
}
.btn-skip {
  background: var(--border-color) !important;
  color: var(--text-sub) !important;
}
.btn-retry {
  background: #f97316 !important;
}
.update-modal-card {
  max-width: 360px;
}
</style>
