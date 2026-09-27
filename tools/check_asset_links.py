#!/usr/bin/env python3
"""校验源码里引用的 public/ 静态资源是否都存在（防改名后死链）。

覆盖两类引用：
  1. 字面量路径：'/ui/x.svg'、"logo.webp"、`/misc/ylgl1.webp`
  2. 动态拼接：`/Equip/${id}.png`、`/Header/${charId}.png` —— 抽不出具体文件名，
     但能抽出**目录 + 扩展名**，于是校验「该目录下是否存在该扩展名的文件」。

死链不会让页面报错，只会静默显示兜底图，所以必须静态查。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC = ROOT / "src"

# 只校验这些扩展名（图片与字体是重点）
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ttf", ".woff", ".woff2", ".xlsx")

# 故意不存在的「哨兵路径」：代码里用来判断「没有配图」而不是真的去加载
ALLOW_MISSING = {
    "/misc/placeholder.png",   # GuideView: item.img === 该值时渲染占位框，不发请求
}

# 字面量引用：引号内含 / 或已知目录的路径
LITERAL_RE = re.compile(r"""['"`](/[^'"`\n]+?\.(?:%s))['"`]""" % "|".join(e.lstrip(".") for e in EXTS), re.I)
# 动态拼接：`/Dir/${...}.png`  或  `/Dir/${...}.ext`
DYNAMIC_RE = re.compile(r"""['"`]/([A-Za-z_\u4e00-\u9fff]+)/\$\{[^}]+\}\.(%s)['"`]""" % "|".join(e.lstrip(".") for e in EXTS), re.I)
# 纯文件名引用（如 'mid_ico_attribute_0001.png'）——要在 General/ 等目录里找
BARE_RE = re.compile(r"""['"]([A-Za-z0-9_.\u4e00-\u9fff-]+\.(?:%s))['"]""" % "|".join(e.lstrip(".") for e in EXTS), re.I)


def scan_files():
    files = list(SRC.rglob("*.vue")) + list(SRC.rglob("*.js")) + list(SRC.rglob("*.json"))
    idx = ROOT / "index.html"
    if idx.is_file():
        files.append(idx)
    return [f for f in files if f.is_file()]


def main() -> int:
    missing_literal: list[tuple[Path, int, str]] = []
    missing_dynamic: list[tuple[Path, int, str, str]] = []
    checked_literal = checked_dynamic = 0
    bare_unresolved: list[tuple[Path, int, str]] = []

    for f in scan_files():
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            for m in LITERAL_RE.finditer(line):
                p = m.group(1)
                # 含 ${...} 的是模板拼接，交给 DYNAMIC_RE 处理（这里抽不出文件名）
                if "${" in p:
                    continue
                checked_literal += 1
                # 去掉 query / hash
                clean = p.split("?")[0].split("#")[0]
                if clean in ALLOW_MISSING:
                    continue
                if not (PUBLIC / clean.lstrip("/")).exists():
                    missing_literal.append((f, lineno, p))
            for m in DYNAMIC_RE.finditer(line):
                d, ext = m.group(1), m.group(2).lower()
                checked_dynamic += 1
                dirpath = PUBLIC / d
                if not dirpath.is_dir() or not any(dirpath.glob("*." + ext)):
                    missing_dynamic.append((f, lineno, d, ext))
            for m in BARE_RE.finditer(line):
                name = m.group(1)
                if "${" in name:
                    continue
                checked_literal += 1
                if not (PUBLIC / name).exists() and not (PUBLIC / "General" / name).exists() \
                   and not (PUBLIC / "ui" / name).exists() and not (PUBLIC / "images" / name).exists():
                    bare_unresolved.append((f, lineno, name))

    print("=== 死链校验 ===")
    print(f"  字面量引用检查: {checked_literal} 处")
    print(f"  动态拼接检查  : {checked_dynamic} 处")

    ok = True
    if missing_literal:
        ok = False
        print(f"\n  [X] 字面量死链 {len(missing_literal)} 处：")
        for f, ln, p in missing_literal:
            print(f"      {f.relative_to(ROOT)}:{ln}  ->  {p}")
    else:
        print("\n  [OK] 无字面量死链")

    if missing_dynamic:
        ok = False
        print(f"\n  [X] 动态拼接目录无对应扩展名文件 {len(missing_dynamic)} 处：")
        for f, ln, d, ext in missing_dynamic:
            print(f"      {f.relative_to(ROOT)}:{ln}  ->  /{d}/*.{ext} 不存在")
    else:
        print("  [OK] 动态拼接目录均有对应扩展名文件")

    # 裸文件名（多为 JSON 里的图标名，可能是外部数据，只提示不判错）
    real_bare = [(f, ln, n) for f, ln, n in bare_unresolved if not n.endswith(".json")]
    if real_bare:
        print(f"\n  [!] {len(real_bare)} 处裸文件名未在常见目录找到（可能是动态数据，人工确认）：")
        for f, ln, n in real_bare[:15]:
            print(f"      {f.relative_to(ROOT)}:{ln}  ->  {n}")
        if len(real_bare) > 15:
            print(f"      ... 另有 {len(real_bare) - 15} 处")

    print(f"\n===== {'PASS' if ok else 'FAIL'} =====")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
