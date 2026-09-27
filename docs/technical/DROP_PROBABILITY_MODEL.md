# 掉落概率模型（金装刷取难易度）

> 覆盖 `tools/3_run_probability.py`（852 行蒙特卡洛模拟器）、结果 JSON 契约、`/equip-prob` 页面算法，以及与游戏反编译源码的一致性核对。
> 数据表字段见 [DATA_TABLES.md](DATA_TABLES.md)。源码位于工作区 `E:\Desktop\html\hsxngh\游戏数据\源码\MainScripts\`。

## 1. 这个模型回答什么问题

> 「我想刷某件金装，平均要打多少场？」

它统计的是**敌方身上携带该装备的机会率**（遇见率），**不是掉落率**。结果 JSON 里 `metric = "map_farm_source_enemy_equipped"`、`isWholeMapProbability: false` 就是这句免责声明。

### 1.1 遇见率 ≠ 到手率（量级差约 10~30 倍）

两步是分开的：

1. **敌人带了什么** —— 由 `GenerateEquipForEventRole` 决定 → 这就是本模型算的；
2. **实际掉几件** —— 由战斗结算的骰点决定（`BattleResultPanel` 按 `DropPossi` 掷骰）。

第 2 步的抽取池是**全部敌人身上约 10~30 件装备**，而不放回抽取的件数期望约 **1.04 件/场**（按 `Dice.json` 权重与 `EquipNum/DropPossi` 精算）。

所以：

```
单场到手率  ≈  单场遇见率 × (1.04 / 池大小)  ≈  遇见率 × (0.03 ~ 0.10)
```

**`approxBattles` 的含义是「平均多少次机会遇见一次」，不是「平均刷几场到手」。** 页面文案「单次可刷战斗机会遇见率」在措辞上是诚实的，但读的人极易误解，文档和 UI 都应显式区分这两个概念。

统计范围（`_meta.sources` / `_meta.excludes`）：

| 计入 | 不计入 |
| --- | --- |
| 多格地块自带的战斗 | 异界传送门 |
| 指定一格地块探索后翻出的战斗 | 星界秘境 |
| | 战斗结算骰点 |

## 2. 运行方式

### 2.1 ⚠️ `tools/README.md` 里的命令目前**跑不通**

README 写的是：

```powershell
python tools/3_run_probability.py --map 夏日海滩 --trials 2000000 --workers 8
```

但脚本的 `--profile-mode` **默认值是 `server-samples`**，该模式下不给 `--block-samples` 会直接 `parser.error` 退出：

```
error: 精确统计需要 --block-samples；近似统计请显式使用 --profile-mode area-spot-weighted
```

**实测退出码 2，什么都没跑。** README 尚未同步这一改动。

### 2.2 真正可用的命令

```powershell
# 近似模式跑单图（推荐）
python tools/3_run_probability.py --map 夏日海滩 --trials 2000000 --workers 8 --profile-mode area-spot-weighted

# 跑全部 15 张图
python tools/3_run_probability.py --map all --trials 2000000 --workers 8 --profile-mode area-spot-weighted

# 快速调试
python tools/3_run_probability.py --map 夏日海滩 --trials 10000 --profile-mode area-spot-weighted

