import os
from tkinter import Tk, filedialog


def split_file(target_dir, file_name="dist.zip", chunk_size_mb=9):
    """
    只负责将指定目录下的文件切分为指定大小的分卷
    :param target_dir: 目标目录路径
    :param file_name: 需要切分的大包文件名，默认 'dist.zip'
    :param chunk_size_mb: 每个分卷的大小限制（单位：MB），默认 9MB
    """
    file_path = os.path.join(target_dir, file_name)

    if not os.path.exists(file_path):
        print(f"❌ 错误：在目录【{target_dir}】下找不到文件 '{file_name}'。")
        return

    # 转换成字节数 (1MB = 1024 * 1024 字节)
    chunk_size = chunk_size_mb * 1024 * 1024
    part_num = 0

    print(f"📂 目标目录: {target_dir}")
    print(f"📦 开始切分文件: {file_path}")
    print(f"📏 设定单卷最大体积: {chunk_size_mb} MB")

    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            part_num += 1
            # 生成形如：dist.zip.001, dist.zip.002
            part_name = f"{file_path}.{part_num:03d}"

            with open(part_name, 'wb') as part_file:
                part_file.write(chunk)

            print(f"  -> 已生成分卷: {part_name} ({len(chunk) / 1024 / 1024:.2f} MB)")

    print(f"✅ 切分完成！总共在目标目录下生成了 {part_num} 个分卷文件。")


if __name__ == "__main__":
    # 1. 初始化 Tkinter 并隐藏主窗口（只用它的弹窗功能）
    root = Tk()
    root.withdraw()

    # 2. 弹出文件夹选择框
    print("请在弹出的窗口中选择 'dist.zip' 所在的文件夹...")
    selected_directory = filedialog.askdirectory(title="选择 dist.zip 所在的文件夹")

    # 3. 如果用户没有取消选择，则执行切片
    if selected_directory:
        # 兼容 Windows 路径斜杠，并去除首尾空格
        selected_directory = os.path.normpath(selected_directory.strip())
        split_file(selected_directory, file_name="dist.zip", chunk_size_mb=9)
    else:
        print("🛑 已取消选择，未执行任何操作。")