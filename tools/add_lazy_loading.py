#!/usr/bin/env python3
"""给 .vue 里的内容类 <img> 批量加 loading="lazy" 与 decoding="async"。

设计取舍：
  * **跳过 /ui/ 下的图标**：那是 34 个小 SVG（多在顶栏、弹窗按钮等首屏可见位置），
    加懒加载无收益，反而可能延后渲染首屏图标。
  * **跳过首屏关键图**：`/logo.webp`（顶栏 logo，必须立刻显示）。
  * **跳过 GIF**：`/gif/` 是装饰动画，体积很小且需要立即播放。
  * **跳过支付二维码**：弹窗内的图，给懒加载没有坏处但也没有收益，
    且它出现在 `v-if` 弹窗里，本身就按需加载 —— 一律跳过以便人工核对其显示。
  * 其余内容图（Header / Skill / Equip / Relics / Shop / RoleCard / AreaBlock /
    lime / GodungeonRelics / Foretell / General / mid_ico_* 等）都加。

安全性：这些图的 CSS 都带固定宽高（`width/height` 或 `flex-shrink:0` + 固定尺寸），
`loading="lazy"` 不会造成布局跳动。

用法：
  python tools/add_lazy_loading.py            # 只预估
  python tools/add_lazy_loading.py --apply    # 实际写入
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

SKIP_SRC_PATTERNS = [
    "/ui/",           # 小 SVG 图标，多在首屏
    "/logo",          # 顶栏 logo / favicon 同源
    "/gif/",          # 装饰动画
    "WeChatPay",      # 支付二维码
    "Alipay",
]

# 整文件跳过：NavigationMenu 的 :src="item.icon" 是**侧边栏菜单图标**，
# src 里没有路径前缀（所以挡不住），但它一直可见 —— 加懒加载会闪。
SKIP_FILES = {
    "src/components/NavigationMenu.vue",
}

IMG_TAG = re.compile(r"<img\b", re.I)


def iter_img_tags(text: str):
    """产出 (start, end_exclusive, tag_text)。用引号感知的扫描找 '>'，避免属性值里的 > 误判。"""
    i = 0
    while True:
        m = IMG_TAG.search(text, i)
        if not m:
            return
        start = m.start()
        j = m.end()
        quote = None
        end = None
        while j < len(text):
            ch = text[j]
            if quote:
                if ch == quote:
                    quote = None
            elif ch in "\"'":
                quote = ch
            elif ch == ">":
                # 自闭合 <img ... /> 的 '>' 已是结尾
                end = j + 1
                break
            j += 1
        if end is None:
            return
        yield start, end, text[start:end]
        i = end


def needs_patch(tag: str) -> tuple[bool, bool]:
    has_lazy = bool(re.search(r"\bloading\s*=", tag))
    has_async = bool(re.search(r"\bdecoding\s*=", tag))
    return (not has_lazy), (not has_async)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="实际写入（默认只预估）")
    args = ap.parse_args()

    patched_files = 0
    patched_tags = 0
    skipped_icons = 0
    plan = []

    for vue in sorted(SRC.rglob("*.vue")):
        rel = vue.relative_to(ROOT).as_posix()
        if rel in SKIP_FILES:
            continue
        text = vue.read_text(encoding="utf-8")
        out = []
        last = 0
        changed = 0
        for start, end, tag in iter_img_tags(text):
            src_m = re.search(r"""src\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)""", tag)
            src = next((g for g in (src_m.groups() if src_m else []) if g), "") if src_m else ""

            if any(p in src for p in SKIP_SRC_PATTERNS):
                skipped_icons += 1
                continue

            add_lazy, add_async = needs_patch(tag)
            if not (add_lazy or add_async):
                continue

            attrs = ""
            if add_lazy:
                attrs += ' loading="lazy"'
            if add_async:
                attrs += ' decoding="async"'
            new_tag = tag[: -1].rstrip()
            if new_tag.endswith("/"):
                new_tag = new_tag[:-1].rstrip()
            new_tag = f"{new_tag}{attrs} />"

            out.append(text[last:start])
            out.append(new_tag)
            last = end
            changed += 1
            plan.append((vue.relative_to(ROOT).as_posix(), src[:52]))

        if changed:
            out.append(text[last:])
            patched_files += 1
            patched_tags += changed
            if args.apply:
                vue.write_text("".join(out), encoding="utf-8")

    print("=== 懒加载注入 ===")
    print(f"  命中文件 : {patched_files}")
    print(f"  命中 <img>: {patched_tags}")
    print(f"  跳过(图标/logo/gif/支付码): {skipped_icons}")
    print("\n  明细（前 30 条）:")
    for f, s in plan[:30]:
        print(f"    {f:44} {s}")
    if len(plan) > 30:
        print(f"    ... 另有 {len(plan) - 30} 条")

    if not args.apply:
        print("\n（仅预估，未写文件。确认后加 --apply）")
    else:
        print(f"\n已写入 {patched_files} 个 .vue 文件")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
