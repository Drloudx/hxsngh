
// ==============================================
// 1. 底层通用工具函数
// ==============================================
/**
 * 拆分 "ID,名称" 格式的字段
 * @param {string} str 原始字段
 * @returns {{id: string, name: string}}
 */
function splitIdName(str = '') {
  if (!str) return { id: '', name: '' }
  const [id, name = ''] = str.split(',')
  return { id: id.trim(), name: name.trim() }
}

/**
 * 判断是否为异化角色（ID带下划线）
 * @param {string} roleId
 * @returns {boolean}
 */
export function isAlienRole(roleId = '') {
  return roleId.includes('_')
}

/**
 * 生成角色显示名称（异化角色加前缀）
 * @param {string} name 基础名称
 * @param {string} skinName 异化皮肤名
 * @returns {string}
 */
export function formatRoleDisplayName(name = '', skinName = '') {
  return skinName ? `[${skinName}]${name}` : name
}

/**
 * 数组转ID-Map，提升查找性能
 * @param {Array} list
 * @param {string} keyField
 * @returns {Map<string, Object>}
 */
function createMapById(list = [], keyField = 'IDs') {
  const map = new Map()
  list.forEach(item => {
    if (item[keyField]) map.set(item[keyField], item)
  })
  return map
}

/**
 * 兼容JSON格式，自动提取数组（支持直接数组 / DataTable包裹）
 * @param {Object|Array} jsonData
 * @returns {Array}
 */
export function extractDataArray(jsonData) {
  if (Array.isArray(jsonData)) return jsonData
  if (jsonData.DataTable && Array.isArray(jsonData.DataTable)) return jsonData.DataTable
  console.warn('数据格式不兼容，返回空数组', jsonData)
  return []
}

/**
 * 统一替换文本中的 {数字} 占位符
 * @param {string} text 原始带占位符文本
 * @param {Array} values 数值数组，索引对应占位符数字
 * @returns {string}
 */
function replacePlaceholders(text = '', values = []) {
  return text.replace(/\{(\d+)\}/g, (match, idx) => {
    const num = Number(idx)
    return values[num] !== undefined ? values[num] : match
  })
}

// ==============================================
// 2. 业务组装函数（内部调用，不对外导出）
// ==============================================

/**
 * 组装角色基础信息
 * @param {Object} raw 原始角色数据
 * @returns {Object}
 */
function buildBaseInfo(raw = {}) {
  const raceInfo = splitIdName(raw.Race)
  const normalAttackInfo = splitIdName(raw.NormalAttack)
  const displayName = formatRoleDisplayName(raw.Name, raw.SkinName)
  const tags = [
    raw.Type ?? '',
    raw.Class ?? '',
    raw.Element ?? '',
    raw.Map ?? ''
  ].filter(Boolean)

  return {
    id: raw.IDs ?? '',
    name: raw.Name ?? '未知角色',
    displayName,
    skinName: raw.SkinName ?? '',
    isAlien: isAlienRole(raw.IDs),
    step: raw.Step ?? '',
    type: raw.Type ?? '',
    class: raw.Class ?? '',
    element: raw.Element ?? '',
    map: raw.Map ?? '',
    race: raceInfo,
    normalAttack: normalAttackInfo,
    source: raw.Source ?? '',
    background: raw.Background ?? '',
    characterRole: raw.CharacterRole ?? '',
    tags,
    filterTags: raw.FilterTags ? raw.FilterTags.split(',') : []
  }
}

/**
 * 组装支援技能（性格、称号、特性）
 * 占位符 {0}{1}{2} 对应 Value0/Value1/Value2
 * @param {Object} raw 原始角色数据
 * @param {Map<string, Object>} supportMap 支援技能Map
 * @returns {Object}
 */
