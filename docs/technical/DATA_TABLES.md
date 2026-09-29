# 数据表与 ID 规则

> 本文档定义 `src/assets/*.json` 的字段契约、ID 前缀语义、占位符规则，以及「服务端表 / 本地表」的边界。
> 数据表的拉取与更新流程见工作区 `E:\Desktop\html\hsxngh\游戏数据\README.md`。

## 1. 数据来源与边界

### 1.1 两类文件

`src/assets/` 下 57 个 JSON 分两类，**维护方式完全不同**：

| 类别 | 数量 | 来源 | 能否自动覆盖 |
| --- | --- | --- | --- |
| 服务端配置表 | 53 | `POST https://api.monster-girls-guild.chillyroom.com/GameDataTable/FetchDataTable` | ✅ 可被 `tools/1_sync_tables.py` 整表覆盖 |
| 本地文件 | 4 | 人工 / 模拟生成 | ❌ 自动化流程必须跳过 |

**4 个本地文件**（`tools/1_sync_tables.py` 的 `LOCAL_ONLY_FILES`）：

| 文件 | 性质 | 维护方式 |
| --- | --- | --- |
| `notices.json` | 更新公告 | 手工写，格式见 §5 |
| `data.json` | 指定招募的常驻池角色 | **纯手工**，口径见 §5 |
| `map_equip_difficulties.json` | 掉落难度评级 | 由 `tools/3_run_probability.py` 生成 |
| `simulation_exact_results.json` | 蒙特卡洛模拟原始结果 | 由 `tools/3_run_probability.py` 生成 |

> **红线**：任何时候都不要让同步脚本覆盖这 4 个文件，也不要手工编辑后两个（重跑模拟会冲掉）。

### 1.2 只有 22 张表被前端实际使用

其余 30 余张表虽然在 `src/assets/` 里，但**没有任何视图 import**。它们保留是为了：

- 后续功能扩展时不必重新拉表；
- 交叉核对（例如用 `Area_Spot.json` 校验地块图 ID，用 `World_Map.json` 校验地图名）。

判断某表是否在用，直接搜 import：

```powershell
Select-String -Path src\views\*.vue -Pattern "assets/<表名>\.json"
```

