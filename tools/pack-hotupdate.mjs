#!/usr/bin/env node
/**
 * 打包热更包：dist/ → dist.zip → 9MB 分卷
 *
 * 用法（项目根目录）：
 *   node tools/pack-hotupdate.mjs                 # 用现有 dist/
 *   node tools/pack-hotupdate.mjs --build         # 先 npm run build
 *   node tools/pack-hotupdate.mjs --out D:\out    # 指定输出目录
 *
 * 为什么必须脚本化：
 *   热更包必须排除 opencv 引擎与 APK。漏掉 opencv.js + opencv_js.wasm
 *   会让热更包凭空多出约 7.9 MB；漏掉 .apk 会多出约 24 MB。
 *   手工删（否则每次要手敲 Compress-Archive 并记得删文件）极易漏。
 *
 * 为什么不用 PowerShell：
 *   本机默认禁止执行 .ps1（和项目里 npm.ps1 同一个坑），Node 无此限制。
 *   压缩走 Windows 自带 bsdtar（tar.exe）, 它打出的 zip 是标准格式且能做 zip64。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const DIST = join(ROOT, 'dist')

const argv = process.argv.slice(2)
const DO_BUILD = argv.includes('--build')
const outIdx = argv.indexOf('--out')
const OUT_DIR = outIdx >= 0 && argv[outIdx + 1]
  ? (isAbsolute(argv[outIdx + 1]) ? argv[outIdx + 1] : join(ROOT, argv[outIdx + 1]))
  : ROOT
const CHUNK_MB = 9
const MB = 1024 * 1024

// 热更包排除名单：opencv 引擎随 APK 内置（必须与 opencv.js 成对），APK 是下载包
const EXCLUDE_NAMES = new Set(['opencv.js', 'opencv_js.wasm', 'opencv.js.base64.bak'])
const EXCLUDE_EXTS = new Set(['.apk'])

// dist **根层**的 .zip 一律排除，并明确告警。
// 真踩过：有人把整个 dist 压成 zip 放在 dist/ 里，若不排除，这坨 8.5 MB 会原样进热更包
// （包体几乎翻倍，且用户白下 8.5 MB 无用数据）。根层本来就只该有 index.html / opencv / apk 等。
// 只对根层生效 —— public/ 子目录里的 .zip 若是真资源仍照常打包。
const isStrayRootZip = (name, atRoot) => atRoot && extname(name).toLowerCase() === '.zip'

const fmt = (n) => (n / MB).toFixed(2) + ' MB'
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`${cmd} 退出码 ${r.status}`)
}

if (DO_BUILD) {
  console.log('== 构建 ==')
  const r = spawnSync('cmd', ['/c', 'npm', 'run', 'build'], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) throw new Error('构建失败，退出码 ' + r.status)
}

if (!existsSync(DIST)) throw new Error('找不到 dist/，请先 npm run build 或加 --build')

// ---------- 1. 预检：必须排除的文件是否真的存在（存在才说明 dist 正常） ----------
console.log('\n== 预检 dist ==')
const distFiles = readdirSync(DIST, { withFileTypes: true })
const present = []
const skipped = []
for (const e of distFiles) {
  if (e.isFile() && (EXCLUDE_NAMES.has(e.name) || EXCLUDE_EXTS.has(extname(e.name)))) {
    present.push(e.name)
    skipped.push(`  - ${e.name} (${fmt(statSync(join(DIST, e.name)).size)})`)
  }
}
console.log(`  需要排除且确实存在的: ${present.length ? '' : '(无)'}`)
skipped.forEach((s) => console.log(s))
if (!present.includes('opencv.js')) console.warn('  ⚠ 未在 dist 根层发现 opencv.js，dist 可能不完整')
if (present.some((n) => n.endsWith('.bak'))) console.warn('  ⚠ 发现 .bak 备份文件混进 dist，请检查 public/ 下是否有备份')
const strayZips = distFiles.filter((e) => e.isFile() && isStrayRootZip(e.name, true))
if (strayZips.length) {
  console.warn('  ⚠ dist 根层发现 .zip（不是要发布的资源，已自动排除）：')
  strayZips.forEach((e) => console.warn(`      - ${e.name} (${fmt(statSync(join(DIST, e.name)).size)})`))
  console.warn('    这类文件通常是"把 dist 整个压一份"留下的；下次构建会被 emptyOutDir 清掉。')
}
if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/index.html 不存在')

// ---------- 2. 组装待压缩目录（硬链接/拷贝可选，这里用拷贝保证干净） ----------
const staging = join(ROOT, '.hotupdate_staging')
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

// 递归复制，跳过排除项
const walk = (srcDir, dstDir, atRoot = false) => {
  for (const e of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, e.name)
    const dst = join(dstDir, e.name)
    if (e.isDirectory()) {
      mkdirSync(dst, { recursive: true })
      walk(src, dst, false)
    } else if (e.isFile()) {
      if (EXCLUDE_NAMES.has(e.name) || EXCLUDE_EXTS.has(extname(e.name))) continue
      if (isStrayRootZip(e.name, atRoot)) continue
      copyFileSync(src, dst)
    }
  }
}
walk(DIST, staging, true)

// 暂存目录可能 13 MB+；用 try/finally 保证任何失败路径都会清掉，
// 否则中断一次就在仓库根目录留下一坨垃圾。
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
const zipPath = join(OUT_DIR, 'dist.zip')
let zipSize = 0
let names = []
try {
  if (!existsSync(join(staging, 'index.html'))) throw new Error('暂存目录缺少 index.html（必须在 zip 根层）')

  // ---------- 3. 压缩 ----------
  if (existsSync(zipPath)) rmSync(zipPath, { force: true })

  console.log('\n== 压缩 ==')
  // ⚠️ 必须**逐个列出顶层条目**，绝不能写 `-C staging .`
  //    bsdtar 会把 `.` 展开成 `./`，于是包里每个条目都带 `./` 前缀，
  //    `index.html` 变成 `./index.html` —— 而前端是 `unzipped['index.html']` 精确取键，
  //    直接抛「热更新包缺少 index.html」（真实事故：2026-09-29 一次发版全量失败）。
  //    逐个列出后条目名就是 `index.html` / `assets/...`，与前端期望一致。
  const topEntries = readdirSync(staging)
  run('tar', ['-a', '-c', '-f', zipPath, '-C', staging, ...topEntries])
  zipSize = statSync(zipPath).size
  console.log(`  dist.zip = ${fmt(zipSize)}`)

  // ---------- 4. 校验：用**前端同一个库**按**精确键名**验，不做任何归一化 ----------
  // 之前的校验是 `tar -tf` 后 `.replace(/^\.\//,'')` 再比对 —— 恰好把 `./` 前缀洗掉，
  // 于是"自认为通过"，而 App 那边取不到 index.html。校验必须与消费方同构。
  const { unzipSync } = await import('fflate')
  const unzipped = unzipSync(new Uint8Array(readFileSync(zipPath)))
  const entryNames = Object.keys(unzipped)

  const prefixed = entryNames.filter((n) => n.startsWith('./'))
  if (prefixed.length) {
    throw new Error(
      `zip 里有 ${prefixed.length} 个条目带 "./" 前缀（如 ${prefixed[0] || './index.html'}）。` +
      `前端用 fflate 按精确键名取 unzipped['index.html']，带前缀会直接报「热更新包缺少 index.html」。`,
    )
  }
  if (!('index.html' in unzipped)) {
    throw new Error('zip 根层没有 index.html（必须是精确条目名 index.html），热更会报「缺少 index.html」')
  }
  // 与 hotupdate.js 完全相同的入口校验：能从 index.html 里匹配到 ./assets/<hash>.js
  const html = new TextDecoder('utf-8').decode(unzipped['index.html'])
  const hashMatch = html.match(/src="\.\/assets\/([^"]+)\.js"/)
  if (!hashMatch) throw new Error('zip 里的 index.html 匹配不到 ./assets/<hash>.js，热更会报「入口文件无效」')
  if (!(`assets/${hashMatch[1]}.js` in unzipped)) {
    throw new Error(`index.html 引用了 assets/${hashMatch[1]}.js，但 zip 里没有这个条目`)
  }
  names = entryNames
  console.log(`  ✓ 条目名无 "./" 前缀；有 index.html；入口 JS assets/${hashMatch[1]}.js 也在包里（fflate 实测）`)
  console.log(`    条目 ${entryNames.length} 个`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}

// ---------- 4. 分卷 ----------
console.log(`\n== 分卷（${CHUNK_MB} MB/卷） ==`)
for (const f of readdirSync(OUT_DIR)) {
  if (/^dist\.zip\.\d{3}$/.test(f)) rmSync(join(OUT_DIR, f), { force: true })
}
const buf = readFileSync(zipPath)
const chunk = CHUNK_MB * MB
const parts = []
for (let i = 0, n = 1; i < buf.length; i += chunk, n++) {
  const slice = buf.subarray(i, Math.min(i + chunk, buf.length))
  const p = `${zipPath}.${String(n).padStart(3, '0')}`
  writeFileSync(p, slice)
  parts.push({ name: `${String(n).padStart(3, '0')}`, size: slice.length })
  console.log(`  -> dist.zip.${String(n).padStart(3, '0')}  (${fmt(slice.length)})`)
}

// ---------- 5. 输出回填信息 ----------
const md5 = createHash('md5').update(buf).digest('hex')

// 热更弹窗要显示包体积。**必须写进 hotupdate.json**：
// Gitee raw 会 302 跳到 raw.giteeusercontent.com，且响应头里没有
// Access-Control-Expose-Headers: Content-Length —— 浏览器 JS 跨域读 content-length
// 本来就受限，所以前端 probeRemoteFileSize 永远拿到 0（表现为"大小未知"）。
// 发布时把 zip 真实字节数写进清单，是最可靠且零额外请求的做法。
const manifestPath = join(ROOT, 'hotupdate.json')
let existing = {}
if (existsSync(manifestPath)) {
  try { existing = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { /* 忽略坏 JSON */ }
}
const suggested = {
  ...existing,
  version: existing.version || '',
  downloadUrl: existing.downloadUrl || 'https://gitee.com/ccyconner/hxsngh/raw/master/dist.zip',
  totalParts: parts.length,
  // 清单里的是**分卷上传前的整包大小**吗？不是 —— 前端按分卷求和显示，所以这里给整包大小。
  packageSize: zipSize,
  md5,
  body: existing.body || '',
}
const suggestedPath = join(OUT_DIR, 'hotupdate.suggested.json')
writeFileSync(suggestedPath, JSON.stringify(suggested, null, 2) + '\n', 'utf8')

