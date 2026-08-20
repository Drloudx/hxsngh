import { ref } from 'vue'

// ==============================================
// 配置：未实装角色隐藏开关
// ==============================================
export const HIDE_UNRELEASED_CHARACTERS = ref(true)

// ==============================================
// 配置：手动屏蔽的角色 ID 列表 (便于随时注释恢复)
// 适用于官方包中已存在，但实际未放出的角色
// ==============================================
export const BLOCKED_CHARACTER_IDS = [
  'M12303_000', // [炼金]巨魔术士
  // 'M11303_002', // [熔岩]雪人骑士
]

/**
 * 过滤出未被屏蔽的合法角色列表 (角色图鉴标准)
 * @param {Array} characters 角色列表 (通过 configUtil 解析后的角色列表)
 * @returns {Array} 过滤后的合法角色列表
 */
export function getVisibleCharacters(characters) {
  if (!characters) return []
  return characters.filter(c => {
    const id = c.id || c.IDs
    return id && !BLOCKED_CHARACTER_IDS.includes(id)
  })
}

/**
 * 判断指定角色是否被屏蔽
 * @param {String} characterId 角色ID
 * @returns {Boolean}
 */
export function isCharacterBlocked(characterId) {
  if (!characterId) return false
  return BLOCKED_CHARACTER_IDS.includes(characterId)
}

/**
 * 提取当前有效角色列表中所有真实存在的细分种族 (Race) 名称 Set
 * @param {Array} visibleCharacters 合法角色列表
 * @returns {Set<String>}
 */
export function getVisibleRaceNames(visibleCharacters) {
  const set = new Set()
  if (!visibleCharacters) return set
  visibleCharacters.forEach(c => {
    const raceName = c.race?.name || (c.Race ? (c.Race.split(',')[1] || c.Race) : '')
    if (raceName) set.add(raceName.trim())
  })
  return set
}

/**
 * 判断一个天赋是否属于有效且已放出的内容
 * 规则：
 * 1. 专属天赋：所属角色必须在当前有效角色列表中 (未被屏蔽且已放出)
 * 2. 细分种族天赋：所属种族必须在当前有效角色列表中存在对应角色 (未出种族自动隐藏)
 * @param {Object} talent 天赋对象 (含 SpecifyRoleIDs, Race)
 * @param {Array} visibleCharacters 有效角色列表
 * @param {Set<String>} visibleRaceNames 有效细分种族集合 (可选，若不传则自动根据 visibleCharacters 计算)
 * @returns {Boolean}
 */
export function isTalentVisible(talent, visibleCharacters = [], visibleRaceNames = null) {
  if (!talent) return false

  // 1. 专属天赋判定
  if (talent.SpecifyRoleIDs) {
    if (isCharacterBlocked(talent.SpecifyRoleIDs)) return false
    const exists = visibleCharacters.some(c => (c.id || c.IDs) === talent.SpecifyRoleIDs)
    if (!exists) return false
  }

  // 2. 细分种族天赋判定
  if (talent.Race) {
    const raceSet = visibleRaceNames || getVisibleRaceNames(visibleCharacters)
    if (!raceSet.has(talent.Race.trim())) return false
  }

  return true
}

/**
 * 判断一个心得是否属于有效且已放出的内容
 * @param {Object} relic 心得对象 (含 SpecifyRoleIDs)
 * @param {Array} visibleCharacters 有效角色列表
 * @returns {Boolean}
 */
export function isRelicVisible(relic, visibleCharacters = []) {
  if (!relic || !relic.SpecifyRoleIDs) return true
  if (isCharacterBlocked(relic.SpecifyRoleIDs)) return false
  return visibleCharacters.some(c => (c.id || c.IDs) === relic.SpecifyRoleIDs)
}
