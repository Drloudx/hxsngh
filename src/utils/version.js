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
 * 已忽略的 APK 版本记录。
 *
 * 为什么不用「按天」：原实现 setSkipUpdateDate() 写一个当天日期、isUpdateSkippedToday()
 * 比较它，结果是**当天内所有更新检查全部静默**——包括热更新。用户点一次「今日不提醒」，
 * 当天既收不到 APK 更新也收不到热更新，还会被误导为「已是最新版本」。
 * 改成按版本记录：只有「用户忽略过的那个版本」不再打扰，出了新版本照样提示。
 */
export const setSkipUpdateVersion = (version) => {
  if (!version) return
  localStorage.setItem('update_skip_version', String(version).replace(/^v?/, 'v'))
}

export const getSkipUpdateVersion = () => localStorage.getItem('update_skip_version')

export const isUpdateSkippedThisVersion = (version) => {
  const skip = getSkipUpdateVersion()
  if (!skip || !version) return false
  return compareVersions(version, skip) <= 0
}

/**
 * @deprecated 旧的按天忽略，只保留给可能的旧调用方；新代码请用 setSkipUpdateVersion。
 */
export const setSkipUpdateDate = () => {
  const d = new Date()
  const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  localStorage.setItem('update_skip_date', s)
}

/**
 * @deprecated 见 setSkipUpdateDate。仅用于首启动兼容旧数据清理。
 */
export const isUpdateSkippedToday = () => {
  const s = localStorage.getItem('update_skip_date')
  const d = new Date()
  const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return s === t
}
import { probeRemoteFileSize } from './fileSize'
