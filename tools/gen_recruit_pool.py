#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【工具】生成「指定招募」常驻池数据 src/assets/recruit_pool.json

数据源
------
  游戏数据/数据表/Summon.json  —— 招募池名单 + IsUsual（1=常驻 / 0=限定）+ 时间
  游戏数据/数据表/Role.json    —— 角色明细：Name / Class / Race / Element / Map / Step / Weight

口径（复刻 PublicSummonPanel.cs 的 FreshFilterRoleList + GetResultRole）
-------------------------------------------------------------------
  · 只取 IsUsual != 0（常驻）；IsUsual == 0 是限时角色，不进常驻池
  · 只取 isTimeLegal（常驻有 StartTime/EndTime 时要落在区间内；空则视为常开）
  · 排除 ID 含 "_" 的异化/皮肤版（它们不是独立招募条目）
  · 概率 = 该角色 Weight / 候选集合 Weight 之和（WeightedRandom 是等比例加权）

  ⚠️ 权重来自 Role.json 的 Weight 字段，不按稀有度硬编码。
     实测常驻池权重档位：S=10、A=100、B=1000、C=10000（各档 10 倍）。
     但必须读真实值，因为同一稀有度内也可能出现例外。

标签（Tags）
-----------
  游戏里 `RoleDataTable.RoleDataItem.Tags` 由 4 个维度拼成：
      职业(Class) + 属性(Element) + 地区(Map) + 细分种族(Race 逗号后的名称)
  另外「星级」两枚标签：传说(=Step S)、史诗(=Step A)

输出
----
  src/assets/recruit_pool.json
      {
        "generated_at": ...,
        "source": {...},
        "roles": [{ IDs, name, step, star, weight, class, race, element, map, tags: [...] }],
        "limited": [{ IDs, name, step, start, end }]
      }

用法
----
    python tools/gen_recruit_pool.py
"""
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
OUT = os.path.join(ROOT, "src", "assets", "recruit_pool.json")

# 稀有度 → 前端星级（与 RecruitView 的稀有度分类一致）
#   传说 = S (step 4)  -> 稀有度 3
#   史诗 = A (step 3)  -> 稀有度 2
#   其余 B/C        -> 稀有度 1
STAR_OF_STEP = {"S": 3, "SS": 3, "A": 2, "B": 1, "C": 1}


def load(table):
    """table 可写 'Summon' 或 'Summon.json'（自动补扩展名）"""
    name = table if table.endswith(".json") else f"{table}.json"
    path = os.path.join(SRC_DIR, name)
    if not os.path.exists(path):
        raise SystemExit(f"缺少数据表：{path}")
    data = json.load(open(path, encoding="utf-8"))
    return list(data.values()) if isinstance(data, dict) else data


def parse_time(s):
    if not s:
        return None
    for fmt in ("%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return None


def race_name(race):
    """'BD20015,神族' -> '神族'"""
    if not race:
        return ""
    return race.split(",", 1)[1].strip() if "," in race else race.strip()


def build_tags(role):
    """拼出游戏里那套 4 维标签 + 星级标签"""
    tags = []
    for v in (role.get("Class"), role.get("Element"), role.get("Map")):
        if v:
            tags.append(v.strip())
    rn = race_name(role.get("Race"))
    if rn:
        tags.append(rn)
    step = role.get("Step")
    if step == "S":
        tags.append("传说")
    elif step == "A":
        tags.append("史诗")
    return tags


def main():
    now = datetime.datetime.now()

    summon = load("Summon.json")
    roles = load("Role.json")
    role_by_id = {r["IDs"]: r for r in roles}

    pool = []
    limited = []
    skipped_expired = []

    for s in summon:
        rid = s.get("IDs")
        if not rid:
            continue
        role = role_by_id.get(rid)
        if not role:
            continue  # 招募表里有、角色表里没有，跳过

        is_usual = s.get("IsUsual")

        # 限定：单独收集，不进常驻池
        if is_usual == 0:
            limited.append({
                "IDs": rid,
                "name": s.get("Name") or role.get("Name"),
                "step": s.get("Step") or role.get("Step"),
                "start": s.get("StartTime") or "",
                "end": s.get("EndTime") or "",
            })
            continue

        # 异化/皮肤版不是独立条目
        if "_" in rid:
            continue

        # 常驻池的时间校验：有起止时间就要求当前落在区间内
        st, et = parse_time(s.get("StartTime")), parse_time(s.get("EndTime"))
        if st and et:
            if not (st <= now <= et):
                skipped_expired.append({"IDs": rid, "name": s.get("Name"), "end": s.get("EndTime")})
                continue

        weight = role.get("Weight") or 0
        step = role.get("Step") or s.get("Step") or ""
        pool.append({
            "IDs": rid,
            "name": role.get("Name") or s.get("Name"),
            "step": step,
            "star": STAR_OF_STEP.get(step, 1),
            "weight": weight,
            "class": role.get("Class") or "",
            "race": race_name(role.get("Race")),
            "element": role.get("Element") or "",
            "map": role.get("Map") or "",
            "tags": build_tags(role),
        })

    # 按权重降序（前端展示与调试都方便）
    pool.sort(key=lambda x: (-x["weight"], x["IDs"]))

    payload = {
        "_comment": "由 tools/gen_recruit_pool.py 生成，请勿手改",
        "generated_at": now.isoformat(timespec="seconds"),
        "source": {
            "appVersion": _app_version(),
            "summonTotal": len(summon),
            "roleTotal": len(roles),
            "poolCount": len(pool),
            "limitedCount": len(limited),
        },
        "roles": pool,
        "limited": sorted(limited, key=lambda x: x["IDs"]),
    }
    if skipped_expired:
        payload["skippedExpired"] = skipped_expired

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    # ---- 输出摘要 ----
    from collections import Counter
    by_step = Counter(r["step"] for r in pool)
    by_weight = Counter(r["weight"] for r in pool)
    total_w = sum(r["weight"] for r in pool)

    print(f"[OK] {OUT}")
    print(f"  常驻池 {len(pool)} 人（权重合计 {total_w:,}）")
    print(f"    Step 分布: {dict(sorted(by_step.items()))}")
    print(f"    权重档位 : {dict(sorted(by_weight.items(), reverse=True))}")
    print(f"  限定角色 {len(limited)} 个:")
    for x in payload["limited"]:
        print(f"    {x['IDs']}  {x['name']}  {x['step']}  {x['start']} ~ {x['end']}")
    if skipped_expired:
        print(f"  已过期跳过 {len(skipped_expired)} 个:")
        for x in skipped_expired:
            print(f"    {x['IDs']}  {x['name']}  截止 {x['end']}")


def _app_version():
    path = os.path.join(SRC_DIR, "summary.json")
    if not os.path.exists(path):
        return ""
    try:
        s = json.load(open(path, encoding="utf-8"))
        return s.get("app_version", {}).get("netPath", {}).get("appVersion", "")
    except Exception:
        return ""


if __name__ == "__main__":
    main()
