export const formatFileSize = (bytes) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '大小未知'
  if (value < 1024) return `${Math.round(value)} B`

  const units = ['KB', 'MB', 'GB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * 探测远程文件大小。
 *
 * ⚠️ 可靠性有限，仅作**兜底**：热更包大小应当写进 hotupdate.json 的 packageSize。
 * 原因：Gitee raw 会 302 跳到 raw.giteeusercontent.com，且响应头**没有**
 * `Access-Control-Expose-Headers: Content-Length`；而 content-length 属于
 * 禁止 JS 读取的响应头（forbidden response-header name），即使同源策略放行也读不到。
 * 所以这里先 HEAD、再退化为 `Range: bytes=0-0` 读 Content-Range，
 * 两者都可能被 CORS 挡掉 —— 那时返回 0，UI 显示「大小未知」。
 */
export const probeRemoteFileSize = async (url) => {
  if (!url) return 0

  // 方案 1：HEAD + content-length
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (response.ok) {
      const size = Number(response.headers.get('content-length'))
      if (Number.isFinite(size) && size > 0) return size
    }
  } catch { /* 继续方案 2 */ }

  // 方案 2：Range 请求只取 1 字节，从 Content-Range 的 "/<total>" 拿总长
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    })
    const contentRange = response.headers.get('content-range')
    if (contentRange) {
      const total = Number(String(contentRange).split('/').pop())
      if (Number.isFinite(total) && total > 0) return total
    }
    // 有些服务端直接以 200 返回全量
    const size = Number(response.headers.get('content-length'))
    if (Number.isFinite(size) && size > 0) return size
  } catch { /* 两种都失败 */ }

  console.warn('[Update] 无法探测远程文件大小（CORS 未暴露 Content-Length），' +
    '请在 hotupdate.json 里补 packageSize 字段:', url)
  return 0
}
