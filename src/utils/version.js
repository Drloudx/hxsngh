/**
 * 版本比较函数
 * @param {string} v1 - 版本1
 * @param {string} v2 - 版本2
 * @returns {number} 1: v1 > v2, -1: v1 < v2, 0: v1 == v2
 */
export const compareVersions = (v1, v2) => {
  const p = (v) => (v || '').replace('v', '').split('.').map(Number)
  const a = p(v1), b = p(v2)
  for (let i = 0; i < 4; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1
    if ((a[i] || 0) < (b[i] || 0)) return -1
  }
  return 0
}

/**
 * 检查更新
 * @returns {Promise<Object|null>} 返回更新信息或 null
 */

export const fetchLatestRelease = async () => {
  try {
    // 1. 修改为 Gitee 的最新 Release API 地址
    const r = await fetch('https://gitee.com/api/v5/repos/ccyconner/hxsngh/releases/latest')
    if (!r.ok) throw new Error('请求失败: ' + r.status)
    const d = await r.json()

    // 2. Gitee 的版本号字段同样是 tag_name
    const latestVersion = d.tag_name || 'v0.0.0'

    // 3. Gitee 的附件字段叫 assets，但结构与 GitHub 略有差异
    // Gitee 的下载链接字段是 browser_download_url
    const apk = (d.assets || []).find(a => a.name.endsWith('.apk'))
    
    const apkUrl = apk ? apk.browser_download_url : null
    const packageSize = Number(apk?.size) || await probeRemoteFileSize(apkUrl)

    return {
      version: latestVersion,
      body: d.body || '暂无更新说明',
      apkUrl,
      packageSize
    }
  } catch (e) {
    console.error('Check update failed:', e)
    throw e
  }
}

/**
 * 设置跳过更新的日期
 */
export const setSkipUpdateDate = () => {
  const d = new Date()
  const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  localStorage.setItem('update_skip_date', s)
}

/**
 * 检查今天是否已跳过更新
 * @returns {boolean}
 */
export const isUpdateSkippedToday = () => {
  const s = localStorage.getItem('update_skip_date')
  const d = new Date()
  const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return s === t
}
import { probeRemoteFileSize } from './fileSize'
