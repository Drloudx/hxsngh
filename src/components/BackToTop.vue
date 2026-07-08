<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const show = ref(false)

const handleScroll = (e) => {
  const el = e.target
  if (el.matches('.talent-list, .lime-grid-container, .sandbox-role-list, .recruit-view, .role-grid-container, .role-detail-overlay, .equip-list-container, .block-list-scroll')) {
    show.value = el.scrollTop > 300
  }
}

const scrollToTop = () => {
  const elements = document.querySelectorAll('.talent-list, .lime-grid-container, .sandbox-role-list, .recruit-view, .role-grid-container, .role-detail-overlay, .equip-list-container, .block-list-scroll')
  let target = null
  for (const el of elements) {
    if (el.matches('.role-detail-overlay') && el.offsetParent !== null) {
      target = el
      break
    }
    if (el.offsetParent !== null && el.scrollTop > 100) {
      target = el
    }
  }
  if (!target) {
    target = Array.from(elements).find(el => el.offsetParent !== null)
  }
  if (target) {
    target.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => {
  document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
})

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll, { capture: true })
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="back-to-top"
      @click="scrollToTop"
      title="回到顶部"
    >
      <div class="icon-container">
        <img src="/ui/down-top.svg" alt="回到顶部" class="top-icon" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  /* 取消靠右，改为紧贴卡片右侧 */
  right: unset;
  left: calc(50% + 420px + 5px); /* 微调 5px 以与 54px 的菜单按钮垂直中心对齐 */
  bottom: 24px;
  width: 44px;
  height: 44px;
  background-color: #628fb8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 998;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.back-to-top:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.back-to-top:active {
  transform: translateY(-2px);
  filter: brightness(0.9);
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 垂直翻转图标 */
  transform: scaleY(-1);
}

.top-icon {
  width: 24px;
  height: 24px;
  display: block;

}


/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}

@media (max-width: 600px) {
  .back-to-top {
    /* 移动端对齐底高，并微调 right 确保与菜单中心垂直对齐 */
    right: 21px;
    left: unset;
    bottom: 25px; /* 和上传截图等按键的底部高度相同 */
    width: 38px;
    height: 38px;
  }
  .top-icon {
    width: 20px;
    height: 20px;
  }
}
</style>