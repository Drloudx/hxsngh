#!/usr/bin/env node
/**
 * 验证 opencv.js 拆分 base64 wasm 后，本项目的图像识别链路仍然可用。
 *
 * 关键点：不看 opencv 是否「能跑」，而看**项目的 imageMatcher 是否真的能识别出标签**。
 * 做法：加载真实 app，等引擎预热（26 个模板全部转成灰度 Mat），
 *       再构造一张含真模板的截图喂给 imageMatcher.match()，断言识别结果。
 *
 * 用法：node tools/verify-opencv.mjs [baseUrl]     默认 http://127.0.0.1:5174
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'

const BASE = process.argv[2] || 'http://127.0.0.1:5174'

const browser = await firefox.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const wasmReq = []
page.on('response', (r) => { if (/opencv/i.test(r.url())) wasmReq.push(`${r.url().split('/').pop()} ${r.status()}`) })

console.log(`打开真实应用：${BASE}`)
await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })

// 等 imageMatcher 预热完成（应用 onMounted 里主动 init）
let initOk = false
try {
  await page.waitForFunction(() => window.__dshMatcherReady === true, { timeout: 90000 })
  initOk = true
} catch { /* 下面用备用判据 */ }

if (!initOk) {
  // 备用判据：直接调 init() 并等待
  initOk = await page.evaluate(async () => {
    try {
      const mod = await import('/src/utils/imageMatcher.js')
      await mod.imageMatcher.init()
      return mod.imageMatcher.isInitialized === true
    } catch (e) { console.error(e); return false }
  })
}

const state = await page.evaluate(async () => {
  try {
    const mod = await import('/src/utils/imageMatcher.js')
    const im = mod.imageMatcher
    return {
      initialized: im.isInitialized === true,
      templateCount: Object.keys(im.templateMats || {}).length,
      templateNames: Object.keys(im.templateMats || {}),
      hasCv: !!(window.cv && window.cv.Mat)
    }
  } catch (e) { return { error: String(e) } }
})

console.log(`\n1) window.cv 可用            : ${state.hasCv ? '✓' : '✗'}`)
console.log(`2) imageMatcher 已初始化     : ${state.initialized ? '✓' : '✗'}`)
console.log(`3) 已构建模板 Mat 数量       : ${state.templateCount ?? 0} / 26  ${state.templateCount === 26 ? '✓' : '✗'}`)
console.log(`4) opencv 相关请求           : ${wasmReq.join(' | ') || '(无)'}`)
console.log(`   .wasm 是否走网络          : ${wasmReq.some(r => r.includes('.wasm')) ? '✓ 是' : '✗ 否'}`)

// 真实识别：把某个真模板贴进一张「类截图」里，走完整 match() 流程
const matchTest = await page.evaluate(async () => {
  try {
    const mod = await import('/src/utils/imageMatcher.js')
    const im = mod.imageMatcher
    // 选一个模板，取出它在 800px 基准下的实际尺寸
    const name = im.templateMats['传说'] ? '传说' : Object.keys(im.templateMats)[0]
    const templ = im.templateMats[name]
    const tw = templ.cols, th = templ.rows

    // 造一张 800x1600 的"截图"：ROI 区域（x 20%~80%, y 35%~70%）内贴上模板
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 1600
    const g = canvas.getContext('2d')
    g.fillStyle = '#101820'; g.fillRect(0, 0, 800, 1600)
    // 模板是灰度 Mat，画到 canvas 需要转回图像
    const tmp = document.createElement('canvas')
    tmp.width = tw; tmp.height = th
    window.cv.imshow(tmp, templ)
    const roiX = Math.floor(800 * 0.5) - Math.floor(tw / 2)
    const roiY = Math.floor(1600 * 0.5) - Math.floor(th / 2)
    g.drawImage(tmp, roiX, roiY)

    const res = await im.match(canvas)
    return { name, tw, th, placedAt: [roiX, roiY], matched: res.matched }
  } catch (e) { return { error: String(e) } }
})

console.log(`\n5) 真实模板匹配（贴入模板「${matchTest.name}」后识别）:`)
if (matchTest.error) {
  console.log(`   ✗ 出错: ${matchTest.error}`)
} else {
  console.log(`   模板尺寸 ${matchTest.tw}x${matchTest.th}，贴入位置 (${matchTest.placedAt.join(', ')})`)
  console.log(`   识别结果: [${matchTest.matched.join(', ')}]`)
}

const pass = state.hasCv && state.initialized && state.templateCount === 26 &&
  wasmReq.some(r => r.includes('.wasm')) &&
  !matchTest.error && matchTest.matched.includes(matchTest.name)

if (errors.length) console.log(`\n页面错误:\n  ${errors.slice(0, 5).join('\n  ')}`)
await browser.close()
console.log(`\n===== 结论：${pass ? '✓ 拆分后识别链路正常（模板全就绪 + 真模板可被识别）' : '✗ 未通过，需检查'} =====`)
process.exit(pass ? 0 : 1)
