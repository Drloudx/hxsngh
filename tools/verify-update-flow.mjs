#!/usr/bin/env node
/**
 * 验证热更新/更新检查的行为修复 —— 通过拦截网络，让**真实 app** 进入各种状态。
 *
 * 覆盖：
 *   1. 按版本忽略：静默检查受控、手动检查不受控
 *   2. 手动检查更新时，APK 已最新也会检测热更（不再谎报"已是最新版本"）
 *   3. 热更弹窗为强制更新：没有「稍后」、遮罩点击关不掉
 *   4. 启动时序：热更清单请求及时发起（旧版有 1.5s 人为延时）
 *
 * 用法：node tools/verify-update-flow.mjs [baseUrl]
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'

const BASE = process.argv[2] || 'http://127.0.0.1:5174'
let pass = 0, total = 0
const check = (name, ok, detail = '') => {
  total++
  if (ok) { pass++; console.log(`  [OK] ${name}`) }
  else console.log(`  [X]  ${name}${detail ? '  — ' + detail : ''}`)
}

// 热更版本必须与本地**同 base**（前三段一致），否则会被判定为跨 base、需要 APK 更新，
// 走的是另一条（正确的）分支。本地基准是 1.0.20.2，所以用 1.0.20.3。
// packageSize 必须由发布方写进 hotupdate.json —— 靠 HEAD 探测拿不到（CORS 未暴露 Content-Length）。
const HOT_PACKAGE = { version: '1.0.20.3', downloadUrl: 'https://gitee.com/x/y/raw/master/dist.zip', totalParts: 1, body: '测试热更说明', packageSize: 11313416 }

/** 起一个页面，并把 Gitee 接口都打桩 */
async function newPage(browser, { apkRelease = 'v1.0.20', hotUpdate = null, storage = {} } = {}) {
  const page = await browser.newPage()
  const seen = { hotManifest: null }

  await page.addInitScript((st) => {
    document.documentElement.setAttribute('data-app-shell', 'true')
    // 让 app 认为本地已生效版本是 1.0.20.2（避免 checkHotUpdate 里的版本重置逻辑改写）
    localStorage.setItem('local_web_version', '1.0.20.2')
    localStorage.setItem('hotupdate_version', '1.0.20.2')
    localStorage.setItem('privacy_accepted', 'true')
    localStorage.setItem('apk_cached_version', '1.0.20')
    for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v)
  }, storage)

  await page.route('**/hotupdate.json*', (route) => {
    seen.hotManifest = Date.now()
    if (!hotUpdate) return route.fulfill({ status: 404, body: 'not found' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hotUpdate) })
  })
  await page.route('**/api/v5/repos/**/releases/latest', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ tag_name: apkRelease, body: '测试版本说明', assets: [{ name: 'app.apk', browser_download_url: 'https://gitee.com/x/y/releases/download/v1/app.apk', size: 1024 * 1024 }] }),
    }))
  await page.route('**/probe**', (route) => route.fulfill({ status: 200, headers: { 'content-length': '1048576' }, body: '' }))

  return { page, seen }
}

const browser = await firefox.launch()

// ---------- 1) 按版本忽略语义（纯逻辑） ----------
{
  const { page } = await newPage(browser, {})
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('#app')
  const r = await page.evaluate(async () => {
    const v = await import('/src/utils/version.js')
    v.setSkipUpdateVersion('v1.0.21')
    return {
      same: v.isUpdateSkippedThisVersion('v1.0.21'),
      lower: v.isUpdateSkippedThisVersion('v1.0.20'),
      newer: v.isUpdateSkippedThisVersion('v1.0.22'),
      hasOldApi: typeof v.setSkipUpdateDate === 'function',   // 兼容保留，但不应再被调用
    }
  })
  console.log('\n1) 「按版本忽略」语义')
  check('忽略 v1.0.21 → 不再弹', r.same === true)
  check('更低的 v1.0.20 → 也不弹', r.lower === true)
  check('更高的 v1.0.22 → 仍会弹', r.newer === false)
  await page.close()
}

// ---------- 2) 静默检查：已忽略的 APK 版本不再打扰，但仍会去查热更 ----------
{
  const { page, seen } = await newPage(browser, {
    apkRelease: 'v1.0.21',
    storage: { update_skip_version: 'v1.0.21' },   // 用户已忽略该版本
  })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(7000)
  const state = await page.evaluate(() => ({
    updateModal: !!document.querySelector('.update-modal-card'),
    hotModal: !!document.querySelector('.hotupdate-body'),
  }))
  console.log('\n2) 静默检查（用户已忽略 v1.0.21）')
  check('APK 更新弹窗不再出现', state.updateModal === false)
  check('热更清单仍被查询（未被 APK 忽略开关连带静默）', seen.hotManifest !== null)
  await page.close()
}

// ---------- 3) 手动检查：APK 最新但有热更 → 必须提示热更，不能谎报"最新版本" ----------
{
  const { page } = await newPage(browser, { apkRelease: 'v1.0.20', hotUpdate: HOT_PACKAGE })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('#app')
  await page.evaluate(async () => {
    const app = document.querySelector('#app').__vue_app__
    // 通过设置菜单的「检测更新」路径不方便，直接调模块函数
    const m = await import('/src/App.vue')
    return !!m
  }).catch(() => {})
  // 点设置 → 检测更新
  const clicked = await page.evaluate(() => {
    // 设置按钮是 .btn-icon[title="设置"]；菜单项在 .settings-dropdown 里
    const gear = document.querySelector('.settings-container .btn-icon') || document.querySelector('.btn-icon[title="设置"]')
    if (gear) gear.click()
    return !!gear
  })
  await page.waitForTimeout(400)
  const clickedItem = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.dropdown-item')]
    const el = items.find(i => i.innerText.includes('检测更新'))
    if (el) { el.click(); return true }
    return false
  })
  await page.waitForTimeout(4000)
  const state = await page.evaluate(() => {
    const t = document.body.innerText
    return {
      hotModal: !!document.querySelector('.hotupdate-body'),
      saysLatest: t.includes('当前已是最新版本'),
    }
  })
  console.log('\n3) 手动检查更新（APK 最新 + 有热更）')
  check('找到并点击了设置按钮', clicked === true)
  check('找到并点击了「检测更新」', clickedItem === true)
  check('弹出了热更弹窗', state.hotModal === true)
  check('**没有**谎报「当前已是最新版本」', state.saysLatest === false)
  await page.close()
}

