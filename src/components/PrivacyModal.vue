<script setup>
defineProps({
  show: Boolean,
  isFirstLaunch: Boolean
})

const emit = defineEmits(['close', 'agree'])
</script>

<template>
  <div v-if="show" class="custom-modal-overlay privacy-modal-overlay" @click.self="isFirstLaunch ? null : emit('close')">
    <div class="custom-modal-card privacy-modal-card">
      <div class="modal-header">
        <h3>隐私政策</h3>
      </div>
      <div class="modal-body privacy-modal-body">
        <!-- 首次启动提示 -->
        <template v-if="isFirstLaunch">
          <p class="privacy-first-hint">请阅读隐私政策，确认并同意后继续使用</p>
          <div class="privacy-divider"></div>
        </template>

        <!-- 隐私政策正文 -->
        <div class="privacy-policy-content">
          <h1 class="policy-title">幻想少女公会助手 隐私政策</h1>
          <p class="policy-meta">版本更新日期：2026年08月26日</p>
          <p class="policy-meta">版本生效日期：2026年06月20日</p>

          <h2 class="policy-section-title">引言</h2>
          <p class="policy-text">「幻想少女公会助手」（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。我们致力于维持您对我们的信任，恪守国家相关法律法规，保护您的个人信息。</p>
          <p class="policy-text">请您在使用我们的产品（或服务）前，仔细阅读并了解本《隐私政策》。点击“确认并同意”后，代表您已阅读并同意本政策。</p>

          <h2 class="policy-section-title">一、我们如何收集和使用您的个人信息</h2>
          <p class="policy-text">我们仅会出于本政策所述的以下目的，收集和使用您的个人信息，绝不额外收集无关隐私信息：</p>

          <h3 class="policy-sub-title">1. 保障 App 正常运行与基础业务功能</h3>
          <p class="policy-text">本应用的大部分工具数据保存在您的设备本地。为提供联网更新、文件下载与导入导出功能，应用会使用网络连接，并在您主动操作时调用系统文件选择、分享或安装界面。</p>

          <h3 class="policy-sub-title">2. 运营数据统计与分析</h3>
          <p class="policy-text">Android App 使用友盟+移动统计 U-App 和应用性能监控 U-APM，用于统计启动、活跃、版本与渠道分布，并分析崩溃、卡顿、启动、网络和内存等运行表现。网页版使用百度统计分析页面访问情况。Android App 不加载百度统计，网页版不接入友盟移动 SDK。</p>

          <h2 class="policy-section-title">二、信息共享、转让与公开披露</h2>
          <p class="policy-text">除实现本政策所述功能所必需的处理外，我们不会出售您的个人信息。Android App 的相关数据会传输给友盟+服务提供方；网页版访问统计数据会传输给百度统计服务提供方，并分别依据其隐私政策进行处理和保存。</p>
          <p class="policy-text">如法律法规要求、行政或司法机关依法提出要求，或为保护用户和公众安全所必需，我们可能依法配合披露相关信息。</p>

          <h2 class="policy-section-title">三、第三方 SDK 与统计服务说明</h2>
          <p class="policy-text">我们会核验第三方服务的安全与合规要求，并要求服务提供方采取合理的数据安全防护措施。Android App 中的友盟 SDK 仅在您点击“确认并同意”后初始化；同意状态会保存在设备本地，后续启动可直接初始化。</p>

          <div class="sdk-info-box">
            <p class="policy-text"><strong>SDK 名称：</strong>友盟+SDK（移动统计 U-App、应用性能监控 U-APM）</p>
            <p class="policy-text"><strong>服务提供方：</strong>友盟同欣（北京）科技有限公司</p>
            <p class="policy-text"><strong>服务类型：</strong>移动应用运营统计；崩溃、ANR、启动耗时、页面、网络、内存和性能监控。</p>
            <p class="policy-text"><strong>收集个人信息类型：</strong>设备信息（可能包括 IMEI、Mac、Android ID、OAID、广告标识符、GUID、SIM 卡 IMSI）、设备型号与操作系统版本、网络信息（IP 地址、网络类型、运营商）、应用信息（包名、版本、渠道、启动与使用情况）、应用运行日志及性能数据。是否实际收集取决于设备、系统版本、授权状态和 SDK 能力；本应用不主动申请精确地理位置权限。</p>
            <p class="policy-text"><strong>使用目的：</strong>统计 App 启动、活跃、版本和渠道分布，定位崩溃、卡顿和性能问题，改进产品体验。</p>
            <p class="policy-text"><strong>隐私政策链接：</strong><a href="https://www.umeng.com/page/policy" target="_blank" rel="noopener noreferrer" class="policy-link">友盟+隐私权政策</a></p>
          </div>

          <div class="sdk-info-box">
            <p class="policy-text"><strong>服务名称：</strong>百度统计</p>
            <p class="policy-text"><strong>服务提供方：</strong>北京百度网讯科技有限公司</p>
            <p class="policy-text"><strong>服务类型：</strong>网页访问统计与使用情况分析。</p>
            <p class="policy-text"><strong>处理信息：</strong>访问页面与时间、来源页面、浏览器和操作系统信息、设备类型、IP 地址、网络信息及 Cookie 等网页统计所需信息。</p>
            <p class="policy-text"><strong>使用目的：</strong>了解网页版页面访问与功能使用情况，改进产品体验。</p>
            <p class="policy-text"><strong>隐私政策链接：</strong><a href="https://tongji.baidu.com/web/help/article?id=330&amp;type=0" target="_blank" rel="noopener noreferrer" class="policy-link">百度统计隐私政策</a></p>
          </div>

          <h2 class="policy-section-title">四、您如何管理您的个人信息</h2>
          <p class="policy-text">您对自己的个人信息享有以下权利：</p>
          <ul class="policy-list">
            <li><strong>访问查阅：</strong>您可以随时在APP设置内查看完整隐私政策。</li>
            <li><strong>停止使用：</strong>您可以停止使用网页版或卸载本应用。有关统计数据的访问、更正或删除请求，可通过 App 设置中的“反馈/建议”联系我们处理。</li>
          </ul>
          <ul class="policy-list">
            <li><strong>权限说明：</strong>应用使用网络权限完成内容更新和数据统计；仅在您主动下载、导出或安装更新时调用相应系统能力。</li>
          </ul>
          <h2 class="policy-section-title">五、我们如何保护和存储您的个人信息</h2>
          <p class="policy-text"><strong>数据安全：</strong>本地工具记录保存在您的设备内；运营统计数据由友盟+或百度统计服务提供方依据其安全与保存规则处理。我们会采取合理措施减少无关信息收集并保护数据安全。</p>
          <p class="policy-text"><strong>补充说明：</strong>本应用不要求注册账号，不主动收集手机号、精确地理位置、通讯录或相册内容。</p>

          <h2 class="policy-section-title">六、未成年人保护</h2>
          <p class="policy-text">我们的产品主要面向成年游戏用户。如果您是未成年人，请在法定监护人的陪同下阅读本政策，并在征得监护人同意后再使用本服务。请勿在未获得监护人许可的情况下使用本APP。</p>

          <h2 class="policy-section-title">七、隐私政策的更新</h2>
          <p class="policy-text">我们可能会适时对本隐私政策内容进行修订。当隐私政策发生重大变更时，我们会在APP内公告进行提示。政策更新后您继续使用APP，即视为同意新版隐私政策内容。</p>
        </div>
      </div>
      <div class="modal-footer">
        <!-- 首次启动模式：确认并同意 -->
        <template v-if="isFirstLaunch">
          <button class="modal-btn-confirm btn-agree" @click="emit('agree')">确认并同意</button>
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

.btn-agree {
  background: var(--success) !important;
}
.btn-agree:hover {
  filter: brightness(1.1);
}
</style>
