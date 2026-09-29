#!/usr/bin/env node
/**
 * 头像健康度：不只查"裂图"，还要查"**全都退成同一张兜底图**"。
 *
 * 为什么需要：`verify-image-health.mjs` 统计 naturalWidth===0 的图 —— 但页面自己挂
 * `@error` 把 src 换成兜底图后，图片是**加载成功**的，只是**全站同一张**。
 * 这个 bug 在 2026-09-28 图片 WebP 化后出现（多数 `/Header/x.png` 只剩 `.webp`），
 * 却因为"没有裂图"而躲过了原有巡检。
 *
 * 用法：node tools/verify-avatar-health.mjs --serve dist
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const serveIdx = argv.indexOf('--serve')
const serveDir = serveIdx >= 0 ? resolve(argv[serveIdx + 1]) : null
const PORT = 5195
const BASE = argv.find(a => a.startsWith('http')) || `http://127.0.0.1:${PORT}`
const workspace = resolve('.')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2' }

let server = null
if (serveDir) {
  server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html'
      let f = join(serveDir, p)
      try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html') } catch { }
      const b = await readFile(f)
      res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(b)
    } catch {
      // ⚠️ 缺文件必须**真的返回 404**，不能回退成 index.html ——
      // 本项目是 hash 路由，不需要 SPA 回退；而回退会把图片 404 伪装成 200+HTML，
      // 让"404 监听"永远抓不到，测出来的结论就是假的。
      res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found')
    }
  })
  await new Promise(r => server.listen(PORT, '127.0.0.1', r))
  console.log(`静态服务: ${BASE}`)
}

// [路由, 描述]：这些页面会大量渲染 /Header/*.png 角色头像
const PAGES = [
  ['/subskill', '支援筛选'],
  ['/unique', '技能筛选'],
  ['/role', '角色图鉴'],
  ['/relics', '心得图鉴'],
]

const FALLBACKS = ['/Header/M00000.png', '/Header/M00000.webp', '/Relics/Mark.png', '/Skill/TB00001.png', '/Skill/TB00001.webp']

const browser = await firefox.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await ctx.addInitScript(() => {
  try { localStorage.setItem('privacy_accepted', 'true'); localStorage.setItem('saved_notice_version', '__seen__') } catch { }
  const o = window.fetch
  window.fetch = (u, ...r) => {
    const s = String(typeof u === 'string' ? u : (u && u.url) || '')
    return (s.includes('hotupdate') || s.includes('gitee.com')) ? Promise.reject(new Error('blocked')) : o(u, ...r)
  }
})

let bad = 0
await mkdir(join(workspace, '.probe-shots'), { recursive: true }).catch(() => { })

for (const [route, label] of PAGES) {
  const page = await ctx.newPage()
  try {
    // ★ 根因级判据：拦下所有 /Header/{id}.png 的 404。
    //   若该 id 的 .webp **存在**，则这次退兜底本是可避免的（全局换装被页面 @error 抢跑了）→ 记 bug。
    const missed404 = new Set()
    page.on('response', (res) => {
      const m = /\/Header\/([^/?#]+)\.png(?:\?|$)/.exec(res.url())
      if (m && res.status() === 404) missed404.add(m[1])
    })

    await page.goto(`${BASE}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector('#app', { timeout: 30000 })
    await page.waitForTimeout(4000)
    await page.evaluate(() => document.querySelectorAll('.custom-modal-overlay, .modal-overlay').forEach(n => n.remove()))
    await page.evaluate(async () => {
      const step = window.innerHeight
      for (let y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)) }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(2500)

    const stat = await page.evaluate((fb) => {
      const imgs = [...document.querySelectorAll('img')].filter(i => (i.getAttribute('src') || '').startsWith('/Header/'))
      const srcs = imgs.map(i => i.getAttribute('src'))
      const distinct = [...new Set(srcs)]
      return {
        total: imgs.length,
        distinct: distinct.length,
        sample: distinct.slice(0, 4),
        fellBack: srcs.filter(s => fb.includes(s)).length,
        broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
      }
    }, FALLBACKS)

    // 逐个 404 的 id：有没有 .webp 可救？（仅作信息 —— 404 本身是设计使然：
    // 模板统一写 .png，靠全局处理器换装。**判据看"最终有没有退兜底"**）
    const avoidable = [...missed404].filter(id =>
      existsSync(join(workspace, 'public', 'Header', `${id}.webp`)) ||
      existsSync(join(serveDir || join(workspace, 'dist'), 'Header', `${id}.webp`)),
    )
    // ★ 判据：头像不该退成兜底图。退了就说明全局换装被谁抢跑了。
    const ok = stat.fellBack === 0 && stat.broken === 0
    if (!ok) bad++
    console.log(`${ok ? '[OK]' : '[X] '} ${label.padEnd(10)} 头像 ${String(stat.total).padStart(4)} 张，去重 ${String(stat.distinct).padStart(3)}` +
      `  **退兜底 ${stat.fellBack}**  裂图 ${stat.broken}` +
      `  （.png 404 共 ${missed404.size} 次属正常，换装会救回；其中 .webp 存在的 ${avoidable.length} 个已全部救回）`)
    console.log(`     样例: ${stat.sample.join('  ')}`)
    if (!ok) {
      console.log(`     ⚠️ 退兜底说明有页面 @error 抢在全局换装前改了 src`)
      await page.screenshot({ path: join(workspace, '.probe-shots', `avatar${route.replace(/\//g, '_')}.png`) })
    }
  } catch (e) {
    console.log(`[!] ${label} 异常: ${String(e).slice(0, 90)}`)
  }
  await page.close()
}

await browser.close(); server?.close()
console.log(`\n===== 异常页面: ${bad}/${PAGES.length} =====`)
process.exit(bad === 0 ? 0 : 1)
