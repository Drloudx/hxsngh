import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox


class FastImageCleanerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("地块图像极速清理工具")
        self.root.geometry("450x200")

        self.label = tk.Label(root, text="请选择需要清理并重命名的图片文件夹：", font=("Microsoft YaHei", 10))
        self.label.pack(pady=15)

        self.path_var = tk.StringVar()
        self.entry = tk.Entry(root, textvariable=self.path_var, width=50, state="readonly")
        self.entry.pack(pady=5)

        self.btn_select = tk.Button(root, text="浏览文件夹", command=self.select_folder)
        self.btn_select.pack(pady=5)

        self.btn_frame = tk.Frame(root)
        self.btn_frame.pack(pady=15)

        self.btn_process = tk.Button(self.btn_frame, text="⚡ 极速：先删后改",
                                     command=self.process_images, bg="#e1f5fe", font=("Microsoft YaHei", 10, "bold"))
        self.btn_process.pack(padx=10)

    def select_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.path_var.set(folder_selected)

    def natural_sort_key(self, filename):
        """核心数字提取：确保 _1_ 严格排在 _10_ 前面"""
        name_without_ext, _ = os.path.splitext(filename)
        match = re.match(r"^[A-Za-z0-9]+_[A-Za-z0-9]+_(\d+)", name_without_ext)
        if match:
            return (int(match.group(1)), name_without_ext)
        return (99999, name_without_ext)

    def process_images(self):
        folder_path = self.path_var.get()
        if not folder_path:
            messagebox.showwarning("警告", "请先选择文件夹！")
            return

        img_ext = (".png", ".jpg", ".jpeg", ".webp")
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(img_ext)]

        if not files:
            messagebox.showinfo("提示", "该目录下未找到符合格式的图片文件")
            return

        # 正则配置
        prefix_pattern = re.compile(r"^([A-Za-z0-9]+_[A-Za-z0-9]+)")
        seq_pattern = re.compile(r"(_unit|_part|_\d+_\d+@|_\d+_)")

        # 1. 绝对按地块前缀（如 S50002_331）进行分组
        land_groups = {}
        for filename in files:
            name_without_ext, _ = os.path.splitext(filename)
            match = prefix_pattern.match(name_without_ext)
            if match:
                land_id = match.group(1)
                if land_id not in land_groups:
                    land_groups[land_id] = []
                land_groups[land_id].append(filename)

        to_delete = []

        # 2. 【第一阶段：精准锁定垃圾文件】
        for land_id, group_files in land_groups.items():
            seq_files = [f for f in group_files if seq_pattern.search(f)]

            if seq_files:
                # 有分割序列帧：按数字从小到大排序，保留绝对第一帧
                seq_files.sort(key=self.natural_sort_key)
                keep_file = seq_files[0]
                # 剩下的整图、多余序列帧全部送进地狱
                for f in group_files:
                    if f != keep_file:
                        to_delete.append(f)
            else:
                # 纯粹有多张底图或杂图：只留第1张，其余送进地狱
                group_files.sort()
                keep_file = group_files[0]
                for f in group_files:
                    if f != keep_file:
                        to_delete.append(f)

        if not to_delete:
            messagebox.showinfo("提示", "文件结构很干净，无需清理！")
            return

        # 二次确认
        confirm = messagebox.askyesno("确认操作",
                                      f"【极速流水线模式】\n\n"
                                      f"步骤 1：直接无脑闪电删除 {len(to_delete)} 个多余文件。\n"
                                      f"步骤 2：对剩下的所有独苗文件统一去尾缀重命名。\n\n"
                                      f"确定要开始吗？")
        if not confirm:
            return

        # 执行步骤 1：批、量、暴、力、力、删、除
        del_success = 0
        for name in to_delete:
            file_path = os.path.join(folder_path, name)
            try:
                os.remove(file_path)
                del_success += 1
            except Exception:
                pass

        # 执行步骤 2：对清除后剩下的“独苗文件”重新扫描，纯净改名
        # 此时文件夹里已经没有竞争对手了，可以直接放心切尾缀
        remaining_files = [f for f in os.listdir(folder_path) if f.lower().endswith(img_ext)]
        rename_success = 0

        for filename in remaining_files:
            name_without_ext, ext = os.path.splitext(filename)
            match = prefix_pattern.match(name_without_ext)
            if match:
                land_id = match.group(1)
                target_name = f"{land_id}{ext}"

                # 如果名字跟目标不一样（比如还带长尾缀），直接改
                if filename != target_name:
                    src_path = os.path.join(folder_path, filename)
                    dst_path = os.path.join(folder_path, target_name)
                    try:
                        # 极端防错：如果目标已存在，直接覆盖
                        if os.path.exists(dst_path):
                            os.remove(dst_path)
                        os.rename(src_path, dst_path)
                        rename_success += 1
                    except Exception:
                        pass

        messagebox.showinfo("操作成功",
                            f"⚡ 极速处理完毕！\n\n第一步：删除多余帧/底图 {del_success} 个\n第二步：净化重命名成功 {rename_success} 个")


if __name__ == "__main__":
    root = tk.Tk()
    app = FastImageCleanerApp(root)
    root.mainloop()