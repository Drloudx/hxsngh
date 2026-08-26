<script setup>
defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="show" class="custom-modal-overlay" @click.self="emit('close')">
    <div class="custom-modal-card about-modal-card">
      <div class="modal-header about-header">
        <h3>关于我们</h3>
      </div>

      <div class="modal-body about-body">
        <div class="author-section">
          <img src="/ui/author_avatar.jpg" class="about-logo" />
          <h4 class="author-name">云汐渚梦</h4>
          <div class="social-links">
      <a href="https://www.taptap.cn/user/34448185?share_id=06714cbc47ff&utm_medium=share&utm_source=copylink" target="_blank" rel="noopener noreferrer" class="social-item taptap">
              <span class="social-icon">T</span>
              TapTap
            </a>
      <a href="https://b23.tv/xGNrRhf" target="_blank" rel="noopener noreferrer" class="social-item bilibili">
              <span class="social-icon">B</span>
              Bilibili
            </a>
          </div>
        </div>

        <div class="credits-section">
          <div class="credits-title">感谢名单</div>
          <div class="credits-list">
            <div class="credit-item">
              <span class="credit-name">TapTap 留白</span>
              <span class="credit-desc">最初角色数据源</span>
            </div>
            <div class="credit-item">
              <span class="credit-name">Lance</span>
              <span class="credit-desc">天赋数据</span>
            </div>
            <div class="credit-item">
              <span class="credit-name">幺蛾子</span>
              <span class="credit-desc">天赋推荐支持</span>
            </div>
            <div class="credit-item">
              <span class="credit-name">来年祈风信</span>
              <span class="credit-desc">数据支持</span>
            </div>
            <div class="credit-item">
              <span class="credit-name">山酒</span>
              <span class="credit-desc">数据支持</span>
            </div>
            <div class="credit-item">
              <span class="credit-name">Tranished</span>
              <span class="credit-desc">数据支持</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn-confirm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-modal-card {
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
}
.about-header {
  display: flex;
  justify-content: center;
  align-items: center;
}
.about-body {
  padding: 20px !important;
  text-align: left !important;
}
.author-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}
.about-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.author-name {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: var(--text-main);
}
.social-links {
  display: flex;
  gap: 12px;
}
.social-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}
.social-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  color: white;
}
.taptap {
  background: #00cccc20;
  color: #008a8a;
}
.taptap .social-icon { background: #00cccc; }
.bilibili {
  background: #fb729920;
  color: #e83e6d;
}
.bilibili .social-icon { background: #fb7299; }

.credits-section {
  background: var(--bg);
  padding: 16px;
  border-radius: 12px;
}
.credits-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-sub);
  margin-bottom: 12px;
  text-align: center;
}
.credits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.credit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.credit-name {
  color: var(--text-main);
  font-weight: 600;
}
.credit-desc {
  color: var(--text-sub);
  font-size: 12px;
}

.donate-body {
  padding: 30px 20px !important;
}
.donate-hint {
  font-size: 14px;
  color: var(--text-sub);
  margin-bottom: 20px;
}
.donate-qrs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}
.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qr-item img {
  width: 240px;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 4px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.qr-item span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}
</style>
