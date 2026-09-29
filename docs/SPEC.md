# 幻想少女公会助手 · 前端规范（SPEC）

> 本文档是项目的**功能与数据契约总规范**：各页面职责、关键业务规则、数据链与来源边界、资源与验收。
> 架构与发布链见 [ARCHITECTURE](ARCHITECTURE.md)（UI 规则见其 §6）；已修复的严重问题见 [KNOWN_BUGS_AND_FIXES](KNOWN_BUGS_AND_FIXES.md)。

---

## 一、项目与路由

- **定位**：面向《幻想少女公会》玩家的非官方 Wiki 助手。不设广告、会员、付费；捐赠仅用于域名与服务器开销。
- **形态**：Web 单页应用 + Capacitor 8 Android 壳，共用同一份 `dist/`。
- **技术栈**：Vue 3（`<script setup>`）、Vite 8、vue-router 4（**Hash 路由**）、原生 CSS、Capacitor 8。**无 Pinia/Vuex、无 UI 框架**。
- **在线地址**：<https://hxsngh.yxzmy.top>

### 1.1 路由表（22 条）

| path | name | 标题 | 短名 |
| --- | --- | --- | --- |
| `/` | — | 重定向到 `/recruit` | — |
| `/recruit` | `recruit` | 指定招募工具 | 招募 |
| `/search` | `search` | 综合检索 | 综合 |
| `/talent` | `talent` | 天赋筛选工具 | 天赋 |
| `/subskill` | `subskill` | 支援筛选工具 | 支援 |
| `/unique` | `unique` | 技能筛选工具 | 技能 |
| `/lime` | `lime` | 莱姆图鉴 | 莱姆 |
| `/prefix` | `prefix` | 怪物加护 | 加护 |
| `/relics` | `relics` | 心得图鉴 | 心得 |
| `/foretell` | `foretell` | 预言图鉴 | 预言 |
| `/dungeon-relics` | `dungeon-relics` | 星界秘境遗物图鉴 | 遗物 |
| `/godstone` | `godstone` | 神石图鉴 | 神石 |
| `/rune` | `rune` | 符文图鉴 | 符文 |
| `/equip` | `equip` | 装备筛选工具 | 装备 |
| `/equip-prob` | `equip-prob` | 金装刷取难易度 | 概率 |
| `/areablock` | `areablock` | 地块图鉴 | 地块 |
| `/gambleshop` | `gambleshop` | 商人/宝库概率 | 概率 |
| `/other-prob` | `other-prob` | 其他概率 | 其他 |
| `/talent-manage` | `talent-manage` | 天赋管理 | 库存 |
| `/guide` | `guide` | 新人攻略 | 攻略 |
| `/fruit-record` | `fruit-record` | 大果记录 | 大果 |
| `/role` | `role` | 角色图鉴 | 角色 |
| `/ranking` | `ranking` | 预告：热度排行 | 预告 |

全部懒加载（`() => import(...)`）。

### 1.2 ★ 页面清单有四份，新增页面必须全部登记

| # | 位置（**按符号名找，别记行号**） | 作用 | 漏改后果 |
| --- | --- | --- | --- |
| 1 | `src/router/index.js` 的 `routes` 数组 | 真正的路由 | 页面无法访问 |
| 2 | `src/components/NavigationMenu.vue` 的 `categories` | 菜单分组与图标 | 菜单里没有入口 |
| 3 | `src/App.vue` 的 `const modes = [` | 顶栏标题与加载态标题 | 顶栏标题退化 |
| 4 | `src/App.vue` 的 `const pageNames = {` | 百度统计中文名 | 统计显示英文名 |

四份互不校验。**已知漂移**：`modes[21].name` 与 router 的 `meta.title` 文案不一致（「预告：角色/队伍热度排行」vs「预告：热度排行」）；`NavigationMenu` 的 `categories` 只有 21 条，`/ranking` 有意不入菜单。

> 上面原先记的是行号（`App.vue:290-313` / `389-405`），`App.vue` 涨到 2200+ 行后**全部失效**。**一律用符号名定位**：
> `Select-String -Path src\App.vue -Pattern "const modes = \[|const pageNames = \{"`

> 历史上 4 号 `pageNames` 曾缺 7 条（`unique`/`relics`/`godstone`/`rune`/`equip-prob`/`gambleshop`/`other-prob`），**已于 2026-09-27 补齐至 22 条**，现与路由表一一对应。

### 1.3 加载态

`routeLoadingState`（模块级 `reactive`）由 `beforeEach` 置真、`afterEach`/`onError` 置假。`App.vue` 用 `v-if`/`v-else` 在「加载占位」与 `<router-view>` 之间切换。

> **副作用**：加载期间 `<router-view>` 被整个卸载，页面组件会重建 —— 页面内 ref 保存的筛选条件会丢失。需要跨路由保留的状态请写进 URL query 或 `localStorage`。

---

## 二、共享模块与全站约束

### 2.1 共享模块索引

| 模块 | 职责 | 关键导出 |
| --- | --- | --- |
| `utils/configTableUtil.js` | **唯一的角色数据组装入口** | `getFullCharacterList`、`getFullCharacter`、`getCharacterById`、`getCharacterByName`、`searchCharactersByName`、`extractDataArray`、`replacePlaceholders`、`isAlienRole`、`formatRoleDisplayName`、`getTalentSourceLabel` |
| `utils/characterFilter.js` | 未实装内容过滤 | `BLOCKED_CHARACTER_IDS`、`HIDE_UNRELEASED_CHARACTERS`、`getVisibleCharacters`、`isCharacterBlocked`、`getVisibleRaceNames`、`isTalentVisible`、`isRelicVisible` |
| `utils/tagCategories.js` | 标签分类字典 | `TAG_CATEGORIES`、`POSITIVE_TAG_CATEGORIES`、`getCategoryByTag`、`getPositiveCategoryByTag` |
| `utils/imageMatcher.js` | OpenCV 模板匹配单例 | `imageMatcher` |
| `utils/hotupdate.js` | 热更检测/下载/安装 | `checkHotUpdate`、`applyHotUpdate` |
| `utils/version.js` | APK 更新检查 | `fetchLatestRelease`、`compareVersions`、`isUpdateSkippedToday`、`setSkipUpdateDate` |
| `utils/storage.js` | localStorage 安全读写 | `readStoredArray`、`writeStoredJson` |
| `utils/dataTransfer.js` | 导入导出 | `exportData`、`importData` |
| `utils/fileSize.js` | 体积格式化/探测 | `formatFileSize`、`probeRemoteFileSize` |