# 精确模式（需要服务端地块样本）
python tools/3_run_probability.py --map all --trials 2000000 --workers 8 --block-samples blocks.json
```

### 2.3 环境与耗时

- **纯标准库**（`argparse/json/multiprocessing/os/random/time/collections`），无需 pip 安装。README 里提到的 `UnityPy`/`Pillow` 只属于 `2_extract_images.py`。
- Windows 下 `multiprocessing` 是 spawn 启动，脚本已加 `mp.freeze_support()`。
- 控制台编码：建议 `chcp 65001` 或 `$env:PYTHONIOENCODING='utf-8'`。

| 规模 | 实测耗时 |
| --- | --- |
| 单进程吞吐 | ≈ 1900~2150 trials/s |
| 单图 200 万次 / 8 进程 | ≈ 2 分钟 |
| 全 15 图 200 万次 / 8 进程 | ≈ 30 分钟 |
| 全 15 图 **代码默认 1000 万次** | ≈ 2.6 小时 |

已发布的 `simulation_exact_results.json` 里 `trials: 2000000`，说明线上数据是用 200 万次跑的。

### 2.4 ⚠️ 副作用：会覆写 `map_equip_difficulties.json`

`main()` 无条件读取并写回 `src/assets/map_equip_difficulties.json`（`:804-847`），**即使只跑一张图也会改写**。而该文件在 `src/` 下**零引用**，属于死资产。跑模拟前建议先备份或直接忽略其变化。

## 3. 两种 profile 模式

| 模式 | 地块样本来源 | 精度 |
| --- | --- | --- |
| `server-samples`（默认） | `--block-samples` 传入的服务端地块样本 | `precision: "server-sampled"` |
| `area-spot-weighted` | 按 `Area_Spot.json` 权重从表推算 | `precision: "table-weighted-estimate"` |

线上数据是 `area-spot-weighted`（见 `_meta.profileMode`）。

`area-spot-weighted` 怎么造 profile（`build_area_spot_profiles`，`:291-322`）：

- 合法地块：`legal_for_map` ∧ `MinDiffi <= 难度` ∧ `SpotSize != 35`（35 = 传送门）∧ `Weight > 0`
- **多格自带战斗**：`SpotSize > 1` ∧ `SpecialSpot == 0` → `battleType='NormalBattle'`、`isBoss=False`、权重 = `Area_Spot.Weight`、**战斗概率 100%**
- **一格探索翻战斗**：`SpotSize == 1` ∧ `EventNum` 上限 > 0 ∧ `RoleWeight > 0` → 战斗概率 = `RoleWeight / (IngredientWeight + RoleWeight + ChestWeight + ItemWeight)`

实测：每张图 15~16 个 profile（14~15 个多格 + 1 个一格）。一格地块全表恰好 15 个（每图 1 个），`EventNum` 均为 `1-1`、`RoleWeight=3700`、`ChestWeight=6000`，故战斗概率 `3700/9700 ≈ 38.14%`。

> **该模式的已知局限**：不产生 Boss 地块、不产生稀有战斗，且 profile 权重只用 `Area_Spot.Weight`，**未乘 `SpotSize`、未用 `MaxNum`、未用 `Difficulty_Spec` 的 `MidBlockNum/BigBlockNum/HugeBlockNum`**。

### 3.1 ⚠️ 为什么整个坠落模型都带着"未经验证"的底色

**真实地图由服务端下发，客户端的两个生成函数是死代码。** 这一点已实测确认：

| 函数 | 位置 | 全 3677 个 .cs 中的出现次数 |
| --- | --- | --- |
| `SandTable.GenerateBlockBattleEvent` | `SandTable.cs:190` | **只有定义，无调用点** |
| `ExploreEnd.GenerateBlockEvents` | `ExploreEnd.cs:327` | **只有定义，无调用点** |

真实路径是 `MapMenu.cs` 里的 `GameApi.Explore.StartExploreAsync(...)` → `GeneralHelper.ConvertExploreMap(reply.ExploreMap)` —— **整张地图（地块列表、地块棋盘、事件、战斗队伍）由服务端返回**。这与脚本头部注释（`:8-10`）的说法一致。

推论：

- `server-samples` 模式之所以是默认值，正是因为只有服务端样本才代表真实布局；
- **`area-spot-weighted` 模式的全部权重（事件权重、地块出现频率、Boss/稀有战分布）都是未经服务端验证的推断**，线上数据就是这一档；
- 客户端那两个函数只能当"参考实现"读，不能当"真实行为"读。

### 3.2 ⚠️ 客户端硬编码权重表与服务端修正表不一致

`WeightTableHelper.cs:5-19` 的两张表（模拟器逐值复刻，见 §4.1）与 `src/assets/Battle_Weight_Correction.json` 的 8 行**数值不同**：

| 行 | 客户端硬编码 | `Battle_Weight_Correction.json` |
| --- | --- | --- |
| `battleC` | `0, -0.7, -0.9, -1, 0` | `0, 0, -0.5, -1, 0` |
| `battleB` | `-0.5, 0, -0.7, -0.9, 0` | `-0.25, 0, 0, -0.5, 0` |
| `battleA` | `-0.5, -0.5, 0, -0.7, 0` | `-0.5, -0.25, 0, 0, 0` |
| `battleS` | `-0.5, -0.5, -0.5, 0, 0` | `-0.99, -0.5, -0.25, 0, 0` |
| `prefixC` | `0.5, 0.5, 0, -0.5, 0` | `0.5, 0.5, 0, 0, 0` |
| `prefixB` | `-0.5, 0.5, 0.5, 0, 0` | `-0.24, 0.5, 0.5, 0, 0` |
| `prefixA` | `-0.5, 0, 0.5, 0.5, 0` | `-0.49, -0.24, 0.5, 0.5, 0` |
| `prefixS` | `-0.5, -0.5, 0.5, 0.5, 0` | `-0.49, -0.49, -0.24, 0.5, 0` |

（行列方向一致：行 = 事件/词条阶 C,B,A,S；列 = 装备阶 C,B,A,S,SS）

而且**客户端根本不加载 `Battle_Weight_Correction`**：它在整个 `MainScripts` 里只作为服务端 SDK 的配置 DTO 出现（`GameConfig.cs:40-42`、`BattleWeightCorrectionEntry.cs:9`），`DataTableManager` 里零引用。

**结论**：模拟器硬编码的是**客户端**那套（这点复刻没错），但真实掉落由服务端生成，服务端用的大概率是 JSON 那套。**这是本模型最大的单点不确定性。** 若要提升置信度，应做双跑对比（把两张表换成 JSON 值再跑一遍，看结论差异）。

> `Battle_Weight_Correction.json` 留在 `src/assets/` 里但前端无人引用，容易被误当成"当前生效值"。

## 4. 一次「战斗」的完整流程

`worker()` 主循环（`:544-659`），每次 trial：

```
1. 按 profile 权重抽一个地块 profile
       profile = prepared_profiles[wpick(profile_weights)]

