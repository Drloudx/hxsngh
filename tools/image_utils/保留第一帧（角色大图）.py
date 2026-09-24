import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox


class ImageCleanerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("序列帧清理工具")
        self.root.geometry("450x200")

        # 标签提示
        self.label = tk.Label(root, text="请选择需要清理的图片文件夹：", font=("Microsoft YaHei", 10))
        self.label.pack(pady=15)

        # 路径显示框
        self.path_var = tk.StringVar()
        self.entry = tk.Entry(root, textvariable=self.path_var, width=50, state="readonly")
        self.entry.pack(pady=5)

        # 按钮区域
        self.btn_select = tk.Button(root, text="浏览文件夹", command=self.select_folder)
        self.btn_select.pack(pady=5)

        # 功能按钮容器
        self.btn_frame = tk.Frame(root)
        self.btn_frame.pack(pady=15)

        # 两个核心功能按键
        self.btn_keep_base = tk.Button(self.btn_frame, text="仅保留part1_1 (保留基础原图)",
                                       command=lambda: self.clean_images(keep_base=True), bg="#e1f5fe")
        self.btn_keep_base.pack(side=tk.LEFT, padx=10)

        self.btn_del_all = tk.Button(self.btn_frame, text="仅保留part1_1 (连同基础原图也删了)",
                                     command=lambda: self.clean_images(keep_base=False), bg="#ffebee")
        self.btn_del_all.pack(side=tk.LEFT, padx=10)

    def select_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.path_var.set(folder_selected)

    def clean_images(self, keep_base):
        folder_path = self.path_var.get()
        if not folder_path:
            messagebox.showwarning("警告", "请先选择文件夹！")
            return

        img_ext = (".png", ".jpg", ".jpeg", ".webp")
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(img_ext)]

        if not files:
            messagebox.showinfo("提示", "该目录下未找到符合格式的图片文件")
            return

        to_delete = []

        # 正则解析：匹配是否是序列帧文件
        # 能够匹配: M12003_001_1_single_part1_1@1.png 或 M12002_1_single_part1_3@1.png 等
        pattern = re.compile(r"(_part\d+)_(\d+)(@\d+)?")

        for filename in files:
            name_without_ext, ext = os.path.splitext(filename)
            match = pattern.search(name_without_ext)

            if match:
                # 提取动作组（如 part1）和 帧序号（如 1, 2, 3...）
                part_name = match.group(1)  # 比如 "_part1"
                frame_idx = match.group(2)  # 比如 "1" 或 "2"

                # 如果帧序号不是 1，说明是多余的后续序列帧，需要删除
                if frame_idx != "1":
                    to_delete.append(filename)
            else:
                # 如果没有匹配到序列帧后缀，说明是基础编号文件 (例如 M12003.png 或 M12002.png)
                if not keep_base:
                    to_delete.append(filename)

        if not to_delete:
            messagebox.showinfo("提示", "未找到需要清理的多余图片文件")
            return

        # 确认二次提示
        mode_title = "【保留基础原图】" if keep_base else "【删除基础原图】"
        confirm = messagebox.askyesno("确认删除",
                                      f"模式：{mode_title}\n共找到 {len(to_delete)} 个文件需要删除，是否确定？")

        if confirm:
            success = 0
            fail = 0
            for name in to_delete:
                file_full_path = os.path.join(folder_path, name)
                try:
                    os.remove(file_full_path)
                    success += 1
                except Exception:
                    fail += 1

            messagebox.showinfo("操作完成", f"删除成功: {success} 个\n失败: {fail} 个")


if __name__ == "__main__":
    root = tk.Tk()
    app = ImageCleanerApp(root)
    root.mainloop()