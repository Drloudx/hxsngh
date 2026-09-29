# 项目交接说明文档（HANDOFF）

> 更新时间：2026-09-29
> 项目路径：`E:\Desktop\html\hsxngh\vue-hxsngh`（Vue 3 + Vite 8 + vue-router 4 + Capacitor 8 / Android）
> 适用对象：后续接手开发对话 / 工程师

---

## 零、给新 AI 对话的开场提示词（复制即用）

### 短版

```text
项目文件在 E:\Desktop\html\hsxngh\vue-hxsngh。
图片资源在 vue-hxsngh\public\（已按图鉴分目录）；要从官方 CDN 重新提取就用 E:\Desktop\html\hsxngh\游戏数据\CDN 和 游戏数据\工具\4_提取图片资源.py。
数据表在同一工作区的 游戏数据\数据表（官方服务端 53 张表的最新快照），前端实际引用的是 vue-hxsngh\src\assets\。
游戏源码（反编译 C#）在 游戏数据\源码\MainScripts，热更 DLL 原件在 游戏数据\DLL。
你先看一下我项目，读一下 docs\HANDOFF.md 和 docs\SPEC.md。
```

### 完整版（推荐，含任务与操作约定）

```text
【项目】E:\Desktop\html\hsxngh\vue-hxsngh —— 《幻想少女公会》玩家自制 Wiki 助手
（Vue 3 + Vite 8 + vue-router 4 哈希路由 + 原生 CSS，无 UI 框架；Capacitor 8 打安卓包）

【资源位置】都在同一个工作区 E:\Desktop\html\hsxngh 下：
- 图片资源：vue-hxsngh\public\（已按图鉴分好目录）
  要重新从官方 CDN 提取 → 游戏数据\CDN\bundles 是缓存，脚本是 游戏数据\工具\4_提取图片资源.py
- 数据表：游戏数据\数据表（官方服务端 53 张表的最新快照）
  前端实际引用的是 vue-hxsngh\src\assets\（构建期打进 JS，改完必须重新构建）
- 游戏源码（反编译 C#，3677 个 .cs）：游戏数据\源码\MainScripts
  热更 DLL 原件：游戏数据\DLL；拉表/反编译脚本：游戏数据\工具\
- 工作区总说明：游戏数据\README.md

【先做】读 docs\HANDOFF.md（当前状态、常用命令、避坑）和 docs\SPEC.md（22 个页面契约、数据链与来源边界）。
改具体模块时再看 docs\ARCHITECTURE.md（含 UI 规则）、docs\technical\（数据表 / 概率模型 / 热更协议）。

【本次任务】<在这里写你要做的新功能或要修的 bug>

【操作约定】
- 构建必须用 cmd /c npm run build（PowerShell 禁止执行 npm.ps1）
- 数据/图片改动后必须重新构建才生效，因为数据是打包进 JS 的、运行时没有接口请求
- 不要动 src\assets\data.json（手工维护的指定招募常驻池）和 notices.json（公告）
  —— 这两个是**手工维护**的，自动同步脚本必须跳过它们。要加公告就往 `notices.json` 数组头部插一条（格式见 docs\technical\DATA_TABLES.md §5.1）
- 新增页面要登记 4 处：router 的 routes、NavigationMenu 的 categories、App.vue 的 modes、App.vue 的 pageNames
- 新弹窗类名必须含 modal-overlay，否则安卓返回键会穿透
```

---

## 一、当前项目状态概览