2. 战斗是否发生
       if random.random() >= profile['battleProbability']: continue
       多格自带战斗恒为 1.0；一格探索 = RoleWeight/ΣW

3. 抽战斗事件
       ev = profile['events'][wpick(profile['eventWeights'])]

4. 组队 get_fight_event_pure_role_list(ev)
       - 「冒险小队」特判：战士1 + 非战士1 + (法师|射手)1 = 3 人
       - 否则人数 = 1（稀有）或 range_random(EnemyNum{事件阶})
       - MustRole 全部入队
       - ProbRole 按 Weight 无重复抽取，appeared_role 初始为 [MustRole 整串]
       - 按 CLASS_POSITION 排序

5. 分配加护词条
       - 自带战斗：count = int(PrefixNum + ExtraPrefix) + 小数进位（不封顶）
       - 探索战斗：count = min(同式, 1)，稀有时至少 1 且全队 isBoss
       - 每个目标走 decide_role_prefix() 掷词条品阶再抽具体词条

6. 逐角色生成装备（10 个槽位）
       - 槽位顺序：等权时全排列；否则按 [武器,护甲,武器,护甲,饰品,部件,饰品,部件,饰品,部件] 加权不放回
       - 件数 get_role_equip_count()：稀有=10；Boss≥BossEquipMinNum；带词条 +1 或 +(词条阶-1)；上限 10
       - 候选池 = 该槽位 × 该职业（含「全职」）
       - 羁绊过滤 → 权重重抽（含一次「失败权重」项，失败则退回全池）
       - 命中后把 Pure/Title 的词条值累加进 appear_bond

7. 红装/SS
       仅当事件阶 ≥ A：
         denom = 10000（A阶） 或 1000（S阶）
         对职业匹配的每件 SS 累加期望 1/denom/len(ss_pool)
         另真实掷一次骰，命中则覆盖对应槽位

