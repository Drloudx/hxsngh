#!/usr/bin/env node
/**
 * 弹窗关闭按钮（.modal-close-x）定位体检。
 *
 * 背景（真事故）：App.vue 的 <style> 是**非 scoped 全局样式**，里面曾有一条裸的
 * `.modal-close-x { position:absolute; right:12px; top:50%; transform:translateY(-50%) }`，
 * 本意只服务 `.import-modal-card`（数据管理弹窗，其 .modal-header 有 position:relative）。
 * 各页面自己的 scoped `.modal-close-x` 只声明颜色/字号/边框，**不声明 position**，
 * 于是这条绝对定位泄漏到全站；而页面的 `.modal-header`/`.modal-window` 都是 static，
 * 最近的定位祖先就成了 `.modal-overlay`（position:fixed）→ X 被摆到**视口**右侧垂直居中处，
 * 小弹窗上直接飞到卡片外面。
 *
 * 这个脚本真开弹窗量 bounding box，断言 X 的视觉中心落在卡片**头部区域**内。
 * --simulate-bug 会重新注入旧规则，用来复现/证明因果（修复后应为 OK，注入后应为 X）。
 *
 * 用法：
 *   node tools/verify-modal-close.mjs --serve dist      # 自起静态服务，量构建产物
 *   node tools/verify-modal-close.mjs http://127.0.0.1:5199   # 量已有服务
 *   追加 --simulate-bug 可反向复现旧 bug
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const SIMULATE_BUG = argv.includes('--simulate-bug')
const serveIdx = argv.indexOf('--serve')
const serveDir = serveIdx >= 0 ? resolve(argv[serveIdx + 1]) : null
const positional = argv.find(a => a.startsWith('http'))
const PORT = 5199
const BASE = positional || `http://127.0.0.1:${PORT}`

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.apk': 'application/vnd.android.package-archive',
}

let server = null
if (serveDir) {
  server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0])
      if (p === '/' || p === '') p = '/index.html'
      let file = join(serveDir, p)
      try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html') } catch { }
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' })
      res.end(body)
    } catch {
      // SPA 回退：找不到就给 index.html（hash 路由不需要，但保险）
      try {
        const body = await readFile(join(serveDir, 'index.html'))
        res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(body)
      } catch { res.writeHead(404); res.end('not found') }
    }
  })
  await new Promise(r => server.listen(PORT, '127.0.0.1', r))
  console.log(`静态服务: ${BASE}  <- ${serveDir}`)
}

// [路由, 用例名, 打开弹窗要点哪个元素, 弹窗标题关键字]
const CASES = [
  ['/talent', '天赋筛选 · 天赋来源', '.talent-source-wrapper', '来源'],
  ['/subskill', '支援筛选 · 天赋来源', '.talent-source-wrapper', '来源'],
  ['/unique', '技能筛选 · 天赋来源', '.talent-source-wrapper', '来源'],
]

// 旧规则原文：注入它即可复现修复前的表现
const OLD_RULE = `.modal-close-x{position:absolute;right:12px;top:50%;transform:translateY(-50%);padding:6px 8px;line-height:1;}`

const browser = await firefox.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
// 首启会弹隐私/公告/热更这类引导弹窗并遮住页面。它们不是本次被测对象，
// 直接掐掉相关网络请求 + 预置已读标记，让页面干净地呈现。
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('privacy_accepted', 'true')
    localStorage.setItem('saved_notice_version', '__seen__')
  } catch { }
  const orig = window.fetch
  window.fetch = (u, ...rest) => {
    const s = String(typeof u === 'string' ? u : (u && u.url) || '')
    if (s.includes('hotupdate') || s.includes('gitee.com')) return Promise.reject(new Error('blocked by verify'))
    return orig(u, ...rest)
  }
})
let bad = 0
const summary = []

for (const [route, name, opener, titleHint] of CASES) {
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector('#app', { timeout: 30000 })
    await page.waitForTimeout(3000)

    // 兜底：清掉仍然存在的引导弹窗，避免干扰
    await page.evaluate(() => {
      document.querySelectorAll('.custom-modal-overlay, .modal-overlay').forEach(n => n.remove())
    })

    if (SIMULATE_BUG) await page.addStyleTag({ content: OLD_RULE })

    const found = await page.evaluate(sel => !!document.querySelector(sel), opener)
    if (!found) { console.log(`[skip] ${name} —— 找不到触发器 ${opener}`); await page.close(); continue }
    // 程序化点击：绕过命中测试，免得被残留遮罩挡住
    await page.evaluate(sel => document.querySelector(sel).click(), opener)
    await page.waitForTimeout(800)

    const res = await page.evaluate((hint) => {
      // 按标题精确定位被测弹窗，而不是盲取"最后一个 overlay"
      const all = [...document.querySelectorAll('.modal-overlay, .custom-modal-overlay')]
      const ov = all.reverse().find(o => {
        const h = o.querySelector('.modal-header h3')
        return h && h.textContent.includes(hint)
      }) || all[0]
      if (!ov) return { err: '没有可见弹窗（标题未匹配到）' }
      const card = ov.querySelector('.modal-window, .custom-modal-card')
      const x = ov.querySelector('.modal-close-x')
      if (!card || !x) return { err: `card=${!!card} x=${!!x}` }
      const cs = getComputedStyle(x)
      const box = e => { const b = e.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) } }
      const hdr = ov.querySelector('.modal-header')
      return {
        title: (hdr?.querySelector('h3')?.textContent || '').trim(),
        card: box(card), x: box(x),
        pos: cs.position, top: cs.top, right: cs.right,
        headerDisplay: getComputedStyle(hdr).display,
        headerJustify: getComputedStyle(hdr).justifyContent,
      }
    }, titleHint)

    if (res.err) { console.log(`[!] ${name} —— ${res.err}`); await page.close(); continue }

    const cx = (res.x.l + res.x.r) / 2, cy = (res.x.t + res.x.b) / 2
    const insideCard = cx >= res.card.l && cx <= res.card.r && cy >= res.card.t && cy <= res.card.b
    const headerBand = res.card.t + Math.min(90, (res.card.b - res.card.t) * 0.45)
    const inHeader = cy <= headerBand
    const ok = insideCard && inHeader
    if (!ok) bad++
    summary.push({ name, ok })

    console.log(`${ok ? '[OK]' : '[X] '} ${name.padEnd(20)} position=${res.pos.padEnd(8)} top=${String(res.top).padEnd(7)} right=${res.right}`)
    console.log(`     标题="${res.title}"  header: display=${res.headerDisplay} justify=${res.headerJustify}`)
    console.log(`     card=[${res.card.l},${res.card.t} → ${res.card.r},${res.card.b}]  X=[${res.x.l},${res.x.t} → ${res.x.r},${res.x.b}]`)
    console.log(`     X 中心=(${cx.toFixed(1)},${cy.toFixed(1)})  在卡内=${insideCard}  在头部(cy≤${headerBand.toFixed(0)})=${inHeader}`)
  } catch (e) {
    console.log(`[!] ${name} —— 异常: ${String(e).slice(0, 90)}`)
  }
  await page.close()
}

await browser.close()
server?.close()

const mode = SIMULATE_BUG ? '注入旧规则（复现 bug）' : '当前代码（应为修复后）'
console.log(`\n===== ${mode}：异常 ${bad}/${summary.length} =====`)
// 修复后期望 bad=0；注入模式下期望 bad>0（说明脚本确实抓得住这个 bug）
process.exit(SIMULATE_BUG ? (bad > 0 ? 0 : 1) : (bad === 0 ? 0 : 1))
