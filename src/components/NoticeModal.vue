<script setup>
import { defineProps, defineEmits } from 'vue'
import notices from '../assets/notices.json'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const renderLine = (text) => {
  // 公告文本颜色标记规则
// 格式：[ 正则匹配符号, 颜色代码 ]
// 使用方法：==文字== 红色、~~文字~~ 橙色、##文字## 绿色...以此类推
const rules = [
  [/==(.+?)==/g, '#ef4444'],   // 🔴 红色 - 重要警告/紧急更新
  [/~~(.+?)~~/g, '#f97316'],   // 🟠 橙色 - 优化/功能调整
  [/##(.+?)##/g, '#22c55e'],   // 🟢 绿色 - 修复BUG/成功提示
  [/{{(.+?)}}/g, '#3b82f6'],   // 🔵 蓝色 - 新增功能
  [/\[\[(.+?)\]\]/g, '#a855f7'], // 🟣 紫色 - 高级/史诗/特殊内容
  [/\(\((.+?)\)\)/g, '#ec4899'], // 🩷 粉色 - 提示/温馨提醒
  [/<<(.+?)>>/g, '#64748b'],     // ⚫ 灰色 - 备注/次要说明
  [/%%(.+?)%%/g, '#eab308'],     // 🟡 金色 - 高亮重点/顶级内容
];
  for (const [re, color] of rules) {
    text = text.replace(re, '<span style="color:' + color + '">$1</span>');
  }
  return text;
};
</script>

<template>
  <div v-if="show" class="custom-modal-overlay" @click.self="emit('close')">
    <div class="custom-modal-card">
      <div class="modal-header">
        <h3>公告</h3>
      </div>
      <div class="modal-body notice-body">
        <div class="notice-list">
          <div v-for="(item, idx) in notices" :key="idx" class="notice-item">
            <div class="notice-header">
              <span class="notice-date">{{ item.date }}</span>
              <span v-if="item.title" class="notice-title">{{ item.title }}</span>
            </div>
            <ul class="notice-lines">
              <li v-for="(line, lIdx) in item.lines" :key="lIdx" v-html="renderLine(line)"></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn-confirm" @click="emit('close')">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notice-body {
  max-height: 400px;
  overflow-y: auto;
  text-align: left !important;
  padding: 20px 24px !important;
}

.notice-body::-webkit-scrollbar {
  width: 6px;
}
.notice-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 10px;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notice-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notice-date {
  font-size: 11px;
  font-weight: bold;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 36px;
  text-align: center;
}

.notice-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-main);
}

.notice-lines {
  margin: 0;
  padding-left: 18px;
  list-style-type: disc;
}

.notice-lines li {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-main);
  margin-bottom: 4px;
}

.notice-lines li::marker {
  color: var(--primary);
  font-size: 12px;
}
</style>
