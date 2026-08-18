<script setup>
defineProps({
  show: Boolean,
  isFirstLaunch: Boolean,
  isInApp: Boolean,
  baiduAuthorized: Boolean
})

const emit = defineEmits(['close', 'agree', 'disagree', 'toggle-auth'])
</script>

<template>
  <div v-if="show" class="custom-modal-overlay privacy-modal-overlay" @click.self="isFirstLaunch ? null : emit('close')">
    <div class="custom-modal-card privacy-modal-card">
      <div class="modal-header">
        <h3>隐私政策</h3>
      </div>
      <div class="modal-body privacy-modal-body">
        <!-- 设置模式下的授权开关（仅 App 显示，首次启动和网页版均不显示） -->
        <template v-if="!isFirstLaunch && isInApp">
          <div class="privacy-switch-row">
            <div class="privacy-switch-label">
              <span class="privacy-switch-title">数据统计授权</span>
              <span class="privacy-switch-desc">关闭后将停止上报匿名页面访问数据</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" :checked="baiduAuthorized" @change="emit('toggle-auth')" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="privacy-divider"></div>
        </template>

        <!-- 首次启动提示 -->
        <template v-if="isFirstLaunch">
          <p class="privacy-first-hint">请阅读隐私政策并确认数据统计授权</p>
          <div class="privacy-divider"></div>
        </template>

        <!-- 隐私政策正文 -->
        <div class="privacy-policy-content">
          <h1 class="policy-title">幻想少女公会助手 隐私政策</h1>
          <p class="policy-meta">版本更新日期：2026年06月20日</p>
          <p class="policy-meta">版本生效日期：2026年06月20日</p>

          <h2 class="policy-section-title">引言</h2>
          <p class="policy-text">「幻想少女公会助手」（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。我们致力于维持您对我们的信任，恪守国家相关法律法规，保护您的个人信息。</p>
          <p class="policy-text">请您在使用我们的产品（或服务）前，仔细阅读并了解本《隐私政策》。如果您不同意本隐私政策的任何内容，请勿使用本App，您选择使用本应用，即代表您同意本隐私政策全部条款。</p>

          <h2 class="policy-section-title">一、我们如何收集和使用您的个人信息</h2>
          <p class="policy-text">我们仅会出于本政策所述的以下目的，收集和使用您的个人信息，绝不额外收集无关隐私信息：</p>

          <h3 class="policy-sub-title">1. 保障 App 正常运行与基础业务功能</h3>
          <p class="policy-text">本应用无设备信息采集行为，不会获取设备型号、系统版本、网络类型、运行日志等任何设备相关信息，仅依托前端页面正常运行，无需采集设备数据保障功能使用。</p>

          <h3 class="policy-sub-title">2. 运营数据统计与分析</h3>
          <p class="policy-text">为了了解产品使用热度、统计页面访问情况、优化功能体验与修复使用问题，我们引入第三方百度网页统计服务，仅统计匿名页面访问数据，全程不收集任何可以定位用户个人身份的隐私信息。关于第三方统计服务收集信息的具体情况，请参见本政策第三部分内容。</p>

          <h2 class="policy-section-title">二、信息共享、转让与公开披露</h2>
          <p class="policy-text">我们不会收集、留存任何可识别用户身份的个人隐私信息，因此不存在向任何第三方共享、转让、公开披露用户个人信息的行为。</p>
          <p class="policy-text">我们仅通过第三方网页统计服务，获取APP内匿名页面访问路径与页面停留时长数据，所有数据均无法定位具体自然人，不存在个人隐私泄露风险。</p>

          <h2 class="policy-section-title">三、第三方网页统计服务说明</h2>
          <p class="policy-text">为保障本应用稳定运行、优化产品使用体验，我们接入第三方网页统计服务。我们会对第三方统计服务进行安全核验，并要求合作方采取完善的数据安全防护措施，保障用户数据安全。</p>

          <div class="sdk-info-box">
            <p class="policy-text"><strong>服务名称：</strong>百度统计</p>
            <p class="policy-text"><strong>运营主体：</strong>百度在线网络技术（北京）有限公司</p>
            <p class="policy-text"><strong>收集信息：</strong>APP内页面访问路径、页面停留时长；不收集设备型号、系统版本、IP地址、地理位置、手机号、设备唯一识别码、匿名设备标识等任何设备及个人敏感隐私信息。</p>
            <p class="policy-text"><strong>使用目的：</strong>统计APP每日活跃人数、页面访问热度，用来优化工具功能、修复使用bug，所有数据全程匿名，无法追踪到单独个人用户。</p>
            <p class="policy-text"><strong>隐私政策链接：</strong><a href="https://tongji.baidu.com/web/help/article?id=330&amp;type=0" target="_blank" class="policy-link">百度统计隐私政策</a></p>
          </div>

          <h2 class="policy-section-title">四、您如何管理您的个人信息</h2>
          <p class="policy-text">您对自己的个人信息享有以下权利：</p>
          <ul class="policy-list">
            <li><strong>访问查阅：</strong>您可以随时在APP设置内查看完整隐私政策。</li>
            <li><strong>撤回授权：</strong>您使用过程中，可随时在APP设置隐私协议下拉菜单内，自主关闭页面使用数据统计功能，关闭后我们将立即停止全部匿名页面访问数据的上报。</li>
          </ul>
          <p class="policy-text policy-note">注：关闭授权后，百度统计将停止采集和上报数据，已上报的数据将按百度统计的隐私政策进行保留和处理。</p>
          <ul class="policy-list">
            <li><strong>权限说明：</strong>本应用不申请任何手机敏感隐私权限，关闭统计授权后不影响APP全部基础功能正常使用。</li>
          </ul>
          <h2 class="policy-section-title">五、我们如何保护和存储您的个人信息</h2>
          <p class="policy-text"><strong>数据安全：</strong>我们仅留存匿名页面访问统计数据，无任何用户个人信息，同时要求第三方统计方采取完善安全防护措施，保障统计数据安全。</p>
          <p class="policy-text"><strong>补充说明：</strong>本应用全程不收集账号、手机号、地理位置、相册、通讯录等任何用户敏感隐私数据。</p>

          <h2 class="policy-section-title">六、未成年人保护</h2>
          <p class="policy-text">我们的产品主要面向成年游戏用户。如果您是未成年人，请在法定监护人的陪同下阅读本政策，并在征得监护人同意后再使用本服务。请勿在未获得监护人许可的情况下使用本APP。</p>

          <h2 class="policy-section-title">七、隐私政策的更新</h2>
          <p class="policy-text">我们可能会适时对本隐私政策内容进行修订。当隐私政策发生重大变更时，我们会在APP内公告进行提示。政策更新后您继续使用APP，即视为同意新版隐私政策内容。</p>
        </div>
      </div>
      <div class="modal-footer" :class="{ 'privacy-footer-dual': isFirstLaunch }">
        <!-- 首次启动模式：同意 / 不同意 -->
        <template v-if="isFirstLaunch">
          <button class="modal-btn-confirm btn-disagree" @click="emit('disagree')">不同意</button>
          <button class="modal-btn-confirm btn-agree" @click="emit('agree')">同意</button>
        </template>
        <!-- 设置模式：关闭 -->
        <button v-else class="modal-btn-confirm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.privacy-modal-overlay {
  z-index: 10000 !important;
}
.privacy-modal-card {
  max-width: 520px !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.privacy-modal-body {
  padding: 18px 22px !important;
  text-align: left !important;
  overflow-y: auto;
  flex: 1;
}

/* 授权开关行 */
.privacy-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 4px;
}
.privacy-switch-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.privacy-switch-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}
.privacy-switch-desc {
  font-size: 11px;
  color: var(--text-sub);
  line-height: 1.4;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  border-radius: 24px;
  transition: all 0.25s ease;
}
.toggle-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-switch input:checked + .toggle-slider {
  background: var(--primary);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}
