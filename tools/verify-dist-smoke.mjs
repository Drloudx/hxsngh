#!/usr/bin/env node
/**
 * 生产构建产物（dist/）冒烟测试 —— 模拟 WebView 实际加载的东西。
 *
 * 与 verify-opencv.mjs / verify-image-health.mjs 的区别：那两个跑在 dev server 上，
 * 可以 import /src/... 源码；这个只打 dist/，是**真正要进 APK 的产物**。
 *
 * 检查项：
 *   1. 页面能加载、Vue 挂载成功（不是白屏）
 *   2. window.cv 就绪 —— 证明 opencv.js + 外置 opencv_js.wasm 在产物里能配合工作
 *   3. opencv.js / opencv_js.wasm 都从网络取到（200）
 *   4. 无 JS 运行时错误
 *   5. 图片无裂图
 *
 * 用法：node tools/verify-dist-smoke.mjs http://127.0.0.1:5175
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'

const BASE = process.argv[2] || 'http://127.0.0.1:5175'
let pass = 0, total = 0
const check = (name, ok, detail = '') => {
  total++
  if (ok) { pass++; console.log(`  [OK] ${name}`) }
  else console.log(`  [X]  ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await firefox.launch()
const page = await browser.newPage()
const errors = []
const net = {}
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
page.on('response', (r) => {
  const u = r.url()
  for (const k of ['opencv.js', 'opencv_js.wasm']) {
    if (u.endsWith('/' + k)) net[k] = r.status()
  }
})

console.log(`产物冒烟: ${BASE}\n`)

await page.goto(`${BASE}/index.html#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })

// 1) Vue 挂载
let mounted = false
try {
  await page.waitForFunction(() => {
    const el = document.getElementById('app')
    return el && el.children.length > 0
  }, { timeout: 60000 })
  mounted = true
} catch { mounted = false }

// 2) window.cv 就绪（含 wasm 真正可用）
let cvReady = false
try {
  await page.waitForFunction(() => {
    try {
      if (!window.cv || typeof window.cv.Mat !== 'function') return false
      const m = new window.cv.Mat(2, 2, window.cv.CV_8UC1)
      m.delete()
      return true
    } catch { return false }
  }, { timeout: 90000 })
  cvReady = true
} catch { cvReady = false }

await page.waitForTimeout(2500)

console.log('1) 应用加载')
check('Vue 已挂载（非白屏）', mounted)

console.log('\n2) opencv 引擎（产物形态）')
check('window.cv 就绪且 Mat 可用', cvReady)
check('opencv.js 请求成功', net['opencv.js'] === 200, `status=${net['opencv.js']}`)
check('opencv_js.wasm 请求成功', net['opencv_js.wasm'] === 200, `status=${net['opencv_js.wasm']}`)

console.log('\n3) 运行时错误')
check('无未捕获 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '))

console.log('\n4) 图片健康')
const img = await page.evaluate(async () => {
  // 滚一遍触发懒加载
  const step = window.innerHeight
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y)
    await new Promise(r => setTimeout(r, 120))
  }
  window.scrollTo(0, 0)
  await new Promise(r => setTimeout(r, 2000))
  const imgs = [...document.querySelectorAll('img')]
  return {
    total: imgs.length,
    broken: imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length,
    brokenSrcs: imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).slice(0, 3).map(i => i.getAttribute('src')),
  }
})
check('无裂图', img.broken === 0, `${img.broken}/${img.total} 裂图: ${img.brokenSrcs.join(', ')}`)

await browser.close()
console.log(`\n===== ${pass}/${total} passed =====`)
process.exit(pass === total ? 0 : 1)
