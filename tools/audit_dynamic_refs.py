"""离线审计：动态拼接路径到底会请求哪些图片文件。

目的：转 WebP 前，先用**离线解析**算出所有"可能被请求的文件名"，
而不是把验证责任推给运行时（静态 check_asset_links.py 验不出具体 ID）。

每个拼接点逐个列出解析规则与校验方式。
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path('.')
ASSETS = ROOT / 'src' / 'assets'
PUBLIC = ROOT / 'public'


def load_assets(name: str):
    p = ASSETS / (name + '.json')
    if not p.exists():
        return []
    try:
        d = json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        return []
    return d if isinstance(d, list) else d.get('DataTable', [])


def col(rows, key):
    return {str(r.get(key)) for r in rows if r.get(key) not in (None, '')}


# 每个拼接点的解析规则：目录 → 候选文件名生成器
def build_expectations():
    exp = {}

    # /Equip/${equip.IDs}.png  /Equip/${equip.id || equip.IDs}.png
    equip = load_assets('Equip')
    exp['Equip'] = col(equip, 'IDs')

    # /AreaBlock/${spot.IDs}.png
    exp['AreaBlock'] = col(load_assets('Area_Spot'), 'IDs')

    # /Relics/${item.IDs}.png   /Relics/${relic.IDs}.png
    exp['Relics'] = col(load_assets('Relics'), 'IDs')

    # /Rune/${id}.png
    exp['Rune'] = col(load_assets('Rune'), 'IDs')

    # /Skill/${icon}.png  —— 来自多个表的 Icon 字段
    skill_icons = set()
    for t in ('Unique', 'Sub_Skill', 'Talent', 'Role'):
        for r in load_assets(t):
            for k in ('Icon', 'icon'):
                if r.get(k):
                    skill_icons.add(str(r[k]))
    exp['Skill'] = skill_icons

    # /Header/${charId}.png —— 角色 ID
    exp['Header'] = col(load_assets('Role'), 'IDs')

    # /RoleCard/${char.id.replace(/^M/,'MD')}.png —— M→MD 变换
    exp['RoleCard'] = {re.sub(r'^M', 'MD', x) for x in col(load_assets('Role'), 'IDs')}

    # /lime/${lime.IDs}.png
    exp['lime'] = col(load_assets('Lime'), 'IDs')

    # /Shop/${iconId}.png —— iconId 取自 GambleShop/GoldenVault 的 Content 字段
    # 形如 "ID,名称"，取逗号前的部分；另外有 4 个硬编码兜底图（见 GambleShopView.parseItemDisplay）
    shop = set()
    for t in ('GambleShop', 'GoldenVault'):
        for r in load_assets(t):
            content = str(r.get('Content') or '')
            if ',' in content:
                first = content.split(',')[0].strip()
                if first:
                    shop.add(first)
    shop |= {
        'mid_ico_chest_0001',   # 宝箱兜底
        'cur_ico_rune_0001',    # 符文兜底
        'D00002_000',           # 四叶草兜底
        'D00002_001',           # 天赋果实兜底
    }
    exp['Shop'] = shop

    # /GodStone/${id}.png
    exp['GodStone'] = col(load_assets('Godstone'), 'IDs')

    # /DungeonRelics/${relic.IDs}.png
    exp['DungeonRelics'] = col(load_assets('Dungeon_Relic'), 'IDs')

    # /Foretell/${Icon}.png
    exp['Foretell'] = col(load_assets('Foretell'), 'Icon')

    # /ParagonPrefix/JH400{lastTwo}.png —— 由 Prefix.IDs 末两位推
    pref = set()
    for r in load_assets('Prefix'):
        ids = str(r.get('IDs') or '')
        if len(ids) >= 2:
            pref.add('JH400' + ids[-2:])
    exp['ParagonPrefix'] = pref

    return exp


# 已知的「兜底常量」：路径由 `@error` 处理器赋值，磁盘上**本来就没有对应文件**，
# 也不该有 —— 它们正是用来在 404 后顶上的。列出来避免 --verify-webp 误报。
KNOWN_FALLBACK_MISSING = {
    'RoleCard/MD00000',   # 头像兜底链：MD00000.png → @error → /Header/M00000.webp
    'Skill/TB20020',      # 未实装技能图标
    'Skill/TB20021',      # 未实装技能图标
}


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description='审计动态拼接路径解析出的图片文件')
    ap.add_argument('--verify-webp', action='store_true',
                    help='转 WebP 后的校验：断言每个候选文件名都存在 .webp 或 .png')
    ap.add_argument('--expected-ext', default='.webp',
                    help='转换后期望的扩展名（默认 .webp）')
    args = ap.parse_args()

    exp = build_expectations()
    print('=== 动态拼接路径的离线解析覆盖率 ===\n')
    print('%-16s %8s %8s %8s %8s   %s' % ('目录', '候选', '有文件', '缺失', '零文件?', '说明'))
    grand_missing = 0
    verify_fail = []
    for d, names in sorted(exp.items()):
        dirp = PUBLIC / d
        if not dirp.is_dir():
            print('%-16s %8d  目录不存在' % (d, len(names)))
            continue
        on_disk = {f.stem for f in dirp.iterdir() if f.is_file()
                   and f.suffix.lower() in ('.png', '.jpg', '.webp')}
        missing = {n for n in names if n not in on_disk}
        grand_missing += len(missing)
        note = ''
        if not names:
            note = '无法从表解析（需人工核对该拼接点）'
        print('%-16s %8d %8d %8d %8s   %s'
              % (d, len(names), len(names) - len(missing), len(missing),
                 '是' if not on_disk else '', note))
        if missing:
            sample = sorted(missing)[:4]
            print('%-16s   缺失样例: %s' % ('', ', '.join(sample)))

        # 转 WebP 后的校验：候选文件名必须能找到 .webp 或回退 .png
        if args.verify_webp and names:
            for n in names:
                key = f'{d}/{n}'
                if key in KNOWN_FALLBACK_MISSING:
                    continue
                want = dirp / (n + args.expected_ext)
                fallback = dirp / (n + '.png')
                if not want.exists() and not fallback.exists():
                    verify_fail.append(key)

    print()
    print('缺失合计: %d' % grand_missing)

    if args.verify_webp:
        print()
        print('=== WebP 转换后校验（期望扩展名 %s，缺失时回退 .png 也算通过） ===' % args.expected_ext)
        if verify_fail:
            print('  [X] %d 个候选文件名既无 %s 也无 .png：' % (len(verify_fail), args.expected_ext))
            for x in verify_fail[:30]:
                print('      ' + x)
            if len(verify_fail) > 30:
                print('      ... 另有 %d 个' % (len(verify_fail) - 30))
            return 1
        print('  [OK] 所有候选文件名都有 %s 或 .png 兜底，无死链风险' % args.expected_ext)
        if KNOWN_FALLBACK_MISSING:
            print('  （已豁免 %d 个有意的兜底常量：%s）'
                  % (len(KNOWN_FALLBACK_MISSING), ', '.join(sorted(KNOWN_FALLBACK_MISSING))))
    else:
        print()
        print('提示：缺失 > 0 说明该目录的表与磁盘不完全对齐（可能有已下线/未实装条目），')
        print('      转 WebP 时要保证"存在哪个就转哪个"，转换脚本按目录遍历磁盘，天然满足。')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
