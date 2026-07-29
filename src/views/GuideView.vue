<template>
  <div class="guide-flex-wrapper">

    <div class="guide-sub-header">
      <span class="guide-hint-text">点击图片全屏浏览</span>
    </div>

    <main class="guide-main-area">
      <div class="guide-scroll-container">
        <div class="talent-card">
          <div class="download-link-wrapper" @click="handleDownload">
            <div class="title-text-group">
              <div class="main-title">幻想少女新手攻略20260623</div>
              <div class="sub-title-row">
                <span class="sub-title">（群友制作 @雨落）.xlsx</span>
                <div class="download-action-inline">
                  <span>点击下载</span>
                  <span class="download-icon">↓</span>
                </div>
              </div>
            </div>
          </div>

          <div class="strategy-image-container">
            <button class="pure-nav-arrow preview-arrow arrow-left" @click.stop="prevImage">
              <img src="/ui/left.svg" alt="上一张" class="arrow-svg-icon" />
            </button>

            <div class="image-slide-window" @click="openImageModal">
              <img
                :src="imagesList[currentIndex]"
                alt="新手攻略图"
                class="strategy-preview-img"
              />
              <div class="image-indicator">{{ currentIndex + 1 }} / {{ imagesList.length }}</div>
            </div>

            <button class="pure-nav-arrow preview-arrow arrow-right" @click.stop="nextImage">
              <img src="/ui/right.svg" alt="下一张" class="arrow-svg-icon" />
            </button>
          </div>
        </div>

        <!-- 攻略合集 -->
        <div v-for="(group, idx) in guidesList" :key="group.title" class="talent-card strategy-group-card" :class="{ 'first-group-card': idx === 0 }">
          <div class="group-header-row">
            <span class="group-title">{{ group.title }}</span>
            <span class="group-author">by {{ group.author }}</span>
          </div>
          <div class="group-links-list">
            <div
              v-for="item in group.list"
              :key="item.title"
              class="guide-link-card"
              @click="openLink(item.url)"
            >
              <div class="link-card-content-area">
                <span class="link-title">{{ item.title }}</span>
                <div v-if="item.img" class="link-img-slot" :class="{ 'placeholder-slot': item.img === '/misc/placeholder.png' }">
                  <img v-if="item.img !== '/misc/placeholder.png'" :src="item.img" class="link-thumbnail" />
                  <div v-else class="link-placeholder-box">
                    <span>(暂无预览图，改名即可显示)</span>
                  </div>
                </div>
              </div>
              <img src="/ui/right.svg" class="link-arrow-icon" />
            </div>
          </div>
        </div>

      </div>

      <div
        v-if="isImageModalOpen"
        class="image-region-overlay"
        @click="closeImageModal"
        @touchmove.prevent
      >
        <button class="image-modal-close" @click="closeImageModal">✕</button>

        <button class="pure-nav-arrow expanded-arrow modal-arrow-left" @click.stop="prevExpandedImage">
          <img src="/ui/left.svg" alt="上一张" class="arrow-svg-icon modal-arrow-color" />
        </button>

        <div
          class="region-canvas"
          @click.stop
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <img
            :src="imagesList[currentIndex]"
            class="expanded-image"
            :style="{
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transition: isAnimating ? 'transform 0.2s ease-out' : 'none'
            }"
            @dragstart.prevent
          />
        </div>

        <button class="pure-nav-arrow expanded-arrow modal-arrow-right" @click.stop="nextExpandedImage">
          <img src="/ui/right.svg" alt="下一张" class="arrow-svg-icon modal-arrow-color" />
        </button>
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  showGifs: { type: Boolean, default: true },
  engineStatus: { type: String, default: 'ready' }
})

const imagesList = [
  '/misc/ylgl1.png',
  '/misc/ylgl2.png',
  '/misc/ylgl3.png',
  '/misc/ylgl4.png'
]

