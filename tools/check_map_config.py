#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【校验】地图配置一致性检查

背景
----
地图名原先散落在 5 处（4 个 Vue 页面 + 1 个 Python 脚本），
游戏加新地图时容易漏改。1.0.3.0 加「无声沼泽」就漏过。

现状
----
前端 4 处已统一到 src/config/maps.js（从 World_Map.json 自动推导），
只剩 tools/3_run_probability.py 的 MAP_LEVELS 仍需手动维护
（它是独立 Python 脚本，无法 import JS）。

本脚本做三件事
--------------
  1. 校验 tools/3_run_probability.py 的 MAP_LEVELS
     与 World_Map.json 完全一致（地图名 + 等级 = InitialDiffi + 99）
  2. 检查前端是否还有地图硬编码残留（不应该有）
  3. 检查 simulation_exact_results.json 是否覆盖了全部地图

用法
----
    python tools/check_map_config.py
退出码 0 = 全部通过；1 = 有问题
"""
import json
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORKSPACE = os.path.dirname(ROOT)
SRC = os.path.join(ROOT, "src")
ASSETS = os.path.join(SRC, "assets")

LEVEL_OFFSET = 99  # 项目地图等级 = InitialDiffi + 99


def load_json(name):
    path = os.path.join(ASSETS, name)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return list(d.values()) if isinstance(d, dict) else d


def ok(msg):
    print(f"  [OK]   {msg}")


def bad(msg):
    print(f"  [X]    {msg}")
    FAILS.append(msg)


FAILS = []


def check_world_map():
    wm = load_json("World_Map.json")
    if not wm:
        bad("找不到 src/assets/World_Map.json（先跑 tools/1_sync_tables.py）")
        return {}
    result = {}
    # 「星界秘境」是秘境玩法，不是可刷图地图，与前端 src/config/maps.js 口径一致
    skip = {"星界秘境"}
    for m in wm:
        name = m.get("Name")
        if name and name not in skip:
            result[name] = (m.get("InitialDiffi") or 0) + LEVEL_OFFSET
    ok(f"World_Map.json 共 {len(result)} 张可刷地图（已排除秘境）")
    return result


def check_python_map_levels(expected):
    """校验 3_run_probability.py 的 MAP_LEVELS"""
    path = os.path.join(HERE, "3_run_probability.py")
    if not os.path.exists(path):
        bad("找不到 tools/3_run_probability.py")
        return

    with open(path, encoding="utf-8") as f:
        text = f.read()

    m = re.search(r"MAP_LEVELS\s*=\s*\{([\s\S]*?)\n\}", text)
    if not m:
        bad("3_run_probability.py 里找不到 MAP_LEVELS 定义")
        return

    actual = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"\s*['\"]([^'\"]+)['\"]\s*:\s*(\d+)", line)
        if mm:
            actual[mm.group(1)] = int(mm.group(2))

    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    wrong = {k: (actual[k], expected[k]) for k in set(actual) & set(expected) if actual[k] != expected[k]}

    if missing:
        bad(f"3_run_probability.py 的 MAP_LEVELS 缺少地图：{missing}")
    if extra:
        bad(f"3_run_probability.py 的 MAP_LEVELS 有多余地图：{extra}")
    if wrong:
        for k, (a, e) in sorted(wrong.items()):
            bad(f"3_run_probability.py 里 {k} 等级不对：{a}（应为 {e}）")
    if not (missing or extra or wrong):
        ok(f"3_run_probability.py 的 MAP_LEVELS 与数据表一致（{len(actual)} 张，等级 = InitialDiffi + {LEVEL_OFFSET}）")


def check_frontend_hardcode(map_names):
    """前端不应再有「地图清单/等级表」这类硬编码（统一走 src/config/maps.js）

    判定口径（避免误报）：
      只查「地图名 → 数字」形态的映射表，例如 `'夏日海滩': 140`。
      那才是清单式硬编码。
      单纯 `"地图名": [装备名...]` 这类业务数据（掉落表）不算，属正常内容。
    """
    pat = re.compile(r"['\"]([^'\"]+)['\"]\s*:\s*\d")
    offenders = []
    for dirpath, _dirnames, filenames in os.walk(SRC):
        for fn in filenames:
            if not fn.endswith((".vue", ".js")):
                continue
            if fn == "maps.js":
                continue
            p = os.path.join(dirpath, fn)
            try:
                text = open(p, encoding="utf-8").read()
            except Exception:
                continue
            hits = sorted({m.group(1) for m in pat.finditer(text) if m.group(1) in map_names})
            if hits:
                rel = os.path.relpath(p, ROOT)
                offenders.append((rel, hits))
    if offenders:
        for rel, hits in offenders:
            bad(f"前端仍有地图等级表硬编码：{rel} -> {hits[:5]}")
    else:
        ok("前端无地图等级表硬编码（均已走 src/config/maps.js）")


def check_simulation_coverage(map_names):
    path = os.path.join(ASSETS, "simulation_exact_results.json")
    if not os.path.exists(path):
        bad("找不到 simulation_exact_results.json")
        return
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    covered = {k for k in raw if k != "_meta"}
    # 「星界秘境」不在装备掉落模拟范围内（属秘境玩法，非地图刷取）
    skip = {"星界秘境"}
    missing = sorted(set(map_names) - covered - skip)
    if missing:
        bad(f"概率模拟结果缺地图：{missing}（跑 tools/3_run_probability.py --map <名>）")
    else:
        ok(f"概率模拟结果覆盖 {len(covered)} 张地图")


def check_equip_data(map_names):
    """Equip.json 里每张地图都应有装备"""
    equips = load_json("Equip.json")
    if not equips:
        bad("找不到 src/assets/Equip.json")
        return
    areas = {}
    for e in equips:
        a = e.get("AreaName") or e.get("Area") or ""
        if a:
            areas[a] = areas.get(a, 0) + 1
    missing = [m for m in map_names if m not in areas]
    if missing:
        bad(f"Equip.json 里这些地图没有装备：{missing}")
    else:
        ok(f"Equip.json 覆盖全部 {len(map_names)} 张地图的装备")


def main():
    print("=== 地图配置一致性检查 ===\n")

    expected = check_world_map()
    if not expected:
        print("\n===== FAIL =====")
        sys.exit(1)

    map_names = list(expected.keys())

    print()
    check_python_map_levels(expected)

    print()
    check_frontend_hardcode(map_names)

    print()
    check_simulation_coverage(map_names)

    print()
    check_equip_data(map_names)

    print()
    if FAILS:
        print(f"===== FAIL（{len(FAILS)} 项）=====")
        sys.exit(1)
    print("===== PASS =====")


if __name__ == "__main__":
    main()