1. **仓库**：`https://gitee.com/ccyconner/hxsngh`，主分支。本地改动按需推送，推送前按改动范围验收。
2. **在线地址**：<https://hxsngh.yxzmy.top>（网页版）；Android 包见 `public/hxsnghv1.0.22.apk`。
3. **版本号现状**（改版时需一起确认）：

   | 位置 | 值 |
   | --- | --- |
   | `android/app/build.gradle` 的 `versionName` | `1.0.22`（`versionCode 1`） |
   | `public/hxsnghv1.0.22.apk` 文件名 | `1.0.22` |
   | `hotupdate.json` 的 `version` | `1.0.22.1`（2026-09-29 发布，8.53 MB / 1 卷） |
   | 游戏数据对应的官方版本 | appVersion `1.0.2.6`（CDN 2026-09-24） |

   > ⚠️ `hotupdate.json` **在 `.gitignore` 里**（第 57 行）—— 它是发布时手工回填的本地文件，**不入库**，`git log` 里看不到它的变化，
   > 因此**不能靠 git 判断热更版本是否已更新**，每次发版都要手工确认。
   >
   > **热更版本的前三段必须与当前 APK 一致**（当前 `1.0.22`），否则 `checkHotUpdate` 会判为「跨 base」而改走 APK 更新分支。
   > 第四段才是热更自增位（`1.0.22` → `1.0.22.1` → `1.0.22.2`…）。

4. **构建状态**：2026-09-29 执行 `cmd /c npm run build` 通过，约 8.9 秒（Vite 会打印「chunks larger than 500 kB」警告，属已知情况）。
5. **数据状态**：`src/assets/` 已与官方服务端 53 张表对齐（52 张无差异，`Relics.json` 已更新），`public/` 补齐 Relics +13、Rune +10 张图。

---

## 二、接手第一小时该做什么

```powershell
# 1. 装依赖（Node 20.19+ 或 22.12+）
cmd /c npm install

# 2. 起开发服务器
cmd /c npm run dev

# 3. 另开一个终端，确认能构建
cmd /c npm run build
```

> **必须用 `cmd /c`**：PowerShell 默认禁止执行 `npm.ps1`（脚本执行策略），直接敲 `npm run dev` 会报 `UnauthorizedAccess`。

然后通读 [SPEC.md](SPEC.md) 的页面契约，重点看你要改的那一页。

---

## 三、核心文件速查表

| 文件路径 | 核心职责 |
| --- | --- |
| `src/App.vue` | 应用外壳：2200+ 行。启动时序、全局弹窗编排、隐私/统计/热更/更新检查、导航模式、导入导出、**全站全局样式（非 scoped，会泄漏到所有页面）** |
| `src/router/index.js` | 22 条懒加载路由 + `routeLoadingState` 模块级状态 |
| `src/utils/configTableUtil.js` | ★ 唯一的角色数据组装入口：`Role.json` + 支援/技能/天赋/心得 → 完整角色对象 |
| `src/utils/characterFilter.js` | 未实装角色屏蔽名单与可见性判定（`BLOCKED_CHARACTER_IDS` 手工维护） |
| `src/utils/imageMatcher.js` | OpenCV.js 模板匹配单例，供「指定招募」识别截图 |
| `src/utils/hotupdate.js` | 热更检测、分卷下载拼接、fflate 校验、交原生解压 |
| `src/utils/version.js` | APK 更新检查（Gitee Release API）与跳过逻辑 |
| `src/components/NavigationMenu.vue` | 导航菜单定义与三模式渲染（新增页面必须登记这里） |
| `android/app/src/main/java/com/hxsngh/assistant/MainActivity.java` | WebView 容器、热更 ZIP 原子替换安装、`files/www/` 资源拦截、Gitee 代理、原生桥 |
| `tools/3_run_probability.py` | ★ 装备掉落蒙特卡洛模拟器，产出两个概率 JSON |
| `build.py` | 热更包分卷（9 MB/卷），支持命令行参数与 GUI 双模 |
| `hotupdate.json` | 热更清单，发布前手工回填 |

---

## 四、关键架构与技术要点（避坑指南）

### 1. 数据是「打包进 JS」的，不是运行时请求

`src/assets/*.json` 被各视图 `import`，Vite 直接内联进 chunk。后果：

- 改一个数据表必须**重新构建**才生效，不能只换服务器上的 JSON 文件。
- `Equip-*.js` 因此高达 985 KB。**不要**顺手改成运行时 fetch —— 会引入首屏网络依赖、离线回退与缓存失效一整套问题。
- 页面各自 `import` 自己需要的表，**没有统一的 data service 层**。加新表时照抄邻近页面的 import 写法。

### 2. Android 的物理返回键靠 CSS 类名白名单

