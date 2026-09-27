#!/usr/bin/env python3
"""把 public/ 下的「大图」转成 WebP，并把所有代码引用一并改名。

设计取舍（实测得出，见 docs）：
  * 只处理 >= --min-kb 的图（默认 20KB）。4400+ 张 1-2KB 的小雪碧图**不处理**：
    实测其调色板量化收益 0%、无损重压仅 4.5%，转 WebP 还会有 11% 反而变大。
  * 默认**不改分辨率**（除了显式指定 --resize），因为很多图在看图弹窗里会被放大，
    擅自缩小会在放大时糊掉。尺寸明显离谱的图用 --resize 单独指明。
  * 输出 .webp 且**换文件名**，因为 App 端非 HTML 资源是 `immutable, max-age=31536000`，
    不换名永远拿不到新图。
  * 自动改写代码里的引用；若某文件被引用但找不到（或反之），直接报错不写盘。

用法：
  python tools/optimize_images.py                      # 预估，不写任何文件
  python tools/optimize_images.py --apply              # 执行
  python tools/optimize_images.py --min-kb 15 --quality 85
  python tools/optimize_images.py --resize logo.png=128
  python tools/optimize_images.py --restore            # 从 .backup/images 回滚
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import shutil
import sys
from pathlib import Path

# Windows 控制台默认 GBK，直接 print 非 ASCII 会 UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from PIL import Image
except ImportError:
    print("需要 Pillow：python -m pip install pillow")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
BACKUP = ROOT / ".backup" / "images"

# 扫描引用时要看的源文件（只读文本）
SRC_GLOBS = ["src/**/*.vue", "src/**/*.js", "src/**/*.json", "index.html"]
# 这些目录里的图**不转**（体积小且可复现；避免无谓改动）
SKIP_DIRS = {"备用"}
# 默认排除的目录：这些目录的图是**动态拼接路径**引用的
# （如 `/Equip/${id}.png`、`/AreaBlock/${IDs}.png`、`/General/${attr.icon}`），
# 改名要同时改 40+ 处模板字面量，风险高而收益有限（详见输出末尾提示）。
# 想处理它们时显式加 --include-dynamic，并自行确保所有拼接点都改了扩展名。
DYNAMIC_DIRS = {
    "Equip", "AreaBlock", "DungeonRelics", "GodStone", "Relics", "Rune",
    "RoleCard", "RoleDraw", "Skill", "Header", "lime", "Shop", "ParagonPrefix",
    "GodStone", "Bond", "Foretell", "General", "images",
}


def human(n: float) -> str:
    for unit in ("B", "KB", "MB"):
        if abs(n) < 1024 or unit == "MB":
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} MB"


def collect_images(min_bytes: int, include_dynamic: bool):
    out = []
    for p in PUBLIC.rglob("*"):
        if not p.is_file() or p.is_symlink():
            continue
        parts = p.parts
        if any(part in SKIP_DIRS for part in parts):
            continue
        if not include_dynamic:
            rel = p.relative_to(PUBLIC)
            # 只按 public 下的**第一层目录**判断是否属于动态拼接区
            if len(rel.parts) > 1 and rel.parts[0] in DYNAMIC_DIRS:
                continue
        if p.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        if p.stat().st_size < min_bytes:
            continue
        out.append(p)
    return sorted(out)


def build_reference_index() -> dict[str, list[tuple[Path, int, str]]]:
    """文件名 -> [(文件, 行号, 行内容)]，用于改写与校验"""
    index: dict[str, list[tuple[Path, int, str]]] = {}
    files: list[Path] = []
    for g in SRC_GLOBS:
        files.extend(ROOT.glob(g))
    for f in files:
        if not f.is_file():
            continue
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            for m in re.finditer(r"[/\w\u4e00-\u9fff .@#（）()\-]+\.(png|jpe?g|webp)", line, re.I):
                name = m.group(0).split("/")[-1]
                index.setdefault(name, []).append((f, lineno, line))
            # 纯文件名引用（如 'mid_ico_attribute_0001.png'）
            for m in re.finditer(r"'([^'/]+\.(?:png|jpe?g|webp))'", line, re.I):
                name = m.group(1)
                index.setdefault(name, []).append((f, lineno, line))
    return index


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="真正写入（默认只预估）")
    ap.add_argument("--restore", action="store_true", help="从 .backup/images 回滚")
    ap.add_argument("--min-kb", type=int, default=20, help="只处理不小于该大小的图（默认 20）")
    ap.add_argument("--quality", type=int, default=82, help="WebP 质量（默认 82）")
    ap.add_argument(
        "--min-gain",
        type=float,
        default=15.0,
        help="至少省这么多百分比才采用（默认 15）。"
        "已经是高压缩 WebP 的图重编码基本不省，重编码只会白白损失一代画质。",
    )
    ap.add_argument(
        "--resize",
        action="append",
        default=[],
        metavar="NAME=MAXEDGE",
        help="限定某张图的最长边（可多次），如 --resize logo.png=128",
    )
    ap.add_argument(
        "--include-dynamic",
        action="store_true",
        help="也处理动态拼接路径的目录（Equip/AreaBlock/General 等）。"
        "启用前请确认已把对应模板里的 `.png` 改成 `.webp`。",
    )
    args = ap.parse_args()

    if args.restore:
        if not BACKUP.exists():
            print(f"没有备份目录 {BACKUP}，无法回滚")
            return 2
        n = 0
        for p in BACKUP.rglob("*"):
            if p.is_file():
                rel = p.relative_to(BACKUP)
                dst = PUBLIC / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(p, dst)
                n += 1
        print(f"✓ 已从备份回滚 {n} 个文件到 public/")
        print("  注意：代码里的引用改写需要手动 git checkout 或重新运行本脚本前的版本")
        return 0

    resize_map: dict[str, int] = {}
    for spec in args.resize:
        if "=" not in spec:
            print(f"--resize 格式应为 NAME=MAXEDGE：{spec}")
            return 2
        name, edge = spec.rsplit("=", 1)
        resize_map[name.strip()] = int(edge)

    min_bytes = args.min_kb * 1024
    images = collect_images(min_bytes, args.include_dynamic)
    refs = build_reference_index()

    print(f"根目录   : {ROOT}")
    print(f"阈值     : >= {args.min_kb} KB")
    print(f"质量     : WebP q{args.quality}")
    print(f"限定尺寸 : {resize_map if resize_map else '（不改分辨率）'}")
    print(f"待处理   : {len(images)} 张\n")

    plans = []
    skipped = []
    total_before = total_after = 0
    for p in images:
        before = p.stat().st_size
        try:
            im = Image.open(p)
            im.load()
        except Exception as e:
            print(f"  跳过（打不开）{p.name}: {e}")
            continue
        work = im.convert("RGBA") if im.mode not in ("RGB", "RGBA") else im
        max_edge = resize_map.get(p.name)
        resized = None
        if max_edge and max(im.size) > max_edge:
            scale = max_edge / max(im.size)
            new_size = (max(1, round(im.size[0] * scale)), max(1, round(im.size[1] * scale)))
            work = work.resize(new_size, Image.LANCZOS)
            resized = new_size
        buf = io.BytesIO()
        work.save(buf, "WEBP", quality=args.quality, method=6)
        after = buf.tell()

        gain = (before - after) / before * 100
        # 收益门槛：重编码已压缩的 WebP 往往只省几个百分点，甚至变大，
        # 这种改动等于白丢一代画质，直接跳过。
        if gain < args.min_gain:
            skipped.append((p, before, after, gain, im.size))
            continue

        new_name = p.stem + ".webp"
        new_rel = p.parent.relative_to(PUBLIC) / new_name
        total_before += before
        total_after += after
        plans.append(
            {
                "src": p,
                "new_name": new_name,
                "new_rel": new_rel,
                "before": before,
                "after": after,
                "size": im.size,
                "new_size": resized,
                "refs": refs.get(p.name, []),
                "bytes": buf.getvalue(),
            }
        )

    plans.sort(key=lambda x: x["before"] - x["after"], reverse=True)

    print(f"{'原文件':34}{'原大小':>10}{'转后':>10}{'省':>10}  引用")
    for it in plans:
        ratio = f"{it['before'] / it['after']:.1f}x" if it["after"] else "-"
        dim = f"{it['size']}->{it['new_size']}" if it["new_size"] else str(it["size"])
        print(
            f"  {it['new_name']:32}{human(it['before']):>10}{human(it['after']):>10}"
            f"{ratio:>10}  {len(it['refs'])} 处  {dim}"
        )

    print(
        f"\n合计: {human(total_before)} -> {human(total_after)}，"
        f"省 {human(total_before - total_after)} ({(total_before - total_after) / total_before * 100:.1f}%)"
        if total_before
        else "\n没有可处理的图片"
    )

    if skipped:
        print(f"\n跳过 {len(skipped)} 张（收益 < {args.min_gain}%，重编码不划算）：")
        for p, before, after, gain, size in sorted(skipped, key=lambda x: -x[1])[:15]:
            print(f"    {p.name:26} {human(before):>9} -> {human(after):>9}  ({gain:+.1f}%)  {size}")
        if len(skipped) > 15:
            print(f"    ... 另有 {len(skipped) - 15} 张")

    # 引用校验：被转的文件必须能定位到引用；否则提示人工确认
    no_ref = [it for it in plans if not it["refs"]]
    if no_ref:
        print(f"\n[!] 以下 {len(no_ref)} 个文件在源码里找不到引用（可能是动态拼接或死资产）：")
        for it in no_ref[:20]:
            print(f"    {it['new_name']}  ({human(it['before'])})")
        if len(no_ref) > 20:
            print(f"    ... 另有 {len(no_ref) - 20} 个")

    if not args.apply:
        print("\n（仅预估，未写任何文件。确认后加 --apply）")
        return 0

    # ---- 写入 ----
    print("\n== 写入 ==")
    BACKUP.mkdir(parents=True, exist_ok=True)
    changed_src_files: set[Path] = set()

    for it in plans:
        rel = it["src"].relative_to(PUBLIC)
        bkp = BACKUP / rel
        bkp.parent.mkdir(parents=True, exist_ok=True)
        if not bkp.exists():
            shutil.copy2(it["src"], bkp)

        out = it["src"].with_name(it["new_name"])
        out.write_bytes(it["bytes"])
        if out != it["src"] and it["src"].exists():
            it["src"].unlink()

        # 改写引用：先精确文件名，再尽量带上目录以降低误伤
        for f, _lineno, _line in it["refs"]:
            text = f.read_text(encoding="utf-8")
            if it["src"].name not in text:
                continue
            text = text.replace(it["src"].name, it["new_name"])
            f.write_text(text, encoding="utf-8")
            changed_src_files.add(f)

    print(f"  已转换 {len(plans)} 张图，改写 {len(changed_src_files)} 个源文件")
    for f in sorted(changed_src_files):
        print(f"    {f.relative_to(ROOT)}")
    print(f"\n  原图备份: {BACKUP}")
    print("  回滚: python tools/optimize_images.py --restore  （并 git checkout 改写的源文件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
