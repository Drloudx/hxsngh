import os
import re
import tkinter as tk
from tkinter import filedialog


def process_images():
    # 隐藏主窗口
    root = tk.Tk()
    root.withdraw()

    # 选择文件夹
    folder_path = filedialog.askdirectory(title="请选择要清理的图片文件夹")
    if not folder_path:
        return

    # 匹配角色ID (例如: M00000, M11005, M11005_001)
    pattern = re.compile(r'^(M\d+(?:_\d{3})?)')

    roles = {}

    # 1. 扫描目录下所有PNG并按角色分组
    for filename in os.listdir(folder_path):
        if not filename.lower().endswith('.png'):
            continue

        match = pattern.match(filename)
        if match:
            role_id = match.group(1)
            if role_id not in roles:
                roles[role_id] = []
            roles[role_id].append(filename)

    total_deleted = 0

    # 2. 严格筛选与删除
    for role_id, files in roles.items():
        # 强制：只找名字里带 idle 的文件
        idle_files = [f for f in files if 'idle' in f.lower()]

        keep_file = None
        if idle_files:
            # 排序后，留第一帧（默认 _1_idle 排在最前面）
            idle_files.sort()
            keep_file = idle_files[0]

        # 遍历该角色的所有文件，不是那“唯一保留帧”的统统删掉
        for f in files:
            if f != keep_file:
                try:
                    os.remove(os.path.join(folder_path, f))
                    total_deleted += 1
                except Exception:
                    pass

        # 3. 将留下的唯一 idle 帧重命名
        if keep_file:
            old_path = os.path.join(folder_path, keep_file)
            new_path = os.path.join(folder_path, f"{role_id}.png")

            # 如果新名字和老名字不同，执行改名
            if old_path != new_path:
                try:
                    # 以防万一目标文件已经存在，先移除再重命名
                    if os.path.exists(new_path):
                        os.remove(new_path)
                    os.rename(old_path, new_path)
                except Exception:
                    pass

    # 4. 只打印最终的删除总数
    print(f"处理完成！一共删除了 {total_deleted} 个文件。")


if __name__ == "__main__":
    process_images()