### 2.2 数据语义约定（强制）

1. **关联一律用 `IDs`**（复数）。配置表同时有 `Id`（数字序号）与 `IDs`（业务 ID），后者才是关联键。
2. **复合字段格式 `"ID,名称"`**（如 `Race: "BD20015,神族"`），统一用 `splitIdName()` 拆。**不要在页面里手写 `split(',')`。**
3. **文本占位符** `{0}`~`{6}` 由 `replacePlaceholders` 统一替换，下标映射见 [DATA_TABLES §4](technical/DATA_TABLES.md)。页面不得自行解读。
4. **双语字段 `xxxI2` 一律不展示**，前端只用非 I2 版本。
5. **角色显示名**用 `formatRoleDisplayName(name, skinName)`：有皮肤名 → `[皮肤]本名`。
6. **异化角色判定**用 `isAlienRole(id)`：ID 含下划线。
7. **多值字段拆分**用 `split(/[\s,，]+/)`（全项目已有 8 处内联，新代码请保持一致）。

### 2.3 未实装内容过滤

官方包里存在「已有数据但未放出」的内容，由 `characterFilter.js` 统一过滤：

- **角色**：`BLOCKED_CHARACTER_IDS` 手工名单（当前仅 `M53301_000` [泳装]星界邪神；`M31301_000` [泳装]圣剑之灵 已注释解封）。
- **专属天赋/心得**：所属角色不可见 → 隐藏。
- **种族天赋**：该细分种族下没有任何可见角色 → 隐藏（**屏蔽一个角色可能连带隐藏整条种族天赋**）。

> `HIDE_UNRELEASED_CHARACTERS` 虽然导出为 `Ref`，但**没有任何 UI 可切换**，且唯一读取点在 `RoleView.vue`。

### 2.4 资源访问与容错

- 图片一律用**根相对路径**（`/Equip/Z00000_000.png`），走 `public/`。
- 命名规则见 [DATA_TABLES §7](technical/DATA_TABLES.md)。**表 ID 前缀 ≠ 图片名前缀**（Bond 的 `JN` → 图 `HZ`；Role 的 `M` → 卡片图 `MD`）。
- 关键图片都有兜底常量：头像 `M00000.png`、技能 `TB00001.png`、心得 `Mark.png`。缺图时静默显示兜底，不会报错。
- **App 端非 HTML 资源是一年强缓存**，替换图片必须换文件名。

### 2.5 主题、组件与长列表

见 [ARCHITECTURE §6](ARCHITECTURE.md)。要点：颜色只用 CSS 变量；弹窗类名必须含 `modal-overlay`；分页统一 `displayLimit` + `IntersectionObserver`（`RoleView` 例外，用容器 scroll 事件）。

### 2.6 本地状态与备份

- 全部持久化走 `localStorage`（**Capacitor Preferences 零使用**），键清单见 [ARCHITECTURE §4.7](ARCHITECTURE.md)。
- **主题持久化**：键 `recruit_tool_darkMode`（`'true'`/`'false'`）。首帧防白闪靠 `index.html` 里的一段**内联脚本**在 module 之前加 `.dark-mode` —— 因为样式由 JS 注入，等 Vue 挂载再加 class 会先闪一帧浅色。**不要删掉那段内联脚本。**
- **通用导入导出**（`App.vue`）合并了 `talent_manager_data`、`my_owned_limes`、`fruit_record_data` 三类。
  > ⚠️ `unowned_characters`（指定招募）与 `foretell_clover_calc_items`（预言计算器）**不在通用备份范围内**。

#### 数据管理弹窗（`showDataModal`）—— 四路通道

设置菜单里是**一个**「数据管理」入口（不再是分开的「导出数据 / 导入数据」），弹窗内按导出、导入两组各给两条通道：

| 分组 | 通道 | 实现 | 依赖系统组件 |
| --- | --- | --- | --- |
| 导出 | **文件导出** | `exportData()` → App 内走原生写文件+分享，网页端走 Blob 下载 | 否 |
| 导出 | **复制文本数据** | `copyText()`：先 `navigator.clipboard.writeText`，失败退回 `execCommand('copy')` | 否 |
| 导入 | **文件导入** | 隐藏 `<input type=file>`（`.universal-file-input`） | **是**（系统选择器） |
| 导入 | **粘贴文本数据** | `navigator.clipboard.readText()` 自动读取，失败则露出文本框让用户长按粘贴 | 否 |

- 两条导出通道共用 `buildBackupData()`，两条导入通道共用 `applyImportData()`（含写失败回滚），**逻辑不重复**。
- `handleUniversalImport`（文件 change）失败时会自动展开粘贴框并提示改用文本通道。

> ⚠️ **为什么文本通道是手机端主力**：部分安卓 WebView / 文件管理器无法打开 `<input type=file>` 选择器（宿主会弹「无法打开文件选择器」这类提示），文件通道在那些设备上**必失败**。因此改动这块时**不要删掉文本通道**，它是唯一的自救路径。详见 [HANDOFF §8.1](HANDOFF.md)。


---

## 二·补 更新与热更策略（2026-09-28 重做）

三条通道的**强制性**与**忽略语义**是刻意区分的，改动前务必读完：

| 通道 | 强制性 | 忽略语义 | 说明 |
| --- | --- | --- | --- |
| **热更新**（`HotUpdateModal`） | **强制**：无「稍后」、遮罩点击无效、`available` 状态必须点「立即更新」 | 无（只能更新） | 热更包含最新数据与图片资源，带着旧资源跑会出各种"数据不对"的怪问题。**唯一退路**：连续下载失败 ≥3 次后出现「暂时关闭（继续使用旧资源）」，避免断网用户被永久锁死 |
| **APK 更新**（`UpdateModal`） | 可选 | **按版本**：`update_skip_version` 记录被忽略的版本，只有更高版本才会再提示 | 强制 APK 更新需要原生权限配合，Web 侧做不到可靠强推，故保持可选 |
| **公告**（`NoticeModal`） | 可选 | 按 `saved_notice_version`（`date-title`） | 改标题会导致公告重弹 |