console.log('\n== 完成 ==')
console.log(`  输出目录     : ${OUT_DIR}`)
console.log(`  dist.zip     : ${fmt(zipSize)}`)
console.log(`  totalParts   : ${parts.length}`)
// packageSize 必须回填**字节数**：前端 formatFileSize() 直接 Number() 它，
// 写成 "10.79 MB" 会得到 NaN → 弹窗又变回「大小未知」。
console.log(`  packageSize  : ${zipSize}            # 字节数，抄这个进 hotupdate.json`)
console.log(`                 = ${fmt(zipSize)}  (仅便于阅读，别抄这行)`)
console.log(`  md5          : ${md5}`)
console.log('')
console.log('  ┌─────────────────────────────────────────────────────────┐')
console.log('  │ 必须把 packageSize 抄进 hotupdate.json，否则弹窗显示      │')
console.log('  │ 「大小未知」—— 浏览器跨域读不到 Gitee 的 Content-Length。 │')
console.log('  └─────────────────────────────────────────────────────────┘')
console.log(`\n  已写出待回填的清单草案: ${suggestedPath}`)
console.log('  （把 packageSize / totalParts / md5 抄进 hotupdate.json，再改 version 与 body）')
console.log('')
console.log('  另外：热更版本号要保证与当前 APK 同 base（前三段一致），')
console.log('        否则前端会判定为"跨 base 版本"而改走 APK 更新分支。')
