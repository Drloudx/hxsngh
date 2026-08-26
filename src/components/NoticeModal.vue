<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import notices from '../assets/notices.json'

const sortedNotices = computed(() => {
  const pinned = notices.filter(n => n.pinned)
  const normal = notices.filter(n => !n.pinned)
  return [...pinned, ...normal]
})

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const colorRules = [
  { pattern: /==(.+?)==/g, color: '#ef4444' },
  { pattern: /~~(.+?)~~/g, color: '#f97316' },
  { pattern: /##(.+?)##/g, color: '#22c55e' },
  { pattern: /{{(.+?)}}/g, color: '#3b82f6' },
  { pattern: /\[\[(.+?)\]\]/g, color: '#a855f7' },
  { pattern: /\(\\\((.+?)\\\)\)/g, color: '#ec4899' },
  { pattern: /<<(.+?)>>/g, color: '#64748b' },
  { pattern: /%%(.+?)%%/g, color: '#eab308' }
]

const anchorPattern = /<a\s+([^>]*?)>(.*?)<\/a>/gi

const getSafeLink = (attributes) => {
  const hrefMatch = String(attributes || '').match(/\bhref\s*=\s*(["'])(.*?)\1/i)
  if (!hrefMatch) return null

  const href = hrefMatch[2].trim()
  if (href.startsWith('/') && !href.startsWith('//')) {
    return {
      href,
      external: false,
      download: /\bdownload(?:\s|=|$)/i.test(attributes)
    }
  }

  try {
    const url = new URL(href)
    if (url.protocol !== 'https:') return null
    return { href: url.href, external: true, download: false }
  } catch {
    return null
  }
}

const parseNoticeLine = (value) => {
  const text = String(value || '')
  const segments = []
  let cursor = 0

  while (cursor < text.length) {
    let nextMatch = null
    let nextColor = ''
    let nextType = 'text'

    anchorPattern.lastIndex = cursor
    const anchorMatch = anchorPattern.exec(text)
    if (anchorMatch) {
      nextMatch = anchorMatch
      nextType = 'link'
    }

    for (const rule of colorRules) {
      rule.pattern.lastIndex = cursor
      const match = rule.pattern.exec(text)
      if (match && (!nextMatch || match.index < nextMatch.index)) {
        nextMatch = match
        nextColor = rule.color
        nextType = 'color'
      }
    }

    if (!nextMatch) {
      segments.push({ text: text.slice(cursor), color: '' })
      break
    }
    if (nextMatch.index > cursor) {
      segments.push({ text: text.slice(cursor, nextMatch.index), color: '' })
    }
    if (nextType === 'link') {
      const link = getSafeLink(nextMatch[1])
      segments.push({
        text: nextMatch[2].replace(/<[^>]*>/g, ''),
        color: '',
        link
      })
    } else {
      segments.push({ text: nextMatch[1], color: nextColor })
    }
    cursor = nextMatch.index + nextMatch[0].length
  }

  return segments.length ? segments : [{ text, color: '' }]
}
</script>

<template>
  <div v-if="show" class="custom-modal-overlay" @click.self="emit('close')">
    <div class="custom-modal-card">
      <div class="modal-header">
        <h3>公告</h3>
      </div>
      <div class="modal-body notice-body">
        <div class="notice-list">
          <div v-for="(item, idx) in sortedNotices" :key="idx" class="notice-item">
            <div class="notice-header">
              <span class="notice-date" :class="{
                'notice-pinned': item.pinned
              }">{{ item.pinned ?
                '置顶' : item.date
              }}</span>
              <span v-if="item.title" class="notice-title">{{ item.title }}</span>
            </div>
            <ul class="notice-lines">
              <li v-for="(line, lIdx) in item.lines" :key="lIdx">
                <template
                  v-for="(segment, sIdx) in parseNoticeLine(line)"
                  :key="`segment-${sIdx}`"
                >
                  <a
                    v-if="segment.link"
                    class="notice-link"
                    :href="segment.link.href"
                    :download="segment.link.download || undefined"
                    :target="segment.link.external ? '_blank' : undefined"
                    :rel="segment.link.external ? 'noopener noreferrer' : undefined"
                  >{{ segment.text }}</a>
                  <span
                    v-else
                    :style="segment.color ? { color: segment.color } : undefined"
                  >{{ segment.text }}</span>
                </template>
              </li>
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

.notice-pinned {
  background: rgba(249, 115, 22, 0.15) !important;
  color: #f97316 !important;
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

.notice-link {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
}
</style>
