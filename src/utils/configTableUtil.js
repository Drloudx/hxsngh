/**
 * 角色数据组装工具
 * 【数据表对应说明】
 * 1. RoleDataTable.json       角色主表：基础属性、职业、种族、属性、地区、支援技能ID、皮肤信息
 * 2. SubSkillDataTable.json   支援技能表：性格/称号/特性，包含描述+Value0~Value2数值
 * 3. UniqueDataTable.json     主动技能表：角色专属主动技能、技能描述、各项数值参数
 * 4. TalentDataTable.json     天赋表：专属/职业/种族/属性/通用天赋，带占位符效果文本
 * 5. RelicsDataTable.json     角色心得表：角色心得数据
 *
 * 字段规则约定：
 * - ID格式：普通角色=纯数字ID，异化角色=ID_001（带下划线）
 * - 复合字段格式："ID,名称"，统一用splitIdName()拆分
 * - 文本占位符：{0} {1} {2} 依次对应 Value0 Value1 Value2
 */

// ==============================================
// 工具方法：内部通用方法，不对外导出
// ==============================================

/**
 * 拆分 "ID,名称" 格式字符串
 * 示例输入："BD20015,神族"
 * 输出：{ id:"BD20015", name:"神族" }
 * @param {string} str 原始复合字符串
 * @returns {{id:string, name:string}}
 */
function splitIdName(str = '') {
  if (!str) return { id: '', name: '' }
  const [id, name = ''] = str.split(',')
  return { id: id.trim(), name: name.trim() }
}

/**
 * 判断当前角色是否为异化皮肤角色
 * 判断依据：角色ID包含下划线 "_"
 * @param {string} roleId 角色ID（来自RoleDataTable.IDs）
 * @returns {boolean} true=异化皮肤角色
 */
export function isAlienRole(roleId = '') {
  return roleId.includes('_')
}

/**
 * 拼接角色完整显示名称
 * 普通角色：直接显示本名
 * 异化皮肤角色：格式 [皮肤名]角色名
 * @param {string} name 角色本名 RoleDataTable.Name
 * @param {string} skinName 皮肤名 RoleDataTable.SkinName
 * @returns {string} 前端展示用全名
 */
export function formatRoleDisplayName(name = '', skinName = '') {
  return skinName ? `[${skinName}]${name}` : name
}

/**
 * 将数组转为ID映射Map，用于根据ID快速查找数据
 * @param {Array} list 原始数据表数组
 * @param {string} keyField 作为key的字段名，固定为IDs
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
 * 自动兼容两种JSON结构
 * 情况A：文件直接为数组
 * 情况B：外层包裹 { DataTable: [...] }
 * 自动提取出纯数组，统一后续处理逻辑
 * @param {Array|Object} jsonData 读取后的原始JSON对象
 * @returns {Array} 纯净数据数组
 */
export function extractDataArray(jsonData) {
  if (Array.isArray(jsonData)) return jsonData
  if (jsonData.DataTable && Array.isArray(jsonData.DataTable)) return jsonData.DataTable
  console.warn('数据格式不兼容，返回空数组', jsonData)
  return []
}


/**
 * 全局占位符替换函数
 * 将文本内 {0} {1} {2} 替换为对应索引的数值
 * @param {string} text 带占位符的原始描述文本
 * @param {Array} values 数值数组，下标对应占位数字
 * @returns {string} 替换完成的可读文本
 */
export function replacePlaceholders(text = '', values = []) {
  return text.replace(/\{(\d+)\}/g, (match, idx) => {
    const num = Number(idx)
    return values[num] !== undefined ? values[num] : match
  })
}

// ==============================================
// 组装方法：单块数据组装逻辑
// ==============================================

/**
 * 组装角色基础信息块
 * 数据源：RoleDataTable.json 单行角色数据
 * 输出字段包含基础信息 + 自动生成的tags标签数组
 * tags固定顺序：大种族Type > 职业Class > 属性Element > 地区Map
 * @param {Object} raw RoleDataTable内单行原始角色对象
 * @returns {Object} 结构化基础信息
 */