`App.vue` 用选择器字符串列表找「当前可见弹窗」（`closeActiveModal`），找到就点关闭按钮。**新弹窗类名必须含 `modal-overlay`**（有模糊匹配兜底），否则返回键会穿透弹窗直接退页面。详见 [ARCHITECTURE §6.2](ARCHITECTURE.md)。

### 3. 热更新只换网页资源，不动原生

- `hotupdate.json` 由**网页端**从 Gitee raw 拉取（`src/utils/hotupdate.js:10`）。
- 下载地址做了**主机白名单校验**：只允许 `gitee.com` / `giteeusercontent.com` 及其子域，且必须 HTTPS（`hotupdate.js:12-23`）。
- 分卷拼接后先用 `fflate` **在 JS 侧试解压**，确认存在 `index.html` 且能匹配到 `./assets/<hash>.js`，才把 base64 交给原生。
- 原生用 `ZipInputStream` 解到 `www_update_staging`，校验存在 `index.html` 与 `assets/*.js` 后**重命名原子替换** `files/www`，失败自动回滚。
- **`opencv.js` 与 `opencv_js.wasm` 被显式跳过**（`MainActivity.java:691`）—— 两者随 APK 内置在 `assets/public/`，热更包不携带它们，原生侧对缺失文件回退到 assets。
  > **这两者必须成对**：wasm 初始化失败会导致整个截图识别不可用，所以热更包绝不覆盖它们。
  > 原生 mime 必须把 `.wasm` 映射为 `application/wasm`（`getMimeType`），否则 `instantiateStreaming` 会拒绝、退化到 arrayBuffer 编译。
  > Gradle 里加了 `noCompress 'wasm'`，避免 APK 压缩大文件。
- 原生安装完成后才写 `local_web_version`，不能在下载成功时就宣称新版生效。
- ⚠️ **zip 条目名绝不能带 `./` 前缀**（2026-09-29 全量更新失败的真实事故）。
  前端是 `unzipped['index.html']` **按精确键名**取，`./index.html` 取不到 → 报「热更新包缺少 index.html」，
  **重试无用**。成因是 bsdtar 的 `-C staging .` 会把 `.` 展开成 `./`；`pack-hotupdate.mjs` 已改为逐个列出顶层条目。
  上传前跑 `node tools/verify-hotupdate-package.mjs`。
  > 教训：**校验不能顺手做名字归一化** —— 旧的校验 `replace(/^\.\//,'')` 恰好把前缀洗掉，
  > 于是脚本"自认为通过"，把坏包放行上线。

### 4. 网页版与 App 版是两套统计，互斥

`isInApp` 有四个判据（Capacitor 平台、`data-app-shell` 属性、URL 含 `files/www/`、存在 `NativeAnalytics` 桥）。判错会导致：网页版加载了友盟、或 App 内加载了百度统计。改这块前先在真机上打日志确认。

### 5. 改 CSS 别开压缩

`vite.config.js` 里 `cssMinify: false` 是**刻意的**：压缩会把 `max-width`/`min-width` 媒体查询改写成 range 语法，旧版 Android System WebView 不支持。**不要为了省体积打开。**

### 6. 新增页面有**四份**清单要登记

| # | 位置（**按符号名找，不要记行号**） | 作用 |
| --- | --- | --- |
| 1 | `src/router/index.js` 的 `routes` 数组 | 真正的路由 |
| 2 | `src/components/NavigationMenu.vue` 的 `categories` | 菜单分组与图标 |
| 3 | `src/App.vue` 的 `const modes = [` | 顶栏标题（`currentModeInfo` 按 path 反查） |
| 4 | `src/App.vue` 的 `const pageNames = {` | 百度统计中文名 |

四份互不校验，漏改不会报错。

> 这里原先写的是行号（`App.vue:290-313` / `389-405`），但 `App.vue` 从 1555 行长到 2200+ 行后**全部失效**，
> 连带三份文档一起误导。**行号一律改用上面的符号名定位**（`Select-String -Pattern "const modes = \["`）。

