<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input type="text" placeholder="搜索角色..." class="talent-search-input" />
      </div>
    </div>
    <div class="sandbox-role-list">
      <div class="sandbox-empty-state">
        <div class="placeholder-title">角色图鉴</div>
        <div class="placeholder-desc">当前页面正在建设中</div>
        <div class="placeholder-title">如果有什么想法，可以加群交流</div>
          <p class="qq-link-wrap" style="margin-top:8px">
            <a href="https://qun.qq.com/universal-share/share?ac=1&authKey=4xp%2BlCmM2Q2gVIvW6a14yOEVtT%2BPLsY9DwmNSDRVTBkp8xcNO%2FTRo%2FOksMb528aW&busi_data=eyJncm91cENvZGUiOiI5NjQ3Njg3OTkiLCJ0b2tlbiI6Im1abkR4eDNDb09HeDZtV2QvNi9ZOTlMNWRhQVQxSDVGK2hSUmlmdkd6bm9hNGRIYjZnWFB6QitBd1A5NVhscmMiLCJ1aW4iOiIxOTY1MTYxNjQzIn0%3D&data=CcXqRPXmezEwvtBwz950aSAyBxYHidOpffYEE8nD1EB-WDcAI-CLzvlLLIavd-lpEuHEP9fCXE5i5Sh3aGjUmw&svctype=4&tempid=h5_group_info" target="_blank" style="color:#3b82f6;font-weight:bold">点击链接加入群聊【幻想少女公会助手反馈交流群】</a>
          </p>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.talent-container {
  width: 100%; max-width: 800px; margin: 0 auto; padding: 0;
  box-sizing: border-box; display: flex; flex-direction: column; flex: 1;
  min-height: 0; overflow-y: auto;
}
.talent-sticky-top {
  flex-shrink: 0; position: sticky; top: 0; z-index: 999;
  background: var(--bg); padding-bottom: 10px;
}
.talent-search-box {
  display: flex; align-items: center; background: var(--card-bg);
  border: 1px solid var(--border-color); border-radius: 12px;
  padding: 10px 14px; box-shadow: inset 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s ease;
}
.talent-search-box:focus-within { border-color: #409eff; }
.search-icon { width: 18px; height: 18px; filter: var(--icon-filter); margin-right: 10px; flex-shrink: 0; opacity: 0.7; }
.talent-search-input { flex: 1; border: none; outline: none; background: transparent; font-size: 15px; color: var(--text-main); font-family: inherit; }
.sandbox-role-list { flex: 1; }
.sandbox-empty-state { text-align: center; padding: 60px 20px; }
.placeholder-title { font-size: 18px; font-weight: 700; color: var(--text-main); margin: 12px 0 6px; }
.placeholder-desc { font-size: 14px; color: var(--text-sub); }
.qq-link-wrap {
  text-align: left;
  padding: 0 10px;
}
</style>
