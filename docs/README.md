# 文档导航

接手先读 [HANDOFF](HANDOFF.md)（当前状态、环境、常用命令），再读 [SPEC](SPEC.md)（各页面功能、数据链与来源边界）。改具体模块时再查对应文档。

| 文档 | 负责内容 |
| --- | --- |
| [SPEC](SPEC.md) | 项目与路由、共享模块与全站约束、**22 个页面契约**、数据与来源、资源维护、验收 |
| [ARCHITECTURE](ARCHITECTURE.md) | 目录职责、分层与依赖方向、关键机制、**UI 规则**、构建与发布 |
| [HANDOFF](HANDOFF.md) | 交接说明：环境、常用命令、关键文件速查、避坑指南 |
| [KNOWN_BUGS_AND_FIXES](KNOWN_BUGS_AND_FIXES.md) | **已修复的严重问题**记录（现象 / 根因 / 修法 / 回归方式） |

## technical

| 文档 | 何时查阅 |
| --- | --- |
| [数据表与 ID 规则](technical/DATA_TABLES.md) | 查字段含义、ID 前缀语义、占位符规则、**ID 到图片名的映射**、本地表与服务端表的边界 |
| [掉落概率模型](technical/DROP_PROBABILITY_MODEL.md) | 改 `tools/3_run_probability.py`、重跑模拟、理解 `simulation_exact_results.json` 契约 |
| [热更新协议](technical/HOT_UPDATE_PROTOCOL.md) | 改 `hotupdate.json`、分卷、原生解压安装、版本比较与回退 |

## dev-logs

[每日开发汇总](dev-logs/README.md)。历史概率核对、试错过程与一次性分析放这里，不作为当前实现依据。

---

## 维护约定

- **只写本项目需要的内容。** 不为对齐某个模板而生成重复文档；页面级细节留在 SPEC，跨页面共用的契约才进 `technical/`。
- **KNOWN_BUGS 只收严重问题，且只记录已修复的。** 修完再写，写清现象、根因、修法与回归方式。未修的问题留在 [SPEC](SPEC.md) / [ARCHITECTURE](ARCHITECTURE.md) 对应段落的「注意」里，不在这里堆清单。
- 模块退休或内容被完全替代时才合并/归档，不因「某文件被引用过」就认定整篇要保留。
- 游戏原始数据、反编译源码与拉取工具的说明不在本仓库维护，见工作区 `游戏数据/README.md`。