> 4 号 `pageNames` 原缺 7 条（`unique`、`relics`、`godstone`、`rune`、`equip-prob`、`gambleshop`、`other-prob`），**已于 2026-09-27 补齐到 22 条**，当前与 22 条路由完全对齐。
> 仍存在的漂移：`modes[21].name` 是「预告：角色/队伍热度排行」，`router` 的 `meta.title` 是「预告：热度排行」，两处文案不一致（仅影响顶栏标题措辞）。
> 另注：`NavigationMenu` 的 `categories` 只有 21 条 —— `/ranking` 有意不入菜单，仅能靠 URL 直达。

### 7. 手工维护的文件容易漂移

| 文件 | 维护方式 | 已知风险 |
| --- | --- | --- |
| `src/assets/data.json` | **纯手工**，指定招募的常驻池角色 | 口径：常驻池、非限定或限定已入池、**排除异化**。当前缺 `娜迦将军`(M11307)、`蔷薇领主`(M13307)（二者都在 `Summon.json` 招募池内） |
| `src/assets/notices.json` | 手工写公告 | 最新一条为 9.29（此前「9.24 之后未补公告」已于 9.29 补齐） |
| `src/utils/characterFilter.js` 的 `BLOCKED_CHARACTER_IDS` | 手工屏蔽未放出角色 | 当前仅屏蔽 `M53301_000`（[泳装]星界邪神） |
| `hotupdate.json` | 发布时手工回填 | 忘记改 `version` 会导致热更不触发 |

8. **`App.vue` 的 `<style>` 不是 scoped，裸类名会漏进每个页面**（2026-09-29 修过一次真实事故）

   `App.vue` 的全站样式里，任何**不带父级前缀**的类名选择器都会对所有页面生效。
   页面自己的 scoped 规则因为多了 `[data-v-xxx]` 属性，只在**它声明过的属性**上赢，没声明的照样被全局规则接管。

   已出过的事：裸的 `.modal-close-x { position:absolute; right:12px; top:50% }` 本意只服务「数据管理」弹窗，
   而 9 个页面各自的 scoped `.modal-close-x` **都不声明 `position`** → 绝对定位泄漏到约 20 个弹窗上，
   X 以 `position:fixed` 的 `.modal-overlay` 为包含块，被摆到**视口**右侧垂直居中处，小弹窗上直接飞到卡片外面。

   **写全局样式时一律加父级前缀**（`.import-modal-card .modal-close-x`）；
   改动弹窗后用 `node tools/verify-modal-close.mjs --serve dist` 回归。详见 [KNOWN_BUGS §4](KNOWN_BUGS_AND_FIXES.md)。

---

## 五、常用命令一览

| 目标 | 命令 | 说明 |
| --- | --- | --- |
| 本地开发 | `cmd /c npm run dev` | Vite 开发服务器 |
| 生产构建 | `cmd /c npm run build` | 输出 `dist/`，约 8 秒 |
| 预览构建产物 | `cmd /c npm run preview` | 本地静态预览 |
| 重装依赖 | `cmd /c npm run reset-deps` | 删 `node_modules` + lock 后重装（脚本用 `rm -rf`，Windows 下需 Git Bash 或 WSL） |
| **打包热更包** | `node tools/pack-hotupdate.mjs --build` | ★ 自动排除 opencv 引擎与 APK → `dist.zip` + 分卷 + md5 |
| 切分热更包（旧） | `python build.py <含 dist.zip 的目录>` | 9 MB/卷；**推荐用上面那条**，它连排除与压缩一起做 |
| 同步安卓工程 | `npx cap sync android` | 把 `dist/` 同步进 `android/` |
| 校验图片死链 | `python tools/check_asset_links.py` | 检查源码引用的 `public/` 资源是否都存在 |
| 图片转 WebP | `python tools/optimize_images.py` | 默认只预估；`--apply` 才写盘并改写引用 |
| 拆分 opencv wasm | `node tools/split-opencv-wasm.mjs` | 幂等；已拆分会直接提示无需处理 |
| 验证识别链路 | `node tools/verify-opencv.mjs` | 真跑 `imageMatcher`，断言 26 模板就绪 + 真模板可被识别 |
| 弹窗关闭按钮定位 | `node tools/verify-modal-close.mjs --serve dist` | 真开弹窗量 X 坐标，断言落在卡片头部；追加 `--simulate-bug` 可反向复现「全局样式泄漏」bug |
| 天赋品质下拉框 | `node tools/verify-talent-dropdown.mjs --serve dist --route /talent\|/search` | 扫描多个滚动位置量下拉框被裁多少 + 切换品质后列表顺序是否变化 + 来源弹窗角色行有无头像 + 真实悬停下的层叠顺序 |
| **热更包出厂体检** | `node tools/verify-hotupdate-package.mjs` | ★ 用**前端同一个 fflate**按**精确键名**验包：条目不许带 `./` 前缀、`index.html` 与入口 JS 都必须在。**上传前必跑** |