function buildSupportSkills(raw = {}, supportMap = new Map()) {
  const characteristicInfo = splitIdName(raw.Characteristic)
  const subClassInfo = splitIdName(raw.SubClass)
  const featureInfo = splitIdName(raw.Feature)
  const starMap = { '性格': 3, '称号': 4, '特性': 5 }

  const fillSkillData = (info, type) => {
    const rawSkill = supportMap.get(info.id) || {}
    const valueList = [rawSkill.Value0, rawSkill.Value1, rawSkill.Value2]
    return {
      id: info.id,
      name: info.name || rawSkill.Name || '',
      type,
      star: starMap[type] || 0,
      icon: rawSkill.Icon ?? '',
      description: rawSkill.Description ?? '',
      formattedDesc: replacePlaceholders(rawSkill.Description, valueList),
      value0: rawSkill.Value0 ?? 0,
      value1: rawSkill.Value1 ?? 0,
      value2: rawSkill.Value2 ?? 0,
      filterTags: rawSkill.FilterTags ? rawSkill.FilterTags.split(',') : []
    }
  }

  return {
    characteristic: fillSkillData(characteristicInfo, '性格'),
    subClass: fillSkillData(subClassInfo, '称号'),
    feature: fillSkillData(featureInfo, '特性')
  }
}

/**
 * 组装主动技能
 * 占位符固定索引：{2}=Value, {4}=ExtraValue1, {5}=ExtraValue2, {6}=ExtraValue3
 * @param {string} roleId 角色ID
 * @param {Array} skillList 主动技能原始数组
 * @returns {Array}
 */
function buildActiveSkills(roleId = '', skillList = []) {
  return skillList
    .filter(skill => skill.IDs === roleId)
    .map(skill => {
      const valueList = []
      valueList[2] = skill.Value
      valueList[4] = skill.ExtraValue1
      valueList[5] = skill.ExtraValue2
      valueList[6] = skill.ExtraValue3

      return {
        id: skill.IDs ?? '',
        owner: skill.Owner ?? '',
        name: skill.Name ?? '',
        skillType: skill.SkillType ?? '',
        actionType: skill.ActionType ?? '',
        targetType: skill.TargetType ?? '',
        target: skill.Target ?? '',
        maxTarget: skill.MaxTarget ?? 0,
        times: skill.Times ?? 1,
        value: skill.Value ?? 0,
        extraValue1: skill.ExtraValue1 ?? 0,
        extraValue2: skill.ExtraValue2 ?? 0,
        extraValue3: skill.ExtraValue3 ?? 0,
        description: skill.Description ?? '',
        formattedDesc: replacePlaceholders(skill.Description, valueList),
        icon: skill.Icon ?? '',
        isFullScreen: !!skill.FullScreen,
        isMove: !!skill.Move,
        positiveTags: skill.PositiveTags ? skill.PositiveTags.split(',') : [],
        negativeTags: skill.NegativeTags ? skill.NegativeTags.split(',') : []
      }
    })
}

/**
 * 组装天赋（全量匹配，分类不互斥）
 * 占位符 {0}{1}{2} 对应 Value0/Value1/Value2
 * @param {Object} baseInfo 组装后的角色基础信息
 * @param {Array} talentList 天赋原始数组
 * @returns {Object}
 */
function buildTalents(baseInfo = {}, talentList = []) {
  const result = {
    exclusive: [], // 专属天赋
    race: [],      // 种族天赋
    class: [],     // 职业天赋
    element: [],   // 属性天赋
    common: []     // 通用天赋
  }

  talentList.forEach(talent => {
    const valueList = [talent.Value0, talent.Value1, talent.Value2]
    talent.formattedEffect = replacePlaceholders(talent.Effect, valueList)

    // 1. 专属天赋
    if (talent.SpecifyRoleIDs === baseInfo.id) {
      result.exclusive.push(talent)
      return
    }

    if (talent.SpecifyRoleIDs) return

    // 2. 种族天赋
    if (talent.Race && talent.Race === baseInfo.race.name) {
      result.race.push(talent)
    }

    // 3. 职业天赋
    if (talent.Class && talent.Class === baseInfo.class) {
      result.class.push(talent)
    }

    // 4. 属性天赋
    if (talent.Element && talent.Element === baseInfo.element) {
      result.element.push(talent)
    }

    // 5. 通用天赋
    if (!talent.Race && !talent.Class && !talent.Element) {
      result.common.push(talent)
    }
  })

  return result
}

/**
 * 组装角色专属遗物
 * @param {string} roleId
 * @param {Array} relicList
 * @returns {Array}
 */
function buildRelics(roleId = '', relicList = []) {
  return relicList.filter(relic => relic.SpecifyRoleIDs === roleId)
}

/**
 * 组装角色心得（预留扩展）
 * @param {string} roleId
 * @param {Array} noteList
 * @returns {Array}
 */