### 两个已修的严重 bug（不要再改回去）

1. **「今日不提醒」会连带静默热更新** —— 旧实现用 `update_skip_date` 按天记，而 `App.vue` 用
   `isUpdateSkippedToday()` 同时把住了 APK 检查与热更检查的入口。用户点一次「今日不提醒」，当天**两条检查全哑**，
   还会被误导为「已是最新版本」。
   → 已改为 `update_skip_version`（按版本），且**只作用于 APK 弹窗**，不再当热更的门闸。
   > 旧 API `setSkipUpdateDate` / `isUpdateSkippedToday` 仍导出但标注 `@deprecated`，**新代码不要用**。

2. **手动「检测更新」谎报已是最新** —— 旧 `checkUpdate()` 只比 APK Release 版本，APK 最新时报「当前已是最新版本」，
   但热更明明有新版。→ 现在 APK 已最新时会**继续查热更**：有热更就弹热更弹窗；远程热更跨了 base 但 APK 未发布时，
   如实提示「安装包尚未发布，请稍后再试」。

### 热更包体积：为什么前端必须依赖清单字段

热更弹窗里的「热更新包 10.8 MB」**不是运行时探测出来的**，而是读 `hotupdate.json` 的 `packageSize`。

原因（实测确认，别再试图改成 probe）：

```
GET https://gitee.com/.../dist.zip.001
 → 302 Location: https://raw.giteeusercontent.com/...   （跳转到 CDN）
 → 200 Content-Length: 9437184
    响应头里**没有** Access-Control-Expose-Headers: Content-Length
```

`Content-Length` 属于 JS 跨域**禁止读取**的响应头（forbidden response-header name），
即使服务端给了 `Access-Control-Allow-Origin` 也读不到。所以 `probeRemoteFileSize()`
（HEAD，失败退化到 `Range: bytes=0-0` 读 `Content-Range`）在这些条件下都拿不到值，
UI 就显示「大小未知」。

**做法**：发布时把 zip 真实字节数写进清单。`node tools/pack-hotupdate.mjs` 会自动算出
并输出一份 `hotupdate.suggested.json` 草案（含 `packageSize` / `totalParts` / `md5`），
直接抄进 `hotupdate.json` 即可。

> `probeRemoteFileSize` 仍保留为兜底（比如未来换到会暴露该头的对象存储），
> 但**不要依赖它**。

### 手动「检测更新」展示什么

设置 →「检测更新」会同时查**包体（APK Release）**与**热更（hotupdate.json）**，
并以四格对比面板呈现 —— 用户明确要求过这个形态：

|  | 本地版本 | 远端版本 |
| --- | --- | --- |
| **包体版本** | `__APK_VERSION__` / `apk_cached_version` | Gitee Release `tag_name` |
| **热更版本** | `local_web_version` | `hotupdate.json` 的 `version` |

- 远端更新的那格高亮并带「可更新」标签
- APK 有更新 → 直接进 APK 弹窗；仅热更有更新 → 面板内给「更新热更」按钮
- 远端热更跨了 base 但 APK 未发布 → 如实提示，不谎报「已是最新」
- 两者都最新 → 绿色提示

> ⚠️ 旧实现只比 APK Release 版本，**完全不查热更**，导致「热更版本更高，点检测更新却提示已是最新」。
> 已修，别改回去。

### 启动时序（为什么现在弹得快）

旧链路有三段可压缩的等待：`checkUpdate` 延后 2000ms、`checkForHotUpdate` 再 `sleep 1500ms`、
`checkHotUpdate` 里 `await probePackageSize()`（额外一轮网络往返）**挡在返回之前**。
→ 现在：热更检查启动后立即发起、体积探测改为**非阻塞回填**（先弹窗、体积算完再更新文案）。

> 改回「先 await 体积再弹窗」或加人为延时，都会让弹窗明显变慢，别做。

---

> 每个页面给出：定位 / 数据来源 / 核心交互 / 持久化 / 图片 / 注意事项。
> 通用规则（§2）不再重复。

### 3.1 指定招募工具 `/recruit`

- **定位**：勾选标签反推能吃到保底的组合；支持截图识别。
- **数据**：`assets/data.json`（**唯一手工角色表**，141 条，中文键）。不用 `configTableUtil`。
- **交互**：`filterCols = ['星级','职业','种族','属性','地区']`；「星级」**硬编码只有传说/史诗**；组合枚举上限 **3 元**；评分 `minR*100 + hasGold*10 + len*0.1 + unownedBonus(1000)`。
- **持久化**：`unowned_characters`（角色名数组）。
- **图片**：`/gif/*.gif`、`/ui/*.svg`、`/images/*`（识别模板）。
- **注意**：`data.json` 收录口径 = 常驻池、非限定或限定已入池、排除异化；不参与自动同步。详见 SPEC §3.1。

### 3.2 综合检索 `/search`

- **定位**：天赋 / 支援 / 主动技能 / 装备四路联合检索（全项目最大页面，3500+ 行）。
- **数据**：`Role` `Talent` `Sub_Skill` `Unique` `Equip` `Bond` + `configTableUtil` + `characterFilter` + `tagCategories`。
- **交互**：`activeTab` 默认 `all`；四路各自 `limit` 20；主搜 + 次筛 + 三组标签；`IntersectionObserver` 加载更多。
- **图片**：`/Header/`、`/Skill/`、`/Equip/`、`/General/`。
- **注意**：
  - 唯一做了**首屏延后装配**的页面（`setTimeout(..., 20)`）。
  - **`rareDropsMap` 是纯手工的「地图 → 稀有装备名」清单**（13 张图），最易随版本漂移。
  - `fullDatasets` 里 `relicList` / `noteList` 传空数组 —— 本页不组装心得。
  - 装备词条用 `parseBondInfo` 从 `"词条名[等级]"` 拆解，再查 `Bond.json`。
  - **天赋品质下拉框**（`.tag-dropdown-menu`）：见 §3.3 的同名说明 —— 本页有两处（`all` 视图与 `talent` Tab 各一），逻辑与 `/talent` 一致，改动请**两处一起改**。

### 3.3 天赋筛选工具 `/talent`

