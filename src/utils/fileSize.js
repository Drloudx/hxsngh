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

export const probeRemoteFileSize = async (url) => {
  if (!url) return 0
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store'
    })
    if (!response.ok) return 0
    const size = Number(response.headers.get('content-length'))
    return Number.isFinite(size) && size > 0 ? size : 0
  } catch (error) {
    console.warn('[Update] 无法获取更新包大小:', error)
    return 0
  }
}
