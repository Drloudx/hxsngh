import { probeRemoteFileSize } from './fileSize'

/**
 * 热更新模块
 * 检测 Gitee 上的热更包，下载解压到 app 私有目录 files/www/ 下
 * Java 层的 WebView 从 files/www/ 加载，使热更文件生效
 */

// 热更 manifest 地址（Gitee raw）
const HOTUPDATE_MANIFEST_URL = 'https://gitee.com/ccyconner/hxsngh/raw/master/hotupdate.json'

const isTrustedDownloadUrl = (value) => {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && (
      host === 'gitee.com' || host.endsWith('.gitee.com') ||
      host === 'giteeusercontent.com' || host.endsWith('.giteeusercontent.com')
    )
  } catch {
    return false
  }
}

const validateManifest = (manifest) => {
  if (!manifest || typeof manifest !== 'object') throw new Error('热更新配置无效')
  if (!/^v?\d+(?:\.\d+){1,3}$/.test(String(manifest.version || ''))) {
    throw new Error('热更新版本号无效')
  }
  if (!isTrustedDownloadUrl(manifest.downloadUrl)) {
    throw new Error('热更新下载地址不受信任')
  }
  const totalParts = Number(manifest.totalParts ?? 1)
  if (!Number.isSafeInteger(totalParts) || totalParts < 1) {
    throw new Error('热更新分卷配置无效')
  }
  manifest.totalParts = totalParts
  manifest.body = typeof manifest.body === 'string' ? manifest.body : ''
  return manifest
}

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

const getDownloadUrls = (manifest) => {
  const totalParts = Math.max(1, Math.floor(Number(manifest.totalParts) || 1))
  if (totalParts === 1) return [manifest.downloadUrl]
  return Array.from({ length: totalParts }, (_, index) => {
    const suffix = String(index + 1).padStart(3, '0')
    return `${manifest.downloadUrl}.${suffix}`
  })
}

const probePackageSize = async (manifest) => {
  const configuredSize = Number(manifest.packageSize || manifest.size)
  if (Number.isFinite(configuredSize) && configuredSize > 0) return configuredSize

  const sizes = await Promise.all(getDownloadUrls(manifest).map(probeRemoteFileSize))
  return sizes.every(size => size > 0) ? sizes.reduce((sum, size) => sum + size, 0) : 0
}

const waitForNativeInstall = () => new Promise((resolve, reject) => {
  const startedAt = Date.now()
  const timer = setInterval(() => {
    if (window.__hotInstallState === 'success') {
      clearInterval(timer)
      resolve()
      return
    }
    if (window.__hotInstallState === 'error') {
      clearInterval(timer)
      reject(new Error(window.__hotInstallError || '热更新文件安装失败'))
      return
    }
    if (Date.now() - startedAt > 5 * 60 * 1000) {
      clearInterval(timer)
      reject(new Error('热更新安装超时，请重试'))
    }
  }, 250)
})

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
    const apkVer = (window.__APK_VERSION__ || window.__APP_VERSION__ || '1.0.5').replace(/^v?/, '')

    // 如果发现本地保存的版本比当前 APK 还低，重置为 APK 版本
    if (!savedVer || compareVersions(apkVer, savedVer) > 0) {
      localStorage.setItem('local_web_version', apkVer)
      localStorage.setItem('hotupdate_version', apkVer)
    }

    const currentVer = localStorage.getItem('local_web_version') || apkVer
    console.log('[HotUpdate] 本地生效的 Web 版本:', currentVer)
    console.log('[HotUpdate] 壳子传导的版本:', apkVer)

    const resp = await fetch(HOTUPDATE_MANIFEST_URL + '?t=' + Date.now())
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const manifest = validateManifest(await resp.json())
    console.log('[HotUpdate] 远程最新版本:', manifest.version)

    console.log('[HotUpdate] 版本比较:', manifest.version, 'vs', currentVer, '结果:', compareVersions(manifest.version, currentVer))
    if (compareVersions(manifest.version, currentVer) > 0) {
      manifest._currentVer = currentVer
      // 补全到4段，不足补0：如 "1.0.11" → [1,0,11,0]
      const pad4 = (v) => { const a = v.replace('v','').split('.').map(Number); while (a.length < 4) a.push(0); return a }
      const curParts = pad4(currentVer)
      const newParts = pad4(manifest.version)
      const baseMatch = curParts[0] === newParts[0] && curParts[1] === newParts[1] && curParts[2] === newParts[2]
      manifest._needsApkUpdate = !baseMatch
      manifest.packageSize = await probePackageSize(manifest)
      console.log('[HotUpdate]  baseMatch:', baseMatch, 'needsApk:', manifest._needsApkUpdate)
      return manifest
    }
    console.log('[HotUpdate] 远程版本不高于本地，无更新')
    return null
  } catch (e) {
    console.warn('[HotUpdate] check failed:', e)
    return null
  }
}

