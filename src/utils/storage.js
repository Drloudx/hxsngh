export const readStoredArray = (key, options = {}) => {
  const { strict = false } = options
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('保存的数据不是数组')
    return parsed
  } catch (error) {
    console.error(`[Storage] 读取 ${key} 失败:`, error)
    if (strict) throw new Error(`${key} 数据已损坏`)
    return []
  }
}

export const writeStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`[Storage] 写入 ${key} 失败:`, error)
    throw new Error('本地存储空间不足或不可用')
  }
}
