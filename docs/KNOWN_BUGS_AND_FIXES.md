# 严重问题与修复记录

> **收录标准**：只记录**严重问题**，且**只在修复之后**写入。
> 每条必须写清「现象 / 根因 / 修法 / 回归方式」四要素，能让后来人判断同类问题会不会复现。
> 未修复的问题不在这里堆清单 —— 它们放在 [SPEC](SPEC.md) / [ARCHITECTURE](ARCHITECTURE.md) 对应段落的「注意」里。

---

## 1. 概率模拟器的文档命令全部无法执行

**现象**：照着 `tools/README.md` 的说明跑「跑测装备可刷掉落概率」，三条命令**没有一条能跑起来**，直接退出、不产生任何数据：

```
error: 精确统计需要 --block-samples；近似统计请显式使用 --profile-mode area-spot-weighted
```

实测退出码 `2`。

**根因**：脚本后来改成了「精确模式优先」，把 `--profile-mode` 的默认值设成 `server-samples`；该模式下若不给 `--block-samples`，`main()` 直接 `parser.error()` 退出。而 README 的示例命令停留在旧版，既没带 `--profile-mode`，也没提供地块样本。

```
3_run_probability.py:750-762   --profile-mode 默认 'server-samples'
3_run_probability.py:777-780   server-samples 且无 --block-samples → parser.error
```

**修法**：在 `tools/README.md` 的三条命令后补 `--profile-mode area-spot-weighted`，并加说明块讲清「为什么必须显式指定」以及「精确模式需要服务端 `/Explore/StartExplore` 的地图布局，社区拿不到」。

**回归方式**：

```powershell
python tools/3_run_probability.py --map 夏日海滩 --trials 10000 --profile-mode area-spot-weighted
```

应正常跑完并打印 `[夏日海滩] 完成，耗时 …`，退出码 0。

> **同类风险**：改 CLI 默认值时，`tools/README.md`、`docs/technical/DROP_PROBABILITY_MODEL.md` 两处都要同步，否则又是一份跑不通的文档。

---

## 2. 低难度数据行会把多件装备写进同一个槽位

**现象**：模拟器在**难度 ≤ 40** 的数据行上会少统计装备 —— 同一件装备的位置被反复覆盖，敌人身上实际只留下更少的条目。

**根因**：`Difficulty_Spec.json` 里难度 1~40 的行，四个槽位权重字段有零值，展开成 10 个槽位后**非零槽位只有 4 或 7 个**，而这几行的 `RoleEquipNumS` 可以达到 6~9：

| Difficulty | Possi W/A/T/P | 展开 10 槽的非零个数 | RoleEquipNum C/B/A/S |
| --- | --- | --- | --- |
| 1 | 950/50/0/0 | **4** | 2-2 / 3-4 / 4-5 / **5-6** |
| 20 | 900/100/0/0 | **4** | 4-4 / 5-5 / 6-6 / **7-7** |
| 21 | 800/150/0/50 | **7** | 4-5 / 5-6 / 6-7 / **7-8** |
| 40 | 750/200/0/50 | **7** | 6-6 / 7-7 / 8-8 / **9-9** |
| 41 | 600/250/50/100 | 10 | 6-7 / 7-8 / 8-9 / 9-10 |
| 100+ | 250/250/250/250 | 10 | 10-10 / … |

件数超过剩余非零槽位时，`wpick()` 在权重和归零后返回 `-1`，随后 `cur_slot_w[-1] = 0` 会**误清零末位元素**，且 `SLOT_LIST[-1]`（「鞋子」）被判为同一槽位，多件装备互相覆盖。

```
3_run_probability.py:99-107   wpick() 在 sum(ws) <= 0 时 return -1
3_run_probability.py:584-587   slot_index = wpick(...) / cur_slot_w[slot_index] = 0
```

**影响范围**：**当时的 15 张地图全部不受影响** —— `MAP_LEVELS` 用到的难度值是 100/110/…/220，这些行的四个 Possi 全是 250，10 个槽位全部非零。

**修法**：在槽位抽取循环里处理 `-1` —— 退回首个剩余可抽槽位；若已无槽位可抽则停止（不再伪造槽位）。