- **定位**：按角色反查可吃到的全部天赋（专属/种族/职业/属性/通用五桶），并支持**天赋组合**反推能同时吃满的角色。
- **数据**：`Role` `Talent` + `configTableUtil` + `characterFilter`。
- **交互**：主搜/次筛/绑定角色/`showExclusiveTalent`；组合器 `selectedCombinations`；`PAGE_SIZE = 20`。
- **图片**：`/Header/`。
- **注意**：`JOB_KEYWORDS` / `RACE_KEYWORDS`（**空数组**）/ `ATTR_KEYWORDS` 是硬编码排序表；假人沉底。

#### ★ 天赋品质下拉框（`.tag-dropdown-menu`）—— 两条硬约束，勿改回去

同名天赋有多个品质时，卡片上是个下拉框（`item.qualities` 按权重降序，`activeIdx` 默认 0 = 最高品质）。
`switchQuality` **只切换展示字段**，不改变这张卡在列表里的身份与位置。由此有两条必须守住的约束：

1. **排序一律走 `sortVariantOf(t)`（= `t.qualities[0]`），不能读 `t.step`。**
   `primarySortedTalents` 按 `step` 权重排序，而 `switchQuality` 会改 `item.step` ——
   直接读 `t.step` 会导致「切到较低品质 → 权重变小 → 卡片在列表里往下跳」，
   用户看到的是一张卡突然和别的卡换了位置。`getCategoryOrder` 与 `selectedCharacter` 分桶同理。
2. **`switchQuality` 不得修改 `item.uid`。** 它是 `v-for` 的 `:key`，改了会让 Vue 销毁重建整张卡片
   （图片重新加载、下拉框闪一下）。`uid` 是分组身份，与「当前看哪个品质」无关。

**下拉框会被列表滚动容器裁掉。** 包含块 `.talent-tag-dropdown-wrapper` 在滚动容器内部，
所以容器一旦 `overflow-y: auto` 就会裁掉溢出的下拉框（实测卡片贴底时最坏裁掉 49px，第 3 项只剩半个字）。
因此 `toggleTagDropdown(item, $event)` 会**测量下方剩余空间**，不够就给菜单加 `.drop-up` 改为向上弹。
> `$event` 必须传：`measureDropUp` 要用 `currentTarget`，且它只在事件派发期间有效，需在 `await nextTick()` **之前**取出。
> 回归：`node tools/verify-talent-dropdown.mjs --serve dist --route /talent`
> 注意 `/talent` 的裁剪层是 `.talent-list`，而 `/search` 的 `.talent-list` **没有** `overflow`，
> 真正裁剪的是上层的 `.app-content` —— 所以 `measureDropUp` 是**向上找最近裁剪祖先**的通用实现，不要写死类名。

**宿主卡片必须给正 `z-index`，否则下拉框会被下一张卡片盖住。**
`.talent-card:hover { transform: translateY(-2px) }` 里的 `transform` 让卡片成为**层叠上下文**，
而卡片是 `position: static`、**仍按普通流绘制** → 下拉框的 `z-index` 被困在卡片内，
后面 DOM 顺序的兄弟卡片反而画在它上面。故悬停规则必须**同时**写 `position: relative; z-index: 30`。
> 触屏点按后 `:hover` 会粘住，所以手机端一样中招。回归脚本用**真实鼠标事件**验证这一点
> （程序化 `element.click()` 不触发 `:hover`，会测出假的"通过"）。

### 3.4 支援筛选工具 `/subskill`

- **定位**：性格/称号/特性三类支援技能的检索与来源角色反查。
- **数据**：`Role` `Sub_Skill` + `configTableUtil` + `tagCategories`。
- **交互**：星级**单选且可再点取消**；主搜变化会**同时清空次筛词与已选标签**；`PAGE_SIZE = 20`。
- **图片**：`/Header/{charId}.png`、`/Skill/{iconId}.png`。
- **注意**：本页**自己重定义**了 `getTalentStepConfig` / `getRarityNum`，与 `configTableUtil` 重复。

### 3.5 技能筛选工具 `/unique`

- **定位**：主动技能检索 + 标签来源解释。
- **数据**：`Role` `Unique` + `configTableUtil` + `tagCategories`。
- **交互**：标签面板用 `POSITIVE_TAG_CATEGORIES` 分类；**过滤掉以「符文」结尾的标签**；`PAGE_SIZE = 20`。
- **图片**：`/Header/`、`/Skill/`。
- **注意**：从技能描述里用正则抽【…】标签并与正负标签集合合并。

### 3.6 莱姆图鉴 `/lime`

- **定位**：莱姆图鉴 + 拥有状态打勾 + 三种概率口径。
- **数据**：`Lime` `World_Map` + `utils/storage`。不用 `configTableUtil`。
- **交互**：拥有状态筛选（全部/已拥有/未拥有）；地区按 `AreaType` 与 `World_Map.Type` 求交。
- **三种概率**：全局出现率 / 元素预言池内概率（分母换成 S+SS 池，非 S/SS 返回「已排除」）/ 元素+精灵预言（(1-(1-p)^5)，即 5 个多格地块至少中一次）。
- **持久化**：`my_owned_limes`（ID 数组）；监听 `window 'lime-data-imported'`。
- **图片**：`/lime/{Lime.IDs}.png`。

### 3.7 怪物加护 `/prefix`

- **定位**：按加护名聚合 4 个品阶，并按玩家输入等级实时换算数值。
- **数据**：`Prefix.json`（197 条，含 **Value0~Value4 五个**数值字段）。
- **交互**：品阶切换（默认取组内最高）；等级预设 `[100,120,130,140,160,170,180,200,210]`，默认 **200**；数值按等级**线性按比例**换算。
- **图片**：`/ParagonPrefix/JH400{末两位}.png`，**硬编码白名单且明确跳过 `14`**。
- **注意**：品阶文案用「绿/蓝/紫/橙」，与全站其它页的「普通/稀有/史诗/传说」**术语不统一**。

### 3.8 心得图鉴 `/relics`

- **定位**：绑定角色 → 该角色可吃的心得，按 专属 > 职业 > 种族 > 属性 排序。
- **数据**：`Role` `Relics` + `configTableUtil` + `characterFilter`。
- **交互**：角色匹配分类 Tab（`all`/`class`/`race`/`element`/`exclusive`）；`PAGE_SIZE = 30`；`formatRelicEffect(text, maxLevel=3)`。
- **图片**：`/Relics/{IDs}.png`，兜底 `Mark.png`。
- **注意**：⚠️ **字段语义错位** —— `relic.Race` 比的是 `char.type`（大种族），`relic.SubRace` 比的是 `char.element`（属性）。字段名与业务含义不一致，极易误改。