> ⚠️ **不要用 PowerShell 直接跑 `tools/*.ps1` 或 `npm`**：本机执行策略禁止 `.ps1`（`npm.ps1` 同样被挡）。
> 因此发布/校验工具都写成 **Node (.mjs) 或 Python**，避开这个坑。

工作区级的游戏数据处理命令（拉表/反编译/提图）见 `E:\Desktop\html\hsxngh\游戏数据\README.md`。

---

## 六、发布流程速记

### 热更新（只换网页，最常用）

```powershell
# 一条命令搞定：构建 + 排除 opencv 引擎/APK + 压缩 + 分卷 + 算 md5
node tools/pack-hotupdate.mjs --build
# 上传 dist.zip.001 / .002 … 到 Gitee
# 回填 hotupdate.json 的 version / downloadUrl / totalParts / md5 / body
```

> **为什么不再手敲 `Compress-Archive`**：压缩必须进 `dist` 里面做（否则 `index.html` 不在 zip 根层，网页端报「热更新包缺少 index.html」），
> 还要记得删 `opencv.js` / `opencv_js.wasm` / `*.apk` —— 漏删 opencv 引擎凭空多 7.9 MB、漏删 APK 多 24 MB。
> 脚本把这几步合起来并做了 zip 根层与 `assets/*.js` 的校验，输出里的 `totalParts` 与 `md5` 可直接回填。

### APK 大版本（换包）

```bash
cmd /c npm run build          # 1. 构建 dist/
npx cap sync android          # 2. 同步进 android/app/src/main/assets/public/
cd android && .\gradlew.bat assembleRelease   # 3. 出 APK
```

> ⚠️ **换包不需要 `pack-hotupdate.mjs`** —— 那个只打热更 ZIP。
> 两者唯一的交集是：热更 ZIP 会排除 `opencv.js` / `opencv_js.wasm` / `*.apk`
> （在**临时暂存目录**里跳过，**不碰 `dist/` 也不碰 `android/`**）。

**换包前建议跑这几步体检**（2026-09-28 首次引入外置 wasm 时建立）：

```bash
python tools/check_apk.py            # 反查 APK：wasm 是否 STORED、关键资源是否都在
node   tools/verify-dist-smoke.mjs   # 打 dist/ 冒烟：window.cv 就绪 + 无裂图（模拟 WebView）
```

已实测通过（`android/app/build/outputs/apk/debug/app-debug.apk`）：

| 条目 | 结果 |
| --- | --- |
| `assets/public/opencv_js.wasm` | 7.68 MB，**STORED（未压缩）** ← `aaptOptions { noCompress 'wasm' }` 生效 |
| `assets/public/opencv.js` | 0.22 MB，DEFLATE（文本压缩，正确） |
| `assets/public/logo.webp` | 存在，旧 `logo1.png`/`logo.png`/`logo2.png` 已清除 |
| `.webp` / `.png` | 2676 / 1750，与 `public/` 一致 |
| `dist` → `assets` 同步 | 4543 个文件全部到位，`opencv_js.wasm` **SHA256 一致** |

> `.wasm` 为什么必须 STORED：WebView 要把它交给 `WebAssembly.instantiateStreaming`，
> 需要真实字节。被 APK 压缩的话原生侧读出来虽仍是明文，但多一层解压开销、更吃内存。

### 热更与换包共存：`opencv_js.wasm` 不会被热更删掉