**回归方式**：当前 15 张地图的输出**不应有任何变化**（该分支对它们不可达）。可用单图重跑比对：

```powershell
python tools/3_run_probability.py --map 新生平原 --trials 200000 --profile-mode area-spot-weighted
```

> **同类风险**：以后新增低难度地图（难度 ≤ 40）会走到这段逻辑；C# 侧同一场景的实现是退化为「全槽位均匀随机」，同样可能重复占用槽位，两边都不严谨。

---

## 3. 百度统计里 7 个页面显示英文路由名

**现象**：网页版统计报表中，有些页面是中文名（「天赋筛选」），有些直接是英文路由名（`equip-prob`、`relics`）。

**根因**：`App.vue` 的 `pageNames` 映射表**只登记了 15 条**，而路由有 **22 条**；`trackWebPage()` 在映射缺失时回退到 `route.name`：

```js
const pageName = pageNames[route.name] || route.name
```

缺失的 7 条：`unique`、`relics`、`godstone`、`rune`、`equip-prob`、`gambleshop`、`other-prob`。

**修法**：补齐 `pageNames` 到 22 条，并顺手按菜单顺序整理，便于以后比对。

**回归方式**：核对两个清单是否等长：

```powershell
Select-String -Path src\router\index.js -Pattern "name: '"
Select-String -Path src\App.vue -Pattern "^  '?[a-z-]+'?:"
```

> **同类风险**：页面清单在本项目有 **4 份**（`router` 的 `routes`、`NavigationMenu` 的 `categories`、`App.vue` 的 `modes`、`App.vue` 的 `pageNames`），互不校验。新增页面务必四处都加，详见 [ARCHITECTURE §4.3](ARCHITECTURE.md)。

---

## 4. 弹窗关闭按钮（✕）跑到卡片外面

**现象**：`/talent`「天赋来源」弹窗的 ✕ 不在标题栏右侧，而是掉到**卡片外面**、悬在视口右侧垂直居中处。
弹窗越矮越明显（只匹配到一个角色时最刺眼）；矮弹窗上 X 越出卡片右缘，高弹窗上它恰好落在卡片范围内、看起来"像是对的"，因此长期没被发现。

**根因**：`App.vue` 的 `<style>` **不是 scoped**，其中有一条**裸选择器**的全局规则：

```css
/* App.vue 全局样式，本意只服务「数据管理」弹窗 */
.modal-close-x { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); ... }
```

而同文件另有一条 `.import-modal-card .modal-header { position: relative }` —— 两条**配套**，绝对定位本应相对那个 header。

问题在于各页面自己的 scoped `.modal-close-x` **只声明 `background`/`border`/`font-size`/`color`/`cursor`，不声明 `position`**。
scoped 规则因为多了 `[data-v-xxx]` 属性特异性更高，却**只在它声明过的属性上赢** —— `position`/`top`/`right` 照旧由全局规则提供。

而页面的 `.modal-header` 和 `.modal-window` 都没有 `position`（static），于是绝对定位的最近定位祖先变成了
`.modal-overlay`（`position: fixed`）→ X 被按**视口**定位：`right:12px` 贴视口右缘、`top:50%` 落在视口垂直中点。

**实测**（390×844 视口，`--simulate-bug` 重新注入旧规则复现）：

| | `position` | `top` | `right` | X 中心 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 修复后 | `static` | `auto` | `auto` | (340, 382) —— 卡片头部内 | OK |
| 旧规则 | `absolute` | `422px`（= 844 ÷ 2） | `12px` | (362.6, 422) —— 掉出头部、越出卡片右缘 | 复现 |

**影响范围**：**8 个页面文件、20 个弹窗**（`TalentManageView` 9、`FruitRecordView` 4、`TalentView` 2、`ForetellView`/`UniqueView`/`SynthesisSearchView`/`SubSkillView`/`PrefixView` 各 1）—— 这些页面的 `.modal-close-x` 全都没声明 `position`。
另 1 个在 `App.vue` 数据管理弹窗里，它本就带 `.import-modal-card`，**未受影响**。

