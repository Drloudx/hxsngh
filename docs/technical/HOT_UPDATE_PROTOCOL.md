# 热更新协议

> 覆盖「网页资源热更」全链路：清单格式 → 分卷下载 → 前端校验 → 原生原子替换 → 版本落库 → 失败回退。
> APK 大版本更新（走 Gitee Release + `UpdateModal`）是另一条通道，见 §7。

## 1. 为什么需要它

热更新只替换**网页资源**，不替换 Android 原生代码。因此：

- 改 Vue 页面、CSS、图片、数据表 → 走热更，用户无需重装 APK。
- 改 `MainActivity.java`、`build.gradle`、依赖 SDK → 必须发新 APK。

## 2. 资源目录与优先级

原生层 `MainActivity` 把 WebView 的页面 URL 固定为 `https://hxsngh.app/index.html`（`MainActivity.java:362`），再用 `WebViewClient.shouldInterceptRequest` 拦截，按以下顺序找文件：

```
① files/www/<path>            ← 热更后的资源（App 私有目录）
② assets/www/<path>           ← APK 内置兜底
③ 404
```

- `files/www` 是热更的落地点；APK 升级时由 `prepareHotUpdateDir()` 从 `assets/public/` 重新拷贝。
- 路径穿越已防护：解析后必须落在 `www` 的 canonical 路径内（`MainActivity.java:437-443`）。
- 缓存头：`text/html` → `no-cache`，其余 → `public, max-age=31536000, immutable`（`MainActivity.java:487-495`）。

> **推论**：既然非 HTML 资源是 1 年强缓存，**换图必须换文件名**。Vite 构建产物的 hash 文件名天然满足；但 `public/` 下固定名的图（如 `public/Equip/Z00000_000.png`）**改了内容不会失效** —— 这是本项目图片更新的已知限制。

## 3. 清单 `hotupdate.json`

发布在 Gitee raw，网页端拉取地址硬编码在 `src/utils/hotupdate.js:10`：

```
https://gitee.com/ccyconner/hxsngh/raw/master/hotupdate.json
```

拉取时附加 `?t=<时间戳>` 防缓存（`hotupdate.js:134`）。

### 字段定义

| 字段 | 类型 | 必填 | 校验规则 |
| --- | --- | --- | --- |
| `version` | string | ✅ | 必须匹配 `/^v?\d+(?:\.\d+){1,3}$/`（1~4 段数字） |
| `downloadUrl` | string | ✅ | **必须 HTTPS 且主机在 Gitee 白名单内** |
| `totalParts` | number | ⭕ | 缺省视为 1；必须是 ≥1 的安全整数 |
| `md5` | string | ⭕ | 网页端**不校验**，仅作发布记录（ZIP 完整性由解压成功与否体现） |
| `body` | string | ⭕ | 更新说明；非字符串会被置为 `''` |
| `size` / `packageSize` | number | ⭕ | 可选，省去探测体积的 HEAD 请求 |

**下载地址白名单**（`hotupdate.js:12-23`）：

```js
host === 'gitee.com' || host.endsWith('.gitee.com') ||
host === 'giteeusercontent.com' || host.endsWith('.giteeusercontent.com')
```

不满足直接抛「热更新下载地址不受信任」。这是防止清单被篡改后把用户引流到任意地址。

### 分卷 URL 规则

```
totalParts === 1 → 直接用 downloadUrl
totalParts >  1 → downloadUrl + '.' + String(i).padStart(3,'0')   // i 从 1 开始
```

即 `.001`、`.002`…（`hotupdate.js:55-62`）。

## 4. 前端流程（`src/utils/hotupdate.js`）

### 4.1 版本基线

```js
const savedVer = localStorage.getItem('local_web_version')
const apkVer = (window.__APK_VERSION__ || window.__APP_VERSION__ || '1.0.5').replace(/^v?/, '')

// 本地版本低于 APK 版本 → 重置为 APK 版本
if (!savedVer || compareVersions(apkVer, savedVer) > 0) {
  localStorage.setItem('local_web_version', apkVer)
  localStorage.setItem('hotupdate_version', apkVer)
}
```

`window.__APK_VERSION__` 由原生在 `setupBridge()` 里注入（`MainActivity.java:211-216`）。`local_web_version` 是**热更后实际生效的网页版本**。

### 4.2 是否需要更新

```js
compareVersions(manifest.version, currentVer) > 0
```

`compareVersions`（`version.js` / `hotupdate.js` 各有一份实现）把版本按 `.` 拆成数字数组，**比较前 4 段**，缺位补 0。