function buildBaseInfo(raw = {}) {
  // 拆分种族ID+名称：Race字段格式 "ID,种族名"
  const raceInfo = splitIdName(raw.Race)
  if (raceInfo.id === 'BD20014_000' || raceInfo.name === '夜族') {
    raceInfo.name = '血族'
  }
  // 拆分普攻ID+名称：NormalAttack字段格式 "ID,名称"
  const normalAttackInfo = splitIdName(raw.NormalAttack)
  // 生成前端展示全名，自动携带皮肤前缀
  const displayName = formatRoleDisplayName(raw.Name, raw.SkinName)

  // 自动生成四标签数组：种族、职业、属性、地区，空值自动过滤
  const tags = [
    raw.Type ?? '',
    raw.Class ?? '',
    raw.Element ?? '',
    raw.Map ?? ''
  ].filter(Boolean)

  return {
    id: raw.IDs ?? '',                    // 角色唯一ID
    name: raw.Name ?? '未知角色',         // 角色本名
    displayName,                          // 前端展示全名（含皮肤前缀）
    skinName: raw.SkinName ?? '',         // 皮肤名称，空=本体角色
    isAlien: isAlienRole(raw.IDs),        // 是否异化皮肤角色
    step: raw.Step ?? '',                 // 稀有度 S/A/B/C
    type: raw.Type ?? '',                 // 大种族：神灵/生灵/魔灵/器灵/亡灵
    class: raw.Class ?? '',               // 职业：战士/法师/射手/牧师
    element: raw.Element ?? '',           // 属性：光系/暗系/水系/火系/风系/地系
    map: raw.Map ?? '',                   // 所在地区：星界/雪原/沙滩等
    race: raceInfo,                       // 细分种族 {id,name}
    normalAttack: normalAttackInfo,      // 普攻信息 {id,name}
    source: raw.Source ?? '',             // 获取来源
    background: raw.Background ?? '',     // 背景描述
    characterRole: raw.CharacterRole ?? '',// 定位：输出/防御/辅助
    tags,                                 // 四维标签数组 [种族,职业,属性,地区]
    filterTags: raw.FilterTags ? raw.FilterTags.split(',') : [] // 玩法标签数组
  }
}

/**
 * 组装三项支援技能：性格、称号、特性
 * 数据源：
 *  主数据：RoleDataTable内 Characteristic / SubClass / Feature 三个ID字段
 *  技能详情：SubSkillDataTable.json
 * 自动生成替换完占位符的formattedDesc文本
 * @param {Object} raw RoleDataTable单行角色数据
 * @param {Map} supportMap SubSkillDataTable生成的ID映射表
 * @returns {Object} { characteristic, subClass, feature }
 */
