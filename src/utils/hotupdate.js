/**
 * 热更新模块
 * 检测 Gitee 上的热更包，下载解压到 app 私有目录 files/www/ 下
 * Java 层的 WebView 从 files/www/ 加载，使热更文件生效
 */

// 热更 manifest 地址（Gitee raw）
const HOTUPDATE_MANIFEST_URL = 'https://gitee.com/ccyconner/hxsngh/raw/master/hotupdate.json'

/**
 * 版本比较
 */
const compareVersions = (v1, v2) => {
  const p = (v) => (v || '').replace('v', '').split('.').map(Number)
  const a = p(v1), b = p(v2)
  for (let i = 0; i < 4; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1
    if ((a[i] || 0) < (b[i] || 0)) return -1
  }
  return 0
}

/**
 * 高性能 Uint8Array 转 Base64 算法
 */
const uint8ToBase64 = (uint8Array) => {
  let binary = '';
  const len = uint8Array.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Uint8Array 转 UTF8 字符串（用于完美还原纯文本文件）
 */
const uint8ToUtf8 = (uint8Array) => {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(uint8Array);
  }
  return decodeURIComponent(escape(String.fromCharCode.apply(null, uint8Array)));
}

/**
 * 检查是否有热更新可用
 */
export const checkHotUpdate = async () => {
  try {
    // 容错加固：如果 localStorage 已经有热更过的稳定版本，优先信任它，不要被原生的原始值干扰
    const savedVer = localStorage.getItem('local_web_version')
    const apkVer = (window.__APP_VERSION__ || savedVer || '1.0.5').replace(/^v?/, '')

    // 如果发现本地保存的版本比当前环境还低（比如覆盖安装了老APK），重置它
    if (!savedVer || compareVersions(apkVer, savedVer) > 0) {
      localStorage.setItem('local_web_version', apkVer)
      localStorage.setItem('hotupdate_version', apkVer)
    }

    const currentVer = localStorage.getItem('local_web_version') || apkVer
    console.log('[HotUpdate] 本地生效的 Web 版本:', currentVer)
    console.log('[HotUpdate] 壳子传导的版本:', apkVer)

    const resp = await fetch(HOTUPDATE_MANIFEST_URL + '?t=' + Date.now())
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const manifest = await resp.json()
    console.log('[HotUpdate] 远程最新版本:', manifest.version)

    if (compareVersions(manifest.version, currentVer) > 0) {
      manifest._currentVer = currentVer
      return manifest
    }
    return null
  } catch (e) {
    console.warn('[HotUpdate] check failed:', e)
    return null
  }
}

/**
 * 下载并解压热更包
 */
export const applyHotUpdate = async (manifest, onProgress) => {

  // 1. 下载 dist.zip
  onProgress?.(0)
  const resp = await fetch(manifest.downloadUrl + '?t=' + Date.now())
  if (!resp.ok) throw new Error('下载热更包失败: HTTP ' + resp.status)

  const total = Number(resp.headers.get('content-length')) || 0
  const reader = resp.body.getReader()
  const chunks = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (total > 0) {
      onProgress?.(Math.round((received / total) * 40))
    }
  }

  onProgress?.(45)

  // 合并 zip 数据为 Uint8Array
  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  // 把 zip 数据传 base64 给 Java 处理（绕开 Capacitor 文件系统路径问题）
  let binary = ''
  for (let i = 0; i < merged.length; i += 8192) {
    binary += String.fromCharCode.apply(null, merged.subarray(i, Math.min(i + 8192, merged.length)))
  }
  window.__hotZipData = btoa(binary)
  window.__hotZipReady = true
  console.log('[HotUpdate] zip 数据已存入 window.__hotZipData, 大小:', merged.length, 'bytes')

  // 解压 index.html 用于后续版本校验
  const { unzip } = await import('fflate')
  const unzipped = await new Promise((resolve, reject) => {
    unzip(merged, (err, data) => {
      if (err) reject(new Error('解压失败: ' + err.message))
      else resolve(data)
    })
  })
  const indexData = unzipped['index.html']
  if (indexData) {
    const utf8 = new TextDecoder('utf-8').decode(indexData)
    window.__hotHtmlContent = utf8
    const hashMatch = utf8.match(/src="\.\/assets\/([^"]+)\.js"/)
    console.log('[HotUpdate] 新 index.html JS hash:', hashMatch ? hashMatch[1] : '未匹配')
  }

  // 保存版本号
  localStorage.setItem('local_web_version', manifest.version)
  localStorage.setItem('hotupdate_version', manifest.version)

  onProgress?.(100)
  console.log('[HotUpdate] 升级成功! 目标版本:', manifest.version)
  return 151
}