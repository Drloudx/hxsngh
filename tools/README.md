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
当有新地图上线或掉落权重调整时，跑测蒙特卡洛模拟并将结果写入 `simulation_exact_results.json` 与 `map_equip_difficulties.json`：

- **跑测指定新图（推荐，200万次模拟，8线程约需 3 分钟）**：
  ```bash
  python tools/3_run_probability.py --map 夏日海滩 --trials 2000000 --workers 8
  ```

- **跑测全部 15 张地图（耗时较长）**：
  ```bash
  python tools/3_run_probability.py --map all --trials 2000000 --workers 8
  ```

- **快速小样本调试（1万次模拟）**：
  ```bash
  python tools/3_run_probability.py --map 夏日海滩 --trials 10000
  ```

---

## 📁 目录结构说明

```
tools/
├── 1_sync_tables.py          # [工具 1] 服务端数据表全自动拉取与同步
├── 2_extract_images.py       # [工具 2] CDN 热更包解密与全套图片提取
├── 3_run_probability.py      # [工具 3] 装备遇见率蒙特卡洛概率模拟器
├── README.md                 # 本说明文档
└── image_utils/              # 本地图像处理独立辅助小工具 (GUI)
    ├── 保留第一帧（地块图）.py
    ├── 保留第一帧（角色大图）.py
    ├── 保留第一帧（角色小人）.py
    └── 删带#数据.py
```

---

## ⚠️ 常见问题说明
1. **Windows 编码**：所有脚本已内置 UTF-8 自动配置，若在 PowerShell 运行遇到乱码，请确认终端代码页为 65001 (`chcp 65001`)。
2. **UnityPy 依赖**：图片提取依赖 `UnityPy` 和 `Pillow`，请确保当前 Python 环境已安装：
   ```bash
   pip install UnityPy Pillow
   ```