> `FruitRecordView` 的 `.modal-header` 恰好写了 `position: relative`，所以它的 X 落到了 header 上，看起来"差不多对" —— 这也是该 bug 长期没被发现的原因之一。

**修法**：把全局规则收窄到它真正的作用域：

```css
.import-modal-card .modal-close-x { position: absolute; ... }
.import-modal-card .modal-close-x:hover { ... }
```

页面里的 X 便回到 `.modal-header` 的 flex 布局 —— 各页**都已**写 `display:flex; align-items:center; justify-content:space-between`，本来就是按"X 是 header 第二个 flex 项"设计的。数据管理弹窗因仍带 `.import-modal-card` 前缀，行为不变。

**回归方式**：

```powershell
node tools/verify-modal-close.mjs --serve dist                 # 期望「异常 0/3」
node tools/verify-modal-close.mjs --serve dist --simulate-bug  # 期望「异常 3/3」（证明脚本抓得住这个 bug）
```

脚本自己起静态服务、真开弹窗量 `getBoundingClientRect`，断言 X 的视觉中心落在卡片头部区域内。
`--simulate-bug` 会把旧规则重新注入，用来证明因果 —— 只会"通过"的检测等于没检测。

> **同类风险**：这属于**全局样式泄漏**，不是孤例。`App.vue` 的 `<style>` 全站生效，任何裸类名都可能被页面"部分覆盖"。
> 写全局样式**一律加父级前缀**；页面自定义关闭按钮时**不要依赖全局规则补 `position`**。
> 同类泄漏已写进 [ARCHITECTURE §6.1](ARCHITECTURE.md) 与 [HANDOFF §4.8](HANDOFF.md)。

---

## 5. 天赋品质下拉框被裁掉 + 切换品质导致卡片跳位

两个缺陷同处一屏（`/talent` 与 `/search` 的天赋卡片），一次修完，共用一套回归脚本。

### 5.1 下拉框底部被滚动容器裁掉

**现象**：卡片上的品质下拉框（`.tag-dropdown-menu`）在卡片靠近列表底部时被**从中间切断** ——
第 3 项只剩半个字、第 4 项完全看不见。卡片越靠底裁得越多。

**根因**：**绝对定位并不能逃出 `overflow` 裁剪**。下拉框的包含块是 `.talent-tag-dropdown-wrapper`
（`position: relative`），它就在滚动容器**内部**；容器 `overflow-y: auto` 会裁掉一切溢出的后代
（`z-index` 再高也没用，只有 `position: fixed` 才不受影响）。

实测（390×844，`.talent-list` 底 = 829）：

| 卡片位置 | 下拉框范围 | 结果 |
| --- | --- | --- |
| 贴 85% | `[676 → 810]` | 完整 |
| 贴 95% | `[744 → 878]` | **裁掉 49px** |
| 贴 100% | `[778 → 912]` | **裁掉 83px** |

**修法**：展开前量一次空间，不够就给菜单加 `.drop-up`（`top:auto; bottom:100%`）改为向上弹。
`measureDropUp()` **向上找最近的裁剪祖先**，不写死类名 —— 同样一个组件，`/talent` 的裁剪层是
`.talent-list`，而 `/search` 的 `.talent-list` 没有 `overflow`，真正裁剪的是上层 `.app-content`。

> ⚠️ 两个易错点：① 菜单高度要在 `await nextTick()` 之后量真实值，不能硬编码项高；
> ② `event.currentTarget` **只在事件派发期间有效**，必须在 `await` 之前取出来，否则是 `null`。

### 5.2 切换品质后卡片在列表里跳位

**现象**：在一个多品质天赋的下拉框里换个品质，**整张卡片会在列表里移动到别的位置**
（实测「强而有力」从 S 切到 A，序号 5 → 6，与「意志强韧」互换）。用户视角是"卡片被拉下去了"。

**根因**：`switchQuality` 会写 `item.step`，而 `primarySortedTalents` 的 `sortRule` 正是按
`getTalentStepConfig(t.step).weight` 排序 —— 切到较低品质 ⇒ 权重变小 ⇒ 卡片往下沉。
`getCategoryOrder` 与 `selectedCharacter` 分桶读的 `SpecifyRoleIDs`/`Race`/`Class`/`Element` 同样被改写。