### 3.9 预言图鉴 `/foretell`

- **定位**：局内预言图鉴 + 四叶草收益计算器。
- **数据**：`Foretell.json`（54 条）。
- **交互**：搜索为**多词 AND + 子序列模糊**；排序三级 = `YY00011_005` 强行置顶 → 按基础 ID 升序 → 同名按 Step 降序。
- **持久化**：`foretell_clover_calc_items`。
- **图片**：`/Foretell/{Foretell.Icon}.png`（**注意用 `Icon` 而非 `IDs`**）；四叶草 `D00002_000.png`。
- **注意**：**硬编码隐藏 4 条预言**（`YY00014_002`、`YY00014_003`、`YY00008_002`、`YY00016_005`）；`getEffectDescription` **只支持单占位符 `{0}`**（与 `replacePlaceholders` 的通用实现不同）。

### 3.10 星界秘境遗物图鉴 `/dungeon-relics`

- **定位**：24 件秘境遗物的图鉴，带四种排序与品阶权重汇总。
- **数据**：`Dungeon_Relic.json`（24 条）。
- **交互**：排序选项 = 稀有度 / 概率 / 价值 / 重复；每种都是「主键降序 → 品质降序 → IDs 升序」三段兜底。
- **图片**：`/DungeonRelics/{IDs}.png`。
- **注意**：概率精度是**四段**（`≥1`→2 位 / `≥0.1`→2 位 / `≥0.01`→3 位 / 否则 4 位），与其它页不同。

### 3.11 神石图鉴 `/godstone`

- **定位**：双 Tab —— 词条列表（8 颗神石能洗出什么）+ 神石图鉴（掉落概率）。
- **数据**：`Godstone`（8 条）`GodstoneEffect`（88 条）。
- **交互**：词条按类型/品阶/搜索筛选；**概率面板按「同行两列」联动 ±1 卡片一起展开**（改 CSS 列数会破坏联动）。
- **图片**：`/GodStone/{Godstone.IDs}.png`。
- **注意**：`Godstone` 与 `GodstoneEffect` **同前缀 `BS` 但编号段不同**（`BS6xxxx` vs `BS0xxxx`），拼图标路径时不能混用。品阶辅助函数用 `switch` 而非映射表（全站唯一）。

### 3.12 符文图鉴 `/rune`

- **定位**：符文图鉴 + 共鸣解析（把 `Material` 关联到 `Rune_Material` 解出 1/2/3 阶共鸣效果）。
- **数据**：`Rune`（164 条）`Rune_Material`（16 条，多对一）。
- **交互**：搜索匹配面最宽（**9 个字段**，含三段已解析共鸣文本）。
- **图片**：`/Rune/{IDs}.png`。
- **注意**：品阶辅助拆成 4 个函数（`getStepName` / `getStepColor` / `getStepBorderColor` / `getStepBg`）。

### 3.13 装备筛选工具 `/equip`

- **定位**：装备总检索，支持粗略/详细两种视图模式与三条词条展开。
- **数据**：`Equip`（1634 条）`Bond`（940 条）+ `tagCategories`。
- **交互**：
  - **动态词条标签**：遍历 `Pure`/`Title`/`Enhance`，拆词条名 → 查 `Bond` → 取 `Tag` 拆标签（全项目唯一这么做的地方）。
  - 筛选：搜索 / 稀有度（含 `SS`）/ 属性 / 职业（「全职」精确，其余 `includes`）/ 部位 / 地图（同时匹配 `AreaType` 与 `AreaName`）。
  - `viewMode = 'rough'` 初始加载 60 条，`'detailed'` 为 20 条。
- **图片**：`/Equip/{IDs}.png`、`/General/{attr.icon}`。
- **注意**：
  - ⚠️ `ATTRIBUTE_MAP` 与 `attrNameToChinese` 是同一套映射的两份表达，**key 大小写混用**（`Luck`/`Tough` 首字母大写，其余全大写）。
  - `mapOptions` 15 张图与 `EquipProbView.maxLevels` **重复维护**。

### 3.14 金装刷取难易度 `/equip-prob`

- **定位**：按地图聚合装备，给出遇见率、约多少次机会遇见一次、四档难度。
- **数据**：`Equip` `Battle_Event` `Role` `World_Map` + **`simulation_exact_results.json`**。不用 `configTableUtil`。
- **交互**：`evalMode` 绝对/相对两种难度口径；`showExactProb` 切换详情文案。
- **图片**：`/Equip/{id}.png`。
- **注意**：**遇见率 ≠ 掉落率**（量级差约 10~30 倍）；排序严格按 `Equip.json` 原始行序；`maxLevels` 是三份地图等级副本之一。完整算法见 [technical/DROP_PROBABILITY_MODEL.md](technical/DROP_PROBABILITY_MODEL.md)。

### 3.15 地块图鉴 `/areablock`

- **定位**：地块形状 + 出现权重 + 体力/探索时间。
- **数据**：`Area_Spot.json`（482 条）。不用任何 utils。
- **交互**：4 个 Tab（basic/equip/event/special）+ 地图筛选 + 地图级懒加载（`displayMapLimit = 3`）。
- **图片**：`/AreaBlock/{Area_Spot.IDs}.png`。
- **注意**：
  - ⚠️ **地块分类完全靠 ID 后缀白名单**（`basicGreen`/`basicBlue`/`basicPurple`/`basicOrange`/`equipSuffixes`/`eventSuffixes`/`specialSuffixes`）。**新后缀不在表内 → 该地块在页面完全消失。** 后缀 `015` 被判定为「废弃」。
  - ⚠️ **概率是「图内相对概率」**（分母 = 同图权重和，排除 015），不是全局概率。`000` 强制 100%。
  - 排序完全由后缀数组的 `indexOf` 顺序决定。
  - 探索时间公式 `stamina * 0.5 * scale`，系数分段表**双份表达**。
  - `mapMaxLevels` 是地图等级的第二份副本。
  - `showProbability` 是开发自用开关，生产无 UI 可关。

### 3.16 商人 / 宝库概率 `/gambleshop`

