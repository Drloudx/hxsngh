#!/usr/bin/env node
/**
 * 把 public/opencv.js 里内嵌的 base64 wasm 拆成独立文件。
 *
 * 背景：该 opencv.js 是「wasm 以 base64 内嵌」的构建，带来两个损失：
 *   1. 体积膨胀 4/3：wasm 7.68MB → base64 10.24MB（白涨 2.56MB）
 *   2. base64 几乎无法被 gzip 压缩（约 75-80%），而二进制 wasm 可压到 30-40%
 *
 * 胶水本身已支持外置 wasm（isDataURI / locateFile / instantiateStreaming 三条路径齐全），
 * 因此只需把 wasmBinaryFile 的取值从 data URI 换成文件名即可。
 *
 * 用法：
 *   node tools/split-opencv-wasm.mjs            # 预估/检查，不写文件
 *   node tools/split-opencv-wasm.mjs --apply    # 实际拆分并改写 opencv.js
 */
import { readFileSync, writeFileSync, existsSync, statSync, copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OPENCV_JS = join(ROOT, 'public', 'opencv.js')
const WASM_OUT = join(ROOT, 'public', 'opencv_js.wasm')
// 备份必须放在 public/ 之外：public/ 下的任何文件都会被 Vite 拷进 dist/，
// 进而被打进 APK 与热更包（10.46MB 白白多出来）。
const BACKUP_DIR = join(ROOT, '.backup')
const BACKUP = join(BACKUP_DIR, 'opencv.js.base64.bak')
const WASM_NAME = 'opencv_js.wasm'          // 与 opencv.js 同目录，locateFile 会拼成同级路径
const APPLY = process.argv.includes('--apply')

const MB = 1024 * 1024
const mb = (n) => (n / MB).toFixed(2) + ' MB'

if (!existsSync(OPENCV_JS)) {
  console.error(`找不到 ${OPENCV_JS}`)
  process.exit(2)
}

const src = readFileSync(OPENCV_JS, 'utf8')
const before = Buffer.byteLength(src, 'utf8')

// 匹配 var wasmBinaryFile="data:...base64,<payload>";
const re = /(var\s+wasmBinaryFile\s*=\s*)"data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)"/;
const m = src.match(re)

if (!m) {
  if (src.includes(`"${WASM_NAME}"`)) {
    console.log('✓ 已经是外置 wasm 形态，无需处理。')
    if (existsSync(WASM_OUT)) console.log(`  外置文件：${WASM_OUT} (${mb(statSync(WASM_OUT).size)})`)
    process.exit(0)
  }
  console.error('✗ 未找到内嵌 base64 wasm，也未发现已外置标记——opencv.js 结构可能已变，请人工确认。')
  process.exit(3)
}

const b64 = m[2]
const wasm = Buffer.from(b64, 'base64')

// 校验 wasm 魔数 \0asm
const magic = wasm.subarray(0, 4)
const isWasm = magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d

const patched = src.replace(re, `$1"${WASM_NAME}"`)
const after = Buffer.byteLength(patched, 'utf8')

console.log('=== 拆分预估 ===')
console.log(`  opencv.js 现在      : ${mb(before)}`)
console.log(`  ├─ base64 段        : ${mb(b64.length)}  (${b64.length} 字符)`)
console.log(`  └─ JS 胶水+其余     : ${mb(before - b64.length)}`)
console.log(`  解码后 wasm         : ${mb(wasm.length)}`)
console.log(`  wasm 魔数校验       : ${isWasm ? '✓ \\0asm 正确' : '✗ 不是有效 wasm！'}`)
console.log('')
console.log(`  拆分后 opencv.js    : ${mb(after)}   (省 ${mb(before - after)})`)
console.log(`  新增 opencv_js.wasm : ${mb(wasm.length)}`)
console.log(`  合计字节变化        : ${mb(before - (after + wasm.length))}（base64 膨胀被消除）`)

if (!isWasm) {
  console.error('\n✗ wasm 魔数不对，拒绝写入。')
  process.exit(4)
}

if (!APPLY) {
  console.log('\n（仅预估，未写文件。确认后加 --apply 执行）')
  process.exit(0)
}

// 备份原文件（放到 public/ 之外，避免被 Vite 拷进 dist）
if (!existsSync(BACKUP)) {
  mkdirSync(BACKUP_DIR, { recursive: true })
  copyFileSync(OPENCV_JS, BACKUP)
  console.log(`\n已备份原文件 → ${BACKUP}`)
} else {
  console.log(`\n备份已存在，跳过 → ${BACKUP}`)
}

writeFileSync(WASM_OUT, wasm)
writeFileSync(OPENCV_JS, patched, 'utf8')
console.log(`✓ 已写入 ${WASM_OUT} (${mb(wasm.length)})`)
console.log(`✓ 已改写 ${OPENCV_JS} (${mb(after)})`)
console.log('\n下一步：起服务验证 window.cv 可用（node tools/verify-opencv.mjs）')
