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
 * 过滤出未被屏蔽的角色
 * @param {Array} characters 角色列表 (通过 configUtil 解析后的角色列表)
 * @returns {Array} 过滤后的角色列表
 */
export function getVisibleCharacters(characters) {
  if (!characters) return []
  return characters.filter(c => !BLOCKED_CHARACTER_IDS.includes(c.id))
}

/**
 * 判断指定角色是否被屏蔽
 * @param {String} characterId 角色ID
 * @returns {Boolean}
 */
export function isCharacterBlocked(characterId) {
  return BLOCKED_CHARACTER_IDS.includes(characterId)
}
