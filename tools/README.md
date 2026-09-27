# 游戏数据与资源更新工具套件

本目录整合了《幻想少女公会》助手的数据同步、资源提取清洗与概率计算工具。游戏版本更新时，可按以下标准三步流水线操作：

---

## 🛠️ 标准更新流水线

### 第一步：同步最新数据表
拉取官方服务端最新的全部配置表（如 `Role.json`、`Equip.json`、`Area_Spot.json` 等）并写入 `src/assets/`：
```bash
python tools/1_sync_tables.py
```
> **说明**：自动查询官方 API 并下载全量数据表，保护本地生成文件（`notices.json`、`simulation_exact_results.json` 等）不受覆盖。

---

### 第二步：提取与清洗最新图片资源
从官方热更 CDN 包（AssetBundle）解密并自动提取缺失的图片资源：
```bash
python tools/2_extract_images.py
```
> **涵盖内容**：
> - 装备图标：`public/Equip/Zxxxxx_xxx.png`
> - 羁绊图标：`public/Bond/HZxxxxx.png`
> - 地块底图：`public/AreaBlock/Sxxxxx_xxx.png`（自动根据首帧自然排序提取独苗底图）
> - 角色卡片：`public/RoleCard/MDxxxxx.png`（52×69 像素规格）
> - 角色立绘：`public/RoleDraw/Mxxxxx_1__single_part1_1@1.png`（保留首帧动作图）
> - 角色头像：`public/Header/Mxxxxx.png`（30×30 像素规格）
>
> *(注：已按需求剔除战斗模拟所需的角色小人序列帧图)*

---

### 第三步：跑测装备可刷掉落概率
当有新地图上线或掉落权重调整时，跑测蒙特卡洛模拟并将结果写入 `simulation_exact_results.json` 与 `map_equip_difficulties.json`。

> ⚠️ **必须显式带 `--profile-mode area-spot-weighted`**。脚本的 `--profile-mode` 默认值是 `server-samples`（精确模式），它要求同时提供 `--block-samples` 地块样本，否则直接报错退出：
> `error: 精确统计需要 --block-samples；近似统计请显式使用 --profile-mode area-spot-weighted`
>
> 线上数据就是用 `area-spot-weighted` 跑出来的。精确模式需要服务端 `/Explore/StartExplore` 返回的真实地图布局，社区拿不到。

- **跑测指定新图（推荐，200万次模拟，8线程约需 2 分钟）**：
  ```bash
  python tools/3_run_probability.py --map 夏日海滩 --trials 2000000 --workers 8 --profile-mode area-spot-weighted
  ```

- **跑测全部 15 张地图（耗时较长，约 30 分钟）**：
  ```bash
  python tools/3_run_probability.py --map all --trials 2000000 --workers 8 --profile-mode area-spot-weighted
  ```

- **快速小样本调试（1万次模拟）**：
  ```bash
  python tools/3_run_probability.py --map 夏日海滩 --trials 10000 --profile-mode area-spot-weighted
  ```

> 注意：脚本每次运行都会**连带覆写** `src/assets/map_equip_difficulties.json`（该文件目前前端无人引用）。
> 模拟器只依赖 Python 标准库，无需 `pip install`。算法细节见 `docs/technical/DROP_PROBABILITY_MODEL.md`。

---

## 📁 目录结构说明

```
tools/
├── 1_sync_tables.py          # [工具 1] 服务端数据表全自动拉取与同步
├── 2_extract_images.py       # [工具 2] CDN 热更包解密与全套图片提取
├── 3_run_probability.py      # [工具 3] 装备遇见率蒙特卡洛概率模拟器
├── optimize_images.py        # [资源] 大图转 WebP 并自动改写所有引用（默认只预估）
├── add_lazy_loading.py       # [资源] 给内容类 <img> 批量加 loading=lazy / decoding=async
├── check_asset_links.py      # [校验] 源码引用的 public/ 资源是否都存在（防改名死链）
├── audit_dynamic_refs.py     # [校验] 动态拼接路径（/Equip/${id}.png 等）离线解析与覆盖率
├── verify-image-health.mjs   # [校验] 真实浏览器逐页统计裂图数（18 页）
├── split-opencv-wasm.mjs     # [引擎] 把 opencv.js 内嵌的 base64 wasm 拆成独立文件
├── verify-opencv.mjs         # [校验] 真跑 imageMatcher，断言识别链路可用
├── pack-hotupdate.mjs        # [发布] 构建+排除+压缩+分卷+md5 一条命令
├── verify-update-flow.mjs    # [校验] 用网络打桩真跑更新/热更流程（绕过真实 Gitee）
├── verify-load-optimizations.mjs # [校验] 懒加载/预取/深色持久化/chunk拆分/扩展名回退
├── check_apk.py              # [校验] 反查构建出的 APK：wasm 是否 STORED、关键资源是否齐全
├── verify-dist-smoke.mjs     # [校验] 打 dist/ 冒烟（模拟 WebView：cv 就绪 + 无裂图）
├── README.md                 # 本说明文档
└── image_utils/              # 本地图像处理独立辅助小工具 (GUI)
    ├── 保留第一帧（地块图）.py
    ├── 保留第一帧（角色大图）.py
    ├── 保留第一帧（角色小人）.py
    └── 删带#数据.py
```