8. 计数
       battle_encountered = 该场所有角色身上装备的 ID 集合（去重）
       cnt[id] += 1        ← 一场战斗每件装备只记 1 次
```

### 4.1 权重的两层修正

装备抽出权重由两张硬编码修正表决定，它们是游戏 `WeightTableHelper` 的副本：

```python
EVENT_CORR  = [[0,-0.7,-0.9,-1.0,0], [-0.5,0,-0.7,-0.9,0],
               [-0.5,-0.5,0,-0.7,0], [-0.5,-0.5,-0.5,0,0]]   # eventStepWeightTable
PREFIX_CORR = [[0.5,0.5,0,-0.5,0], [-0.5,0.5,0.5,0,0],
               [-0.5,0,0.5,0.5,0], [-0.5,-0.5,0.5,0.5,0]]     # prefixWeightTable
```

```
装备权重 = int(max(0, 1 + Fix(装备阶) + EVENT_CORR[事件阶-1][装备阶-1]
                            + PREFIX_CORR[词条阶-1][装备阶-1]) * Equip.Weight)
```

另有「失败权重」项 `int((1 + Fix(事件阶)) * STEP_W[事件阶])`，其中 `STEP_W = {C:10000, B:1000, A:100, S:10}`，**每槽只加一次**；选中它则退回全池重抽。

> `list3 is list2` 这段（`:617-618`）刻意用了 `is` 而不是 `==`，因为 C# 源码里比较的是 `List` 的**引用相等**。这是一处必须保留的复刻细节。

### 4.2 难度系数表

`Difficulty_Spec.json` 按 `Difficulty` 字段（1~300 连续）查表，`dc = {'C':FixC,'B':FixB,'A':FixA,'S':FixS,'SS':FixS}`。

实测 15 张图对应难度 ≥ 100 的行：`FixC ∈ [-0.5, -0.1]`、`FixB = 0`、`FixA ∈ [0.6, 1.0]`、`FixS ∈ [0.3, 0.5]`。

## 5. 输出契约

### 5.1 `simulation_exact_results.json`

```json
{
  "_meta": {
    "sourceModel": "map_farm_sources_v3",
    "sourceVersion": "1.2.0",
    "metric": "map_farm_source_opportunity",
    "profileMode": "area-spot-weighted",
    "precision": "table-weighted-estimate",
    "sources": ["多格地块自带战斗", "指定一格地块探索翻出的战斗"],
    "excludes": ["异界传送门", "星界秘境", "战斗结算骰点"],
    "isWholeMapProbability": false
  },
  "夏日海滩": [
    {
      "id": "Z00103_401", "name": "净水之瓶", "step": "SS", "class": "牧师", "type": "副手",
      "weight": 0, "drops": 8.30055, "encounters": 8.30055, "trials": 2000000,
      "metric": "map_farm_source_enemy_equipped",
      "estimator": "conditional_expectation",
      "difficulty": "very_hard", "difficultyName": "极难", "diffName": "极难",
      "probPercent": 0.00041503, "probStr": "0.0004%", "approxBattles": 240948
    }
  ]
}
```

| 字段 | 含义 |
| --- | --- |
| `id` / `name` | `Equip.IDs` / `Equip.Name`；图标路径 `/Equip/{id}.png` |
| `step` | 只输出 `S` 与 `SS` |
| `class` / `type` | 职业（可为「全职」或逗号多职业）/ 槽位 |
| `weight` | `Equip.Weight` 原值（SS 全为 0） |
| `drops` / `encounters` | S 阶 = 整数遇见次数；**SS 阶 = 条件期望（浮点）**。两字段同值，冗余 |
| `trials` | 本图抽样次数 |
| `estimator` | `monte_carlo`（S）或 `conditional_expectation`（SS） |
| `difficulty` | `very_easy` / `normal` / `rather_hard` / `very_hard` |
| `difficultyName` / `diffName` | 较易/一般/较难/极难，两字段同值（兼容旧代码） |
| `probPercent` | **百分比数值**（`cnt/trials*100`），不是 0~1 概率 |
| `probStr` | 固定 4 位小数的字符串，如 `"0.1344%"` |
| `approxBattles` | `round(100/probPercent)` = 平均多少次机会遇见一次 |

**当前数据规模**：15 张图、共 435 行（每图 28 行，荒凉戈壁 31、无尽荒漠 34、枯木丛林 34）。

### 5.2 `map_equip_difficulties.json`（死资产）

结构 `{地图名: {装备ID: {difficulty, difficultyName}}}`，15 个地图 key。

**但它已经陈旧且无人引用**：文件里实测存在 `hard/难`（168 条）、`easy/易`（63 条）两档，而当前 `difficulty()` 函数**只能产出 4 档**（`very_easy/normal/rather_hard/very_hard`）。说明该文件是**旧版多档方案的残留**，且脚本"读旧 + 只覆盖本次跑的地图 + 原样写回"会让新老口径长期混在一起。

前端 `/equip-prob` 实际读的是 `simulation_exact_results.json` 里的 `difficulty` 字段。

## 6. 难度评级

### 6.1 模拟器内置（绝对口径）

```python
def difficulty(p):          # p 是 probPercent（百分比）
    if p >= 0.20: return 'very_easy', '较易'
    if p >= 0.10: return 'normal',    '一般'
    if p >= 0.04: return 'rather_hard','较难'
    return 'very_hard', '极难'