const guidesList = [
  {
    author: '空白',
    title: '空白合集',
    list: [
      {
        title: '加速流剑仙养成攻略',
        url: 'https://www.taptap.cn/moment/823714731637345966',
        img: '/misc/kb5.webp'
      },
      {
        title: '【攻略】专天剑仙养成攻略(极简版)',
        url: 'https://www.taptap.cn/moment/821847725967409310?share_id=0e595784f632&utm_medium=share&utm_source=copylink',
        img: '/misc/kb1.webp'
      },
      {
        title: '【攻略】万血流黄金女养成攻略',
        url: 'https://www.taptap.cn/moment/824051956220690790',
        img: '/misc/kb4.webp'
      },
      {
        title: '新神飞升--净化史菇龙养成攻略',
        url: 'https://www.taptap.cn/moment/822678573893552294',
        img: '/misc/kb2.webp'
      },
      {
        title: '【攻略】恶意冰邪队，从入门到入土',
        url: 'https://www.taptap.cn/moment/794308378267487774?share_id=b780e41c234d&utm_medium=share&utm_source=copylink',
        img: '/misc/kb3.webp'
      }
    ]
  },
    {
    author: '冰皇晶',
    title: '冰皇晶',
    list: [
      {
        title: '【攻略】冰火队',
        url: 'https://www.taptap.cn/moment/825125419110893038',
        img: '/misc/bjh1.webp'
      }
    ]
  },
  {
    author: '来年祈风信',
    title: '来年祈风信',
    list: [
      {
        title: '【攻略】低配火龙开荒攻略（精简版）',
        url: 'https://www.taptap.cn/moment/822495039757225902',
        img: '/misc/fx1.webp'
      }
    ]
  },
  {
    author: '葱伴土豆泥',
    title: '葱伴土豆泥合集',
    list: [
      {
        title: '【攻略】公主飞升传（开篇）——超越巨灵的顶级开荒阵容！',
        url: 'https://www.taptap.cn/moment/806995105993982429?share_id=7611f09abc16&utm_medium=share&utm_source=copylink',
        img: '/misc/tdn1.webp'
      },
      {
        title: '【攻略】平民焚决——热血巨灵枪',
        url: 'https://www.taptap.cn/moment/789557923113075768?share_id=e6bcb3cc99f7&utm_medium=share&utm_source=copylink',
        img: '/misc/tdn2.webp'
      },
      {
        title: '【攻略】拉条自由！——水晶菇、彩贝无天赋单人自体五大拉条全队',
        url: 'https://www.taptap.cn/moment/804366638940948955?share_id=28c7d780efee&utm_medium=share&utm_source=copylink',
        img: '/misc/tdn3.webp'
      }
    ]
  },
  {
    author: 'lanceyy',
    title: 'lanceyy',
    list: [
      {
        title: '【攻略】鼓舞幸运兔异化魔术 单拉人马/战祭/彩贝 双招财刷钱刷装',
        url: 'https://www.taptap.cn/moment/790590727292715354?share_id=6e1ee8bd5815&utm_medium=share&utm_source=copylink',
        img: '/misc/lan1.webp'
      }
    ]
  },
  {
    author: '樱',
    title: '樱',
    list: [
      {
        title: '[攻略]新手也能轻松做到的单辅15大',
        url: 'https://www.taptap.cn/moment/805570457490162232',
        img: '/misc/ying1.webp'
      }
    ]
  },
  {
    author: '纯爱战士虎鲸',
    title: '纯爱战士虎鲸',
    list: [
      {
        title: '冰剑攻略2.0震撼来袭',
        url: 'https://www.taptap.cn/moment/819020737686798410?share_id=3e519b21d365&utm_medium=share&utm_source=copylink',
        img: '/misc/hj1.webp'
      }
    ]
  }
]

const openLink = (url) => {
  window.open(url, '_blank')
}

const currentIndex = ref(0)
const isImageModalOpen = ref(false)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isAnimating = ref(false)
let autoPlayTimer = null

