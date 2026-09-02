# Hxsngh - 幻想少女公会助手

> 《幻想少女公会》爱好者制作的非官方 Wiki 工具

在线演示：[https://hxsngh.yxzmy.top](https://hxsngh.yxzmy.top)

## 项目介绍

Hxsngh 是面向凉屋游戏《幻想少女公会》玩家的非官方助手工具，提供角色、装备、技能、天赋、遗物等资料查询，以及招募辅助、阵容攻略和概率信息等功能。

本项目与凉屋游戏（ChillyRoom）不存在隶属、代理或合作关系，仅由玩家爱好者维护。项目目前不设置广告、会员或付费功能。页面提供的自愿捐赠渠道仅用于域名、服务器等项目运营开销，不用于解锁功能或专属内容。

## 技术架构

本项目以 Web 技术为业务主体，通过 Android 原生外壳提供系统能力：

- **前端核心：** Vue 3 单文件组件、JavaScript、Vue Router 4（Hash 路由）
- **构建与样式：** Vite 8、原生 CSS，不依赖外部 UI 框架
- **Android 封装：** Capacitor 8、Android 原生 Java 桥接，核心入口为 `MainActivity.java`
- **页面载体：** Android WebView；网页版直接运行在浏览器中
- **图像识别：** 本地 `opencv.js`，通过 WebAssembly 在浏览器或 WebView 内执行图像处理
- **交互能力：** `sortablejs` 提供拖拽排序；Capacitor Filesystem、Preferences、Share 插件提供文件和分享能力
- **数据构建：** Python 脚本用于解析游戏配置、生成装备概率数据、执行测试和制作构建产物

### 热更新机制

热更新采用自定义的网页端与 Android 原生层协作流程：

1. 网页端从受信任的地址下载并合并热更新分卷。
2. 网页端使用 `fflate` 解压校验更新包入口文件。
3. Android 原生 Java 层使用 `ZipInputStream` 完成最终解压和安装。
4. 新资源安装到 App 私有目录 `files/www/`，WebView 优先从该目录加载资源。

热更新只替换网页资源，不替换 Android 原生代码；涉及原生功能或 SDK 的变化仍需要发布新的 APK。

### 数据与隐私

工具记录和大部分业务数据保存在用户设备本地。Android App 集成友盟 U-App 和 U-APM，用于运营统计及崩溃、卡顿、启动、网络和内存等运行表现分析；相关 SDK 仅在用户确认并同意隐私政策后初始化。网页版使用百度统计，Android App 不加载百度统计脚本，网页版不接入友盟移动 SDK。

## 目录结构与主要配置

- `package.json`：前端依赖和构建脚本
- `src/main.js`：Vue 应用入口
- `src/router/index.js`：页面路由
- `src/views/`：业务页面
- `src/components/`：公共组件
- `vite.config.js`：Vite 构建配置
- `capacitor.config.json`：Capacitor 配置
- `android/app/build.gradle`：Android 模块、SDK 和原生依赖配置
- `android/app/src/main/java/.../MainActivity.java`：WebView 容器、热更新和原生桥接逻辑
- `scripts/`：数据生成和测试脚本

## 本地运行

环境要求：Node.js `20.19+` 或 `22.12+`。

```bash
npm install
npm run dev
```

构建网页资源：

```bash
npm run build
```

构建 Android App 前，需要先将网页资源同步到 Android 工程，再使用 Android Studio 或 Gradle 构建 APK。

## 许可证与素材声明

本仓库中的许可证仅适用于项目作者原创的源代码，包括在本项目中编写的 Vue 页面、JavaScript、CSS、Android Java 和 Python 业务辅助脚本，具体范围以根目录的 `LICENSE` 文件为准。

以下内容不属于上述 MIT 授权范围：

- 《幻想少女公会》的角色、装备、地图等图片、贴图、游戏配置 JSON、文案、商标及其他游戏素材；
- Vue、Capacitor、OpenCV.js、友盟 SDK、百度统计及其他第三方软件或服务；
- `.venv/` 中的 Python 虚拟环境文件；
- `.agents/` 中由第三方提供的 Skill、脚本和相关文件；
- 其他明确标注为第三方或生成产物的文件。

《幻想少女公会》相关的名称、商标、角色、图片、贴图、游戏配置、文案及其他素材，其权利归深圳市凉屋游戏科技有限公司（ChillyRoom）及相关权利人所有。本项目仅用于非官方爱好者资料展示，不授予任何人对上述素材进行再分发、商用或独立打包使用的权利。如需使用相关素材，请联系权利人获取授权。

本项目是玩家制作的非官方工具，与凉屋游戏不存在隶属、代理或合作关系，不代表凉屋游戏官方。
