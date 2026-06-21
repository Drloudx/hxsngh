/**
 * 通用数据导出/导入工具
 * 手机端 → Java 写文件 + 系统分享
 * 网页端 → Blob 下载 / 文件上传
 */

/**
 * 导出数据
 * @param {any} data - 要导出的数据（自动 JSON 序列化）
 * @param {string} fileName - 文件名，如 'my_data_2026-01-01.json'
 */
export const exportData = (data, fileName) => {
  const json = JSON.stringify(data)

  // App 内：设标志让 Java 写文件 + 分享
  if (window.location.href.startsWith('file://')) {
    window.__exportData = json
    window.__exportFileName = fileName || 'export.json'
    window.__exportReady = true
    return
  }

  // 网页端：Blob 下载
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'export.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 导入数据（通过隐藏 file input 触发）
 * @param {Event} event - file input 的 change 事件
 * @returns {Promise<any>} 解析后的数据
 */
export const importData = (event) => {
  return new Promise((resolve, reject) => {
    const file = event.target.files?.[0]
    if (!file) return reject(new Error('未选择文件'))

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch (err) {
        reject(new Error('文件格式错误：' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
    event.target.value = ''
  })
}