// ---------- 4) 热更弹窗强制更新 + 遮罩不可关 ----------
{
  const { page } = await newPage(browser, { apkRelease: 'v1.0.20', hotUpdate: HOT_PACKAGE })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(6000)
  const probe = await page.evaluate(() => {
    const body = document.querySelector('.hotupdate-body')
    if (!body) return { found: false }
    const card = body.closest('.custom-modal-card')
    const overlay = card ? card.parentElement : null
    const buttons = [...(card ? card.querySelectorAll('button') : [])].map(b => b.innerText.trim())
    const text = card ? card.innerText : ''
    // 尝试点遮罩
    if (overlay) overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return {
      found: true, buttons, text,
      stillOpen: !!document.querySelector('.hotupdate-body'),
      overlayHasClass: overlay ? overlay.classList.contains('custom-modal-overlay') : false,
    }
  })
  console.log('\n4) 热更弹窗（强制更新）')
  check('弹窗自动出现', probe.found === true)
  check('有「立即更新」', (probe.buttons || []).some(t => t.includes('立即更新')))
  check('**没有**「稍后」按钮', !(probe.buttons || []).some(t => t.includes('稍后')), `按钮: ${(probe.buttons || []).join(' / ')}`)
  check('显示"包含最新数据与图片资源"说明', (probe.text || '').includes('包含最新数据与图片资源'))
  check('点遮罩关不掉', probe.stillOpen === true)
  check('遮罩用 custom-modal-overlay（安卓返回键白名单）', probe.overlayHasClass === true)
  await page.close()
}

// ---------- 5) 启动时序 ----------
{
  const { page, seen } = await newPage(browser, { apkRelease: 'v1.0.20', hotUpdate: HOT_PACKAGE })
  const t0 = Date.now()
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  // seen.hotManifest 是 route 回调时间，转成相对 t0
  await page.waitForTimeout(5000)
  const elapsed = seen.hotManifest ? seen.hotManifest - t0 : null
  console.log('\n5) 启动时序')
  check('热更清单请求及时发起（旧版有 1.5s 人为延时）', elapsed !== null && elapsed < 3000, elapsed === null ? '未发起' : `${elapsed}ms`)
  await page.close()
}

// ---------- 6) 包体积显示（来自清单 packageSize，不依赖 CORS 探测） ----------
{
  const { page } = await newPage(browser, { apkRelease: 'v1.0.20', hotUpdate: HOT_PACKAGE })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(6000)
  const text = await page.evaluate(() => {
    const card = document.querySelector('.hotupdate-body')?.closest('.custom-modal-card')
    return card ? card.innerText : ''
  })
  console.log('\n6) 热更包体积')
  check('弹窗出现了体积信息', /热更新包\s*\d/.test(text), text.replace(/\n/g, ' | ').slice(0, 80))
  check('**不是**「大小未知」', !text.includes('大小未知'), text.includes('大小未知') ? '仍显示大小未知' : '')
  await page.close()
}

// ---------- 7) 手动检测：版本对比面板（本地/远端 × 包体/热更） ----------
{
  const { page } = await newPage(browser, { apkRelease: 'v1.0.20', hotUpdate: HOT_PACKAGE })
  await page.goto(`${BASE}/#/recruit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('#app')
  await page.evaluate(() => {
    const gear = document.querySelector('.settings-container .btn-icon')
    if (gear) gear.click()
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.dropdown-item')].find(i => i.innerText.includes('检测更新'))
    if (el) el.click()
  })
  await page.waitForTimeout(5000)
  const probe = await page.evaluate(() => {
    const grid = document.querySelector('.version-grid')
    const body = document.body.innerText
    return {
      hasGrid: !!grid,
      labels: grid ? [...grid.querySelectorAll('.version-grid-label')].map(e => e.innerText.trim()) : [],
      cells: grid ? [...grid.querySelectorAll('.version-grid-cell')].map(e => e.innerText.trim().replace(/\s+/g, ' ')) : [],
      hasHotUpdateBtn: [...document.querySelectorAll('button')].some(b => b.innerText.includes('更新热更')),
      bodyHasLocal: body.includes('本地版本'),
      bodyHasRemote: body.includes('远端版本'),
    }
  })
  console.log('\n7) 手动检测 → 版本对比面板')
  check('出现对比表格', probe.hasGrid === true)
  check('有「本地版本」「远端版本」表头', probe.bodyHasLocal && probe.bodyHasRemote)
  check('有「包体版本」「热更版本」两行', probe.labels.includes('包体版本') && probe.labels.includes('热更版本'), `标签: ${probe.labels.join('/')}`)
  check('展示四个版本值', probe.cells.length === 4, `单元格: ${probe.cells.join(' | ')}`)
  check('热更可更新时给出「更新热更」按钮', probe.hasHotUpdateBtn === true)
  await page.close()
}

await browser.close()
console.log(`\n===== ${pass}/${total} passed =====`)
process.exit(pass === total ? 0 : 1)
