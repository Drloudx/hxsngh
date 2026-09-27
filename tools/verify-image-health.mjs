#!/usr/bin/env node
/**
 * 真实页面图片健康检查：遍历主要图鉴页，统计"最终加载失败"的图片。
 *
 * 为什么需要：WebP 转换是"部分转换"，靠扩展名回退兜住。静态校验只能证明
 * 每个候选文件名有 .webp 或 .png，**证明不了运行时真的显示出来**。
 * 这个脚本在真实浏览器里渲染每个页面，等图片稳定后统计 naturalWidth === 0 的 img。
 *
 * 用法：node tools/verify-image-health.mjs [baseUrl]
 */
import { firefox } from 'file:///E:/Desktop/html/myrzg/vue-myrzg/node_modules/playwright-core/index.mjs'

const BASE = process.argv[2] || 'http://127.0.0.1:5174'

/** 每个页面的等待时间要够：懒加载图在滚动/延迟后才请求 */
const PAGES = [
  ['/recruit', '指定招募（首页）'],
  ['/role', '角色图鉴'],
  ['/equip', '装备筛选'],
  ['/relics', '心得图鉴'],
  ['/rune', '符文图鉴'],
  ['/lime', '莱姆图鉴'],
  ['/areablock', '地块图鉴'],
  ['/dungeon-relics', '秘境遗物'],
  ['/godstone', '神石图鉴'],
  ['/foretell', '预言图鉴'],
  ['/prefix', '怪物加护'],
  ['/gambleshop', '商人宝库'],
  ['/fruit-record', '大果记录'],
  ['/talent', '天赋筛选'],
  ['/subskill', '支援筛选'],
  ['/unique', '技能筛选'],
  ['/guide', '新人攻略'],
  ['/talent-manage', '天赋管理'],
]

const browser = await firefox.launch()
const ctx = await browser.newContext()
let totalBroken = 0
const rows = []

for (const [path, name] of PAGES) {
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForSelector('#app', { timeout: 30000 })
    await page.waitForTimeout(3500)

    // 滚动一遍触发懒加载
    await page.evaluate(async () => {
      const step = window.innerHeight
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 120))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(2500)

    const stat = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')]
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src'))
      return {
        total: imgs.length,
        broken: broken.length,
        brokenSrcs: broken.slice(0, 5).map(i => i.getAttribute('src')),
        swapped: imgs.filter(i => i.dataset.extSwapped === '1').length,
      }
    })
    totalBroken += stat.broken
    rows.push({ name, ...stat })
    const flag = stat.broken > 0 ? '[X]' : '[OK]'
    console.log(`${flag} ${name.padEnd(14)} 图片 ${String(stat.total).padStart(4)}  裂图 ${stat.broken}  扩展名回退 ${stat.swapped}`)
    if (stat.broken > 0) console.log(`      样例: ${stat.brokenSrcs.join(', ')}`)
  } catch (e) {
    console.log(`[!] ${name.padEnd(14)} 检查异常: ${String(e).slice(0, 80)}`)
  }
  await page.close()
}

await browser.close()
console.log(`\n===== 合计裂图: ${totalBroken} =====`)
process.exit(totalBroken === 0 ? 0 : 1)