- **定位**：旅行商人 4 轮与黄金宝库 3 层，每个格子的道具池与该轮次内的相对出现率。
- **数据**：`GambleShop`（40 条）`GoldenVault`（25 条）。
- **交互**：主分类切换（gamble/vault）会重置三个筛选；搜索/轮次/品阶/类型都是「再点一次取消」。
- **图片**：`/Shop/{iconId}.png` + 4 个硬编码兜底（宝箱/符文/四叶草/天赋果实）。
- **注意**：**客户端没有抽样代码**（购买与宝库生成都在服务端），本页概率是对表权重的推断，**无法与源码对齐验证**。`extractStep` 用 `content.includes('SS')` 判断品阶，**过宽**。

### 3.17 其他概率 `/other-prob`

- **定位**：双 Tab —— 委托概率（16 条任务的品阶分布与出现率）+ 地图红装概率。
- **数据**：`Task`（16 条）`Equip`。
- **注意**：
  - 委托概率**只算原始权重占比**，未建模页面自己描述的保底机制（页面文案与实现自相矛盾）。
  - 红装概率阈值与「池占比 50%」**全部硬编码**，依赖「该图红装池恰好 2 件」这一当前事实。
  - 概率精度为三段（阈值 1 / 0.1）。

### 3.18 天赋管理 `/talent-manage`

- **定位**：**全站唯一以玩家数据为主体**的页面 —— 本地天赋库存簿。
- **数据**：`Role` `Talent` + `configTableUtil` + `characterFilter` + `dataTransfer` + `sortablejs`。
- **持久化**：`talent_manager_data`（完整结构）；旧键 `talent_sandbox_data` 自动迁移并删除。
- **图片**：`/Header/{baseInfo.id}.png`，兜底 `M00000.png`。
- **注意**：**UI 状态也被持久化**导致存储膨胀；紧凑格式判别只看首条；本页重定义了 `getTalentSourceLabel` / `getTalentStepConfig` / `sortTalentAllQuality`。详见 §3.18。

### 3.19 新人攻略 `/guide`

- **定位**：上手指引图轮播 + 攻略表下载 + 按作者分组的 TapTap 外链。
- **数据**：**无数据表**，全部硬编码。
- **交互**：轮播自动播放；图片放大支持双指缩放（0.8~6）与拖拽平移；App 内下载走 `window.NativeDownload.downloadFile`，网页端拼绝对地址。
- **图片**：`/misc/`（轮播 `ylgl1..4.png`、作者缩略图 `*.webp`）。
- **注意**：⚠️ **Excel 文件名内嵌日期与作者名**（`/misc/幻想少女新手攻略20260623（群友制作 @雨落）.xlsx`），换文件必须改代码。7 位作者与全部外链硬编码，新增攻略要重新发版。

### 3.20 大果记录 `/fruit-record`

- **定位**：玩家的大果收支账本，用相邻两天差值反推每日获取/消耗。
- **持久化**：`fruit_record_data`，结构 `[{date, count, consumed, spreadAcrossDays, remark}]`。
- **图片**：`/Shop/D00002_001.png`（内联 14 次）。
- **备注（`remark`）语义分两种，不要混用**：
  - **追加合并**（`mergeRemarks`）——**仅今日卡片**：按「来源\*数量」解析，同来源累加、不同来源追加，兼容 `x`/`X`/`*`/`×`；已保存备注**只读展示**在输入框上方，输入框只填本次新增内容。
  - **预填 + 整体替换**——**弹窗统一口径**（「编辑」与「+ 补录其他日期」一致）：备注框是**多行文本域**（`.modal-textarea`，`rows=4`、`min-height 76px`、可纵向拖拽、超高自动换行）并**预填现有备注**，上方只读展示「当前备注：…」供对照；保存即用输入框内容整体覆盖（首尾空白与空行被裁掉、**中间换行保留**），**清空输入框 = 删除该条备注**。补录弹窗在**切换日期**时按新日期重新预填。

  > 两种口径是刻意的：今日卡片是「流水式记账」（一条条追加，保留每次来源明细），弹窗是「订正式修改」（直接给最终值）。不要把今日卡片改成预填替换，否则流水语义会丢。
  > 弹窗里 `customForm.existingRemark` 同时承担「只读对照值」与「是否有原备注」两个作用，改提示分支时注意别把它清掉。
- **页内「数据管理」弹窗（`showDataManageModal`）**：与全站数据管理同构，导入导出各有文件与文本两条通道。

  | 通道 | 函数 | 依赖系统组件 |
  | --- | --- | --- |
  | 文件导出 | `exportFruitData` → `_type: 'fruit-record'` | 否 |
  | 复制文本数据 | `copyFruitDataText`（`navigator.clipboard.writeText`，失败退 `execCommand`） | 否 |
  | 文件导入 | `triggerFruitImport`（`.fruit-import-file-input`） | **是**（系统选择器） |
  | 粘贴文本数据 | `openPasteImport` / `submitPasteImport`（`clipboard.readText`，失败露文本框） | 否 |

  - 文件导入与粘贴导入**共用 `mergeRecords()`**；`extractFruitRecords()` 兼容裸数组 / `{_type:'fruit-record',data}` / 任意 `{data}` 三种形态。
  - 合并语义：同 `date` 覆盖、新 `date` 追加；导入项**缺 `consumed` 时沿用本地已有值**；`count` 非数字的条目直接忽略。
  - **本页只处理大果记录**，不涉及莱姆/天赋管理（那两类走全站数据管理弹窗）。
- **注意**：删除按 `date` 而非 id；6 个 computed 各自排序；日期用本地时间而 `App.vue` 校验用 UTC。详见 §3.20。

### 3.21 角色图鉴 `/role`

- **定位**：全站信息密度最高的页面 —— 单角色的基础属性（按等级成长）、普攻、细分种族技能、三支援、主动技能、五类天赋、可食用心得。
- **数据**：`Role` `Sub_Skill` `Unique` `Talent` `Relics` `Basic_Attr` + `configTableUtil`（**唯一把 5 张表全量喂进 datasets 的页面**）。
- **交互**：6 个筛选维度 + 玩法标签；细分种族按**硬编码 18 项 priority** 排序（实测 `Role.Race` 有 39 个取值，覆盖不足一半）；`displayLimit = 40` + **容器 scroll 懒加载（非 IntersectionObserver）**。
- **图片**：`/RoleCard/{id.replace(/^M/,'MD')}.png`、`/RoleDraw/{id}_1__single_part1_1@1.png`、`/Skill/{icon}.png`、`/Relics/{IDs}.png`、`/General/{attr.icon}`；三级兜底 `M00000.png` / `TB00001.png` / `Mark.png`。
- **注意**：`getSubSkillDetail` **绕过 `configTableUtil` 自行解析占位符**，与该模块的 `fillSkillData` 逻辑重复；`formatRelicEffect` 与 `RelicsView` 各一份。

