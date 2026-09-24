#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【工具 2】从官方热更包（AssetBundle）提取与处理最新游戏图片资源
涵盖：
  - 装备图标 (public/Equip/Zxxxxx_xxx.png)
  - 羁绊图标 (public/Bond/HZxxxxx.png)
  - 地块图   (public/AreaBlock/Sxxxxx_xxx.png，自动保留第一帧)
  - 角色卡片 (public/RoleCard/MDxxxxx.png，52x69 像素规格)
  - 角色立绘 (public/RoleDraw/Mxxxxx_1__single_part1_1@1.png)
  - 角色头像 (public/Header/Mxxxxx.png，30x30 像素规格)
注：根据需求，不提取战斗模拟角色小人（已废弃）。
"""
import os
import re
import sys
import json
import urllib.request
import UnityPy
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(PROJECT_ROOT, 'public')
SCRATCH_DIR = os.path.join(PROJECT_ROOT, 'tools', '.cache')

VERSION_URL = "https://api.monster-girls-guild.chillyroom.com/App/CheckAppVersion"

def natural_sort_key(filename):
    match = re.match(r"^[A-Za-z0-9]+_[A-Za-z0-9]+_(\d+)", filename)
    if match:
        return (int(match.group(1)), filename)
    return (99999, filename)

def fetch_latest_bundle_path():
    """获取最新 CDN main_sprites.bundle 并下载到本地缓存"""
    os.makedirs(SCRATCH_DIR, exist_ok=True)
    print("[1/4] 获取最新服务端版本与 CDN 地址...")
    req = urllib.request.Request(
        VERSION_URL,
        data=b"{}",
        headers={"User-Agent": "UnityPlayer/2021.3.45f2", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        ver_info = json.loads(resp.read().decode("utf-8"))
        cdn_base = ver_info.get("netPath", {}).get("AndroidBundlePath")
    
    print(f"  -> CDN 地址: {cdn_base}")

    # 获取 Main.version
    req = urllib.request.Request(f"{cdn_base}/Main.version", headers={"User-Agent": "UnityPlayer/2021.3.45f2"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        manifest_ver = resp.read().decode("utf-8").strip()
    print(f"  -> 清单版本: {manifest_ver}")

    # 获取二进制清单 Main_{ver}.bytes
    manifest_url = f"{cdn_base}/Main_{manifest_ver}.bytes"
    print(f"  -> 下载清单文件: {manifest_url}")
    req = urllib.request.Request(manifest_url, headers={"User-Agent": "UnityPlayer/2021.3.45f2"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        manifest_bytes = resp.read()

    # 从清单中解析 main_sprites.bundle 的 MD5 哈希
    match = re.search(rb'main_sprites\.bundle.*?([0-9a-f]{32})', manifest_bytes, re.DOTALL)
    if not match:
        raise ValueError("未能从清单中解析出 main_sprites.bundle 的哈希！")
    bundle_hash = match.group(1).decode("utf-8")
    print(f"  -> main_sprites.bundle 哈希: {bundle_hash}")

    local_bundle = os.path.join(SCRATCH_DIR, f"{bundle_hash}.bundle")
    if os.path.exists(local_bundle) and os.path.getsize(local_bundle) > 10_000_000:
        print(f"  -> 本地已存在完整缓存文件: {local_bundle}")
        return local_bundle

    bundle_url = f"{cdn_base}/{bundle_hash}.bundle"
    print(f"[2/4] 从 CDN 下载图片资源包 ({bundle_url})...")
    req = urllib.request.Request(bundle_url, headers={"User-Agent": "UnityPlayer/2021.3.45f2"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(local_bundle, "wb") as out:
        downloaded = 0
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            downloaded += len(chunk)
            print(f"    已下载 {downloaded / (1024 * 1024):.1f} MB...", end="\r")
    print(f"\n  -> 下载完成！大小: {os.path.getsize(local_bundle) / (1024 * 1024):.1f} MB")
    return local_bundle

def extract_assets(bundle_path=None):
    if not bundle_path or not os.path.exists(bundle_path):
        bundle_path = fetch_latest_bundle_path()

    print(f"\n[3/4] 使用 UnityPy 解包资源包: {bundle_path} ...")
    with open(bundle_path, 'rb') as f:
        # YooAsset UnityFS 带有 32 字节偏移头
        f.seek(32)
        raw_bundle = f.read()

    env = UnityPy.load(raw_bundle)
    print(f"  -> 成功载入 {len(env.objects)} 个资源对象")

    prefix_pattern = re.compile(r"^([A-Za-z0-9]+_[A-Za-z0-9]+)")
    seq_pattern = re.compile(r"(_unit|_part|_\d+_\d+@|_\d+_)")

    equips = {}
    bonds = {}
    area_blocks = {}
    role_cards = {}
    role_draws = {}
    headers = {}
    paragon_prefixes = {}

    print("\n[4/4] 扫描并分类解密各类图集...")
    for obj in env.objects:
        if obj.type.name in ('Sprite', 'Texture2D'):
            data_obj = obj.read()
            name = getattr(data_obj, 'm_Name', getattr(data_obj, 'name', ''))
            if not name:
                continue

            # 加护图标 JH400xx
            if name.startswith('JH400') and obj.type.name == 'Sprite':
                paragon_prefixes[name] = data_obj

            # 装备 Zxxxxx_xxx
            if re.match(r'^Z\d+_\d+$', name):
                if name not in equips or obj.type.name == 'Sprite':
                    equips[name] = data_obj

            # 羁绊 HZxxxxx
            if re.match(r'^HZ\d+$', name):
                bonds[name] = data_obj

            # 地块 Sxxxxx_xxx
            if re.match(r'^S\d+_\d+', name):
                m = prefix_pattern.match(name)
                if m:
                    block_id = m.group(1)
                    area_blocks.setdefault(block_id, []).append((name, data_obj))

            # 角色卡片 MDxxxxx (52x69 规格)
            if name.startswith('MD') and obj.type.name == 'Sprite':
                img = data_obj.image
                if img.size == (52, 69):
                    role_cards[name] = data_obj

            # 角色大立绘 single_part1_1@1
            if 'single_part1_1@' in name and obj.type.name == 'Sprite':
                role_draws[name] = data_obj

            # 角色头像 (30x30 规格)
            if re.match(r'^M\d+(?:_\d+)?$', name) and obj.type.name == 'Sprite':
                img = data_obj.image
                if img.size == (30, 30):
                    headers[name] = data_obj

    # 写入装备图标
    equip_dir = os.path.join(PUBLIC_DIR, 'Equip')
    os.makedirs(equip_dir, exist_ok=True)
    count_equip = 0
    for name, data_obj in equips.items():
        out_path = os.path.join(equip_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_equip += 1
    print(f"  [Equip] 提取/补充 {count_equip} 个新装备图标")

    # 写入羁绊图标
    bond_dir = os.path.join(PUBLIC_DIR, 'Bond')
    os.makedirs(bond_dir, exist_ok=True)
    count_bond = 0
    for name, data_obj in bonds.items():
        out_path = os.path.join(bond_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_bond += 1
    print(f"  [Bond] 提取/补充 {count_bond} 个新羁绊图标")

    # 写入地块底图（保留第一帧规则）
    area_dir = os.path.join(PUBLIC_DIR, 'AreaBlock')
    os.makedirs(area_dir, exist_ok=True)
    count_area = 0
    for block_id, items in area_blocks.items():
        out_path = os.path.join(area_dir, f"{block_id}.png")
        if not os.path.exists(out_path):
            seq_items = [it for it in items if seq_pattern.search(it[0])]
            if seq_items:
                seq_items.sort(key=lambda x: natural_sort_key(x[0]))
                chosen = seq_items[0]
            else:
                items.sort(key=lambda x: x[0])
                chosen = items[0]
            chosen[1].image.save(out_path)
            count_area += 1
    print(f"  [AreaBlock] 提取/补充 {count_area} 个新地块底图")

    # 写入角色卡片
    card_dir = os.path.join(PUBLIC_DIR, 'RoleCard')
    os.makedirs(card_dir, exist_ok=True)
    count_card = 0
    for name, data_obj in role_cards.items():
        out_path = os.path.join(card_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_card += 1
    print(f"  [RoleCard] 提取/补充 {count_card} 个新角色卡片")

    # 写入角色立绘
    draw_dir = os.path.join(PUBLIC_DIR, 'RoleDraw')
    os.makedirs(draw_dir, exist_ok=True)
    count_draw = 0
    for name, data_obj in role_draws.items():
        out_path = os.path.join(draw_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_draw += 1
    print(f"  [RoleDraw] 提取/补充 {count_draw} 个新角色大立绘")

    # 写入角色小头像
    header_dir = os.path.join(PUBLIC_DIR, 'Header')
    os.makedirs(header_dir, exist_ok=True)
    count_header = 0
    for name, data_obj in headers.items():
        out_path = os.path.join(header_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_header += 1
    print(f"  [Header] 提取/补充 {count_header} 个新角色小头像")

    # 写入加护图标
    prefix_dir = os.path.join(PUBLIC_DIR, 'ParagonPrefix')
    os.makedirs(prefix_dir, exist_ok=True)
    count_prefix = 0
    for name, data_obj in paragon_prefixes.items():
        out_path = os.path.join(prefix_dir, f"{name}.png")
        if not os.path.exists(out_path):
            data_obj.image.save(out_path)
            count_prefix += 1
    print(f"  [ParagonPrefix] 提取/补充 {count_prefix} 个新加护图标")

    print("\n[完成] 整体图片资源更新完毕！")

if __name__ == '__main__':
    extract_assets()
