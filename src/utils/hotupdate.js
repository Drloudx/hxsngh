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
    const manifest = await resp.json()
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