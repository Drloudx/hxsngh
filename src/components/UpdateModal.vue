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
    <div class="custom-modal-card">
      <div class="modal-header">
        <h3>发现新版本</h3>
      </div>
      <div class="modal-body update-modal-body">
        <div class="update-version" v-if="updateInfo">{{ updateInfo.version }}</div>
        <div class="update-changelog" v-if="updateInfo">{{ updateInfo.body }}</div>
        <div class="update-progress" v-if="downloadStatus === 'downloading'">
          <div class="update-progress-bar">
            <div class="update-progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <div class="update-progress-text">{{ downloadProgress }}%</div>
        </div>
        <div class="update-done" v-if="downloadStatus === 'complete'">下载完成，正在准备安装...</div>
        <div class="update-error" v-if="downloadStatus === 'error'">下载失败: {{ updateError }}</div>
      </div>
      <div class="modal-footer update-footer">
        <button class="update-skip-btn" @click="skipUpdateToday">今日不提醒</button>
        <button class="modal-btn-confirm" @click="startDownload" v-if="downloadStatus !== 'downloading'">更新</button>
        <button class="modal-btn-confirm" disabled v-else>{{ downloadProgress > 0 ? downloadProgress + "%" : "下载中..." }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 继承全局样式，这里可以根据需要微调 */
</style>
set https_proxy=http://127.0.0.1:7890