function buildNotes(roleId = '', noteList = []) {
  return noteList.filter(note => note.SpecifyRoleIDs === roleId)
}

// ==============================================
// 3. 对外暴露的主接口
// ==============================================

/**
 * 组装单个角色的完整数据
 * @param {Object} rawRole 原始角色对象
 * @param {Object} datasets 关联数据集
 * @param {Array} datasets.supportList 支援技能列表
 * @param {Array} datasets.skillList 主动技能列表
 * @param {Array} datasets.talentList 天赋列表
 * @param {Array} datasets.relicList 遗物列表
 * @param {Array} datasets.noteList 心得列表（可选）
 * @returns {Object} 完整角色数据
 */
export function getFullCharacter(rawRole = {}, datasets = {}) {
  const {
    supportList = [],
    skillList = [],
    talentList = [],
    relicList = [],
    noteList = []
  } = datasets

  const supportMap = createMapById(supportList)
  const baseInfo = buildBaseInfo(rawRole)

  return {
    ...baseInfo,
    supportSkills: buildSupportSkills(rawRole, supportMap),
    activeSkills: buildActiveSkills(baseInfo.id, skillList),
    talents: buildTalents(baseInfo, talentList),
    relics: buildRelics(baseInfo.id, relicList),
    notes: buildNotes(baseInfo.id, noteList)
  }
}

/**
 * 批量组装角色列表
 * @param {Array} rawRoleList 原始角色数组
 * @param {Object} datasets 关联数据集
 * @returns {Array}
 */
export function getFullCharacterList(rawRoleList = [], datasets = {}) {
  const supportMap = createMapById(datasets.supportList || [])
  const skillList = datasets.skillList || []
  const talentList = datasets.talentList || []
  const relicList = datasets.relicList || []
  const noteList = datasets.noteList || []

  return rawRoleList.map(rawRole => {
    const baseInfo = buildBaseInfo(rawRole)
    return {
      ...baseInfo,
      supportSkills: buildSupportSkills(rawRole, supportMap),
      activeSkills: buildActiveSkills(baseInfo.id, skillList),
      talents: buildTalents(baseInfo, talentList),
      relics: buildRelics(baseInfo.id, relicList),
      notes: buildNotes(baseInfo.id, noteList)
    }
  })
}

/**
 * 根据ID查找单个完整角色
 * @param {string} roleId 角色ID
 * @param {Array} rawRoleList 原始角色列表
 * @param {Object} datasets 关联数据集
 * @returns {Object|null}
 */
export function getCharacterById(roleId = '', rawRoleList = [], datasets = {}) {
  const raw = rawRoleList.find(item => item.IDs === roleId)
  return raw ? getFullCharacter(raw, datasets) : null
}

/**
 * 根据名称精确查找角色（本体和异化完全独立）
 * @param {string} name 角色名称
 * @param {Array} rawRoleList 原始角色列表
 * @param {Object} datasets 关联数据集
 * @param {boolean} [fuzzy=false] 是否模糊匹配
 * @returns {Object|null}
 */
export function getCharacterByName(name = '', rawRoleList = [], datasets = {}, fuzzy = false) {
  if (!name) return null

  const raw = rawRoleList.find(item => {
    const hasSkin = !!item.SkinName
    const displayName = formatRoleDisplayName(item.Name, item.SkinName)

    if (fuzzy) {
      return item.Name?.includes(name) || displayName.includes(name)
    }

    if (hasSkin) {
      return displayName === name
    } else {
      return item.Name === name
    }
  })

  return raw ? getFullCharacter(raw, datasets) : null
}

/**
 * 根据名称模糊搜索所有匹配角色
 * @param {string} keyword 关键词
 * @param {Array} rawRoleList 原始角色列表
 * @param {Object} datasets 关联数据集
 * @returns {Array}
 */
export function searchCharactersByName(keyword = '', rawRoleList = [], datasets = {}) {
  if (!keyword) return []

  const matchedRaw = rawRoleList.filter(item => {
    const displayName = formatRoleDisplayName(item.Name, item.SkinName)
    return item.Name?.includes(keyword) || displayName.includes(keyword)
  })

  return matchedRaw.map(raw => getFullCharacter(raw, datasets))
}