# 项目架构说明（幻想少女公会助手 / vue-hxsngh）

> 本文档描述 `vue-hxsngh` 的整体架构、目录职责、数据流与发布链路。
> UI 规则见 §6，页面契约见 [SPEC.md](./SPEC.md)。

## 1. 项目概览

- **项目名称**：幻想少女公会助手（Hyxsngh / Hxsngh）
- **技术栈**：Vue 3（Composition API + `<script setup>`）、Vite 8、Vue Router 4（**Hash 路由**）、原生 CSS（**不依赖任何 UI 框架**）、Capacitor 8（Android 原生壳）
- **形态**：Web 单页应用 + Android App；两种形态共用同一份 `dist/`
- **数据来源**：官方服务端接口 `POST /GameDataTable/FetchDataTable` 下发的配置表，构建期以 JSON 形式**静态打包进 bundle**（`src/assets/*.json`），运行时**无接口请求**（除热更清单与更新检查）
- **图像识别**：本地 OpenCV WebAssembly 做模板匹配，用于「指定招募」截图识别。**引擎是外置的**：`public/opencv.js`（0.22 MB）+ `public/opencv_js.wasm`（7.68 MB），两者必须成对，且随 APK 内置、**不进热更包**（见 §5 与 [SPEC §六](SPEC.md)）
- **在线地址**：<https://hxsngh.yxzmy.top>
- **仓库**：<https://gitee.com/ccyconner/hxsngh>

### 与工作区其他目录的关系