当前被 import 的表见 [SPEC 的数据与来源](../SPEC.md#五数据与来源)。

## 2. ID 前缀语义（实测）

游戏用**字母前缀 + 数字**编码对象类型，前缀是跨表的关联键。以下为 2026-09-27 实测结果：

| 前缀 | 表 | 示例 | 说明 |
| --- | --- | --- | --- |
| `M` | `Role.json` | `M11307` | 角色本体；**异化/皮肤角色带下划线**：`M11307_000` |
| `M` | `Unique.json` | `M11307` | 主动技能，**与角色共用 ID**，靠 `Owner` 字段反向关联 |
| `M` | `Summon.json` / `Skin_Summon.json` | `M11307` | 招募池条目，同样是角色 ID |
| `TF` | `Talent.json` | `TF01033` | 天赋；`_000` / `_001` 后缀是**同名不同品质/等级**的变体 |
| `BD` | `Sub_Skill.json` | `BD10548` | 支援技能（性格/称号/特性）；`Role.json` 的 `Race` 字段也用 `BD` 前缀（如 `BD20015,神族`） |
| `JN` | `Bond.json` | `JN00001` | 羁绊词条 |
| `XD` | `Relics.json` | `XD13001` | 心得 |
| `F` | `Rune.json` | `F10001` | 符文；`_001`~`_0xx` 是符文的不同格位/套装件 |
| `CZ` | `Rune_Material.json` | — | 符文材料 |
| `LM` | `Lime.json` | `LM01001` | 莱姆 |
| `BS` | `Godstone.json` / `GodstoneEffect.json` | `BS60000` | 神石与神石效果 |
| `JH` | `Prefix.json` | `JH10042` / `JH40042` | 怪物加护；数字首位 1/2/3/4 对应 C/B/A/S 阶 |
| `Z` | `Equip.json` | `Z00000_000` | 装备 |
| `S` | `Area_Spot.json` | `S00001_000` | 地块（`S+5位地块号_3位格子号`） |
| `YW` | `Dungeon_Relic.json` | `YW00001` | 星界秘境遗物 |
| `YY` | `Foretell.json` | `YY00001` | 预言 |
| `A` | `World_Map.json` | `A00001` | 世界地图/地区 |
| `SR` | `GambleShop.json` | — | 商人商店 |
| `BK` | `GoldenVault.json` | — | 黄金宝库 |
| `RW` | `Task.json` | — | 任务 |
| `T` | `Status.json` | `T10001` | 状态 |
| `D` | `Special_Item.json` | `D00002` | 特殊道具 |
| `BX` | `Chest.json` | — | 宝箱 |
| `JS` | `Battle_Event.json` | — | 战斗事件 |
| `AX` | `Map_Effect.json` | — | 地图效果 |
| `JC` | `Theater.json` | — | 剧场/剧情 |
| `HD` | `Seven_Days.json` | — | 七日任务 |
| `CJ` | `Achievement.json` | — | 成就 |
| `MW` | `Monster.json` | — | 怪物 |
| `Basic*` | `Basic_Attr.json` | `Basic...` | 基础属性成长 |
| `difficulty*` | `Difficulty_Spec.json` | `difficulty...` | 难度规格 |

### ⚠️ 两个易错点

1. **羁绊表 ID 与图标 ID 不同名**：`Bond.json` 的 `IDs` 是 `JN00001`，但它的图标 ID 在 **`BadgeIDs`** 字段里，形如 `HZ00068`。
2. **`Bond` 图标资源当前无人引用**：全仓库搜索 `HZ` 或 `Bond/` 的图片路径**零命中** —— 羁绊在前端只用文字 + 按稀有度上色（`getBondColor`），`public/Bond/` 的 76 张 `HZ*.png` 属遗留未使用资源。新增羁绊展示需求前不要假设它在用。

## 3. 字段规则

### 3.1 通用约定

| 规则 | 说明 |
| --- | --- |
| 主键字段 | 绝大多数表用 `IDs`（复数）；`Basic_Attr` / `Keyword` / `Introduction` / `Difficulty_Spec` 用 `Id`（单数）。配置表同时有 `Id`（数字序号）与 `IDs`（业务 ID），**关联一律用 `IDs`** |
| 双语字段 | 每个文本字段都有一份 `xxxI2` 版本（`NameI2`、`DescriptionI2`、`EffectI2`…），前端**只用非 I2 版本** |
| 复合字段 | 格式 `"ID,名称"`，如 `Race: "BD20015,神族"`、`NormalAttack: "ZS11001,挥砍"`。用 `configTableUtil.js` 的 `splitIdName()` 拆分 |
| 标签字段 | `FilterTags` / `PositiveTags` / `NegativeTags` / `Tag` 是**逗号分隔字符串**，前端 `split(',')` 成数组。分类映射见 `src/utils/tagCategories.js` |
| 占位符 | 文本里的 `{0}`~`{6}` 对应同行的 `Value0`~`Value2` 或 `ExtraValue1`~`ExtraValue3`，见 §4 |

### 3.2 `Role.json` 关键字段

| 字段 | 含义 |
| --- | --- |
| `IDs` | 角色 ID（`M` + 5 位；`_nnn` 后缀 = 异化/皮肤） |
| `Name` / `SkinName` | 本名 / 皮肤名。有 `SkinName` 时前端显示为 `[皮肤名]本名` |
| `Step` | 稀有度档位（S/A/B/C） |
| `Type` / `Class` / `Element` / `Map` | 大种族 / 职业 / 属性 / 地区，构成四维标签 |
| `Race` | 细分种族，`"ID,名称"` |
| `NormalAttack` | 普攻，`"ID,名称"` |
| `Characteristic` / `SubClass` / `Feature` | 三个支援技能 ID，分别对应 **3 星性格 / 4 星称号 / 5 星特性** |
| `FilterTags` | 玩法标签 |

> **`Role.json` 有 214 条，但角色图鉴只展示可见角色**。未实装角色的屏蔽名单在 `src/utils/characterFilter.js` 的 `BLOCKED_CHARACTER_IDS`（当前仅 `M53301_000`），由 `HIDE_UNRELEASED_CHARACTERS` 开关控制。

## 4. 占位符替换规则

`configTableUtil.js` 的 `replacePlaceholders(text, values)` 用正则 `\{(\d+)\}` 做替换，**下标直接对应传入数组的位置**。不同表传入的数组不同：

### 4.1 天赋 / 支援技能（`Value0~Value2` → `{0}~{2}`）

```js
const valueList = [talent.Value0, talent.Value1, talent.Value2]
talent.formattedEffect = replacePlaceholders(talent.Effect, valueList)
```

### 4.2 主动技能（`Unique.json`，下标从 1 开始，跳过 0）

```js
const valueList = []
valueList[1] = skill.Times        // {1}
valueList[2] = skill.Value        // {2}
valueList[3] = skill.StatusLayer  // {3}
valueList[4] = skill.ExtraValue1  // {4}
valueList[5] = skill.ExtraValue2  // {5}
valueList[6] = skill.ExtraValue3  // {6}
```

> **注意**：这里 `valueList[0]` 是 `undefined`，所以技能描述里若出现 `{0}`，`replacePlaceholders` 会**原样保留 `{0}`**（因为 `values[0] === undefined` 时不替换）。这是刻意行为，不是 bug —— 技能表的 `{0}` 通常留空。

### 4.3 `Prefix.json`（加护）

加护描述用 `{0}~{4}`，对应 `Value0~Value4`（共 5 个值）。具体替换在 `PrefixView.vue` 内部完成，**不在 `configTableUtil.js`**。

### 4.4 新增表的占位符规则

如果新表要用 `{n}`，先在 `configTableUtil.js` 里加一个 `buildXxx()` 组装函数，**不要**在页面里手写 `replace` —— 否则会出现同一字段在两处被解析成不同结果。

## 5. 两个手工维护文件的格式

### 5.1 `notices.json`（公告）

```json
[
  {
    "pinned": true,
    "date": "",
    "title": "",
    "lines": ["置顶条目，date/title 留空，显示为「置顶」"]
  },
  {
    "date": "9.24",
    "title": "内容更新",
    "lines": [
      "更新地图“{{夏日海滩}}”：同步更新地块图鉴",
      "角色图鉴添加新角色“{{娜迦将军}}”"
    ]
  }
]
```

- 数组顺序即展示顺序；`pinned: true` 的排最前。
- `lines` 支持**富文本标记**（由 `NoticeModal.vue` 的 `parseNoticeLine` 安全解析，**不是 `v-html`**）：

| 标记 | 颜色 |
| --- | --- |
| `==文字==` | 红 `#ef4444` |
| `~~文字~~` | 橙 `#f97316` |
| `##文字##` | 绿 `#22c55e` |
| `{{文字}}` | 蓝 `#3b82f6` |
| `[[文字]]` | 紫 `#a855f7` |
| `\(文字\)` | 粉 `#ec4899` |
| `<<文字>>` | 灰 `#64748b` |
| `%%文字%%` | 黄 `#eab308` |

- 也支持 `<a href="...">`，但**只放行站内相对路径与 https 外链**，其他一律丢弃。
- 已读版本记录为 `date + '-' + title`（`App.vue` 里 `saved_notice_version` 的读写处），改标题会导致**公告重新弹一次**。

### 5.2 `data.json`（指定招募常驻池）

```json
[
  {"角色名":"星灵射手","职业":"射手","种族":"神灵","属性":"光系","地区":"星界","稀有度":3}
]
```

- **固定 6 字段**，字段名是中文，与 `Role.json` 的英文键不同名。
- 唯一消费者是 `RecruitView.vue`（默认首页）—— 它按 `稀有度` 分组展示，并把 `职业/种族/属性/地区` 去重成筛选项。
- **收录口径**（作者定义）：常驻池角色；非限定，或限定但已入池；**排除异化角色**。
- 当前 141 条。已知缺失 `娜迦将军`(M11307)、`蔷薇领主`(M13307)（二者均在 `Summon.json` 招募池内）。

> 这个文件**不参与自动同步**，改角色实装状态时需要人工维护。

## 6. 数据表更新流程

```powershell
# 1. 拉取最新 53 张表并覆盖 src/assets/（会跳过 4 个本地文件）
python tools\1_sync_tables.py

# 2. 若有新地图/掉落权重调整，重跑概率模拟（注意必须显式带 --profile-mode）
python tools\3_run_probability.py --map 夏日海滩 --trials 2000000 --workers 8 --profile-mode area-spot-weighted

# 3. 重新构建
cmd /c npm run build
```

新版本可能带来**新前缀、新字段、新占位符位置**，同步后请重点核对：

1. 新增角色/装备是否在 `public/` 里有对应图片（跑 `tools/2_extract_images.py` 或工作区的 `4_提取图片资源.py`）。
2. `data.json` 是否需要按常驻池口径补条目。
3. `notices.json` 是否需要加公告。
4. 若 `Difficulty_Spec.json` 或 `Equip.json` 的权重字段变了，**必须重跑概率模拟**，否则页面上展示的概率会与游戏不符。

---

## 7. ID → 资源名映射

图片不是从 APK 里抠的，而是从官方 CDN 的 AssetBundle 提取（`seek(32)` 跳过 YooAsset 偏移头后用 UnityPy 读）。提取流程与工具见工作区 `游戏数据/README.md`。

### 7.1 命名规则总表

| 目录 | 命名规则 | 权威字段 |
| --- | --- | --- |
| `Equip/` | `{Equip.IDs}.png` | `Equip.json` |
| `Header/` | `{Role.IDs}.png`（30×30），兜底 `M00000.png` | `Role.json` |
| `RoleCard/` | `{Role.IDs.replace(/^M/,'MD')}.png`（52×69） | `Role.json` |
| `RoleDraw/` | `{Role.IDs}_1__single_part1_1@1.png` | `Role.json` |
| `Skill/` | `{Skill.Icon}.png`，兜底 `TB00001.png` | `Unique.json` / `Sub_Skill.json` |
| `Relics/` | `{Relics.IDs}.png`，兜底 `Mark.png` | `Relics.json` |
| `Rune/` | `{Rune.IDs}.png` | `Rune.json` |
| `GodStone/` | `{Godstone.IDs}.png` | `Godstone.json` |
| `Foretell/` | `{Foretell.Icon}.png` ⚠️ **用 Icon 不是 IDs** | `Foretell.json` |
| `DungeonRelics/` | `{Dungeon_Relic.IDs}.png` | `Dungeon_Relic.json` |
| `lime/` | `{Lime.IDs}.png` | `Lime.json` |
| `ParagonPrefix/` | `JH400{末两位}.png` | `Prefix.json`（白名单跳过 `14`） |
| `AreaBlock/` | `{Area_Spot.IDs}.png` | `Area_Spot.json` |
| `Bond/` | `{Bond.BadgeIDs}.png` ⚠️ **用 BadgeIDs 不是 IDs；且当前无人引用** | `Bond.json` |
| `Shop/` | 多为固定名（`cur_ico_rune_0001.png` 等） | `GambleShop.Content` 前置 ID |

**两个易混点**：

1. **表 ID 前缀 ≠ 图片前缀**：`Bond` 的 ID 是 `JN...` 而图是 `HZ...`（在 `BadgeIDs` 字段）；`Role` 的 ID 是 `M...` 而卡片图是 `MD...`。
2. **下划线有两种语义**：`Role` 的下划线表示**异化皮肤**（`M11307_000`）；而 `Relics`/`Rune`/`Area_Spot`/`Equip` 的 ID 本身带下划线（`XD11001_003`、`F40001_001`、`S00001_000`、`Z00000_942`）。

### 7.2 ★ 最大的坑：地块图与单位帧同名

图集里大量 `S\d{5}_\d{3}` 形态的 Sprite **并不是地块，而是单位动画帧**：

| Sprite 名 | 实际是什么 |
| --- | --- |
| `S00001_000_1_unit_part1_0@1` | 地块 `S00001_000` 的第 1 帧 ✅ |
| `S13301_100` | 单位 S13301 的动画帧 ❌ 不是地块 |

**只按名字匹配提取会往 `public/AreaBlock/` 灌进上千张垃圾图**（实测一次误操作写入 1129 张，而合法地块只有 482 个）。

正确做法：**以 `Area_Spot.json` 的 `IDs` 为唯一白名单**，且每个地块只保留**第一帧**作为底图（按自然序取第一个）。`public/AreaBlock/` 里还有 `mid_int.png` 这类手工放的 UI 图，不要被清理脚本删掉。

### 7.3 加护图标的白名单缺口

`PrefixView.vue:204-211` 的 `validNumbers` 从 `'01'` 列到 `'54'`，但**明确跳过了 `'14'`** —— 含义是「`JH40014.png` 不存在」。官方后续补上该图后需**手工把 `'14'` 加回**，否则该加护永远显示占位。
