import os
import hashlib
import json
import subprocess
import zipfile

def get_file_md5(file_path):
    """计算文件MD5值"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

if __name__ == "__main__":
    print("【1】执行 npm run build 打包前端")
    ret = subprocess.run(["npm", "run", "build"], shell=True)
    if ret.returncode != 0:
        input("❌ npm打包失败，按回车退出")
        exit(1)

    zip_path = "dist.zip"
    # 删除旧压缩包
    if os.path.exists(zip_path):
        os.remove(zip_path)

    print("\n【2】打包dist内所有文件（无外层dist文件夹）")
    dist_folder = "dist"
    # 新建zip，直接把dist内部文件放到压缩包根目录
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(dist_folder):
            for file_name in files:
                full_file_path = os.path.join(root, file_name)
                # 去掉外层dist目录前缀，文件直接放在压缩包根层
                archive_name = os.path.relpath(full_file_path, dist_folder)
                zf.write(full_file_path, archive_name)

    print("\n【3】计算dist.zip MD5")
    md5_val = get_file_md5(zip_path)
    print(f"MD5值：{md5_val}")

    print("\n【4】自动更新hotupdate.json内md5字段")
    cfg_path = "hotupdate.json"
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["md5"] = md5_val
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

    print("\n✅ 全部流程执行完毕！")
    print("压缩包位置：项目根目录 dist.zip")
    print("压缩包结构：根目录直接包含index.html，无外层dist文件夹")
    input("\n按回车键关闭窗口")