:root.dark-mode .toggle-slider {
  background: #475569;
}
:root.dark-mode .toggle-switch input:checked + .toggle-slider {
  background: #3b82f6;
}

/* 分割线 */
.privacy-divider {
  height: 1px;
  background: var(--border-color);
  margin: 10px 0 16px 0;
}

/* 隐私政策正文排版 */
.privacy-policy-content {
  line-height: 1.75;
  color: var(--text-main);
}
.policy-title {
  font-size: 22px;
  font-weight: 800;
  text-align: center;
  margin: 0 0 8px 0;
  color: var(--text-main);
}
.policy-meta {
  font-size: 12px;
  color: var(--text-sub);
  text-align: center;
  margin: 0 0 2px 0;
}
.policy-section-title {
  font-size: 15px;
  font-weight: 700;
  margin: 18px 0 8px 0;
  color: var(--text-main);
  padding-bottom: 2px;
  border-bottom: 1px solid var(--border-color);
}
.policy-sub-title {
  font-size: 13px;
  font-weight: 700;
  margin: 12px 0 6px 0;
  color: var(--text-main);
}
.policy-text {
  font-size: 13px;
  margin: 0 0 6px 0;
  color: var(--text-main);
  line-height: 1.7;
}
.policy-list {
  margin: 4px 0 10px 0;
  padding-left: 20px;
}
.policy-list li {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.7;
  margin-bottom: 2px;
}
.policy-note {
  color: var(--text-sub) !important;
  font-size: 12px !important;
  font-style: italic;
  padding-left: 8px;
  border-left: 3px solid var(--border-color);
}
.sdk-info-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 14px;
  margin: 10px 0;
}
.sdk-info-box .policy-text {
  margin-bottom: 4px;
  font-size: 12px;
}
.sdk-info-box .policy-text:last-child {
  margin-bottom: 0;
}
.sdk-info-box a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.sdk-info-box a:hover {
  text-decoration: underline;
}
.policy-link {
  color: #3b82f6 !important;
}

/* 首次启动隐私弹窗提示 */
.privacy-first-hint {
  font-size: 13px;
  color: var(--primary);
  font-weight: 600;
  margin: 0 0 4px 0;
  text-align: center;
}

/* 首次启动底部双按钮 */
.privacy-footer-dual {
  display: flex !important;
  gap: 12px;
  justify-content: center;
}
.privacy-footer-dual .modal-btn-confirm {
  flex: 1;
  max-width: 140px;
  padding: 10px 20px;
}
.btn-agree {
  background: var(--success) !important;
}
.btn-disagree {
  background: var(--text-sub) !important;
}
.btn-agree:hover, .btn-disagree:hover {
  filter: brightness(1.1);
}
</style>