热更的解压会跳过 opencv 两个文件，但**替换前**会执行 `copyMissingStaticFiles()`
把现有 `files/www/` 里的文件补进新目录（只跳过 `assets/` 与 `index.html`）。
所以 APK 带进来的 `opencv_js.wasm` 会**保留下来**，热更后依然可用 —— 已核对代码路径确认。

> 顺序上：**必须先装带 `opencv_js.wasm` 的新 APK**，之后的热更才有意义。
> 老 APK（只有内嵌 base64 的 `opencv.js`、没有 wasm）如果只发热更，会因为
> 热更包不携带 opencv 引擎而拿到「旧 js + 缺 wasm」的错配。

---

## 七、后续可关注优化方向

1. **`data.json` 口径补全**：把 `娜迦将军`、`蔷薇领主` 按常驻池口径确认后补入。
2. ~~公告补更~~ —— **2026-09-29 已补 9.29 条目**（9.28 条目本就存在），当前最新为 9.29。
   > ⚠️ 公告是**烙进 JS** 的（`notices.json` 被 `App.vue` import），改完必须重新构建；要推给已装 App 的用户还得走热更。
3. ~~深色模式持久化~~ —— **2026-09-28 已修**（键 `recruit_tool_darkMode` + `index.html` 内联防白闪脚本）。
4. **构建体积**：`data-equip-*.js` 986 KB、`data-bond-*.js` 544 KB。若要优化，考虑超大表走 `public/` + 运行时 `fetch` + 包内回退，但要一并解决离线可用性。
5. **返回键白名单收敛**：`App.vue` 的选择器列表是历史堆积，理想做法是统一走 `overlayStack` 式的显式注册。
6. **`tools/` 与工作区 `游戏数据/工具/` 的关系**：两套工具有重叠（`2_extract_images.py` 覆盖的图集分类比工作区版少，且 `lime` 规则过宽会吞动画帧），可考虑合并指向同一份实现。
7. ~~动态拼接目录的图片~~ —— **2026-09-28 已完成**（推翻了同日上午"暂缓"的判断）。

   最终结果：**转换 2656 张，跳过 1770 张**（已有高压缩 WebP，重编码反而变大），
   图片总量 **9.39 → 5.13 MB**；`public/` **参与打包**的部分 **12.03 → 7.78 MB**（`.png` 8.15 → 1.03，`.webp` 0.86 → 3.88）。
   现在目录里是混合扩展名：`.webp` 2676 个 / `.png` 1750 个。

   > ⚠️ **体积口径别混（曾因此把包体误判为异常缩水）**
   >
   > 这里原先写的「热更包 **13.70 → 11.78 MB**」，那两个数**都不是 zip 包体**，而是**未压缩合计**
   > （`public/` 参与打包部分 + `dist/assets`）。验算：WebP 化后 7.78 + 4.00 = **11.78**，正好对上。
   >
   > **真正的热更包（zip 后）**：WebP 化前约 13~14 MB → **现在 8.53 MB**
   > （2026-09-29 实测：8,939,389 字节，4554 条目）。
   >
   > 为什么会掉这么多：PNG 在 zip 里还能被 deflate 压掉一成左右，而 **WebP 本身已是压缩格式、zip 几乎压不动**；
   > 所以 raw 上少掉的几 MB 会接近 **1:1** 传导到最终包体 —— 这是"图片转 WebP 让热更包显著变小"的真实机理。

   **关键实现（不要改回去）**：路径是 `模板字符串 + .png` 拼的（54 处），
   写死任一扩展名都会对另一部分死链。所以 **54 处模板一行没动**，改用
   `App.vue` 里的**全局捕获式 error 监听** `handleImageError`：
   图片 404 时自动把 `.png ↔ .webp` 换一次（`dataset.extSwapped` 防死循环）。
   实测 18 个页面 1330 张图 **裂图 0**，回退实际触发 201 次。

   > 为什么当时判断会反复：最初只算了"收益 2.9MB"，实测是 1.37MB，所以先否掉；
   > 后来确认**这次就是发 APK**（全新安装本来就要整体拷 `public/`，没有额外网络成本），
   > 且做出 `tools/audit_dynamic_refs.py` 把动态路径的解析覆盖率从 71% 提到 **100%**，
   > 验证手段补齐后才动手。

   ⚠️ **转换会误伤兜底图常量**：转换器按文件名匹配替换，把 `'/Relics/Mark.png'`
   也改成了 `.webp`，但 `Mark` 只有 `.png`（0.5KB 被跳过）→ 死链。
   已修正。**以后跑 `optimize_images.py --apply` 后必须复查**：
   ```
   python tools/check_asset_links.py                        # 静态死链
   python tools/audit_dynamic_refs.py --verify-webp          # 动态路径覆盖率
   node   tools/verify-image-health.mjs                      # 真实页面裂图数
   ```
