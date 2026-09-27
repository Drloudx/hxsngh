"""验证 APK 内 assets/public/opencv_js.wasm 的存在与压缩方式。

关键：WebView 要把 wasm 交给 WebAssembly.instantiateStreaming，
需要真实字节；若被 APK 以 deflate 压缩存放，原生侧读出来虽仍是明文，
但每个安装包解压更慢、占用更多运行时内存 —— 所以用 noCompress 排除。

zip 的 compress_type: 0 = STORED（未压缩）, 8 = DEFLATE。
"""
import zipfile
import sys
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

apks = sorted(Path('android/app/build/outputs/apk').rglob('*.apk'))
# 排除 androidTest 的测试包（它不含 assets/public）
apks = [p for p in apks if 'androidTest' not in p.as_posix() and 'androidTest' not in p.name]
if not apks:
    print('未找到构建出的主 APK（apk/debug 或 apk/release）')
    raise SystemExit(2)

apk = apks[0]
print('APK: %s  (%.2f MB)' % (apk, apk.stat().st_size / 1048576))

with zipfile.ZipFile(apk) as z:
    names = z.namelist()
    print('条目总数: %d' % len(names))

    # 关键资源
    checks = [
        'assets/public/index.html',
        'assets/public/opencv.js',
        'assets/public/opencv_js.wasm',
        'assets/public/logo.webp',
    ]
    print('\n=== 关键条目 ===')
    for c in checks:
        hit = [n for n in names if n == c]
        if not hit:
            # 有些打包路径会少一层
            hit = [n for n in names if n.endswith(c.split('assets/public/')[-1])][:3]
        if not hit:
            print('  [X] 缺失: %s' % c)
            continue
        n = hit[0]
        info = z.getinfo(n)
        method = {0: 'STORED(未压缩)', 8: 'DEFLATE(已压缩)'}.get(info.compress_type, str(info.compress_type))
        print('  [OK] %-40s %8.2f MB  %s' % (n, info.file_size / 1048576, method))

    # wasm 压缩方式判定
    wasm = [n for n in names if n.endswith('opencv_js.wasm')]
    print('\n=== wasm 压缩判定 ===')
    if not wasm:
        print('  [X] APK 里没有 opencv_js.wasm —— 换包会坏！')
        raise SystemExit(1)
    info = z.getinfo(wasm[0])
    if info.compress_type == 0:
        print('  [OK] STORED —— noCompress 生效，WebView 可流式编译')
    else:
        print('  [!] 仍被压缩（DEFLATE）—— noCompress 未生效，建议检查 aaptOptions')

    # assets/public 下图片/webp 抽查
    webp = [n for n in names if n.startswith('assets/public/') and n.endswith('.webp')]
    png = [n for n in names if n.startswith('assets/public/') and n.endswith('.png')]
    print('\n=== 图片资源 ===')
    print('  .webp: %d 个' % len(webp))
    print('  .png : %d 个' % len(png))

    # 不该在 APK 里出现的
    bad = [n for n in names if n.endswith('.bak') or 'opencv.js.base64' in n]
    print('\n=== 不该出现的条目 ===')
    print('  %s' % ('无' if not bad else bad[:5]))

print('\n===== APK 体检完成 =====')