### 3.22 预告：热度排行 `/ranking`

- **定位**：**未实现的占位页**。<script setup> 为空，无 import。
- **注意**：模板里有个 `<input placeholder="搜索占位...">` 但**没有 `v-model`、没有事件**，纯装饰。硬编码了一条含 `authKey`/`busi_data` 的 QQ 群分享链接（会随群配置变化失效）。样式复用 `TalentManageView` 的类名但在本文件独立复制了一份。

---

## 四、详情与 URL

- **持久化状态一律进 URL query**（因为 §1.3 的加载态会卸载页面组件）。各页面用 `watch` 同步 query ↔ 内部状态。
- 未实现全局的物品详情路由（与参考项目不同）。详情都是页面内的弹窗。
- 弹窗关闭方式必须符合 [ARCHITECTURE §6.2](ARCHITECTURE.md) 的类名约定，否则 Android 物理返回键穿透。

---

## 五、数据与来源

### 5.1 构建产物与数据链

```
官方服务端 API ──tools/1_sync_tables.py──► src/assets/*.json ──Vite import──► dist/assets/*.js
官方 CDN bundle ──tools/2_extract_images.py──► public/*.png ──原样拷贝──► dist/*.png
本地模拟脚本 ──tools/3_run_probability.py──► src/assets/simulation_exact_results.json
```

**没有运行时数据请求**（除热更清单与更新检查）。改数据表必须重新构建。

### 5.2 数据表边界

`src/assets/` 共 57 个 JSON = **53 张服务端表** + **4 个本地文件**。

**4 个本地文件**（同步脚本必须跳过）：

| 文件 | 维护方式 |
| --- | --- |
| `notices.json` | 手工写公告（富文本标记见 [DATA_TABLES §5.1](technical/DATA_TABLES.md)） |
| `data.json` | **纯手工**，指定招募常驻池（口径见 §3.1） |
| `map_equip_difficulties.json` | 模拟脚本生成，**前端零引用的死资产** |
| `simulation_exact_results.json` | 模拟脚本生成，`/equip-prob` 的数据源 |

**53 张表里前端只用 22 张**，其余 31 张（含 330KB 的 `Difficulty_Spec.json`）是有意保留的冗余。

字段契约、ID 前缀规则、占位符规则见 [technical/DATA_TABLES.md](technical/DATA_TABLES.md)。

### 5.3 来源与真实性边界

| 内容 | 真实性 |
| --- | --- |
| 图鉴类数据（角色/装备/天赋/技能…） | 直接来自官方服务端表，**可信** |
| 金装遇见率 | 蒙特卡洛模拟 + 表推算，**是遇见率不是掉落率**；`area-spot-weighted` 模式的布局权重未经验证 |
| 商人/宝库概率 | 对表权重的推断，**服务端无客户端代码可对齐** |
| 委托概率 | 只算权重占比，**未建模保底** |
| 地图红装概率 | **阈值全部硬编码** |
| 攻略内容 | 第三方作者，页面上标明来源 |

**禁止**在任何位置把上述推断类数据表述为"官方概率"。

### 5.4 原表、派生输入与维护步骤

数据更新流水线见 `tools/README.md`；工作区级的完整版（含反编译源码）见 `E:\Desktop\html\hsxngh\游戏数据\README.md`。

一次完整更新的检查清单：

1. `python tools/1_sync_tables.py` 同步 53 张表；
2. `python tools/2_extract_images.py` 补新图（或工作区版 `4_提取图片资源.py`）；
3. 若 `Equip` / `Difficulty_Spec` / `Area_Spot` / `Battle_Event` 有变化 → **重跑 `3_run_probability.py`**（注意必须显式带 `--profile-mode area-spot-weighted`）；
4. 手工确认 `data.json` 是否需要按常驻池口径补角色；
5. 检查 `characterFilter.js` 的屏蔽名单是否需要增删；
6. 在 `notices.json` 加公告；
7. 新图若体积较大 → `python tools/optimize_images.py --apply` 转 WebP（会一并改写引用）；
8. `python tools/check_asset_links.py` 确认无死链；
9. `cmd /c npm run build`。

### 5.5 手工维护文件的漂移风险

| 文件 | 漂移点 |
| --- | --- |
| `data.json` | 缺 `娜迦将军`、`蔷薇领主`；曾残留已下线的「法师波波」（2026-09-27 已删） |
| `notices.json` | 最新条目为 **9.29**（此前「9.24 之后未补公告」的问题已于 9.29 补齐）；已读版本号含标题，**改标题会导致公告重弹** |
| `characterFilter.js` | `M31301_000` 已解封但以注释形式保留 |
| `hotupdate.json` | 发布时手工回填，忘改 `version` 热更不触发 |
| `src/App.vue` 的 `modes` | 与 router 的文案已不一致 |

---

## 六、资源维护

- 图片全部从官方 CDN AssetBundle 提取，**不是从 APK 抠的**。完整规则与踩坑见 [technical/DATA_TABLES.md](technical/DATA_TABLES.md)。
- **已知未使用资源**：`public/Bond/`（152 个文件，零引用）、`public/备用/`（8 个）、`Relics`/`Bond` 下的 `名称 #编号.png` 变体（354 个，提取工具中途产物）。合计仅 0.24 MB，**不值得为省体积去动**。
- **必须保留**：`public/opencv.js` + `public/opencv_js.wasm`（opencv 引擎，随 APK 内置、不进热更包）、`public/fonts/`（本地字体，离线可用）、`public/hxsnghv*.apk`（网页版下载直链）。
- 清理图片前先 `python tools/check_asset_links.py` 校验引用（比 `Select-String` 可靠：它同时覆盖字面量路径与 `${}` 动态拼接）。**删图不会报错，只会静默显示兜底图。**

