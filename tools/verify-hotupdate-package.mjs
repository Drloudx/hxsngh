#!/usr/bin/env node
/**
 * 热更包出厂体检：用**前端同一个库（fflate）+ 同一套判断**验 dist.zip 与 hotupdate.json。
 *
 * 为什么单独有这个脚本（2026-09-29 真实事故）：
 *   `pack-hotupdate.mjs` 原先用 `tar -a -c -f dist.zip -C staging .` 打包 ——
 *   bsdtar 会把 `.` 展开成 `./`，于是**每个条目都带 `./` 前缀**，`index.html` 变成 `./index.html`。
 *   而前端是 `unzipped['index.html']` **按精确键名**取 → 取不到 → 抛「热更新包缺少 index.html」，
 *   用户侧表现为「热更新 / 更新失败」，且**重试多少次都没用**。
 *
 *   更糟的是当时的校验把名字归一化了（`tar -tf` 后 `.replace(/^\.\//,'')` 再比对），
 *   于是脚本"自认为通过"，把问题放行到了线上。**校验必须与消费方同构，不能顺手做归一化。**
 *
 * 用法（项目根目录）：
 *   node tools/verify-hotupdate-package.mjs               # 验当前 dist.zip + hotupdate.json
 *   node tools/verify-hotupdate-package.mjs path/to.zip   # 验指定的包（配合同目录的清单）
 */
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { unzipSync } from 'fflate'

const ROOT = process.cwd()
const zipPath = process.argv[2] || 'dist.zip'
const manifestPath = 'hotupdate.json'

let bad = 0
const ok = (c, msg) => { console.log(`${c ? '[OK]' : '[X] '} ${msg}`); if (!c) bad++ }
const MB = 1024 * 1024

for (const f of [zipPath, manifestPath]) {
  if (!existsSync(f)) { console.error(`找不到 ${f}（请在项目根目录运行）`); process.exit(1) }
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const buf = new Uint8Array(readFileSync(zipPath))

console.log('=== 1. 清单校验（对应 hotupdate.js 的 validateManifest）===')
ok(/^v?\d+(?:\.\d+){1,3}$/.test(String(manifest.version)), `版本号格式: ${manifest.version}`)
let host = ''
try { const u = new URL(manifest.downloadUrl); host = u.hostname.toLowerCase(); ok(u.protocol === 'https:' && (host === 'gitee.com' || host.endsWith('.gitee.com')), `下载地址可信: ${host}`) }
catch { ok(false, `downloadUrl 不是合法 URL: ${manifest.downloadUrl}`) }
const totalParts = Number(manifest.totalParts ?? 1)
ok(Number.isSafeInteger(totalParts) && totalParts >= 1, `totalParts = ${totalParts}`)

console.log('\n=== 2. 体积与哈希 ===')
const size = statSync(zipPath).size
ok(Number(manifest.packageSize) === size, `${zipPath} ${size} 字节 == packageSize ${manifest.packageSize}`)
const md5 = createHash('md5').update(Buffer.from(buf)).digest('hex')
ok(md5 === manifest.md5, `md5 ${md5}${md5 === manifest.md5 ? '' : `  ≠ 清单 ${manifest.md5}`}`)

console.log('\n=== 3. 前端解压校验（applyHotUpdate 的严格复刻，勿加归一化）===')
const unzipped = unzipSync(buf)
const keys = Object.keys(unzipped)
console.log(`   解出 ${keys.length} 个条目`)

const prefixed = keys.filter(k => k.startsWith('./'))
ok(prefixed.length === 0, `无 "./" 前缀条目${prefixed.length ? `（实测 ${prefixed.length} 个，如 ${prefixed[0]}）→ 前端取不到 index.html` : ''}`)
ok('index.html' in unzipped, `unzipped['index.html'] 存在`)
const indexData = unzipped['index.html'] || unzipped['./index.html']
ok(!!indexData, 'index.html 内容可读出')
if (indexData) {
  const html = new TextDecoder('utf-8').decode(indexData)
  const m = html.match(/src="\.\/assets\/([^"]+)\.js"/)
  ok(!!m, `index.html 匹配到入口 JS${m ? ': ' + m[1] : ''}`)
  ok(m ? (`assets/${m[1]}.js` in unzipped) : false, '入口 JS 条目确实在包里')
}

console.log('\n=== 4. 排除项与垃圾 ===')
const leaks = keys.filter(k => /(^|\/)(opencv\.js|opencv_js\.wasm)$/.test(k) || k.endsWith('.apk'))
ok(leaks.length === 0, `未夹带 opencv 引擎 / APK${leaks.length ? ': ' + leaks.join(', ') : ''}`)
ok(!keys.some(k => k.toLowerCase().endsWith('.zip')), '包内无 .zip 垃圾')
if (existsSync('dist')) {
  const stray = readdirSync('dist', { withFileTypes: true }).filter(e => e.isFile() && e.name.toLowerCase().endsWith('.zip'))
  ok(stray.length === 0, `dist 根层无残留 .zip${stray.length ? ': ' + stray.map(e => e.name).join(', ') : ''}`)
}
const parts = readdirSync(ROOT).filter(f => /^dist\.zip\.\d{3}$/.test(f))
ok(parts.length === totalParts || totalParts === 1, `磁盘分卷数 ${parts.length} / totalParts ${totalParts}`)

console.log(`\n包体: ${size} 字节 = ${(size / MB).toFixed(2)} MB`)
console.log(`\n===== ${bad === 0 ? '通过 —— 可以上传' : `失败 ${bad} 项，不要上传`} =====`)
process.exit(bad ? 1 : 0)