```

SS 阶在页面上被**强制为极难**，不参与阈值判定。

阈值是**纯人为口径**，游戏任何表里都没有对应物。

### 6.2 页面的相对口径（`EquipProbView.vue`）

页面提供 `evalMode` 切换，`relative` 模式是**页面自创、模拟器不产出**的：

1. 排除 SS 后按 `probPercent` 降序，`relRankMap[id] = 排名 / 总数`；
2. `< 0.20` 较易、`< 0.50` 一般、`< 0.85` 较难、否则极难；
3. SS 同样强制极难。

两套阈值的关系：绝对口径回答"这装备稀有吗"，相对口径回答"在这张图里算好刷的吗"。

## 7. 与游戏源码的一致性核对

模拟器在关键路径上**刻意复刻了 C# 逻辑**，代码里多处保留了源码引用注释（如 `# ExploreSceneManager.cs:628-784 GenerateEquipForEventRole`）。

### 7.1 已核对一致

| # | 项 | C# 位置 | Python |
| --- | --- | --- | --- |
| 1 | 10 槽位顺序与权重展开 | `ExploreSceneManager.cs:662` | `:68, 358-360` |
| 2 | 候选筛选（槽位 × 职业，含全职） | `ExploreSceneManager.cs:668` | `:471` |
| 3 | 羁绊过滤 + 两阶段重抽 + **引用相等** | `ExploreSceneManager.cs:675-706, 734` | `:596-620` |
| 4 | 装备权重公式与两张修正表 | `WeightTableHelper.cs:5-19` | `:53-66, 455-466` |
| 5 | 「失败权重」项 `STEP_W` | `GeneralHelper.cs:149-168` | `:43, 612-614` |
| 6 | 羁绊累加只用 Pure/Title；`bondNames` 含 Enhance | `ExploreSceneManager.cs:749-772` | `:448-452, 626-629` |
| 7 | 羁绊上限 = `BondNum` 最后一个值 | `BondDataTable.cs:57-61` | `:337-340` |
| 8 | 装备件数（稀有 10 / Boss 下限 / 词条加成 / 上限 10） | `ExploreSceneManager.cs:637-660` | `:279-288` |
| 9 | 词条数量（自带不封顶 / 探索封 1） | `SandTable.cs:196-197`、`ExploreSceneManager.cs:431-442` | `:124-126, 184-193` |
| 10 | 词条分配优先级（Boss 优先，再取最高可用品阶） | `SandTable.cs:223-238` | `:242-276` |
| 11 | `DecideRolePrefix` 权重与合法性过滤 | `RoleHelper.cs:251-299` | `:523-539, 473-482` |
| 12 | 事件池类型过滤与权重 | `ExploreSceneManager.cs:933-999` | `:144-155, 425-428` |
| 13 | 队伍人数 / MustRole / ProbRole / `appearedRole` 整串初始化 | `BattleEventDataTable.cs:41-52`、`ExploreSceneManager.cs:544-589` | `:497-518` |
| 14 | 「冒险小队」特判 + `CLASS_POSITION` 排序 | `ExploreSceneManager.cs:535-543, 594-607` | `:486-495, 231-239` |
| 15 | 红装概率（A阶 1/10000、S阶 1/1000）与职业匹配覆盖 | `ExploreSceneManager.cs:491-529` | `:632-650` |

