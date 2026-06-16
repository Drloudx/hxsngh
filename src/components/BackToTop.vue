<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const show = ref(false)

const handleScroll = () => {
  show.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
  /* 改动1：取消靠右，改为紧贴卡片右侧，距离右侧0px */
  right: unset;
  left: calc(50% + 420px); /* 根据你卡片宽度微调，紧贴卡片右边 */
  /* 改动2：距离页面底部固定24px，不会贴浏览器底边 */
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
    /* 移动端改回靠右，避免超出屏幕 */
    right: 16px;
    left: unset;
    bottom: 16px;
    width: 38px;
    height: 38px;
  }
  .top-icon {
    width: 20px;
    height: 20px;
  }
}
</style>