import os
import csv
import cv2
import numpy as np
import tkinter as tk
from tkinter import filedialog, ttk


class MarblingApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("牛肉マーブリング判定アプリ")
        self.geometry("700x400")

        # HSV threshold variables
        self.h_low = tk.IntVar(value=0)
        self.s_low = tk.IntVar(value=0)
        self.v_low = tk.IntVar(value=200)
        self.h_high = tk.IntVar(value=180)
        self.s_high = tk.IntVar(value=60)
        self.v_high = tk.IntVar(value=255)

        self.images = []
        self.results = []

        self.create_widgets()

    def create_widgets(self):
        control_frame = tk.Frame(self)
        control_frame.pack(side=tk.TOP, fill=tk.X)
        select_btn = tk.Button(control_frame, text="画像選択", command=self.load_images)
        select_btn.pack(side=tk.LEFT, padx=5, pady=5)
        save_btn = tk.Button(control_frame, text="CSV保存", command=self.save_csv)
        save_btn.pack(side=tk.LEFT, padx=5, pady=5)

        slider_frame = tk.LabelFrame(self, text="HSV閾値")
        slider_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        self.add_slider(slider_frame, "H最小", self.h_low, 0, 180)
        self.add_slider(slider_frame, "H最大", self.h_high, 0, 180)
        self.add_slider(slider_frame, "S最小", self.s_low, 0, 255)
        self.add_slider(slider_frame, "S最大", self.s_high, 0, 255)
        self.add_slider(slider_frame, "V最小", self.v_low, 0, 255)
        self.add_slider(slider_frame, "V最大", self.v_high, 0, 255)

        self.tree = ttk.Treeview(self, columns=("file", "fat"), show="headings")
        self.tree.heading("file", text="画像名")
        self.tree.heading("fat", text="脂肪率(%)")
        self.tree.bind("<Double-1>", self.show_mask)
        self.tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

    def add_slider(self, frame, text, var, frm, to):
        row = tk.Frame(frame)
        row.pack(fill=tk.X)
        label = tk.Label(row, text=text, width=7)
        label.pack(side=tk.LEFT)
        slider = tk.Scale(row, from_=frm, to=to, orient=tk.HORIZONTAL, variable=var, command=lambda e: self.update_all())
        slider.pack(side=tk.LEFT, fill=tk.X, expand=True)

    def load_images(self):
        paths = filedialog.askopenfilenames(filetypes=[("Images", "*.jpg *.png *.jpeg")])
        if not paths:
            return
        self.images = list(paths)
        self.update_all()

    def update_all(self):
        self.tree.delete(*self.tree.get_children())
        self.results = []
        for path in self.images:
            fat_pct = self.process_image(path)
            self.results.append((os.path.basename(path), fat_pct))
            self.tree.insert("", tk.END, values=(os.path.basename(path), f"{fat_pct:.2f}"))

    def create_mask(self, path):
        img = cv2.imread(path)
        if img is None:
            return None
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lower = np.array([
            self.h_low.get(),
            self.s_low.get(),
            self.v_low.get(),
        ])
        upper = np.array([
            self.h_high.get(),
            self.s_high.get(),
            self.v_high.get(),
        ])
        mask = cv2.inRange(hsv, lower, upper)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask

    def process_image(self, path):
        mask = self.create_mask(path)
        if mask is None:
            return 0.0
        fat_area = np.count_nonzero(mask)
        total_area = mask.shape[0] * mask.shape[1]
        return (fat_area / total_area) * 100 if total_area else 0.0

    def show_mask(self, event):
        item = self.tree.identify_row(event.y)
        if not item:
            return
        index = self.tree.index(item)
        path = self.images[index]
        mask = self.create_mask(path)
        if mask is None:
            return
        cv2.imshow("Mask", mask)
        cv2.waitKey(1)

    def save_csv(self):
        if not self.results:
            return
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV", "*.csv")])
        if not path:
            return
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["画像名", "脂肪率(%)"])
            for name, pct in self.results:
                writer.writerow([name, f"{pct:.2f}"])


if __name__ == "__main__":
    app = MarblingApp()
    app.mainloop()