### 7.2 已核对**不一致**

| # | 项 | 说明 |
| --- | --- | --- |
| 1 | **Boss 在词条数为 0 时仍应得到词条** | `SandTable.cs:223-227` 对 Boss 无条件 `DecideRolePrefix(mustHave: true)` 并 `num2--`（可为负）；Python `:248-259` 只在 `remaining > 0` 时才给 |
| 2 | **`area-spot-weighted` 不产生 Boss/稀有战斗** | 见 §3 |
| 3 | **全零权重的兜底行为** | C# 返回随机下标；Python `wpick` 返回 `-1`，再由 `:622` 强制改 0 |
| 4 | **空区间字符串** | C# `RangeRandom("")` 会抛异常；Python 用 `.get(..., '0')` 兜底 |
| 5 | **`dc` 给 SS 借用了 FixS** | `:357` `'SS': d['FixS']`，而 C# `GetDifficultyCorrection` 对 SS 返回 0。因 `pool` 已排除 SS（`:350`），当前无影响 |
| 6 | **`Difficulty_Spec` 难度 1~20 的 `FixC = 100`** | 实测存在该值；若地图难度落在 1~20，`1 + FixC = 101` 会把 C 阶事件权重放大 101 倍。当前 15 图难度均 ≥ 100，**不受影响但属潜在炸弹** |

### 7.2.1 刻意与源码不同的地方

| 项 | 做法 | 原因 |
| --- | --- | --- |
| **世界通用装备** | 输出时用 `e['AreaName'] == map_name` 过滤（`:712-715`），**只出该地图专属装备**；模拟池仍按 `legal_for_map` 把「不限」/「世界」装备一起放入参与抽取 | **产品决定：不做世界装备**。实测 `Equip.json` 里有 48 件 S 阶 + 1 件 SS（贤者之石 `Z00000_942`）属 `AreaName = 不限`，它们会在抽取池里与地图专属装备竞争权重（因此影响分母），但**不单独上榜**。这是有意为之，不是漏报 |

### 7.3 无法确认

- `SandTable.GenerateBlockBattleEvent`（多格自带战斗的真实生成逻辑）与 `ExploreEnd.GenerateBlockEvents`（一格探索翻事件）在 3677 个 .cs 中**都只有定义没有调用点**，真实地图由服务端 `/Explore/StartExplore` 下发（见 §3.1）→ `area-spot-weighted` 的加权方式无法从客户端源码验证。
- 商人/宝库的概率公式只在服务端（`GambleShopPurchaseAsync` / `InitGoldenVaultAsync`），页面是对表权重的统计推断。
- `Difficulty_Spec` 的 `WeaponPossi/ArmorPossi/TrinketPossi/PartPossi` 只有 4 个字段而槽位有 10 个，两边都按 `[武器,护甲,武器,护甲,饰品,部件,饰品,部件,饰品,部件]` 展开，但源码**没有注释说明**为何这样排。→ 实现一致，语义未证实。

### 7.4 潜伏缺陷（当前数据未触发，新版本可能踩到）