const startAutoPlay = () => {
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    if (!isImageModalOpen.value) {
      currentIndex.value = (currentIndex.value + 1) % imagesList.length
    }
  }, 5000)
}
const stopAutoPlay = () => {
  if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null }
}
const nextImage = () => { currentIndex.value = (currentIndex.value + 1) % imagesList.length; startAutoPlay() }
const prevImage = () => { currentIndex.value = (currentIndex.value - 1 + imagesList.length) % imagesList.length; startAutoPlay() }

// ===== 核心实现：App内自动复制静态资源 Excel 下载直链 =====
const fileUrl = '/misc/幻想少女新手攻略20260623（群友制作 @雨落）.xlsx'

const handleDownload = () => {
  if (window.NativeDownload) {
    // App 内：Java 直接把 www/misc/ 下的文件复制到公共 Downloads
    window.NativeDownload.downloadFile('misc/' + fileUrl.split('/').pop())
  } else {
    // 网页端：<a> 导航触发浏览器下载
    const baseDir = window.location.pathname.replace(/\/$/, '')
    const absoluteUrl = window.location.origin + baseDir + fileUrl
    const link = document.createElement('a')
    link.href = absoluteUrl
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// === 全屏看图矩阵手势控制逻辑（保持原样） ===
const resetTransform = () => { isAnimating.value = false; scale.value = 1; translateX.value = 0; translateY.value = 0 }
const nextExpandedImage = () => { resetTransform(); currentIndex.value = (currentIndex.value + 1) % imagesList.length }
const prevExpandedImage = () => { resetTransform(); currentIndex.value = (currentIndex.value - 1 + imagesList.length) % imagesList.length }
const openImageModal = () => { resetTransform(); isImageModalOpen.value = true }
const closeImageModal = () => { isImageModalOpen.value = false }

onMounted(() => { startAutoPlay() })
onUnmounted(() => { stopAutoPlay() })

let startTouchesDist = 0
let startScale = 1
let startX = 0
let startY = 0
let isDragging = false
const getDistance = (t1, t2) => Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2))

const handleTouchStart = (e) => {
  isAnimating.value = false
  if (e.touches.length === 2) {
    startTouchesDist = getDistance(e.touches[0], e.touches[1])
    startScale = scale.value
  } else if (e.touches.length === 1) {
    isDragging = true
    startX = e.touches[0].clientX - translateX.value
    startY = e.touches[0].clientY - translateY.value
  }
}
const handleTouchMove = (e) => {
  if (e.touches.length === 2) {
    const newDist = getDistance(e.touches[0], e.touches[1])
    if (startTouchesDist === 0) return
    const ratio = newDist / startTouchesDist
    let targetScale = startScale * ratio
    if (targetScale < 0.8) targetScale = 0.8
    if (targetScale > 6) targetScale = 6
    scale.value = targetScale
  } else if (e.touches.length === 1 && isDragging) {
    translateX.value = e.touches[0].clientX - startX
    translateY.value = e.touches[0].clientY - startY
  }
}
const handleTouchEnd = (e) => {
  isDragging = false
  if (e.touches.length < 2) { startTouchesDist = 0 }
  if (scale.value < 1) {
    isAnimating.value = true; scale.value = 1; translateX.value = 0; translateY.value = 0
  }
}
const handleMouseDown = (e) => { isDragging = true; isAnimating.value = false; startX = e.clientX - translateX.value; startY = e.clientY - translateY.value }
const handleMouseMove = (e) => { if (!isDragging) return; translateX.value = e.clientX - startX; translateY.value = e.clientY - startY }
const handleMouseUp = () => { isDragging = false }
</script>