### 6.1 图片体积策略（2026-09-28 实测确定）

| 图片类别 | 规模 | 结论 |
| --- | --- | --- |
| 小雪碧图（`Equip`/`Header`/`Skill`/`RoleCard`/`AreaBlock`/`Relics`/`Rune` …） | 4400+ 张，均 1.9 KB | **部分已转 WebP**：按"至少省 15%"逐张决定，**转 2656 张 / 跳过 1770 张**（已有高压缩 WebP 重编码反而变大）。合计 9.39 → 5.13 MB |
| 大图（≥20 KB，19 张） | 2.8 MB | **已转 WebP q82 → 474 KB（83%）**，并换名破缓存 |
| `public/General/1..21.png`（菜单图标） | 500 KB（120×120 显示 22px） | **已转 WebP**：转后 NavigationMenu 里的静态路径也被自动改写 |
| `logo.png`（原 `logo1.png`） | 1024×1024 显示 28-36px | **已改 128×128 WebP → 5.5 KB**（原 1.25 MB）；`logo.png`/`logo2.png` 两个零引用旧文件已删 |

> **包体口径（别混，混了会把正常体积当成异常缩水）**
>
> 上表是**图片自身**的体积。`public/` **参与打包**（去掉 `opencv.js` / `opencv_js.wasm` / `*.apk`）的部分：
> **12.03 MB（WebP 化前）→ 7.78 MB（2026-09-28 WebP 化后）→ 7.43 MB（当前）**。
>
> **真正的热更包（zip 后）**：2026-09-29 实测 **8.53 MB**（8,939,389 字节 / 4554 条目）。
> Zip 只压到约 74.6%，因为包内大头是 xlsx、webp、png 这些**已压缩或低压缩比**的内容。
>
> ⚠️ [HANDOFF §7.7](HANDOFF.md) 曾把 **11.78 MB** 写成"热更包" —— 那其实是
> `7.78（public 参与打包）+ 4.00（dist/assets）` 的**未压缩合计**。**不要把未压缩合计当包体。**

#### ★ 混合扩展名与 `handleImageError`（强制理解，勿删）

动态拼接目录现在是**混合扩展名**（`.webp` 2676 / `.png` 1750），而路径是
`模板字符串 + .png` 拼出来的（54 处）。写死任一扩展名都会对另一部分死链，
所以 **54 处模板一行没改**，改用 `App.vue` 的全局错误回退：

```js
// 捕获阶段：img 的 error 事件不冒泡，必须 capture=true
window.addEventListener('error', handleImageError, true)
```

- 图片 404 → 若路径落在 `IMAGE_EXT_DIRS` 白名单目录里 → `.png ↔ .webp` 换一次
- `el.dataset.extSwapped === '1'` **防止无限循环**（两种扩展名都失败就交给 `@error` 兜底图）
- 实测 18 个页面 1330 张图 **裂图 0**，回退实际触发 **201 次**

> ⚠️ 跑 `optimize_images.py --apply` **之后必须**依次跑这三个校验，缺一不可：
> ```
> python tools/check_asset_links.py                  # 静态死链（能抓到转换器误改兜底图常量）
> python tools/audit_dynamic_refs.py --verify-webp    # 动态路径覆盖率（表驱动的离线解析）
> node   tools/verify-image-health.mjs                # 真实浏览器逐页裂图统计
> ```
> 已发生过一次真实事故：转换器把 `'/Relics/Mark.png'` 改成 `.webp`，而 `Mark` 只有 `.png`。

工具：

- `python tools/optimize_images.py` —— 大图转 WebP 并**自动改写所有引用**。默认只预估；
  `--apply` 才写盘，原图备份到 `.backup/images/`，`--restore` 回滚。
  `--min-gain`（默认 15%）用于跳过「重编码高压缩 WebP 几乎不省」的情况。
- `python tools/check_asset_links.py` —— 死链校验，改名后**必跑**。

> ⚠️ **改图内容必须换 URL**：App 端非 HTML 资源是 `immutable, max-age=31536000`（`MainActivity.java:492`）。
> 换文件名或加 `?v=N` 都行，但**不能原地替换文件内容**。
> ⚠️ 备份文件绝不能放在 `public/` 下：Vite 会把 `public/` 全量拷进 `dist/`，进而打进 APK 与热更包。

---

## 七、开发与验收

### 7.1 修改前后如何核对

```powershell
# 构建（必须用 cmd，PowerShell 禁止执行 npm.ps1）
cmd /c npm run build

# 新增页面时核对四份清单
Select-String -Path src\router\index.js -Pattern "name: '"
Select-String -Path src\components\NavigationMenu.vue -Pattern "path: '"
Select-String -Path src\App.vue -Pattern "path: '"

# 确认某数据表是否被使用
Select-String -Path src\views\*.vue -Pattern "assets/<表名>\.json"

# 确认某图片目录是否被使用
Select-String -Path src\* -Recurse -Pattern "<目录名>/"

# 确认某 localStorage 键的读写位置
Select-String -Path src\* -Recurse -Pattern "<键名>"
```

### 7.2 改动前必读

| 要改的东西 | 先读 |
| --- | --- |
| 任何页面 | 本文档对应 §3 小节 |
| 样式 / 弹窗 | [ARCHITECTURE §6](ARCHITECTURE.md) |
| 数据字段 / 占位符 | [technical/DATA_TABLES.md](technical/DATA_TABLES.md) |
| 概率相关 | [technical/DROP_PROBABILITY_MODEL.md](technical/DROP_PROBABILITY_MODEL.md) |
| 热更 / 发布 | [technical/HOT_UPDATE_PROTOCOL.md](technical/HOT_UPDATE_PROTOCOL.md) |
| 图片资源 | [technical/DATA_TABLES.md §7](technical/DATA_TABLES.md) |
| 已修复的严重问题 | [KNOWN_BUGS_AND_FIXES](KNOWN_BUGS_AND_FIXES.md) |

### 7.3 文档职责与保留标准

- 本文档负责**功能与数据的权威定义**；专题文档补充深入规则，不重复功能说明。
- 页面级细节留在本文档；跨页面共用的契约进 `technical/`。
- 只读分析、答疑、无文件变化的改动**不写文档**；每日改动按 [dev-logs 规范](dev-logs/README.md) 记入日报。
- 文档只在内容被完全替代时合并或归档。
