import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * 数据 chunk 分组。
 *
 * 为什么需要：`src/assets/*.json` 由各视图 `import`，默认会被打进**对应视图的 chunk**。
 * 于是「`Equip.json`(1.23MB) + `EquipView` 代码」共用一个文件 —— 改一行页面代码，
 * 用户就要重下 1.23MB 数据；反之数据更新也会让页面代码失效。
 *
 * 拆开后：数据 chunk 与代码 chunk 各自独立缓存，热更增量只下真正变的那部分。
 *
 * 分组策略：大表各自独立（它们通常整体一起读、一起用），小表合并成一个
 * `data-small`，避免碎成几十个小请求。
 */
const DATA_GROUPS = {
  'data-equip': ['./src/assets/Equip.json'],
  'data-bond': ['./src/assets/Bond.json'],
  'data-talent': ['./src/assets/Talent.json'],
  'data-subskill': ['./src/assets/Sub_Skill.json'],
  'data-unique': ['./src/assets/Unique.json'],
  'data-areaspot': ['./src/assets/Area_Spot.json'],
  'data-roles': ['./src/assets/Role.json', './src/assets/Basic_Attr.json'],
  // 下面几张各自被不同页面单独引用，拆开可避免"只看心得却要下概率模拟结果"
  'data-simulation': ['./src/assets/simulation_exact_results.json'],
  'data-prefix': ['./src/assets/Prefix.json'],
  'data-relics': ['./src/assets/Relics.json'],
  'data-rune': ['./src/assets/Rune.json'],
  'data-battleevent': ['./src/assets/Battle_Event.json'],
}
// 其余较小的 assets/*.json 统一进 data-small（十几张，合计约 200KB 原始）
const SMALL_DATA_PREFIX = './src/assets/'

const dataChunkRules = [
  ...Object.entries(DATA_GROUPS).map(([name, files]) => ({ name, files })),
  { name: 'data-small', files: null },
]

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    // 保留传统 max-width/min-width 媒体查询，兼容旧版 Android System WebView。
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/src/assets/')) return
          // 统一成正斜杠，兼容 Windows 路径
          const norm = id.replace(/\\/g, '/')
          for (const rule of dataChunkRules) {
            if (rule.files && rule.files.some((f) => norm.includes(f.replace('./', '/')))) {
              return rule.name
            }
          }
          if (norm.includes(SMALL_DATA_PREFIX.replace('./', '/'))) return 'data-small'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