> ⚠️ **本机禁止执行 `.ps1`**（执行策略，`npm.ps1` 同样被挡），所以发布与校验类工具一律写成
> **Node (`.mjs`) 或 Python**。不要新增 `.ps1`，也不要在 PowerShell 里直接敲 `npm`——用 `cmd /c npm run ...`。

---

## 📦 发布与资源校验（2026-09-28 新增）

### 打包热更包

```bash
node tools/pack-hotupdate.mjs --build          # 构建 + 打包 + 分卷 + 算 md5
```

自动排除 `opencv.js` / `opencv_js.wasm` / `*.apk`，并校验 zip 根层有 `index.html`、含 `assets/*.js`。
输出里的 `totalParts` 与 `md5` 直接回填 `hotupdate.json`。

> 手工 `Compress-Archive` 的老流程仍在 `docs/HANDOFF.md §六` 有记录，但已不推荐：
> 漏删 opencv 引擎会让热更包凭空多 7.9 MB，漏删 APK 多 24 MB。

### 图片瘦身

```bash
python tools/optimize_images.py                          # 只预估，不写盘
python tools/optimize_images.py --resize logo.png=128 --apply
```

- 只处理 **≥20 KB** 的大图；4400+ 张小雪碧图**故意不处理**（实测转 WebP 有 11% 反而变大）。
- 默认**不改分辨率**（很多图在看图弹窗里会放大）；用 `--resize NAME=MAXEDGE` 单独指定。
- 输出 `.webp` 且**换文件名**（App 端非 HTML 资源是 `immutable, max-age=31536000`，不改 URL 拿不到新图），
  并自动改写代码引用；原图备份在 `.backup/images/`，可用 `--restore` 回滚。
- 动态拼接路径的目录（`Equip`/`AreaBlock`/`General` 等）默认跳过，要处理加 `--include-dynamic`，
  但**必须先把对应模板里的 `.png` 改成 `.webp`**。

### 资源校验（改名后必跑）

```bash
python tools/check_asset_links.py         # 死链校验（字面量 + 动态拼接目录）
python tools/audit_dynamic_refs.py --verify-webp   # 动态路径覆盖率（表驱动离线解析）
node tools/verify-image-health.mjs        # 真实浏览器逐页裂图统计（18 页）
node tools/verify-opencv.mjs              # 截图识别链路校验
node tools/verify-update-flow.mjs         # 更新/热更流程校验（23 项）
node tools/verify-load-optimizations.mjs  # 加载与体验优化校验（16 项）
```

死链**不会报错**，只会静默显示兜底图，所以必须静态校验。
**转 WebP 之后前三项必须全跑** —— 已发生过一次真实事故：转换器把 `'/Relics/Mark.png'`
误改成 `.webp`，而 `Mark` 只有 `.png`（体积太小被跳过），静态死链校验当场抓到。

### 换包（发 APK）

```bash
cmd /c npm run build
npx cap sync android
cd android && .\gradlew.bat assembleRelease

# 体检（引入外置 wasm 后建立，已实测通过）
python tools/check_apk.py            # 反查 APK：wasm 是否 STORED、关键资源是否齐全
node   tools/verify-dist-smoke.mjs   # 服务 dist/ 后冒烟：window.cv 就绪 + 无裂图
```

> **换包与热更是两条独立流程**：`pack-hotupdate.mjs` 只打热更 ZIP，
> 它的排除（opencv 两件套 + `*.apk`）只作用于**临时暂存目录**，不碰 `dist/` 与 `android/`。
>
> 热更 ZIP 里没有 `opencv_js.wasm` 也不会导致热更后失效 ——
> 原生侧替换前会 `copyMissingStaticFiles()` 把现有 `files/www/` 的文件补进新目录。

### opencv 引擎

```bash
node tools/split-opencv-wasm.mjs        # 幂等；已拆分会提示无需处理
```

`public/opencv.js` 原先是「wasm 以 base64 内嵌」的构建（10.46 MB）。拆成
`opencv.js`(0.22 MB) + `opencv_js.wasm`(7.68 MB) 后：原始省 2.56 MB（24%），
gzip 传输省 0.97 MB（29%），且走 `instantiateStreaming` 不再需要 base64 解码。

> 两者**必须成对**：`MainActivity` 把 `.wasm` 映射为 `application/wasm`，Gradle 加了 `noCompress 'wasm'`，
> 热更包两者都跳过（随 APK 内置）。改动这块后**要重打 APK**。

---

## ⚠️ 常见问题说明
1. **Windows 编码**：所有脚本已内置 UTF-8 自动配置，若在 PowerShell 运行遇到乱码，请确认终端代码页为 65001 (`chcp 65001`)。
2. **UnityPy 依赖**：图片提取依赖 `UnityPy` 和 `Pillow`，请确保当前 Python 环境已安装：
   ```bash
   pip install UnityPy Pillow
   ```
