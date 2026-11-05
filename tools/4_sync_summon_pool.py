#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【工具 4】自动同步「指定招募」常驻池数据 src/assets/data.json

背景
----
data.json 是页面「指定招募工具」用的常驻池名单（6 个中文字段）。
历史上是**纯手工维护**，每次游戏更新都要人工比对补漏，容易漏。

本脚本从官方数据表自动推导，纳入更新工作流：

  数据源
    Summon.json  —— 招募池名单 + IsUsual（1=常驻 / 0=限定）+ 起止时间
    Role.json    —— 角色明细：Name / Class / Race / Element / Map / Step

  收录口径（保持与原手工口径一致）
    · IsUsual == 1（常驻）且当前时间落在 StartTime~EndTime 内（空=常开）
    · 排除 ID 含 "_" 的异化/皮肤版（它们不是独立招募条目）
    · 稀有度映射：S/SS -> 3（传说）；A -> 2（史诗）；B/C -> 1

  行为
    · 默认只打印差异，不写盘（--apply 才写）
    · --apply 时按「角色名」合并：保留原有条目顺序，新角色追加到末尾
    · 若发现 data.json 里有、池里没有的角色，只告警不删除（人工确认后再删）

用法
    python tools/4_sync_summon_pool.py            # 只比对，打印差异
    python tools/4_sync_summon_pool.py --apply    # 写入 data.json
"""
import argparse
import datetime
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORKSPACE = os.path.dirname(ROOT)
SRC_DIR = os.path.join(WORKSPACE, "游戏数据", "数据表")
DATA_JSON = os.path.join(ROOT, "src", "assets", "data.json")

# 稀有度映射（由 data.json 与 Role.json 交叉验证得出：
#   Step S -> 3（传说）、A -> 2（史诗）、B -> 1（稀有）、C -> 0（普通）
# 与 RecruitView 的 rarityMap 一致）
RARITY_OF_STEP = {"S": 3, "SS": 3, "A": 2, "B": 1, "C": 0}
FIELDS = ["角色名", "职业", "种族", "属性", "地区", "稀有度"]


def load(filename):
    path = os.path.join(SRC_DIR, filename)
    if not os.path.exists(path):
        raise SystemExit(f"缺少数据表：{path}")
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return list(d.values()) if isinstance(d, dict) else d


def parse_time(s):
    if not s:
        return None
    for fmt in ("%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return None


def race_name(race):
    """细分种族名（Race 字段逗号后部分）。
    注意：data.json 的「种族」用的是大类 Type（生灵/魔灵/器灵/神灵/亡灵），
    不是这个细分种族。此函数仅作参考信息输出。"""
    if not race:
        return ""
    return race.split(",", 1)[1].strip() if "," in race else race.strip()


def build_pool(now):
    """按 Summon.json + Role.json 推导常驻池"""
    summon = load("Summon.json")
    roles = load("Role.json")
    rm = {r["IDs"]: r for r in roles if r.get("IDs")}

    pool, limited, expired = [], [], []
    for s in summon:
        rid = s.get("IDs")
        role = rm.get(rid)
        if not rid or not role:
            continue

        if s.get("IsUsual") == 0:
            limited.append({"IDs": rid, "name": role.get("Name"), "step": s.get("Step"),
                            "start": s.get("StartTime") or "", "end": s.get("EndTime") or ""})
            continue

        if "_" in rid:
            continue

        st, et = parse_time(s.get("StartTime")), parse_time(s.get("EndTime"))
        if st and et and not (st <= now <= et):
            expired.append({"IDs": rid, "name": role.get("Name"), "end": s.get("EndTime")})
            continue

        step = role.get("Step") or s.get("Step") or ""
        pool.append({
            "角色名": role.get("Name") or s.get("Name") or "",
            "职业": role.get("Class") or "",
            "种族": (role.get("Type") or "").strip(),
            "属性": role.get("Element") or "",
            "地区": role.get("Map") or "",
            "稀有度": RARITY_OF_STEP.get(step, 1),
        })
    return pool, limited, expired


def main():
    ap = argparse.ArgumentParser(description="同步指定招募常驻池到 data.json")
    ap.add_argument("--apply", action="store_true", help="写入 data.json")
    args = ap.parse_args()

    if not os.path.exists(DATA_JSON):
        raise SystemExit(f"找不到 {DATA_JSON}")

    with open(DATA_JSON, encoding="utf-8") as f:
        current = json.load(f)

    now = datetime.datetime.now()
    pool, limited, expired = build_pool(now)

    cur_names = [x.get("角色名") for x in current]
    cur_set = set(cur_names)
    pool_by_name = {p["角色名"]: p for p in pool}

    # 需要新增的
    to_add = [p for p in pool if p["角色名"] not in cur_set]
    # data.json 里有、池里没有（不自动删，只告警）
    stale = [n for n in cur_names if n not in pool_by_name]

    # 字段有变化的
    changed = []
    for x in current:
        p = pool_by_name.get(x.get("角色名"))
        if not p:
            continue
        diff = {k: (x.get(k), p[k]) for k in FIELDS if x.get(k) != p[k]}
        if diff:
            changed.append((x.get("角色名"), diff))

    print(f"=== 指定招募常驻池同步 ===")
    print(f"  数据源: {SRC_DIR}")
    print(f"  当前 data.json : {len(current)} 条")
    print(f"  推导常驻池     : {len(pool)} 人")
    print(f"  限定角色(不进池): {len(limited)} 个")
    if expired:
        print(f"  已过期跳过     : {len(expired)} 个")

    if limited:
        print("\n  限定角色明细:")
        for x in limited:
            print(f"    {x['IDs']:<10} {x['name']}  {x['step']}  {x['start']} ~ {x['end']}")

    if to_add:
        print(f"\n[新增] {len(to_add)} 个角色:")
        for p in to_add:
            print("    + " + json.dumps(p, ensure_ascii=False))
    else:
        print("\n[新增] 无")

    if changed:
        print(f"\n[字段变化] {len(changed)} 个:")
        for nm, diff in changed:
            for k, (ov, nv) in diff.items():
                print(f"    {nm}.{k}: {ov!r} -> {nv!r}")
    else:
        print("\n[字段变化] 无")

    if stale:
        print(f"\n[!] {len(stale)} 个角色在 data.json 里但不在常驻池（未自动删除）:")
        for n in stale:
            print(f"    - {n}")

    if not args.apply:
        print("\n（仅比对，未写盘。确认后加 --apply）")
        return

    # ---- 写入 ----
    merged = list(current)
    for p in to_add:
        merged.append({k: p[k] for k in FIELDS})

    # 字段变化就地修正（不影响顺序）
    for item in merged:
        p = pool_by_name.get(item.get("角色名"))
        if p:
            for k in FIELDS:
                if k in p:
                    item[k] = p[k]

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=1)

    print(f"\n[OK] 已写入 {DATA_JSON}：{len(current)} -> {len(merged)} 条")


if __name__ == "__main__":
    main()