/**
 * 下载并解压热更包（已升级支持多分卷安全下载）
 */
export const applyHotUpdate = async (manifest, onProgress) => {
  onProgress?.(0)

  // 读取配置文件的分卷数，如果没有该字段则默认为单包模式 (totalParts = 1)
  const totalParts = manifest.totalParts || 1
  const isSplitMode = totalParts > 1

  let merged = null

  if (isSplitMode) {
    console.log(`[HotUpdate] 检测到分卷模式，共 ${totalParts} 个分卷`)
    const allChunks = []
    let totalReceived = 0

    // 循环请求并拼接每个分卷
    for (let i = 1; i <= totalParts; i++) {
      // 格式化为 001, 002 等后缀
      const partSuffix = String(i).padStart(3, '0')
      const partUrl = `${manifest.downloadUrl}.${partSuffix}?t=${Date.now()}`

      console.log(`[HotUpdate] 开始拉取第 ${i}/${totalParts} 分卷: ${partUrl}`)
      const resp = await fetch(partUrl)
      if (!resp.ok) throw new Error(`下载分卷 ${partSuffix} 失败: HTTP ` + resp.status)

      const reader = resp.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        allChunks.push(value)
        totalReceived += value.length
      }

      // 平衡进度条：前 40% 的进度留给下载，按完成的分卷比例推进
      onProgress?.(Math.round((i / totalParts) * 40))
    }

    // 分卷整合拼装为完整的 Uint8Array
    merged = new Uint8Array(totalReceived)
    let offset = 0
    for (const chunk of allChunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

  } else {
    // 【保留原全量单包下载逻辑】
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

    merged = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
  }

  onProgress?.(45)

  // 先完整解压并检查入口，再交给原生层安装。
  const { unzip } = await import('fflate')
  const unzipped = await new Promise((resolve, reject) => {
    unzip(merged, (err, data) => {
      if (err) reject(new Error('解压失败: ' + err.message))
      else resolve(data)
    })
  })
  const indexData = unzipped['index.html']
  if (!indexData) throw new Error('热更新包缺少 index.html')

  const utf8 = new TextDecoder('utf-8').decode(indexData)
  const hashMatch = utf8.match(/src="\.\/assets\/([^"]+)\.js"/)
  if (!hashMatch) throw new Error('热更新包入口文件无效')
  window.__hotHtmlContent = utf8
  console.log('[HotUpdate] 新 index.html JS hash:', hashMatch[1])

  let binary = ''
  for (let i = 0; i < merged.length; i += 8192) {
    binary += String.fromCharCode.apply(null, merged.subarray(i, Math.min(i + 8192, merged.length)))
  }
  window.__hotInstallState = 'pending'
  window.__hotInstallError = ''
  window.__hotZipData = btoa(binary)
  window.__hotZipReady = true
  console.log('[HotUpdate] zip 数据已交给原生层, 大小:', merged.length, 'bytes')

  try {
    await waitForNativeInstall()
  } finally {
    window.__hotZipData = ''
    window.__hotZipReady = false
  }

  // 原生层完成目录替换后才保存版本号。
  localStorage.setItem('local_web_version', manifest.version)
  localStorage.setItem('hotupdate_version', manifest.version)

  onProgress?.(100)
  console.log('[HotUpdate] 升级成功! 目标版本:', manifest.version)
  return 151
}