游戏原始数据、反编译源码与拉取工具不在本仓库内，位于工作区 `E:\Desktop\html\hsxngh\游戏数据\`。数据表更新流程见该目录的 `README.md`。

## 2. 目录结构

```
vue-hxsngh/
├── index.html                  # 入口 HTML（挂载 #app，加载 opencv.js）
├── vite.config.js              # base='./'、cssMinify=false（兼容旧 WebView）
├── capacitor.config.json       # appId=com.hxsngh.assistant，webDir=dist
├── hotupdate.json              # 热更清单（发布到 Gitee raw）
├── build.py                    # 热更包分卷脚本（Windows GUI/命令行双模）
├── public/                     # 静态资源，原样拷进 dist
│   ├── opencv.js               # 0.22 MB 引擎加载器，随 APK 内置，不进热更包
│   ├── opencv_js.wasm          # 7.68 MB 引擎主体（Gradle noCompress 'wasm'，必须 STORED）
│   ├── Equip/ Bond/ AreaBlock/ RoleCard/ RoleDraw/ Header/
│   ├── Relics/ Rune/ GodStone/ Foretell/ DungeonRelics/ lime/
│   ├── ParagonPrefix/ Skill/ Shop/ General/ ui/ misc/ images/
│   ├── fonts/                  # HarmonyOS Sans（本地字体）
│   ├── gif/                    # 界面装饰 GIF
│   └── hxsnghv1.0.22.apk       # App 下载分发包（网页版「点击下载」指向它）
├── android/                    # Capacitor 安卓工程（源码入库）
│   └── app/src/main/java/com/hxsngh/assistant/
│       ├── MainActivity.java   # ★ WebView 容器 + 热更解压安装 + 资源拦截（约 950 行）
│       ├── UpdateBridge.java   # 原生更新桥
│       └── UmengApplication.java # 友盟 U-App / U-APM 初始化
├── src/
│   ├── main.js                 # 7 行：createApp + router + mount
│   ├── App.vue                 # ★ 2200+ 行应用外壳（脚本 + 模板 + 全局样式；<style> 非 scoped）
│   ├── router/index.js         # 22 条路由 + routeLoadingState
│   ├── assets/*.json           # ★ 53 张服务端表 + 4 个本地文件（见 SPEC）
│   ├── components/             # 7 个公共组件
│   ├── views/                  # 22 个业务页面
│   └── utils/                  # 9 个纯逻辑工具
├── tools/                      # 数据/资源/概率维护工具（Python）
│   ├── 1_sync_tables.py        # 服务端表 → src/assets/
│   ├── 2_extract_images.py     # CDN bundle → public/
│   ├── 3_run_probability.py    # 蒙特卡洛掉落模拟 → src/assets/*.json
│   ├── image_utils/            # 图像处理独立小工具（GUI）
│   └── README.md
└── docs/                       # 本文档体系
```

## 3. 分层架构

```
┌──────────────────────────────────────────────────────┐
│ App.vue（外壳）                                        │
│  ├─ 顶栏：logo / 标题(菜单模式下拉) / 赞助 / 设置下拉     │
│  ├─ NavigationMenu（桌面侧边栏 + 移动端三模式）          │
│  ├─ <router-view>（视图出口，注入 showGifs/engineStatus）│
│  └─ 全局弹窗：公告/更新/热更/隐私/关于/赞助/反馈/消息     │
├──────────────────────────────────────────────────────┤
│ views/（22 个页面）                                    │
│  每个视图 = 筛选区 + 列表/网格 + 详情弹窗                │
│  自己 import 所需 JSON，自己过滤/排序/分页               │
├──────────────────────────────────────────────────────┤
│ components/（7 个公共组件）                            │
│  NavigationMenu / NoticeModal / UpdateModal /          │
│  HotUpdateModal / PrivacyModal / AboutModal / BackToTop│
├──────────────────────────────────────────────────────┤
│ utils/（纯逻辑，不 import 组件）                        │
│  configTableUtil / characterFilter / imageMatcher /    │
│  hotupdate / version / storage / dataTransfer /        │
│  tagCategories / fileSize                              │
├──────────────────────────────────────────────────────┤
│ src/assets/*.json（构建期静态打包的数据层）              │
└──────────────────────────────────────────────────────┘
```

**依赖方向（单向）**：

- `views → components → utils`
- `views → utils → assets`
- `App.vue → components + utils + assets/notices.json`
- 反向依赖禁止：`utils` 不得 import 组件，`components` 不得 import `views`。

> **注意**：本项目**没有** Pinia/Vuex。跨页面共享状态靠**模块级 `ref`**（`router/index.js` 的 `routeLoadingState`、`utils/characterFilter.js` 的 `HIDE_UNRELEASED_CHARACTERS`）与 `localStorage`。

## 4. 关键机制

### 4.1 路由与页面加载态

- Hash 路由（`createWebHashHistory`），根路径 `/` 重定向到 `/recruit`。
- 22 条路由全部**懒加载**（`() => import(...)`），见 `src/router/index.js` 的 `routes`。
- `routeLoadingState`（`router/index.js` 顶部的模块级 `reactive`）由 `beforeEach` 置 `active=true`、`afterEach`/`onError` 置 `false`。`App.vue` 据它决定渲染**加载占位**还是 `<router-view>`。
  - 注意 `v-if`/`v-else` 结构：加载态激活时 `<router-view>` **整个被替换掉**，因此慢加载时页面组件会被卸载重建。
- 页面组件通过 `:showGifs` 与 `:engineStatus` 两个 prop 接收外壳状态（`App.vue` 模板里的 `<router-view>` 处）。

### 4.2 应用外壳与全局弹窗编排

`App.vue` 的 `onMounted` 是全部启动逻辑的入口，时序为：

1. **图像识别引擎预热**：`imageMatcher.init()`，成功/失败写 `engineStatus`（`ready` / `error`）。
2. 读取 `recruit_tool_showGifs` 恢复 GIF 显隐。
3. 缓存 `window.__APK_VERSION__` 到 `apk_cached_version`（供热更重载后稳定读取）。
4. `checkShell()` 判定是否运行在 App 内 —— 四个判据任一成立即为 App：Capacitor `isNativePlatform()`、`<html data-app-shell="true">`、URL 含 `files/www/` 或 `/data/`、存在 `NativeAnalytics` 桥。**不在 App 内才加载百度统计**。
5. App 内且未跳过更新时，2 秒后静默 `checkUpdate(true)`。
6. 隐私政策：App 首次启动（`privacy_accepted !== 'true'`）延迟 500 ms 弹 `PrivacyModal`；网页版不强制，直接写入 `privacy_accepted`。
7. 隐私就绪后：App 初始化友盟 → `checkNoticeAfterPrivacy()` → `checkForHotUpdate()`。
8. 注册全局 `click` 监听关闭各下拉（`handleGlobalClick`）。
9. 注册 `window.onAndroidBack`：用一组选择器列表找当前可见弹窗，优先点关闭按钮、兜底点遮罩；返回 `true` 表示已消费。

全局弹窗分为两类：

- **独立组件**：`NoticeModal` / `UpdateModal` / `HotUpdateModal` / `PrivacyModal` / `AboutModal` / `BackToTop`。
- **内联在 App.vue 模板里的通用弹窗**：反馈/建议、切换菜单模式、赞助二维码、版本提示（`showVersionAlert`）、通用消息（`showMessage`）。这些都复用 `.custom-modal-overlay` + `.custom-modal-card` + `.modal-btn-confirm` 这套类名。
  > ⚠️ **App.vue 的 `<style>` 不是 scoped**：里面任何裸类名选择器都会全站生效，而页面自己的 scoped 规则只在**它声明过的属性**上赢。已经因此出过一次弹窗关闭按钮错位的事故（见 [KNOWN_BUGS §4](KNOWN_BUGS_AND_FIXES.md)）。**写全局样式一律加父级前缀。**

### 4.3 导航菜单三模式

`NavigationMenu.vue` 同时服务桌面端与移动端：

- **桌面端**：`App.vue` 模板里 `is-desktop="true"` 那处固定渲染 `<NavigationMenu :is-desktop="true" menu-mode="side" />`，走扁平列表 `desktopNavList`（`NavigationMenu.vue:67`）。
- **移动端**：由右下角悬浮按钮 `.nav-fab-btn` 控制 `isOpen`，模式由 `menuMode` 决定 —— `top`（标题栏下拉）/ `bottom`（底部抽屉）/ `side`（右侧抽屉）。模式存在 `localStorage.recruit_tool_menuMode`，默认 `top`。
- 菜单项定义在 `NavigationMenu.vue:27-64` 的 `categories`，分三组：核心工具（7）、图鉴（12）、其他工具（2）。
- 高亮用 `routeLoadingState.active ? routeLoadingState.path : route.path`（`NavigationMenu.vue:69`），保证加载期间菜单已提前切到目标项。

> **维护提醒（重要）**：**页面清单在本项目有 4 份独立定义**，新增页面必须全部登记：
>
> | # | 位置（**按符号名找，别记行号**） | 作用 | 漏改后果 |
> | --- | --- | --- | --- |
> | 1 | `src/router/index.js` 的 `routes` 数组 | 真正的路由 | 页面无法访问 |
> | 2 | `src/components/NavigationMenu.vue` 的 `categories` | 导航菜单分组与图标 | 菜单里看不到入口 |
> | 3 | `src/App.vue` 的 `const modes = [` | **顶栏标题与加载态标题**（`currentModeInfo` 按 path 反查 `name`） | 顶栏标题退化为路由 meta 兜底值 |
> | 4 | `src/App.vue` 的 `const pageNames = {` | 百度统计的页面中文名 | 统计报表里显示英文路由名 |
>
> 四份清单**互不校验**，任何一处漏改都不会报错。已知漂移：`modes[21].name` 是「预告：角色/队伍热度排行」，而 `router` 的 `meta.title` 是「预告：热度排行」，两处文案已不一致。
>
> ⚠️ 这里原先记的是行号（`App.vue:290-313` / `389-405`），`App.vue` 由 1555 行涨到 2200+ 行后**全部失效**并误导了三份文档。**一律用符号名定位。**

### 4.4 主题与显示开关

- 深色/浅色：`document.documentElement.classList.toggle('dark-mode')`，全部颜色走 CSS 变量，组件无需感知。状态变量 `isDarkMode`。
  - **已持久化**：键 `recruit_tool_darkMode`（常量 `DARK_MODE_KEY`），`'true'`/`'false'` 字符串。
  - 首帧防白闪靠 `index.html` 里一段**内联脚本**——它在 module 之前读该键并加 `.dark-mode`。样式由 JS 注入，等 Vue 挂载再加 class 会先闪一帧浅色。**不要删掉那段内联脚本。**
  > 这里曾写「切换后不写 localStorage，刷新即回到浅色」，那是**旧实现**，2026-09-28 已修，别再照旧描述改回去。
- GIF 显隐：`showGifs`，持久化键 `recruit_tool_showGifs`，通过 prop 下发给所有页面。
- 桌面端布局：`.main-layout-row` 是三栏结构（左侧栏 + 居中内容 + 右侧占位），左右两侧均为 `desktop-only`，目的是让内容区在宽屏下**真正居中**。

### 4.5 数据流

**本项目的数据层是「构建期静态打包」，与参考项目 `vue-myrzg` 的「构建期预解析 + 运行时 fetch」完全不同。**

- 22 个视图**各自 `import` 需要的 JSON**（46 处 import，见 SPEC 的交叉引用矩阵）。这些 JSON 由 Vite 打进 JS chunk，首屏不下载、按路由懒加载。
- `src/assets/` 下 57 个 JSON = 53 张服务端配置表 + 4 个本地文件（`notices.json`、`data.json`、`map_equip_difficulties.json`、`simulation_exact_results.json`）。
- 组装逻辑集中在 `src/utils/configTableUtil.js`：把 `Role.json` 的一行 + `Sub_Skill` / `Unique` / `Talent` / `Relics` 关联成一条完整角色对象。**这是唯一的角色数据组装入口**，页面不得自己重复实现关联规则。
- 大表体积：`Equip.json` 1.23 MB、`Bond.json` 634 KB、`Talent.json` 416 KB、`Area_Spot.json` 320 KB。构建产物里 `Equip-*.js` 达 985 KB —— 这是「数据即代码」的直接代价，优化方向见 §5。

数据表字段契约、ID 前缀规则与占位符规则见 [technical/DATA_TABLES.md](technical/DATA_TABLES.md)。

### 4.6 图像识别引擎

- `src/utils/imageMatcher.js` 导出单例 `imageMatcher`。
- 模板是 25 张职业/属性/种族/地区/星级图标（`public/images/*.png`），每个模板记录了**截图参考宽度** `refW`（1440 / 1280 / 1224 / 1116 / 1080 / 1064）。
- 初始化时把所有模板按 `referenceWidth(800) / refW` 缩放并**灰度化**，缓存为 `cv.Mat`。
- `match()` 把输入图缩放到 800 px 宽、灰度化，只取**中间区域 ROI**（x: 20%~80%，y: 35%~70%）做 `TM_CCOEFF_NORMED` 模板匹配，阈值 `maxVal > 0.82` 判为命中。
- 模板加载与 OpenCV 就绪是两个并行分支，OpenCV 等待超时 15 秒。
- 详见 SPEC §3.1。

### 4.7 本地状态与导入导出

全部 `localStorage` 键（实测 **16 个**，含 2 个已废弃/迁移用）：

| 键 | 写入方 | 用途 |
| --- | --- | --- |
| `privacy_accepted` | `App.vue` | 隐私政策是否已同意 |
| `saved_notice_version` | `App.vue` | 已读公告版本（`date-title`） |
| `apk_cached_version` | `App.vue` | 缓存的 APK 版本号 |
| `recruit_tool_menuMode` | `App.vue` | 移动端菜单模式 |
| `recruit_tool_showGifs` | `App.vue` | GIF 显隐 |
| `recruit_tool_darkMode` | `App.vue`（常量 `DARK_MODE_KEY`） | 深色模式持久化 |
| `local_web_version` | `utils/hotupdate.js` | 当前生效的网页资源版本 |
| `hotupdate_version` | `utils/hotupdate.js` | 同上（历史副本，与新键同步写） |
| `update_skip_version` | `utils/version.js` | **按版本**跳过 APK 更新提示（现行） |
| `unowned_characters` | `RecruitView.vue` | 未拥有角色标记（**不在通用备份内**） |
| `foretell_clover_calc_items` | `ForetellView.vue` | 预言四叶草计算器（**不在通用备份内**） |
| `my_owned_limes` | `LimeView.vue` | 莱姆拥有状态 |
| `talent_manager_data` | `TalentManageView.vue` | 天赋管理本地库存 |
| `fruit_record_data` | `FruitRecordView.vue` | 大果记录账本 |
| ~~`update_skip_date`~~ | `utils/version.js` | **已废弃**（`@deprecated`，按天口径，连带静默热更，见 [SPEC §二·补](SPEC.md)） |
| ~~`talent_sandbox_data`~~ | `TalentManageView.vue` | **历史键**，自动迁移进 `talent_manager_data` 后删除 |

- `utils/storage.js` 只封装了 `readStoredArray`（带 `strict` 选项，损坏时抛错）与 `writeStoredJson` 两个函数。
- **导入导出**：`App.vue` 的 `exportAllData()` / `handleUniversalImport()` 合并各视图的本地数据，`utils/dataTransfer.js` 负责文件读写。导出为 JSON 文件，导入时按 `normalizeImportItem` 归一化并做日期合法性校验。
  > ⚠️ 通用备份**只覆盖 3 类**：`talent_manager_data`、`my_owned_limes`、`fruit_record_data`。
  > `unowned_characters` 与 `foretell_clover_calc_items` **不在范围内**（`FruitRecordView` 另有页内数据管理弹窗）。

### 4.8 统计

- **网页版**：百度统计，`baiduSiteId` 硬编码；`_setAutoPageview=false`，改为 `watch(route.fullPath)` 手动上报 `/app/<中文页面名>`（`pageNames` 映射）。
- **App 版**：友盟 U-App / U-APM，通过 `NativeAnalytics.acceptPrivacyAndInitialize()` 桥接，**仅在用户同意隐私政策后**初始化（原生侧 `UmengApplication.initializeAfterPrivacyConsent`）。
- 两者互斥：`isInApp` 为真时不加载百度脚本，网页版不调用友盟。

### 4.9 原生返回键

- 原生 `MainActivity.onBackPressed()` 调 `window.onAndroidBack()`；JS 返回 `true` 表示已关闭某个弹窗，返回 `false` 则交回原生（后退 WebView 历史）。
- JS 侧用**选择器字符串列表**匹配可见弹窗（`closeActiveModal` 里的那个数组），带 `[class*="modal-overlay"]` 这类模糊匹配兜底。
- 这是个脆弱设计：新增弹窗必须使用列表里已有的类名体系，否则物理返回键会直接穿透。约定见 §6.2。

## 5. 构建与运行

### 日常命令

| 目标 | 命令 | 说明 |
| --- | --- | --- |
| 本地开发 | `cmd /c npm run dev` | Vite 开发服务器 |
| 生产构建 | `cmd /c npm run build` | 输出到 `dist/`，约 8 秒 |

> **Windows 注意**：PowerShell 默认禁止执行 `npm.ps1`（脚本执行策略），必须用 `cmd /c npm run build`。

### 构建配置要点

- `base: './'` —— 相对路径，热更后从 `files/www/` 加载也能正确引用资源。
- `cssMinify: false` —— **刻意关闭 CSS 压缩**，因为压缩会重写 `max-width`/`min-width` 媒体查询为 range 语法，旧版 Android System WebView 不支持。**不要为了体积打开它。**
- 别名 `@ → ./src`。

### 发布链路（三条独立通道）

1. **Web 部署**：`npm run build` → 上传 `dist/`（含 `opencv.js`）。
2. **热更新**（只替换网页资源，不动原生）：
   - 删掉 `dist/opencv.js` 与 `.apk` → 打包为 `dist.zip`（`index.html` 必须位于 zip 根层）→ `python build.py <目录>` 切成 9 MB 分卷 `dist.zip.001`、`.002`… → 上传 Gitee → 回填 `hotupdate.json` 的 `version` / `downloadUrl` / `totalParts` / `md5` / `body`。
   - 完整协议见 [technical/HOT_UPDATE_PROTOCOL.md](technical/HOT_UPDATE_PROTOCOL.md)。
3. **APK 发布**：`npx cap sync android` → Gradle 构建 → 传到 Gitee Release。网页端 `UpdateModal` 经 `fetchLatestRelease()` 查 Gitee API 比对版本。

### 已知体积问题

| 产物 | 大小 | 说明 |
| --- | --- | --- |
| `dist/assets/Equip-*.js` | 985 KB | `Equip.json` 全量内联 |
| `dist/assets/Bond-*.js` | 544 KB | `Bond.json` |
| `dist/assets/Talent-*.js` | 334 KB | `Talent.json` |
| `dist/opencv.js` | 0.22 MB | 引擎加载器（文本，压缩） |
| `dist/opencv_js.wasm` | 7.68 MB | 引擎主体，**唯一的**大块静态资源；随 APK 内置、不进热更包 |

构建会提示「Some chunks are larger than 500 kB」，属已知情况。可行的优化方向是把超大数据表改成 `public/` 下的运行时 `fetch`（如参考项目的 `fetchWithFallback` 模式），但那会引入首屏网络依赖与离线回退问题，属于架构级改动，**不要顺手做**。

## 6. UI 规则

### 6.1 样式组织

- 全局样式在 `App.vue` 的**非 scoped `<style>`**里（另有页面共用的第二段 `<style>`）；页面私有样式写各自组件的 `<style scoped>`。
  > ⚠️ **非 scoped 意味着全站生效**：裸类名选择器会作用到所有页面。写全局样式**一律加父级前缀**，
  > 否则会出现「页面 scoped 规则只覆盖了部分属性、其余属性被全局规则接管」的隐蔽错位。详见 [KNOWN_BUGS §4](KNOWN_BUGS_AND_FIXES.md)。
- 亮色浅灰蓝（`--bg: #f8fafc`）/ 暗色深蓝灰（`--bg: #0f172a`），靠 `<html>` 上的 `.dark-mode` 类切换变量。
- **禁止写死颜色**，一律用变量。

| 变量 | 亮 | 暗 | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#f8fafc` | `#0f172a` | 页面背景 |
| `--card-bg` | `#ffffff` | `#1e293b` | 卡片/弹窗 |
| `--header-bg` | `#ffffff` | `#1e293b` | 顶栏 |
| `--text-main` | `#1e293b` | `#cbd5e1` | 主文本 |
| `--text-sub` | `#64748b` | `#b8c6dd` | 次要文本 |
| `--border-color` | `#f1f5f9` | `#334155` | 边框 |
| `--modal-overlay` | `rgba(15,23,42,.4)` | `rgba(0,0,0,.6)` | 遮罩 |
| `--primary` / `--blue` | `#3b82f6` | 同 | 主色 |
| `--icon-filter` | 深色滤镜 | 浅色滤镜 | 单色 SVG 跟随主题 |

**稀有度色板**（不随主题变化，权威来源是 `configTableUtil.js` 的 `TalentStepConfig`）：

| 档 | 色 | 权重 |
| --- | --- | --- |
| S | `#f97316` | 4 |
| A | `#a855f7` | 3 |
| B | `#3b82f6` | 2 |
| C | `#79C37A` | 1 |

> ⚠️ 排序与去重依赖权重，改色时不要顺手改权重。另外其它页面还散落着 6 份同义实现，C 档色值有的是 `#10b981`/`#16a34a`，与这里的 `#79C37A` 不一致。

**响应式断点**：`340 / 380 / 480 / 600 / 767 / 768 / 769`，以 **768 px 为桌面/移动分界**（`.desktop-only` / `.mobile-only`）。历史包袱：同时存在 `767` 和 `768` 两种写法，新代码统一用 `768`。

**字体**：本地 HarmonyOS Sans（`public/fonts/`），声明为 `HarmonyOS_Bold` / `HarmonyOS_Regular`，不引用在线字体（离线可用是硬需求）。

### 6.2 弹窗类名（强制）

`closeActiveModal` 用一个选择器字符串列表查找「当前可见弹窗」，供 Android 物理返回键消费。**新弹窗的类名必须含 `modal-overlay`**（有 `[class*="modal-overlay"]` 模糊匹配兜底），否则返回键会穿透弹窗直接退页面。

关闭按钮要能被 `closeActiveModal` 点到，它按顺序找 `.relic-modal-close`、`.image-modal-close`、`.close-btn`、`.modal-close-btn`、`.modal-close`、`button[class*="close"]`，都没有时才点遮罩。

> ⚠️ **页面自己定义 `.modal-close-x` 时必须写全**（`background`/`border`/`font-size`/`color`/`cursor`）。
> 不要指望它靠 `App.vue` 的全局规则定位 —— 全局那条只管「数据管理」弹窗，且已收窄为 `.import-modal-card .modal-close-x`。
> 页面里的 X 靠 `.modal-header` 的 `display:flex; justify-content:space-between` 排到右侧，**所以 `.modal-header` 必须有这两条**。

### 6.2.1 行内浮层（下拉框 / 气泡）会被滚动容器裁掉

**绝对定位救不了你**：只要浮层的包含块（通常是 `position:relative` 的 wrapper）落在某个
`overflow-y: auto` 的滚动容器**内部**，那么浮层超出该容器可见区的部分就会被裁掉 ——
`z-index` 再高也没用，`position: fixed` 才不受影响。

已出过的事：`.tag-dropdown-menu`（`top:100%` 向下展开）在卡片贴到列表底部时被
`.talent-list`（`/talent`）或 `.app-content`（`/search`）从中间切断，最后一项完全看不见。

**做法**：展开前**量一次空间**，不够就给浮层加一个 `.drop-up` 类改为 `bottom:100%` 向上弹
（见 `TalentView.vue` 的 `measureDropUp` / `toggleTagDropdown`）。要点：

- **向上找最近的裁剪祖先**，不要写死容器类名 —— 同样一个组件，`/talent` 的裁剪层是 `.talent-list`，
  `/search` 的 `.talent-list` 却没有 `overflow`，真正裁剪的是上层的 `.app-content`。
- 用 `await nextTick()` 等菜单渲染出来再量**真实高度**，不要硬编码每项高度。
- 事件对象里的 `currentTarget` **只在事件派发期间有效**，必须在 `await` 之前取出来，否则拿到 `null`。
- 回归：`node tools/verify-talent-dropdown.mjs --serve dist --route /talent|/search`

**还有一半坑在层叠顺序上：宿主不能只靠 `transform` 制造层叠上下文。**

`transform` 会让元素成为**层叠上下文**，但若该元素是 `position: static`，它**仍按普通流绘制** ——
于是浮层的 `z-index` 被**困在宿主内部**，后面 DOM 顺序的兄弟元素反而盖住它。
已出过的事：`.talent-card:hover { transform: translateY(-2px) }` 导致下拉框与下一张卡片重叠的那段
被下一张卡片整个盖住。

```css
/* ✅ 浮起手感可以留，但必须同时给正 z-index，让宿主进入"正 z-index 层" */
.talent-card:hover { transform: translateY(-2px); position: relative; z-index: 30; }
```

> ⚠️ 触屏上 `:hover` 在点按后会**粘住**，所以这不是"桌面才有的小毛病"。
> ⚠️ 验证这类问题**必须用真实鼠标事件**（`page.mouse.move()` + `click()`）——
> 程序化 `element.click()` 不触发 `:hover`，会测出一个假的"通过"。

### 6.3 页面骨架模板

22 个筛选类页面共用同一骨架，新增页面照抄：

```vue
<template>
  <div class="xxx-container">
    <div class="xxx-sticky-top">
      <div class="xxx-search-row">
        <div class="xxx-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input type="text" v-model="searchQuery" placeholder="…" class="xxx-search-input" />
        </div>
        <button class="sub-filter-btn" :class="{ active: showSubSearch }" @click="showSubSearch = !showSubSearch">
          <span class="filter-toggle-text">次筛</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !showSubSearch }" />
        </button>
      </div>

      <Transition name="slide-fade">
        <div v-show="showSubSearch" class="sub-search-box">
          <input type="text" v-model="subSearchQuery" placeholder="结果内二次筛选…" class="sub-search-input" />
        </div>
      </Transition>

      <div class="filter-header-panel">
        <div class="filter-row">
          <span class="filter-label">品质：</span>
          <div class="filter-options">
            <button v-for="opt in stepOptions" :key="opt.value" class="filter-btn"
                    :class="{ active: selectedStep === opt.value }"
                    @click="toggleStepFilter(opt.value)">{{ opt.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="xxx-grid"> … </div>

    <!-- 详情弹窗：类名必须含 modal-overlay -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="modal-window">
        <button class="modal-close-x" @click="detail = null">✕</button>
        <div class="modal-header">…</div>
        <div class="modal-body">…</div>
      </div>
    </div>
  </div>
</template>
```

复用频率最高的类名（实测出现次数）：`.filter-btn` 41、`.modal-header`/`.modal-body` 各 35、`.filter-label` 27、`.filter-row`/`.filter-options` 各 26、`.modal-btn-confirm` 25、`.modal-overlay` 22、`.modal-close-x` 20、`.custom-modal-overlay`/`.custom-modal-card` 各 19、`.modal-window` 16。

> 这些类名**在多数页面各自 scoped 定义**（同名不同实现）。跨页面复制骨架时样式要一并复制；只有**三个以上页面**需要同一段样式时才提取到 `App.vue` 全局。

### 6.4 改动自查清单

- [ ] 暗色模式下新增颜色都取自 CSS 变量。
- [ ] 新弹窗类名含 `modal-overlay`，且有可被点到的关闭按钮。
- [ ] 375 px 宽与 1280 px 宽下各看一次。
- [ ] 图片用根相对路径（`/Equip/xxx.png`），不用 `./` 或 `@/`。
- [ ] 新增页面已登记到 **4 处**（见 §4.3）。
- [ ] `cmd /c npm run build` 通过。
- [ ] 涉及返回键的改动在真机验证过。

## 7. Git 提交与推送约定

- 提交前先看 `git status`，保留工作区已有改动，不把无关改动混入本次提交。
- 每次提交对应一个明确主题。**数据表更新与代码改动分开提交**（数据表 diff 极大，混在一起无法评审）。
- `dist/` 在 `.gitignore` 中，但历史上已被跟踪，因此会持续出现在 `git status` 里。**不要**把 `dist/` 的构建产物当作源码改动提交。
- 每日改动按 [dev-logs 规范](dev-logs/README.md) 记入 `docs/dev-logs/YYYY-MM/YYYY-MM-DD.md`。
- 本地提交与推送分开处理；历史改写、强推不作为默认方案。
