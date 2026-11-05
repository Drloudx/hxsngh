/**
 * 地图配置 —— 唯一数据源
 *
 * 为什么要有这个文件
 * ------------------
 * 地图名原先散落在 5 处硬编码：
 *   1. src/views/AreaBlockView.vue      mapList + mapMaxLevels
 *   2. src/views/EquipView.vue          mapOptions + getMapWeight
 *   3. src/views/EquipProbView.vue      mapMaxLevels
 *   4. src/views/SynthesisSearchView.vue 地图权重表
 *   5. tools/3_run_probability.py        MAP_LEVELS
 * 游戏加新地图时容易漏改（1.0.3.0 加「无声沼泽」就漏过），
 * 现在前端 4 处统一从本文件取值。
 *
 * 数据来源
 * --------
 * src/assets/World_Map.json（由 tools/1_sync_tables.py 从官方服务端同步）
 *   · Name          地图名
 *   · InitialDiffi  初始难度（用作「地图难度」）
 *   · PreviousMap   前置地图（用于排序，形成解锁链）
 *
 * 注意
 * ----
 * tools/3_run_probability.py 是独立 Python 脚本，仍保留自己的 MAP_LEVELS
 * （它跑在 Node 之外，无法 import 本文件）。用 tools/check_map_config.py 校验两边一致。
 */
import worldMapData from '@/assets/World_Map.json'

const WORLD_MAP = (Array.isArray(worldMapData)
  ? worldMapData
  : (worldMapData?.DataTable || Object.values(worldMapData || {})))
  // 「星界秘境」不是可刷图地图（秘境玩法），排除在筛选项之外
  .filter(m => m && m.Name && m.Name !== '星界秘境')

/** 按前置关系排序后的地图名列表（不含「全部」「世界」这类伪选项） */
export const MAP_LIST = (() => {
  const byName = new Map(WORLD_MAP.map(m => [m.Name, m]))
  const ordered = []
  const visited = new Set()

  // 顺着 PreviousMap 链推进；链断了就把剩余地图按 InitialDiffi 补在后面
  let cur = WORLD_MAP.find(m => !m.PreviousMap || !byName.has(m.PreviousMap))
  while (cur && !visited.has(cur.Name)) {
    ordered.push(cur.Name)
    visited.add(cur.Name)
    const next = WORLD_MAP.find(m => m.PreviousMap === cur.Name && !visited.has(m.Name))
    cur = next
  }
  WORLD_MAP
    .filter(m => !visited.has(m.Name))
    .sort((a, b) => (a.InitialDiffi || 0) - (b.InitialDiffi || 0))
    .forEach(m => ordered.push(m.Name))

  return ordered
})()

/**
 * 地图 → 初始难度（用于地块图鉴/装备概率的等级换算）
 *
 * ⚠️ 换算规则：项目里的「地图等级」= World_Map.InitialDiffi + 99
 *    （由 15 张老图逐一核对得出，不是猜的）
 *    例：新生平原 InitialDiffi=1 → 100；枯木丛林 121 → 220；无声沼泽 131 → 230
 */
export const MAP_LEVEL_OFFSET = 99

export const MAP_MAX_LEVEL = Object.fromEntries(
  WORLD_MAP.map(m => [m.Name, (m.InitialDiffi || 0) + MAP_LEVEL_OFFSET])
)

/**
 * 地图 → 排序权重（1 起，按 MAP_LIST 顺序递增）。
 * 用于装备筛选「相同品质按地图排序」。
 */
export const MAP_WEIGHT = Object.fromEntries(
  MAP_LIST.map((name, i) => [name, i + 1])
)

/** 「世界」伪选项（不代表具体地图，排在所有地图之前） */
export const WORLD_ENTRY = '世界'

/**
 * 装备筛选页的完整下拉选项：全部 → 世界 → 各地图
 * @returns {{label: string, value: string}[]}
 */
export function getMapOptions() {
  return [
    { label: '全部', value: 'all' },
    { label: WORLD_ENTRY, value: WORLD_ENTRY },
    ...MAP_LIST.map(name => ({ label: name, value: name })),
  ]
}

/** 取地图排序权重，未知名次排最后 */
export function getMapWeight(map) {
  if (map === 'all') return 0
  if (map === WORLD_ENTRY) return 0.5
  return MAP_WEIGHT[map] ?? 99
}

/** 取地图难度，未知返回默认值 */
export function getMapMaxLevel(map, fallback = 100) {
  return MAP_MAX_LEVEL[map] ?? fallback
}
