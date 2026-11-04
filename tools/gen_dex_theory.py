# -*- coding: utf-8 -*-
"""生成扩展版 dex_theory.json：含每档单价 + 传承概率 + 各档件数，
使前端可以按玩家实际进度（收集/升星/传承分别输入或按百分比）计算。"""
import json, os, io
from collections import OrderedDict

SR = r"E:\Desktop\html\hsxngh\游戏数据\数据表"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "assets", "dex_theory.json")

EXP_TABLE = [
    [1, 5, 200], [6, 10, 400], [11, 20, 600], [21, 30, 1000],
    [31, 40, 1500], [41, 45, 2000], [46, 50, 2500], [51, 55, 3000],
    [56, 60, 3500], [61, 65, 4000], [66, 70, 5000], [71, 75, 6000],
    [76, 80, 7000], [81, 9999, 8000],
]
STEP_INT = {"C": 1, "B": 2, "A": 3, "S": 4, "SS": 5}
BASE_VALUE = {1: 1, 2: 2, 3: 6, 4: 24, 5: 120}
HERITAGE_RATE = {"C": 1 / 160, "B": 0.0125, "A": 0.025, "S": 0.05, "SS": 0}

INITIAL_ROLES = 5  # 初始角色（B 档）不给收集经验


def pt(step):
    return BASE_VALUE.get(STEP_INT.get(step, 0), 0) * 20


def up(step):
    return pt(step) // 2


def load_dist(table):
    d = json.load(open(os.path.join(SR, f"{table}.json"), encoding="utf-8"))
    items = list(d.values()) if isinstance(d, dict) else d
    o = {}
    for x in items:
        if isinstance(x, dict) and x.get("Step"):
            o[x["Step"]] = o.get(x["Step"], 0) + 1
    return dict(sorted(o.items(), key=lambda kv: STEP_INT.get(kv[0], 9)))


def build(key, label, dist, star_times, has_heritage):
    """返回该类的完整明细，供前端自由组合。

    注意：装备传承用的是 **EquipPoint 全值**（源码 SetEquipHeritage 调 EquipPoint），
    不是 EquipUpgradePoint（一半）。这是最容易算错的一处。
    """
    detail = []
    collect_total = 0
    star_total = 0
    her_expect = 0
    her_max = 0
    for step, n in dist.items():
        c = pt(step) * n
        s_times = star_times.get(step, 0)
        s = up(step) * n * s_times
        rate = HERITAGE_RATE.get(step, 0) if has_heritage else 0
        # 传承按全值 pt(step)，不是 up(step)
        h_e = pt(step) * n * rate
        h_m = pt(step) * n if has_heritage else 0
        collect_total += c
        star_total += s
        her_expect += h_e
        her_max += h_m
        detail.append({
            "step": step,
            "count": n,
            "point": pt(step),
            "upgradePoint": up(step),
            "starTimes": s_times,
            "collectExp": c,
            "starExp": s,
            "heritageRate": round(rate, 6),
            "heritageExpExpect": round(h_e, 1),
            "heritageExpMax": h_m,
        })
    # 初始角色扣除
    deducted = 0
    if key == "Role":
        deducted = pt("B") * INITIAL_ROLES
        collect_total -= deducted
    return {
        "key": key,
        "label": label,
        "dist": dist,
        "detail": detail,
        "collect": collect_total,
        "star": star_total,
        "heritageExpect": round(her_expect, 1),
        "heritageMax": her_max,
        "deducted": deducted,
        "hasHeritage": has_heritage,
    }


sources = [
    # 角色：SaveData.Role 的 MaxStar = 5，初始星级 RoleInitialStar:C/B=1、A=2、S=3
    #       → 可升星次数 C/B=4、A=3、S=2（每次升星调用 SetRoleStarUpgrade 给一次经验）
    build("Role", "角色", load_dist("Role"),
          {"C": 4, "B": 4, "A": 3, "S": 2, "SS": 4}, False),
    # 装备：GetMaxStar()=3 → 升星 3 次；传承另计 1 次
    build("Equip", "装备", load_dist("Equip"),
          {"C": 3, "B": 3, "A": 3, "S": 3, "SS": 3}, True),
    # 符文：GetMaxStar()=3 → 3 次
    build("Rune", "符文", load_dist("Rune"),
          {"C": 3, "B": 3, "A": 3, "S": 3, "SS": 3}, False),
    # 莱姆：MaxStar=3 → 3 次
    build("Lime", "莱姆", load_dist("Lime"),
          {"C": 3, "B": 3, "A": 3, "S": 3, "SS": 3}, False),
]

c_sum = sum(s["collect"] for s in sources)
star_sum = sum(s["star"] for s in sources)
her_exp = sum(s["heritageExpect"] for s in sources)
her_max = sum(s["heritageMax"] for s in sources)

# 三口径
total_floor = c_sum + star_sum
total_expect = total_floor + her_exp
total_max = total_floor + her_max


def lv_of(e):
    lv, rem = 1, e
    while True:
        need = next(v for lo, hi, v in EXP_TABLE if lo <= lv <= hi)
        if rem < need:
            break
        rem -= need
        lv += 1
    return lv, rem


payload = {
    "_comment": "由 tools/gen_dex_theory.py 生成，请勿手改",
    "exp_table": EXP_TABLE,
    "sources": sources,
    "totals": {
        "collect": c_sum,
        "star": star_sum,
        "heritageExpect": round(her_exp, 1),
        "heritageMax": her_max,
        "floor": total_floor,
        "expect": round(total_expect, 1),
        "max": total_max,
    },
    "levels": {
        "floor": list(lv_of(total_floor)),
        "expect": list(lv_of(total_expect)),
        "max": list(lv_of(total_max)),
    },
    "heritageRates": HERITAGE_RATE,
    "initialRoles": INITIAL_ROLES,
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)

print(f"[OK] {OUT}")
print(f"  收集 {c_sum:,}  升星 {star_sum:,}")
print(f"  传承 期望 {her_exp:,.0f} / 上限 {her_max:,}")
print(f"  保底 {total_floor:,} -> Lv{payload['levels']['floor'][0]}")
print(f"  期望 {total_expect:,.0f} -> Lv{payload['levels']['expect'][0]}")
print(f"  上限 {total_max:,} -> Lv{payload['levels']['max'][0]}")
