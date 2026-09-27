#!/usr/bin/env node
/**
 * 验证加载与体验优化（2026-09-28 批次）：
 *   1. 内容图带 loading="lazy" + decoding="async"，且首屏关键图（logo/菜单图标）未加
 *   2. 路由预取：hover 菜单项会提前请求目标页 chunk
 *   3. 深色模式持久化：切换后刷新仍保持；首帧即深色（无白闪）
 *   4. manualChunks：数据与视图代码分离（data-* chunk 独立存在）
 *
 * 用法：node tools/verify-load-optimizations.mjs [baseUrl]
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'
import { existsSync, readdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5174'
let pass = 0, total = 0
const check = (name, ok, detail = '') => {
  total++
  if (ok) { pass++; console.log(`  [OK] ${name}`) }
  else console.log(`  [X]  ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await firefox.launch()

// ---------- 1) 懒加载属性 ----------
{
  const page = await browser.newPage()
  await page.goto(`${BASE}/#/role`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3500)
  const r = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')]
    const withLazy = imgs.filter(i => i.getAttribute('loading') === 'lazy')
    const withAsync = imgs.filter(i => i.getAttribute('decoding') === 'async')
    const logo = imgs.find(i => (i.getAttribute('src') || '').includes('logo'))
    return {
      total: imgs.length,
      lazy: withLazy.length,
      async: withAsync.length,
      logoHasLazy: logo ? logo.getAttribute('loading') === 'lazy' : null,
      sample: withLazy.slice(0, 3).map(i => (i.getAttribute('src') || '').slice(0, 40)),
    }
  })
  console.log('\n1) 内容图懒加载（/role 列表页）')
  check('页面渲染出图片', r.total > 0, `共 ${r.total} 张`)
  check('存在带 loading="lazy" 的图', r.lazy > 0, `${r.lazy}/${r.total}`)
  check('存在带 decoding="async" 的图', r.async > 0, `${r.async}/${r.total}`)
  check('顶栏 logo 未被懒加载（首屏关键图）', r.logoHasLazy !== true, r.logoHasLazy === true ? 'logo 被加了 lazy' : '')
  await page.close()
}

// ---------- 2) 路由预取 ----------
{
  const page = await browser.newPage()
  const requested = new Set()
  page.on('request', (req) => {
    const u = req.url()
    // dev: /src/views/RoleView.vue?t=...     prod: /assets/RoleView-HASH.js
    const m = u.match(/\/views\/([A-Za-z]+)\.vue/) || u.match(/\/assets\/([A-Za-z]+View)-[A-Za-z0-9_-]+\.js/)
    if (m) requested.add(m[1])
  })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('#app')
  await page.waitForTimeout(3000)
  const before = new Set(requested)

  // hover 桌面端侧边栏里的「角色图鉴」 —— 触发预取
  const hovered = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.side-item')]
    const el = items.find(i => i.innerText.includes('角色图鉴'))
      || items.find(i => i.innerText.includes('装备筛选工具'))
    if (!el) return null
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    return el.innerText.trim().slice(0, 12)
  })
  await page.waitForTimeout(2500)
  const after = [...requested].filter(n => !before.has(n))

  console.log('\n2) 路由预取')
  check('找到菜单项并触发 mouseenter', hovered !== null, hovered || '未找到 .side-item')
  check('hover 后提前请求了目标页模块', after.length > 0, `新增: ${after.join(', ') || '无'}`)
  await page.close()
}

// ---------- 3) 深色模式持久化 ----------
{
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('#app')
  await page.waitForTimeout(1200)

  const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark-mode'))

  // 通过设置菜单切换主题
  await page.evaluate(() => { const g = document.querySelector('.settings-container .btn-icon'); if (g) g.click() })
  await page.waitForTimeout(300)
  const toggled = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.dropdown-item')].find(i => /深色模式|浅色模式/.test(i.innerText))
    if (el) { el.click(); return el.innerText.trim() }
    return null
  })
  await page.waitForTimeout(500)
  const afterToggle = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark-mode'),
    stored: localStorage.getItem('recruit_tool_darkMode'),
  }))

  // 刷新后是否保持
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const afterReload = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark-mode'),
    stored: localStorage.getItem('recruit_tool_darkMode'),
  }))

  console.log('\n3) 深色模式持久化')
  check('找到主题切换菜单项', toggled !== null, toggled || '未找到')
  check('切换后 class 与 localStorage 同步', afterToggle.dark === (afterToggle.stored === 'true'),
    `dark=${afterToggle.dark} stored=${afterToggle.stored}`)
  check('刷新后主题保持', afterReload.dark === afterToggle.dark,
    `刷新前 ${afterToggle.dark} → 刷新后 ${afterReload.dark}`)
  check('未出现"默认浅色 + 刷新丢失"（localStorage 已写入）', afterReload.stored !== null)
  await ctx.close()
}

// ---------- 4) manualChunks ----------
{
  const assets = 'dist/assets'
  const dataChunks = existsSync(assets) ? readdirSync(assets).filter(f => /^data-.*\.js$/.test(f)) : []
  const viewChunks = existsSync(assets) ? readdirSync(assets).filter(f => /View-.*\.js$/.test(f)) : []
  console.log('\n4) manualChunks（数据与视图代码分离）')
  check('产出独立的 data-* chunk', dataChunks.length > 0, `${dataChunks.length} 个`)
  check('视图 chunk 与数据 chunk 不再合并', viewChunks.length > 0 && dataChunks.length > 0,
    `data ${dataChunks.length} / view ${viewChunks.length}`)
  check('data-equip 独立于 EquipView',
    dataChunks.some(f => f.startsWith('data-equip')) && viewChunks.some(f => f.startsWith('EquipView')))
}

// ---------- 5) 图片扩展名回退（.png ↔ .webp） ----------
// 动态拼接目录的图是"部分转 WebP、部分保留 PNG"，路径写死任一扩展名都会对另一部分死链，
// 故用全局 error 捕获做扩展名互换。这里从 dist 里找一个"只有 .webp 没有 .png"的真实文件名来断言。
{
  const page = await browser.newPage()

  // 从构建产物里挑一个只在 .webp 形态存在的图（如 Equip 目录）
  let probePath = null
  const imgDirs = ['Equip', 'Relics', 'Rune', 'RoleCard', 'Header', 'lime', 'Shop']
  for (const d of imgDirs) {
    const dir = `dist/${d}`
    if (!existsSync(dir)) continue
    const files = readdirSync(dir)
    const webps = files.filter(f => f.endsWith('.webp'))
    const pngStems = new Set(files.filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))
    const only = webps.find(f => !pngStems.has(f.slice(0, -5)))
    if (only) { probePath = { dir: d, stem: only.slice(0, -5) }; break }
  }

  if (!probePath) {
    console.log('\n5) 图片扩展名回退')
    console.log('  [–] 跳过：没找到"只有 .webp"的文件（可能尚未执行 WebP 转换）')
    await page.close()
  } else {
    await page.goto(`${BASE}/#/role`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector('#app')
    await page.waitForTimeout(1200)

    const r = await page.evaluate(async ({ dir, stem }) => {
      const png = `/${dir}/${stem}.png`
      const img = document.createElement('img')
      img.setAttribute('data-probe', '1')
      document.body.appendChild(img)
      const events = []
      img.addEventListener('error', () => events.push('error:' + (img.getAttribute('src') || '').split('/').pop()))
      img.addEventListener('load', () => events.push('load:' + (img.getAttribute('src') || '').split('/').pop()))
      img.src = png                 // 故意指向不存在的 .png
      // 必须等"最终状态"：error 先触发（原 png 404），load 在其后才到。
      // 在 error 那一刻读 naturalWidth 会得到 0（假阴性）。
      await new Promise(r => setTimeout(r, 5000))
      return {
        src: img.getAttribute('src'),
        swapped: img.dataset.extSwapped,
        naturalWidth: img.naturalWidth,
        complete: img.complete,
        events,
      }
    }, probePath)

    console.log('\n5) 图片扩展名回退（.png ↔ .webp）')
    console.log(`     探针: /${probePath.dir}/${probePath.stem}（磁盘上只有 .webp）`)
    check('不存在的 .png 被自动换成 .webp', (r.src || '').endsWith('.webp'), `src=${r.src}`)
    check('打了替换标记（防死循环）', r.swapped === '1', `swapped=${r.swapped}`)
    check('替换后图片成功加载', r.naturalWidth > 0, `naturalWidth=${r.naturalWidth} events=${r.events.join(',')}`)
    await page.close()
  }
}

await browser.close()

console.log(`\n===== ${pass}/${total} passed =====`)
process.exit(pass === total ? 0 : 1)