### 4.3 是热更还是必须换 APK

```js
const baseMatch = cur[0] === next[0] && cur[1] === next[1] && cur[2] === next[2]
manifest._needsApkUpdate = !baseMatch
```

**前三段相同 → 热更；前三段有变化 → 走 APK 更新弹窗**（`hotupdate.js` 的 `checkHotUpdate` 里算出的 `baseMatch`，落到 `manifest._needsApkUpdate`；`App.vue` 只消费这个标志做文案与分支）。

这是刻意设计：前三段代表原生不兼容的大版本。

### 4.4 下载与校验

```
onProgress(0)
  ↓
分卷循环下载（每卷完成推进到 40% 上限）→ 拼成完整 Uint8Array
  ↓
onProgress(45)
  ↓
fflate.unzip()  ──失败──> 抛「解压失败」
  ↓
检查 unzipped['index.html'] 存在  ──不存在──> 抛「热更新包缺少 index.html」
  ↓
正则匹配 src="./assets/<hash>.js"  ──不匹配──> 抛「热更新包入口文件无效」
  ↓
window.__hotHtmlContent = <index.html 文本>
window.__hotZipData = base64(zip)
window.__hotZipReady = true
  ↓
轮询 window.__hotInstallState（最多 5 分钟，250ms 一次）
```

**要点**：

- 前端**先自己完整解压一遍**再交给原生，是为了在下载/拼接出错时尽早失败，避免原生覆盖了 `files/www` 才发现包是坏的。
- 进度条前 40% 给下载、45% 给解压，剩余留给原生安装（`onProgress(100)` 在原生成功后才调用）。
- 失败兜底：`finally` 里清空 `__hotZipData` 与 `__hotZipReady`。

### 4.5 落库时机

```js
await waitForNativeInstall()          // 原生回报 success 才继续
localStorage.setItem('local_web_version', manifest.version)
localStorage.setItem('hotupdate_version', manifest.version)
```

**下载成功 ≠ 生效**。只有原生确认安装完成才写版本号 —— 否则中断后用户会被判定为"已是最新"，永远升不上来。

## 5. 原生安装流程（`MainActivity.installHotUpdateZip`）

### 5.1 触发方式

原生每 1 秒轮询一次页面里的 `window.__hotZipReady`（`pollHotUpdateReady`，`MainActivity.java:368`）。为真时读出 `__hotZipData`（base64），**在 `hot-update-install` 独立线程**上解压。

### 5.2 解压与原子替换

```
1. 清空并重建 www_update_staging
2. ZipInputStream 逐条解压到 staging
   - resolveSafeChild 做路径穿越校验，非法直接抛 SecurityException
   - 目录项跳过
   - ★ 文件名以 opencv.js 结尾 → 跳过（不覆盖）
3. 校验：必须同时存在 index.html 与至少一个 assets/*.js，否则抛错
4. copyMissingStaticFiles(current → staging)
   —— 把当前 www 里非 assets、非 index.html 的静态文件补进 staging
      （支持"增量热更包"，只含变化文件）
   —— 注意：assets 目录不复制，避免旧 hash 文件无限累积
5. currentDir.renameTo(backup)
6. stagingDir.renameTo(currentDir)
   失败 → 尝试 backup 回滚
7. 删除 backup
```

**`opencv.js` 为什么被跳过**：它 10.96 MB，已随 APK 内置在 `assets/public/`。热更包带它会让分卷数翻倍，且没有更新必要。跳过之后，页面请求 `/opencv.js` 时 `files/www` 里没有，拦截器自然回退到 `assets/www/opencv.js`。

### 5.3 完成后的重载

原生解压成功后 `evaluateJavascript("window.__hotInstallState='success'")`，然后继续轮询；此时 `__hotZipReady` 已被前端在 `finally` 里清空，于是走另一条分支：

```java
wv.clearCache(true);
wv.clearHistory();
switchToWwwDir(wv);   // 带 nocache 参数重新加载 index.html
```

**重载由原生发起**，比 JS 侧 `location.reload()` 稳定（避免在旧 JS 上下文里 reload 丢状态）。

## 6. 失败模式与排查