<style scoped>
/* 局部样式完全保留您的规范，无需做任何改动 */
.guide-flex-wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; }
.guide-sub-header { padding: 4px 0 8px 0; flex-shrink: 0; }
.guide-hint-text { font-size: 12px; color: var(--text-sub); opacity: 0.8; }
.guide-main-area { flex: 1; position: relative; overflow: hidden; background: transparent; }
.guide-scroll-container { width: 100%; height: 100%; overflow-y: auto; padding-bottom: 20px; }
.talent-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 20px; padding: 20px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; gap: 14px; width: 100%; }
.download-link-wrapper { text-decoration: none; display: block; cursor: pointer; }
.title-text-group { display: flex; flex-direction: column; gap: 4px; }
.main-title { font-size: clamp(15px, 4vw, 18px); font-weight: 700; color: #2563eb; line-height: 1.4; }
.sub-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.sub-title { font-size: 13px; color: var(--text-sub); }
.download-action-inline { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 12px; font-weight: 600; background: #eff6ff; color: #2563eb; border-radius: 6px; }
.dark-mode .download-action-inline { background: rgba(37, 99, 235, 0.15); color: #60a5fa; }
.dark-mode .main-title { color: #60a5fa; }
.strategy-image-container { display: flex; align-items: center; position: relative; border-radius: 12px; border: 1px solid var(--border-color); background: var(--card-bg); }
.image-slide-window { flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; height: 200px; cursor: zoom-in; position: relative; }
.strategy-preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.image-indicator { position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 10px; }
.pure-nav-arrow { background: none !important; border: none !important; padding: 0; margin: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; outline: none; -webkit-tap-highlight-color: transparent; transition: transform 0.15s ease; }
.pure-nav-arrow:active { transform: scale(0.8); }
.arrow-svg-icon { width: 24px; height: 24px; filter: var(--icon-filter); display: block; }
.preview-arrow { position: absolute; top: 50%; transform: translateY(-50%); }
.preview-arrow:active { transform: translateY(-50%) scale(0.8); }
.arrow-left { left: 4px; }
.arrow-right { right: 4px; }
.image-region-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.94); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 200; overflow: visible; touch-action: none; display: flex; align-items: center; justify-content: center; }
.region-canvas { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: visible; }
.expanded-image { max-width: 94%; max-height: 94%; object-fit: contain; user-select: none; -webkit-user-drag: none; will-change: transform; }
.expanded-arrow { position: absolute; top: 50%; transform: translateY(-50%); }
.expanded-arrow:active { transform: translateY(-50%) scale(0.8); }
.modal-arrow-left { left: 12px; }
.modal-arrow-right { right: 12px; }
.modal-arrow-color { width: 32px; height: 32px; filter: brightness(0) invert(1) !important; opacity: 0.75; }
.image-modal-close { position: absolute; top: 14px; right: 14px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); font-size: 15px; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 220; }
.strategy-group-card {
  margin-top: 16px;
}

.group-header-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.group-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.first-group-card .group-title {
  color: #000000;
}
.dark-mode .first-group-card .group-title {
  color: #ffffff;
}

.group-author {
  font-size: 12.5px;
  color: var(--text-sub);
  font-weight: 600;
}

.group-links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide-link-card {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 12px;
}

.guide-link-card:hover {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
  transform: translateY(-2px);
}

.link-title {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1.4;
  text-align: left;
}
.dark-mode .link-title {
  color: #60a5fa;
}

.link-arrow-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  flex-shrink: 0;
  opacity: 0.6;
}

.link-card-content-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.link-img-slot {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.link-img-slot.placeholder-slot {
  height: 32px;
  background: transparent;
  border: 1px dashed var(--border-color);
}

.link-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.link-placeholder-box {
  font-size: 12px;
  color: var(--text-sub);
  font-weight: 600;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 600px) { .talent-card { padding: 14px; border-radius: 16px; } .image-slide-window { height: 170px; } .arrow-svg-icon { width: 20px; height: 20px; } .modal-arrow-color { width: 28px; height: 28px; } .modal-arrow-left { left: 6px; } .modal-arrow-right { right: 6px; } }
</style>