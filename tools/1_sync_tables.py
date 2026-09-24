#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【工具 1】一键同步官方服务端最新数据表
数据源：https://api.monster-girls-guild.chillyroom.com/GameDataTable/FetchDataTable
输出目录：src/assets/*.json
"""
import os
import sys
import json
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "src", "assets")

API_URL = "https://api.monster-girls-guild.chillyroom.com/GameDataTable/FetchDataTable"
VERSION_URL = "https://api.monster-girls-guild.chillyroom.com/App/CheckAppVersion"

# 本地特有或模拟生成的文件，同步时不覆盖
LOCAL_ONLY_FILES = {
    "notices.json",
    "data.json",
    "map_equip_difficulties.json",
    "simulation_exact_results.json"
}

def sync_tables():
    print("[1/3] 检查服务端版本信息...")
    try:
        req = urllib.request.Request(
            VERSION_URL,
            data=b"{}",
            headers={"User-Agent": "UnityPlayer/2021.3.45f2", "Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            ver_info = json.loads(resp.read().decode("utf-8"))
            net_path = ver_info.get("netPath", {})
            print(f"  -> AppVersion: {net_path.get('appVersion')}")
            print(f"  -> BundlePath: {net_path.get('AndroidBundlePath')}")
    except Exception as e:
        print(f"  -> (版本检查跳过: {e})")

    print("\n[2/3] 从服务端拉取最新数据表...")
    req = urllib.request.Request(
        API_URL,
        data=b"{}",
        headers={"User-Agent": "UnityPlayer/2021.3.45f2", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        if raw.startswith(b"\xef\xbb\xbf"):
            raw = raw[3:]
        data = json.loads(raw.decode("utf-8"))

    print(f"  -> 成功获取 {len(data)} 张表数据")

    print(f"\n[3/3] 同步写入 {ASSETS_DIR} ...")
    os.makedirs(ASSETS_DIR, exist_ok=True)
    synced_count = 0

    for table_name, entries in data.items():
        filename = f"{table_name}.json"
        if filename in LOCAL_ONLY_FILES:
            continue

        items = list(entries.values()) if isinstance(entries, dict) else entries
        target_path = os.path.join(ASSETS_DIR, filename)

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=1)
        
        synced_count += 1
        print(f"  [OK] {filename} ({len(items)} 条)")

    print(f"\n[完成] 数据表同步完成！共更新 {synced_count} 张数据表。")

if __name__ == "__main__":
    sync_tables()