| 现象 | 根因 | 排查入口 |
| --- | --- | --- |
| 检测不到更新 | `version` 没自增 / 清单被 CDN 缓存 | 控制台 `[HotUpdate] 远程最新版本` 与 `版本比较` 日志；清单 URL 已加 `?t=`，但 Gitee 侧仍可能有缓存 |
| 「热更新下载地址不受信任」 | `downloadUrl` 主机不在白名单 | 检查是不是用了 Gitee 之外的地址 |
| 「热更新包缺少 index.html」 | zip 里多了一层 `dist/` | `tar -tf dist.zip` 看首行 |
| 「热更新包入口文件无效」 | `index.html` 里没有 `src="./assets/xxx.js"` | Vite 配置的 `base` 被改了？产物结构变了？ |
| 「热更新安装超时，请重试」 | 原生线程卡住 / 磁盘满 | logcat 过滤 tag `HotUpdate` |
| 更新成功后界面没变 | 非 HTML 资源 1 年强缓存 | 见 §2 推论；确认换的是 hash 文件名资源 |
| 反复提示同一版本 | 更新成功但 `local_web_version` 没写 | 看 `waitForNativeInstall` 是否超时被 reject |

**统一的日志入口**：JS 侧全部以 `[HotUpdate]` 前缀打印；原生侧 `Log.d("HotUpdate", ...)`。

## 7. 发布操作手册

### 7.1 热更新包

```powershell
# 1. 构建
cmd /c npm run build

# 2. 打 zip —— index.html 必须在根层！
#    正确做法：进 dist 目录再压
Compress-Archive -Path dist\* -DestinationPath dist.zip

# 3. 剔除不该进热更包的大文件（如果 compress 前忘了删）
#    dist/opencv.js 与 dist/*.apk 应排除，原生侧虽会跳过 opencv.js，
#    但白白增加 11MB 下载量

# 4. 分卷（单卷上限 9MB 硬编码在 build.py）
python build.py .

# 5. 上传 dist.zip.001 / .002 … 到 Gitee

# 6. 回填 hotupdate.json 并提交
```

`build.py` 的行为：

- 固定切 `dist.zip`，单卷 `9 * 1024 * 1024` 字节，命名 `dist.zip.001`、`dist.zip.002`…
- 不带参数会弹 Tkinter 目录选择框；带参数（如 `python build.py .`）直接执行。
- 已 `reconfigure` stdout 为 UTF-8，避免 Windows 控制台 GBK 编码报错。

### 7.2 `hotupdate.json` 回填示例

```json
{
  "version": "1.0.20.3",
  "downloadUrl": "https://gitee.com/ccyconner/hxsngh/raw/master/dist.zip",
  "totalParts": 2,
  "md5": "<dist.zip 的 MD5>",
  "body": "本次更新说明"
}
```

**核对清单**：

- [ ] `version` 严格大于线上当前值，且**前三段与 APK 版本一致**（否则会被判定为需要换 APK）。
- [ ] `totalParts` 等于实际分卷数。
- [ ] `downloadUrl` 指向的路径下确实存在 `.001`、`.002`…
- [ ] 实际分卷数与 `totalParts` 不符会导致漏下或 404。

### 7.3 APK 发布

1. 改 `android/app/build.gradle` 的 `versionCode`（必须自增）与 `versionName`。
2. `npx cap sync android`。
3. Gradle 构建 release APK。
4. 上传到 Gitee Release（`assets` 里带 `.apk`）。
5. 更新 `public/hxsnghv<版本>.apk`（网页版「点击下载」直链）。

App 内 `UpdateModal` 经 `fetchLatestRelease()`（`src/utils/version.js:25`）调 Gitee Release API 比对 `tag_name` 与本地 `__APK_VERSION__`，并用 `probeRemoteFileSize` 探测安装包体积。

## 8. 安全设计小结

| 机制 | 位置 | 作用 |
| --- | --- | --- |
| 下载主机白名单 | `hotupdate.js:12-23` | 防清单被篡改后引流 |
| 版本号格式校验 | `hotupdate.js:27-29` | 防畸形版本号绕过比较 |
| `totalParts` 整数校验 | `hotupdate.js:33-37` | 防构造超多分卷拖垮客户端 |
| ZIP 路径穿越防护 | `MainActivity.java:308-334`、`685-686` | 防 `../` 写出沙盒 |
| `deleteDirectory` 白名单 | `MainActivity.java:773-787` | 拒绝删除 `filesDir` 之外的路径 |
| 前端预解压 + 入口校验 | `hotupdate.js:238-250` | 坏包不落到磁盘 |
| 原子替换 + 回滚 | `MainActivity.java:722-731` | 中途失败不留下半个版本 |
| 生效后才写版本号 | `hotupdate.js:272` | 防止用户卡在"假最新" |