8. ~~图片懒加载~~ —— **2026-09-28 已做**：82 张内容图加了 `loading="lazy" decoding="async"`
   （脚本 `tools/add_lazy_loading.py`，**故意跳过** `/ui/` 小图标、logo、gif、支付二维码、
   以及 `NavigationMenu` 的菜单图标 —— 那些是首屏元素，加懒加载会闪）。
9. ~~数据 chunk 未拆分~~ —— **2026-09-28 已做**：`vite.config.js` 的 `manualChunks` 把 `src/assets/*.json`
   拆成 13 个 `data-*` chunk（`data-equip` 986 KB 等）。改页面代码不再让数据 chunk 失效。
10. ~~无路由预取~~ —— **2026-09-28 已做**：`NavigationMenu` hover/touchstart 时 `import()` 预热目标页 chunk。
11. **骨架屏** —— 未做。加载态现在是 `<div v-if="routeLoadingState.active">` + 一行文字，
    换成占位方块可改善"等待体感"（**不加快加载**，纯观感，价值最低）。

---

## 八、待确认事项（进行中，**不要当已解决**）

### 8.1 部分用户「能导出、不能导入」—— 待确认环境与 APK 版本

**状态**：2026-09-28 已排查并加固，**根因尚未最终确认**，等用户反馈设备/浏览器与 APK 版本。

**已查实的证据**：

| # | 结论 | 依据 |
| --- | --- | --- |
| 1 | 宿主弹的「无法打开文件选择器！」**不在本项目代码里** | 全工作区搜索、`git log --all -S`、线上部署包 `index-qsQBCq9V.js` 三处均 0 命中 → 是安卓宿主/文件管理器弹的 |
| 2 | `MainActivity.java` **没有**覆盖 `setWebChromeClient` | 用的是 Capacitor 默认 `BridgeWebChromeClient`，其 `onShowFileChooser` 实现完整 → 新版 APK 理论上正常 |
| 3 | 出问题的人在 **App 内**，不在浏览器 | `exportData()` 只有 `hxsngh.app` / `file://` / `data-app-shell="true"` 才走原生分支；他导出能用说明原生桥通了 |
| 4 | 导出与导入的通道不对称 | 导出走原生写文件+分享（**不需要**系统选择器）；导入走 `<input type=file>` → 需要系统 `ACTION_GET_CONTENT`，被拒就失败 |

**已做的加固**（三处真实隐患，均已修并构建验证）：

1. 文件输入原在 `v-if="isSettingsOpen"` 下拉内部，点击同一瞬间被卸载 → 移到下拉外**常驻 DOM**。
2. `display:none` → 改为视觉隐藏但保留布局（`.universal-file-input`，1px + `clip-path` + `opacity:0`）。
3. 去掉 `accept=".json"`（部分安卓文件管理器按 MIME 过滤，`.json` 解析不出 MIME 会导致选不了文件），并在点击前 `input.value = ''`（顺带修复「同一文件连续导入两次不触发 change」）。

**下一步（取决于反馈）**：

- 若是**浏览器**且国产 ROM/微信内置浏览器 → 基本无解，只能靠文本通道（已提供）。
- 若是**旧 APK** → 让用户升级到最新版再试。
- 若是**ROM 精简掉「文档/文件管理」组件** → Web 侧无法根治，需在 `MainActivity.java` 用 `ACTION_OPEN_DOCUMENT` 自起选择器并**重新打 APK**（不是热更能解决的）。

**用户侧的绕过途径**：数据管理弹窗 →「复制文本数据」/「粘贴文本数据」，完全不依赖系统选择器。