| # | 缺陷 | 触发条件 | 影响 |
| --- | --- | --- | --- |
| 1 | **低难度图会写错槽位** | 某难度的**非零槽位数 < 装备件数**时，`wpick` 在剩余权重全 0 时返回 `-1`（`:99-107`），`cur_slot_w[-1] = 0` 误清零末位，随后 `SLOT_LIST[-1]` 两件装备写进同一槽位互相覆盖 | 少统计一件装备。实测有 **40 个难度行**（难度 1~40）满足条件，例如难度 1 只有 4 个非零槽位而 `RoleEquipNumS` 可达 6。**当前 15 张图难度均 ≥ 100（10 个槽位全非零），不受影响**；新增低难度地图即会踩雷 |
| 2 | **`"冒险小队"` 特判是死分支** | `Battle_Event.json` 177 条里**没有名为「冒险小队」的条目**（实测） | Python `:486-495` 与 C# `ExploreSceneManager.cs:535-543` 的整段特判永不执行。属无害死代码，但读代码时容易被误导 |
| 3 | **`Battle_Event.RoleNum` 字段零引用** | 队伍人数实际用 `Difficulty_Spec.EnemyNum{Step}` | 死数据 |
| 4 | **`ExploreSceneManager.RedEquipAppearPossi` 常量零引用** | 红装概率实际用 `10000/1000` 硬编码 | 死常量 |
| 5 | **`dc` 给 SS 借用了 FixS**（见 7.2-6） | `pool` 已排除 SS | 当前无影响 |

## 8. 维保要点

### 8.1 必须手工同步的硬编码副本

这些常量在 C# 里本来就是硬编码的，脚本无法从数据表读，**游戏改版必须手工同步**：

| Python 常量 | 对应 C# | 位置 |
| --- | --- | --- |
| `MAP_LEVELS`（15 张图 → 难度） | 无表可查（`World_Map.InitialDiffi` 不是同一量） | `:20-36` |
| `STEP_W` | `GeneralHelper.GetWeightByStep` | `:43` |
| `EVENT_CORR` | `WeightTableHelper.eventStepWeightTable` | `:53-58` |
| `PREFIX_CORR` | `WeightTableHelper.prefixWeightTable` | `:61-66` |
| `SLOT_LIST` | `GeneralHelper.EquipType` | `:68` |
| `CLASS_POSITION` | `GeneralHelper.ClassPosition` | `:70` |

### 8.2 地图清单有三份副本

| # | 位置 | 用途 |
| --- | --- | --- |
| 1 | `tools/3_run_probability.py:20-36` `MAP_LEVELS` | 模拟器 |
| 2 | `src/views/EquipProbView.vue:288-304` `maxLevels` | 页面地图等级 |
| 3 | `src/views/AreaBlockView.vue:490-506` `mapMaxLevels` | 地块页地图等级 |

**新增地图必须同时改三处**（内容相同但独立维护）。另外 `EquipView.vue:533-547` 还有第四份地图名清单。

### 8.3 版本哨兵

`main()` 写入 `_meta.sourceModel = 'map_farm_sources_v3'`，页面用 `simulationMeta.sourceModel !== 'map_farm_sources_v3'` 判断数据是否过期并显示横幅。**改版本号必须两边同时改**，否则页面永远弹「数据待更新」。

### 8.4 可复现性

随机种子固定为 `9000 + i`（`i` 是进程号），**与地图无关**。所以：
- 同一命令重复运行结果完全一致（可复现）；
- 但改 `--trials` 会改变每个 worker 的样本量，结果**不是**嵌套一致的，不能用来做收敛性检验。

## 9. 相关页面

| 路由 | 页面 | 数据来源 | 计算位置 |
| --- | --- | --- | --- |
| `/equip-prob` | 金装刷取难易度 | `simulation_exact_results.json` | 离线 Python（本文档） |
| `/gambleshop` | 商人/宝库概率 | `GambleShop.json` / `GoldenVault.json` | 浏览器端权重占比 |
| `/other-prob` | 委托 + 地图红装概率 | `Task.json` / `Equip.json` | 浏览器端 |

后两者的细节见 [SPEC §3.14~3.17](../SPEC.md)。