**修法**：引入 `sortVariantOf(t) = t.qualities[0] || t`，**排序身份固定取组内默认（最高）品质**。
分组时 `qualities` 已按权重降序排好，首项即默认品质，与 `activeIdx: 0` 一致。

**顺带修的一处**：`switchQuality` 原本还会写 `item.uid`，而它是 `v-for` 的 `:key` ——
改 key 会让 Vue **销毁重建整张卡片**（图片重新加载、下拉框闪一下）。已不再改写 `uid`。

**回归方式**：

```powershell
node tools/verify-talent-dropdown.mjs --serve dist --route /talent
node tools/verify-talent-dropdown.mjs --serve dist --route /search
```

脚本会：① 把目标卡片从列表中部逐档滑到底部，量下拉框被裁多少（期望 0px，且贴底时自动翻转）；
② 切换品质后比对**整个列表的顺序**（期望完全不变）；③ 断言来源弹窗角色行有真实加载的头像；
④ 用**真实鼠标悬停**打开下拉框，断言与下一张卡片重叠的区域里最上层元素是下拉项本身。

### 5.3 下拉框被下一张卡片盖住（层叠上下文陷阱）

**现象**：下拉框与下一张卡片重叠的那一段被**下一张卡片整体盖住** —— 最后一项只剩上半截，
下一张卡片的标签压在它上面。用户视角是"卡片跑到下拉框上面了，下拉框不应该在上面吗"。

**根因**：`.talent-card:hover { transform: translateY(-2px) }`。

`transform` 会让元素成为**层叠上下文**。但卡片是 `position: static` ——
所以它**仍按普通流绘制**，并不会像"定位元素"那样排到后面去。
于是卡内 `.tag-dropdown-menu` 的 `z-index: 1000` 被**困在卡片自己的层叠上下文里**，
而后面 DOM 顺序的兄弟卡片在普通流中绘制得更晚 → 把下拉框盖住。

实测（1280×800，`永恒生命`，下拉框与下一张卡片重叠 22.2px）：

| | 卡片计算样式 | 重叠区最上层元素 |
| --- | --- | --- |
| 修前 | `position:static` `transform:matrix(1,0,0,1,0,-2)` `z-index:auto` | `talent-tag-dropdown-wrapper`（**下一张卡片**的标签容器） |
| 修后 | `position:relative` `transform:matrix(1,0,0,1,0,-2)` `z-index:30` | `tag-dropdown-item`（下拉项本身） |

**修法**：悬停时**同时**给一个正的 `z-index`：

```css
.talent-card:hover {
  transform: translateY(-2px);   /* 保留浮起手感 */
  position: relative;            /* z-index 生效的前提 */
  z-index: 30;                   /* 整体进入"正 z-index 层"，绘制晚于普通流 */
}
```

> ⚠️ **为什么最初没查到**：第一版探针用 `element.click()` **程序化点击**，不触发 `:hover`，
> 于是卡片没有 `transform`、没有层叠上下文，下拉框正常浮在上面 —— 测了个"通过"。
> 现在脚本改用 `page.mouse.move()` + `page.mouse.click()` 做**真实悬停**才复现。
> **能复现才有资格谈修复。**
>
> ⚠️ **触屏同样中招**：手机上点按后 `:hover` 会**粘住**不消失，所以移动端也一直是坏的。

> **同类风险**：任何"列表项里放绝对定位浮层"的地方都会撞上 5.1 与 5.3 ——
> `.modal-window` / `.custom-modal-card` 是 `position: fixed` 遮罩的子元素，不受影响；
> 但**页面内联的下拉/气泡**要注意两点：① 包含块不能在 `overflow` 容器内；② 宿主卡片/条目
> **不能只靠 `transform` 制造层叠上下文而不给 `z-index`**。
> 5.2 的同类风险是**任何"展示态与排序键共用同一字段"的列表**：切换展示会写回排序字段就会跳位。
> 规则已写进 [ARCHITECTURE §6.2.1](ARCHITECTURE.md) 与 [SPEC §3.3](SPEC.md)。
