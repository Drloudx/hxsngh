#!/usr/bin/env node
/**
 * /talent 下拉框裁剪 + 品质切换排序稳定性体检。
 *
 * 背景：`.tag-dropdown-menu` 是 `v-if` 按需渲染，无法预先统计项数，
 * 所以先用搜索框把候选缩到一小撮，再逐个点开数项数，挑一个多品质的卡片做测量。
 *
 * 查两件事：
 *  A. 把卡片从列表中部滑到列表底部，看下拉框被 `.talent-list`（overflow-y:auto）裁掉多少
 *  C. 切换品质后，整个列表顺序是否变化（= 被重新排序）
 *
 * 用法：node tools/verify-talent-dropdown.mjs --serve dist [查询词]
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const serveIdx = argv.indexOf('--serve')
const serveDir = serveIdx >= 0 ? resolve(argv[serveIdx + 1]) : null
const routeIdx = argv.indexOf('--route')
const ROUTE = routeIdx >= 0 ? argv[routeIdx + 1] : '/talent'
const rest = argv.filter((a, i) => !a.startsWith('-') && !a.startsWith('http') && i !== serveIdx + 1 && i !== routeIdx + 1 && i !== argv.indexOf('--w') + 1 && i !== argv.indexOf('--h') + 1)
const QUERY = rest[0] || '强'
const PORT = 5197
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
      try { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(await readFile(join(serveDir, 'index.html'))) }
      catch { res.writeHead(404); res.end('nf') }
    }
  })
  await new Promise(r => server.listen(PORT, '127.0.0.1', r))
  console.log(`静态服务: ${BASE}`)
}

const browser = await firefox.launch()
const VW = Number(argv[argv.indexOf('--w') + 1]) || 390
const VH = Number(argv[argv.indexOf('--h') + 1]) || 844
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 3 })
await ctx.addInitScript(() => {
  try { localStorage.setItem('privacy_accepted', 'true'); localStorage.setItem('saved_notice_version', '__seen__') } catch { }
  const o = window.fetch
  window.fetch = (u, ...r) => {
    const s = String(typeof u === 'string' ? u : (u && u.url) || '')
    return (s.includes('hotupdate') || s.includes('gitee.com')) ? Promise.reject(new Error('blocked')) : o(u, ...r)
  }
})

let bad = 0
const page = await ctx.newPage()
await page.goto(`${BASE}/#${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForSelector('#app', { timeout: 30000 })
await page.waitForTimeout(3500)
await page.evaluate(() => document.querySelectorAll('.custom-modal-overlay, .modal-overlay').forEach(n => n.remove()))

await page.fill('.talent-search-input, input[type="text"]', QUERY)
await page.waitForTimeout(1200)
console.log(`\n路由 ${ROUTE}　查询词「${QUERY}」`)

const target = await page.evaluate(async () => {
  const cards = [...document.querySelectorAll('.talent-card')]
  const out = []
  for (let i = 0; i < Math.min(cards.length, 10); i++) {
    const trig = cards[i].querySelector('.dropdown-trigger-btn')
    if (!trig) continue
    trig.click(); await new Promise(r => setTimeout(r, 60))
    const items = [...cards[i].querySelectorAll('.tag-dropdown-item')].map(x => x.textContent.trim())
    out.push({ i, name: cards[i].querySelector('.talent-name')?.textContent.trim(), n: items.length, items })
    trig.click(); await new Promise(r => setTimeout(r, 60))
  }
  return out
})
console.log('  各卡片的下拉项数：')
target.forEach(t => console.log(`    #${t.i} 「${t.name}」 ${t.n} 项  [${t.items.join(' | ')}]`))
const pick = target.find(t => t.n >= 3) || target.find(t => t.n >= 2)
if (!pick) { console.log('\n没有多品质卡片，无法继续'); await browser.close(); server?.close(); process.exit(1) }
console.log(`\n  => 选中 #${pick.i}「${pick.name}」(${pick.n} 项)`)

// ---------- A. 滚动位置扫描 ----------
// 滚动容器在 /talent 是 .talent-list、在 /search 是更上层的 .app-content，
// 所以不写死类名：从卡片往上找第一个"真的能滚"的祖先。
const scan = await page.evaluate(async (idx) => {
  const findScroller = (el) => {
    let b = el.parentElement
    while (b && b !== document.body) {
      const cs = getComputedStyle(b)
      if (cs.overflowY !== 'visible' && b.scrollHeight > b.clientHeight + 1) return b
      b = b.parentElement
    }
    return null
  }
  // ★ 真正决定"裁不裁"的是最近一个 overflow != visible 的祖先，
  //   它即使不可滚动（内容没超出）也照样在盒子边界裁剪后代。
  const findClipper = (el) => {
    let b = el.parentElement
    while (b && b !== document.body) {
      const cs = getComputedStyle(b)
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') return b
      b = b.parentElement
    }
    return null
  }
  const card = document.querySelectorAll('.talent-card')[idx]
  const list = findScroller(card) || document.scrollingElement
  const clipper = findClipper(card)
  const trig = card.querySelector('.dropdown-trigger-btn')
  const out = []
  for (const anchor of [0.5, 0.7, 0.85, 0.95, 1.0]) {
    list.scrollTop = Math.max(0, card.offsetTop - list.clientHeight * anchor)
    await new Promise(r => setTimeout(r, 120))
    trig.click()
    await new Promise(r => setTimeout(r, 130))
    const menu = card.querySelector('.tag-dropdown-menu')
    if (!menu) { out.push({ anchor, err: '没打开' }); continue }
    const cb = card.getBoundingClientRect()
    const mb = menu.getBoundingClientRect()
    const cs = getComputedStyle(menu)
    const clipBottom = clipper ? clipper.getBoundingClientRect().bottom : window.innerHeight
    out.push({
      anchor, clipper: clipper ? (clipper.className || clipper.tagName) : '(视口)',
      cardBottom: +cb.bottom.toFixed(1), clipBottom: +clipBottom.toFixed(1),
      menuTop: +mb.top.toFixed(1), menuBottom: +mb.bottom.toFixed(1),
      flipped: menu.classList.contains('drop-up') || cs.bottom === '100%',
      clipped: +Math.max(0, mb.bottom - clipBottom).toFixed(1),
    })
    trig.click()
    await new Promise(r => setTimeout(r, 130))
  }
  return out
}, pick.i)

console.log('\n================ A. 下拉框是否被裁剪祖先切掉 ================')
for (const s of scan) {
  if (s.err) { console.log(`  卡片贴 ${(s.anchor * 100).toFixed(0)}%: ${s.err}`); continue }
  const flag = s.clipped > 0.5 ? `<<< 裁掉 ${s.clipped}px` : '完整'
  console.log(`  卡片贴 ${(s.anchor * 100).toFixed(0).padStart(3)}% 处:  裁剪层=${String(s.clipper).slice(0, 16).padEnd(16)} card底=${String(s.cardBottom).padStart(6)}  裁剪底=${String(s.clipBottom).padStart(6)}  menu=[${s.menuTop} -> ${s.menuBottom}]  翻转=${s.flipped ? '是' : '否'}  ${flag}`)
}
const okScan = scan.filter(s => !s.err)
const reachable = okScan.filter(s => s.cardBottom <= s.clipBottom + 1)
const worst = reachable.length ? Math.max(...reachable.map(s => s.clipped)) : 0
console.log(`  => 卡片仍在可视区内时的最坏裁剪: ${worst}px`)
if (worst > 0.5) bad++

// 截一张"卡片停在容器底部"的图，作为可复核证据
await page.evaluate((idx) => {
  const findScroller = (el) => {
    let b = el.parentElement
    while (b && b !== document.body) {
      const cs = getComputedStyle(b)
      if (cs.overflowY !== 'visible' && b.scrollHeight > b.clientHeight + 1) return b
      b = b.parentElement
    }
    return null
  }
  const card = document.querySelectorAll('.talent-card')[idx]
  const list = findScroller(card)
  if (list) list.scrollTop = Math.max(0, card.offsetTop - list.clientHeight * 0.95)
  card.querySelector('.dropdown-trigger-btn').click()
}, pick.i)
await page.waitForTimeout(400)
await mkdir(join(workspace, '.probe-shots'), { recursive: true }).catch(() => { })
await page.screenshot({ path: join(workspace, '.probe-shots', `dropdown-bottom${ROUTE.replace(/\//g, '_')}.png`) })

// 截一张"来源弹窗里角色行有没有头像"的图
const srcBtn = await page.$('.talent-source-wrapper')
if (srcBtn) {
  await page.evaluate(() => document.querySelectorAll('.talent-card .dropdown-trigger-btn').forEach(b => { if (b.closest('.talent-card').querySelector('.tag-dropdown-menu')) b.click() }))
  await srcBtn.click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(workspace, '.probe-shots', `source-modal${ROUTE.replace(/\//g, '_')}.png`) })
  const av = await page.evaluate(() => {
    const card = document.querySelector('.matched-hero-card')
    if (!card) return { err: '弹窗内没有 .matched-hero-card' }
    const img = card.querySelector('img')
    const r = e => { const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
    return {
      hasImage: !!img,
      src: img ? img.getAttribute('src') : null,
      naturalW: img ? img.naturalWidth : 0,
      box: img ? r(img) : null,
      name: card.querySelector('.hero-name-span')?.textContent.trim(),
      cardH: r(card).h,
    }
  })
  console.log('\n================ B. 来源弹窗角色行头像 ================')
  if (av.err) { console.log('  ' + av.err); bad++ }
  else {
    const ok = av.hasImage && av.box && av.box.w > 20 && av.box.h > 20 && av.naturalW > 0
    if (!ok) bad++
    console.log(`  ${ok ? '[OK]' : '[X]'} 「${av.name}」 头像=${av.hasImage ? `${av.box.w}x${av.box.h}` : '无'}  naturalWidth=${av.naturalW}  src=${av.src}`)
    console.log(`       行高=${av.cardH}px（加头像前约 40px）`)
  }
  await page.keyboard.press('Escape').catch(() => { })
  await page.evaluate(() => {
    const btn = document.querySelector('.modal-overlay .modal-close-x')
    if (btn) btn.click()
  })
  await page.waitForTimeout(300)
}

// ---------- D. 层叠顺序：下拉框必须真的画在下一张卡片之上 ----------
// 必须用**真实鼠标悬停**打开：`.talent-card:hover` 带 transform，会创建层叠上下文，
// 而程序化 element.click() 不触发 :hover —— 那正是上一轮漏掉这个 bug 的原因。
console.log('\n================ D. 下拉框是否被下一张卡片盖住 ================')
// A 段截图时留了一个展开的下拉框，先全部收起，否则下面的点击会把它关掉
await page.evaluate(() => {
  document.querySelectorAll('.talent-card').forEach(c => {
    if (c.querySelector('.tag-dropdown-menu')) c.querySelector('.dropdown-trigger-btn').click()
  })
})
await page.waitForTimeout(250)

const stackIdx = await page.evaluate((idx) => {
  const cards = [...document.querySelectorAll('.talent-card')]
  for (let k = idx; k >= 0; k--) {
    const c = cards[k]
    if (c && c.nextElementSibling && c.querySelector('.dropdown-trigger-btn')) return k
  }
  return idx
}, pick.i)

// 把目标卡片滚到可视区中部，保证触发器真的可点
await page.evaluate((idx) => {
  const card = document.querySelectorAll('.talent-card')[idx]
  const findScroller = (el) => {
    let b = el.parentElement
    while (b && b !== document.body) {
      const cs = getComputedStyle(b)
      if (cs.overflowY !== 'visible' && b.scrollHeight > b.clientHeight + 1) return b
      b = b.parentElement
    }
    return null
  }
  const list = findScroller(card)
  if (list) list.scrollTop = Math.max(0, card.offsetTop - list.clientHeight * 0.4)
  card.scrollIntoView({ block: 'center' })
}, stackIdx)
await page.waitForTimeout(350)

const triggerBox = await page.evaluate((idx) => {
  const card = document.querySelectorAll('.talent-card')[idx]
  const t = card.querySelector('.dropdown-trigger-btn')
  const b = t.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
}, stackIdx)

await page.mouse.move(triggerBox.x, triggerBox.y)   // 真实悬停 → 触发 :hover
await page.waitForTimeout(180)
await page.mouse.click(triggerBox.x, triggerBox.y)
await page.waitForTimeout(400)
// 菜单没开就再点一次（可能刚好把残留的收起了）
if (!(await page.evaluate((idx) => !!document.querySelectorAll('.talent-card')[idx].querySelector('.tag-dropdown-menu'), stackIdx))) {
  await page.mouse.click(triggerBox.x, triggerBox.y)
  await page.waitForTimeout(400)
}
// 鼠标停在下拉框上，保持 :hover 状态
const anchor = await page.evaluate((idx) => {
  const card = document.querySelectorAll('.talent-card')[idx]
  const m = card.querySelector('.tag-dropdown-menu')
  if (!m) return null
  const b = m.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
}, stackIdx)
if (anchor) { await page.mouse.move(anchor.x, anchor.y); await page.waitForTimeout(220) }

const stack = await page.evaluate((idx) => {
  const card = document.querySelectorAll('.talent-card')[idx]
  const menu = card.querySelector('.tag-dropdown-menu')
  if (!menu) return { err: '菜单没打开' }
  const items = [...menu.querySelectorAll('.tag-dropdown-item')]
  const last = items[items.length - 1]
  const lb = last.getBoundingClientRect()
  const cx = lb.left + lb.width / 2, cy = lb.top + lb.height / 2
  const top = document.elementFromPoint(cx, cy)

  const cardCS = getComputedStyle(card)
  const next = card.nextElementSibling
  const nextCS = next ? getComputedStyle(next) : null
  const menuCS = getComputedStyle(menu)
  const mb = menu.getBoundingClientRect()
  const nb = next ? next.getBoundingClientRect() : null
  // 只有下拉框真的伸进下一张卡片时，层叠顺序才有意义
  const overlap = nb ? Math.max(0, Math.min(mb.bottom, nb.bottom) - Math.max(mb.top, nb.top)) : 0
  // 再在下拉框与下一张卡片的**重叠区**里取一点复核
  const probeY = nb ? Math.min(mb.bottom, nb.bottom) - 2 : cy
  const overlapTop = document.elementFromPoint(cx, probeY)

  const chain = []
  let e = top
  while (e && e !== document.body) { chain.push(e.className || e.tagName); e = e.parentElement }

  return {
    point: { cx: +cx.toFixed(1), cy: +cy.toFixed(1) },
    probeY: +probeY.toFixed(1),
    lastText: last.textContent.trim(),
    topmost: top ? (top.className || top.tagName) : null,
    topmostIsInMenu: !!(top && top.closest('.tag-dropdown-menu')),
    overlapTopmost: overlapTop ? (overlapTop.className || overlapTop.tagName) : null,
    overlapIsInMenu: !!(overlapTop && overlapTop.closest('.tag-dropdown-menu')),
    menuBottom: +mb.bottom.toFixed(1),
    nextTop: nb ? +nb.top.toFixed(1) : null,
    overlap: +overlap.toFixed(1),
    chain: chain.slice(0, 6),
    cardTransform: cardCS.transform, cardPosition: cardCS.position, cardZ: cardCS.zIndex,
    menuZ: menuCS.zIndex, menuPos: menuCS.position,
    nextTransform: nextCS ? nextCS.transform : null,
    nextPosition: nextCS ? nextCS.position : null,
    nextZ: nextCS ? nextCS.zIndex : null,
  }
}, stackIdx)

if (stack.err) { console.log('  ' + stack.err); bad++ }
else if (stack.overlap <= 0.5) {
  console.log(`  [skip] 下拉框未伸入下一张卡片（menu 底 ${stack.menuBottom} < 下一张卡顶 ${stack.nextTop}），本次不判定层叠`)
}else {
  const ok = stack.topmostIsInMenu && stack.overlapIsInMenu
  if (!ok) bad++
  console.log(`  ${ok ? '[OK]' : '[X]'} 下拉框与下一张卡片重叠 ${stack.overlap}px（menu 底 ${stack.menuBottom} > 下一张卡顶 ${stack.nextTop}）`)
  console.log(`       最后一项中心 (${stack.point.cx},${stack.point.cy}) 最上层 = ${stack.topmost}`)
  console.log(`       重叠区内 (${stack.point.cx},${stack.probeY}) 最上层 = ${stack.overlapTopmost}`)
  if (!ok) console.log(`       命中链路: ${stack.chain.join('  <  ')}`)
  console.log(`       卡片: position=${stack.cardPosition} transform=${stack.cardTransform} z-index=${stack.cardZ}`)
  console.log(`       菜单: position=${stack.menuPos} z-index=${stack.menuZ}`)
  console.log(`       下一张卡片: position=${stack.nextPosition} transform=${stack.nextTransform} z-index=${stack.nextZ}`)
  // 留一张"下拉框压在下一张卡片上"的图作为可复核证据
  await page.screenshot({
    path: join(workspace, '.probe-shots', `stack${ROUTE.replace(/\//g, '_')}_${VW}x${VH}.png`),
    clip: {
      x: Math.max(0, stack.point.cx - 190), y: Math.max(0, Math.min(stack.point.cy, stack.nextTop) - 130),
      width: 380, height: 300,
    },
  })
}

// ---------- C. 排序稳定性 ----------
console.log('\n================ C. 切换品质后的排序稳定性 ================')
await page.evaluate((idx) => {
  const findScroller = (el) => {
    let b = el.parentElement
    while (b && b !== document.body) {
      const cs = getComputedStyle(b)
      if (cs.overflowY !== 'visible' && b.scrollHeight > b.clientHeight + 1) return b
      b = b.parentElement
    }
    return null
  }
  const card = document.querySelectorAll('.talent-card')[idx]
  const list = findScroller(card)
  if (list) list.scrollTop = Math.max(0, card.offsetTop - list.clientHeight + 120)
  if (card.querySelector('.tag-dropdown-menu')) card.querySelector('.dropdown-trigger-btn').click()
}, pick.i)
await page.waitForTimeout(300)

const orderBefore = await page.evaluate(() => [...document.querySelectorAll('.talent-card')].map(c => c.querySelector('.talent-name')?.textContent.trim()))
console.log(`  切换前共 ${orderBefore.length} 张；「${pick.name}」序号 ${orderBefore.indexOf(pick.name)}`)

const sw = await page.evaluate(async (idx) => {
  const card = document.querySelectorAll('.talent-card')[idx]
  card.querySelector('.dropdown-trigger-btn').click()
  await new Promise(r => setTimeout(r, 150))
  const items = [...card.querySelectorAll('.tag-dropdown-item')]
  if (items.length < 2) return { err: '不足 2 项' }
  const from = items[0].textContent.trim(), to = items[1].textContent.trim()
  items[1].click()
  return { from, to }
}, pick.i)
await page.waitForTimeout(600)

if (sw.err) console.log('  ' + sw.err)
else {
  const orderAfter = await page.evaluate(() => [...document.querySelectorAll('.talent-card')].map(c => c.querySelector('.talent-name')?.textContent.trim()))
  console.log(`  已把「${pick.name}」从 #0(${sw.from}) 切到 #1(${sw.to})`)
  const same = JSON.stringify(orderBefore) === JSON.stringify(orderAfter)
  if (!same) {
    bad++
    console.log(`  [X] 列表顺序变了（「${pick.name}」序号 ${orderBefore.indexOf(pick.name)} -> ${orderAfter.indexOf(pick.name)}）：`)
    for (let i = 0; i < Math.max(orderBefore.length, orderAfter.length); i++)
      if (orderBefore[i] !== orderAfter[i]) console.log(`       #${i}: ${orderBefore[i]}  ->  ${orderAfter[i]}`)
  } else {
    console.log('  [OK] 列表顺序未变')
  }
}

await browser.close(); server?.close()
console.log(`\n===== 异常项: ${bad} =====`)
process.exit(bad === 0 ? 0 : 1)