function buildSupportSkills(raw = {}, supportMap = new Map()) {
  // 拆分三个支援技能的ID+名称
  const characteristicInfo = splitIdName(raw.Characteristic)
  const subClassInfo = splitIdName(raw.SubClass)
  const featureInfo = splitIdName(raw.Feature)

  // 星级对应关系：性格=3星，称号=4星，特性=5星
  const starMap = { '性格': 3, '称号': 4, '特性': 5 }

  /**
   * 填充单条支援技能完整数据
   * @param {Object} info {id,name} 拆分后的ID与名称
   * @param {string} type 类型：性格 / 称号 / 特性
   * @returns {Object} 完整技能对象
   */
  const fillSkillData = (info, type) => {
    // 根据ID从技能表取出完整行数据
    const rawSkill = supportMap.get(info.id) || {}
    // 占位符对应 Value0 Value1 Value2
    const valueList = [rawSkill.Value0, rawSkill.Value1, rawSkill.Value2]

    return {
      id: info.id,
      name: info.name || rawSkill.Name || '',
      type,
      star: starMap[type] || 0,
      icon: rawSkill.Icon ?? '',
      description: rawSkill.Description ?? '',          // 原始带占位符文本
      formattedDesc: replacePlaceholders(rawSkill.Description, valueList), // 替换完成的文本
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
 * 组装角色主动技能列表
 * 数据源：UniqueDataTable.json
 * 筛选规则：只保留IDs与当前角色ID一致的技能
 * 占位符约定：{2}=Value，{4}=ExtraValue1，{5}=ExtraValue2，{6}=ExtraValue3
 * @param {string} roleId 当前角色ID
 * @param {Array} skillList UniqueDataTable数组
 * @returns {Array} 角色专属主动技能数组
 */
function buildActiveSkills(roleId = '', skillList = []) {
  return skillList
    .filter(skill => skill.IDs === roleId)
    .map(skill => {
      // 固定下标对应游戏内占位符
      const valueList = []
      valueList[1] = skill.Times
      valueList[2] = skill.Value
      valueList[3] = skill.StatusLayer
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
        description: skill.Description ?? '',          // 原始占位符文本
        formattedDesc: replacePlaceholders(skill.Description, valueList), // 已替换数值
        icon: skill.Icon ?? '',
        isFullScreen: !!skill.FullScreen,
        isMove: !!skill.Move,
        positiveTags: skill.PositiveTags ? skill.PositiveTags.split(',') : [],
        negativeTags: skill.NegativeTags ? skill.NegativeTags.split(',') : []
      }
    })
}

/**
 * 组装天赋分组
 * 数据源：TalentDataTable.json
 * 分组逻辑（互不排斥，多条可同时命中多组）
 * 1. exclusive 专属天赋：SpecifyRoleIDs=当前角色ID，只给对应角色
 * 2. race 种族天赋：Talent.Race = 角色细分种族名称
 * 3. class 职业天赋：Talent.Class = 角色职业Class
 * 4. element 属性天赋：Talent.Element = 角色属性Element
 * 5. common 通用天赋：Race/Class/Element全部为空
 * 自动生成 formattedEffect 替换完占位符的效果文本
 * @param {Object} baseInfo buildBaseInfo产出的角色基础信息
 * @param {Array} talentList TalentDataTable完整数组
 * @returns {Object} 5组分类天赋
 */
function buildTalents(baseInfo = {}, talentList = []) {
  const result = {
    exclusive: [], // 角色专属天赋
    race: [],      // 种族匹配天赋
    class: [],     // 职业匹配天赋
    element: [],   // 属性匹配天赋
    common: []     // 无限制通用天赋
  }

  talentList.forEach(talent => {
    // 预生成替换完占位符的效果文本 {0}{1}{2} → Value0/1/2
    const valueList = [talent.Value0, talent.Value1, talent.Value2]
    talent.formattedEffect = replacePlaceholders(talent.Effect, valueList)

    // 分支1：专属天赋，绑定角色ID，优先归入专属组
    if (talent.SpecifyRoleIDs === baseInfo.id) {
      result.exclusive.push(talent)
      return
    }
    // 绑定了其他角色的天赋直接跳过
    if (talent.SpecifyRoleIDs) return

    // 分支2：种族匹配 → 加入种族组
    if (talent.Race && talent.Race === baseInfo.race.name) {
      result.race.push(talent)
    }
    // 分支3：职业匹配 → 加入职业组
    if (talent.Class && talent.Class === baseInfo.class) {
      result.class.push(talent)
    }
    // 分支4：属性匹配 → 加入属性组
    if (talent.Element && talent.Element === baseInfo.element) {
      result.element.push(talent)
    }
    // 分支5：无任何限制 → 通用天赋
    if (!talent.Race && !talent.Class && !talent.Element) {
      result.common.push(talent)
    }
  })

  return result
}

/**
 * 筛选当前角色的心得
 * 数据源：RelicsDataTable.json
 * 筛选条件：Relics.SpecifyRoleIDs === 角色ID
 * @param {string} roleId 角色ID
 * @param {Array} relicList RelicsDataTable数组
 * @returns {Array} 角色专心得数组
 */
function buildRelics(roleId = '', relicList = []) {
  return relicList.filter(relic => relic.SpecifyRoleIDs === roleId)
}

/**
 * 组装角色心得笔记 (安全兜底，避免全局 buildNotes 未定义时崩溃)
 */
function buildNotes(roleId = '', noteList = []) {
  if (typeof window !== 'undefined' && typeof window.buildNotes === 'function') {
    return window.buildNotes(roleId, noteList)
  }
  return []
}


// ==============================================
// 对外导出：上层业务调用入口
// ==============================================

/**
 * 组装单个角色的完整结构化数据
 * @param {Object} rawRole RoleDataTable单行原始角色对象
 * @param {Object} datasets 全部关联数据表
 * @param {Array} datasets.supportList SubSkillDataTable
 * @param {Array} datasets.skillList UniqueDataTable
 * @param {Array} datasets.talentList TalentDataTable
 * @param {Array} datasets.relicList RelicsDataTable
 * @param {Array} datasets.noteList 心得列表（可选）
 * @returns {Object} 一整条完整角色数据（基础信息+支援+技能+天赋+遗物）
 */
export function getFullCharacter(rawRole = {}, datasets = {}) {
  const {
    supportList = [],
    skillList = [],
    talentList = [],
    relicList = [],
    noteList = []
  } = datasets

  // 支援技能构建ID索引表，提升查询速度
  const supportMap = createMapById(supportList)
  // 先组装基础信息块
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
 * 批量把整份角色表全部组装成完整结构化数据
 * @param {Array} rawRoleList RoleDataTable完整数组
 * @param {Object} datasets 关联数据表集合
 *
 * @returns {Array} 批量完整角色数组
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
 * 根据角色ID精确查询完整角色数据
 * @param {string} roleId 角色IDs
 * @param {Array} rawRoleList RoleDataTable数组
 * @param {Object} datasets 关联数据表
 * @returns {Object|null}
 */
export function getCharacterById(roleId = '', rawRoleList = [], datasets = {}) {
  const raw = rawRoleList.find(item => item.IDs === roleId)
  return raw ? getFullCharacter(raw, datasets) : null
}

/**
 * 按角色名称精确查找
 * 严格区分本体与异化皮肤：
 * 本体角色(无SkinName)：只能用本名匹配
 * 异化角色(有SkinName)：只能用 [皮肤名]角色名 全名匹配
 * @param {string} name 搜索名称
 * @param {Array} rawRoleList 角色原始数组
 * @param {Object} datasets 关联数据表
 * @param {boolean} fuzzy 是否开启模糊搜索
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
    // 精确匹配规则，本体与异化严格分开，不会互相命中
    if (hasSkin) {
      return displayName === name
    } else {
      return item.Name === name
    }
  })

  return raw ? getFullCharacter(raw, datasets) : null
}

/**
 * 关键词模糊搜索一批角色
 * 同时匹配本名和带皮肤前缀的全名
 * @param {string} keyword 搜索词
 * @param {Array} rawRoleList 角色原始数组
 * @param {Object} datasets 关联数据表
 * @returns {Array} 匹配到的完整角色数组
 */
export function searchCharactersByName(keyword = '', rawRoleList = [], datasets = {}) {
  if (!keyword) return []

  const matchedRaw = rawRoleList.filter(item => {
    const displayName = formatRoleDisplayName(item.Name, item.SkinName)
    return item.Name?.includes(keyword) || displayName.includes(keyword)
  })

  return matchedRaw.map(raw => getFullCharacter(raw, datasets))
}

// ===================== 天赋品质权重&色值配置 =====================
/**
 * 根据品质标识获取配置信息（权重、色值、标签）
 * @param {string} step 品质标识 S/A/B/C
 * @returns {Object} {weight:number, color:string, label:string}
 */
function getTalentStepConfig(step = '') {
  const TalentStepConfig = {
    S: { weight: 4, color: '#f97316', label: 'S' },
    A: { weight: 3, color: '#a855f7', label: 'A' },
    B: { weight: 2, color: '#3b82f6', label: 'B' },
    C: { weight: 1, color: '#79C37A', label: 'C' },
    '': { weight: 0, color: '#999999', label: '未知' }
  }
  return TalentStepConfig[step] ?? TalentStepConfig['']
}

/**
 * 天赋数组排序：同名天赋相邻排列，品质从高到低 S>A>B>C
 * @param {Array} talentArr 单分类原始天赋数组
 * @returns {Array} 排序完成的天赋数组（全部品质保留）
 */
function sortTalentAllQuality(talentArr = []) {
  const nameMap = new Map()
  talentArr.forEach(item => {
    const name = item.Name || '无名天赋'
    if (!nameMap.has(name)) nameMap.set(name, [])
    nameMap.get(name).push(item)
  })

  const final = []
  nameMap.forEach(list => {
    list.sort((a, b) => {
      const wa = getTalentStepConfig(a.Step).weight
      const wb = getTalentStepConfig(b.Step).weight
      return wb - wa
    })
    final.push(...list)
  })
  return final
}

/**
 * 天赋数组过滤：同名天赋仅保留最高品质一条
 * @param {Array} talentArr 单分类原始天赋数组
 * @returns {Array} 去重后的天赋数组（每个名称只留最高品质）
 */
function filterTalentOnlyTopQuality(talentArr = []) {
  const nameMap = new Map()
  talentArr.forEach(item => {
    const name = item.Name || '无名天赋'
    const currentWeight = getTalentStepConfig(item.Step).weight
    if (!nameMap.has(name)) {
      nameMap.set(name, item)
      return
    }
    const existItem = nameMap.get(name)
    const existWeight = getTalentStepConfig(existItem.Step).weight
    if (currentWeight > existWeight) {
      nameMap.set(name, item)
    }
  })
  return Array.from(nameMap.values())
}

/**
 * 全局全量天赋分组：整张天赋表按类型分组，保留全部品质天赋
 * 分组规则：专属/种族/职业/属性/通用，组内同名相邻、品质降序排列
 * @param {Array} talentList TalentDataTable 完整原始天赋数组
 * @returns {Object} {exclusive:Array, race:Array, class:Array, element:Array, common:Array}
 */
function getAllTalentsGrouped(talentList = []) {
  const allGroup = {
    exclusive: [],
    race: [],
    class: [],
    element: [],
    common: []
  }

  talentList.forEach(talent => {
    const valueList = [talent.Value0, talent.Value1, talent.Value2]
    talent.formattedEffect = replacePlaceholders(talent.Effect, valueList)

    if (talent.SpecifyRoleIDs) {
      allGroup.exclusive.push(talent)
      return
    }
    if (talent.Race) allGroup.race.push(talent)
    if (talent.Class) allGroup.class.push(talent)
    if (talent.Element) allGroup.element.push(talent)
    if (!talent.Race && !talent.Class && !talent.Element) allGroup.common.push(talent)
  })

  Object.keys(allGroup).forEach(key => {
    allGroup[key] = sortTalentAllQuality(allGroup[key])
  })
  return allGroup
}

/**
 * 全局全量天赋分组：整张天赋表按类型分组，同名只保留最高品质天赋
 * 分组规则：专属/种族/职业/属性/通用，组内同名自动去重仅保留最高品质
 * @param {Array} talentList TalentDataTable 完整原始天赋数组
 * @returns {Object} {exclusive:Array, race:Array, class:Array, element:Array, common:Array}
 */
function getAllTalentsGroupedOnlyTopQuality(talentList = []) {
  const allGroup = {
    exclusive: [],
    race: [],
    class: [],
    element: [],
    common: []
  }

  talentList.forEach(talent => {
    const valueList = [talent.Value0, talent.Value1, talent.Value2]
    talent.formattedEffect = replacePlaceholders(talent.Effect, valueList)

    if (talent.SpecifyRoleIDs) {
      allGroup.exclusive.push(talent)
      return
    }
    if (talent.Race) allGroup.race.push(talent)
    if (talent.Class) allGroup.class.push(talent)
    if (talent.Element) allGroup.element.push(talent)
    if (!talent.Race && !talent.Class && !talent.Element) allGroup.common.push(talent)
  })

  Object.keys(allGroup).forEach(key => {
    allGroup[key] = filterTalentOnlyTopQuality(allGroup[key])
  })
  return allGroup
}

/**
 * 根据单条天赋 + 全角色列表，算出右侧来源标签文本
 * @param {Object} talent 单条原始天赋对象
 * @param {Array<Character>} allChars 全部组装好的角色数组（带id、displayName、class、race.name、element）
 * @returns {string} 展示用来源标签文字
 */

export const getTalentSourceLabel = (talent, allChars = []) => {
  // 1. 专属天赋：绑定SpecifyRoleIDs，找到对应角色名
  if (talent.SpecifyRoleIDs) {
    const targetId = String(talent.SpecifyRoleIDs).trim().toLowerCase()
    const bindRole = allChars.find(c => String(c.id).trim().toLowerCase() === targetId)
    return bindRole ? bindRole.displayName : `专属(${talent.SpecifyRoleIDs})`
  }
  // 2. 种族天赋
  if (talent.Race) {
    return talent.Race
  }
  // 3. 职业天赋
  if (talent.Class) {
    return `${talent.Class}`
  }
  // 4. 属性天赋
  if (talent.Element) {
    return `${talent.Element}`
  }
  // 5. 无任何限制 = 通用天赋
  return '通用'
}


