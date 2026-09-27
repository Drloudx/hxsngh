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
