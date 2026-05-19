export class ImageMatcher {
  constructor() {
    this.templates = [
        // 1440x3200 阵营
        { name: '射手', url: '/images/job_01_shes_hou.png', refW: 1440 },
        { name: '法师', url: '/images/job_02_fa_shi.png', refW: 1440 },
        { name: '光系', url: '/images/ele_01_guang.png', refW: 1440 },
        { name: '风系', url: '/images/ele_03_feng.png', refW: 1440 },
        { name: '火系', url: '/images/ele_05_huo.png', refW: 1440 },
        { name: '水系', url: '/images/ele_06_shui.png', refW: 1440 },
        { name: '平原', url: '/images/region_02_ping_yuan.png', refW: 1440 },
        { name: '森林', url: '/images/region_03_sen_lin.png', refW: 1440 },
        { name: '沙滩', url: '/images/region_04_sha_tan.png', refW: 1440 },
        { name: '海洋', url: '/images/region_05_hai_yang.png', refW: 1440 },
        { name: '山脉', url: '/images/region_06_shan_mai.png', refW: 1440 },
        { name: '沙漠', url: '/images/region_08_sha_mo.png', refW: 1440 },
        { name: '生灵', url: '/images/race_02_sheng_ling.png', refW: 1440 },
        { name: '亡灵', url: '/images/race_05_wang_ling.png', refW: 1440 },
        // 1280x2844(需要缩放对齐)
        { name: '战士', url: '/images/job_03_zhan_shi.png', refW: 1280 },
        { name: '牧师', url: '/images/job_04_mu_shi.png', refW: 1280 },
        { name: '神灵', url: '/images/race_01_shen_ling.png', refW: 1280 },
        // 1224x2688(需要缩放对齐)
        { name: '传说', url: '/images/star_01_chuan_shuo.png', refW: 1224 },
        { name: '星界', url: '/images/region_01_xing_jie.png', refW: 1224 },
        { name: '暗系', url: '/images/ele_02_an.png', refW: 1224 },
        { name: '魔灵', url: '/images/race_03_mo_ling.png', refW: 1224 },
        // 1224x2688(需要缩放对齐)

        { name: '器灵', url: '/images/race_04_qi_ling.png', refW: 1116 }



    ];
    this.templateMats = {};
    this.isInitialized = false;
    this.referenceWidth = 1440; // 统一归一化到 1440 宽度
  }

  async init() {
    if (this.isInitialized) return;
    
    // 等待 OpenCV 加载
    if (!window.cv || !window.cv.Mat) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    const loadPromises = this.templates.map(async (item) => {
      try {
        const img = await this.loadImage(item.url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const rawMat = window.cv.imread(canvas);
        
        // 💡 关键修正：如果模板的参考宽度不是 1440，将其缩放到 1440 下应有的大小
        if (item.refW !== this.referenceWidth) {
          const scale = this.referenceWidth / item.refW;
          const scaledMat = new window.cv.Mat();
          const newSize = new window.cv.Size(Math.floor(rawMat.cols * scale), Math.floor(rawMat.rows * scale));
          window.cv.resize(rawMat, scaledMat, newSize, 0, 0, window.cv.INTER_AREA);
          this.templateMats[item.name] = scaledMat;
          rawMat.delete();
          console.log(`📏 模板缩放成功: ${item.name} (${item.refW} -> ${this.referenceWidth})`);
        } else {
          this.templateMats[item.name] = rawMat;
          console.log(`✅ 模板加载成功: ${item.name}`);
        }
      } catch (err) {
        console.warn(`⚠️ 模板加载失败: ${item.name}, URL: ${item.url}`);
      }
    });

    await Promise.all(loadPromises);
    this.isInitialized = true;
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  async match(imageElement) {
    if (!this.isInitialized) await this.init();

    const rawSrc = window.cv.imread(imageElement);
    
    // 分辨率归一化：所有上传图都缩放到 1440 宽进行匹配
    const scale = this.referenceWidth / rawSrc.cols;
    const src = new window.cv.Mat();
    const newSize = new window.cv.Size(this.referenceWidth, Math.floor(rawSrc.rows * scale));
    window.cv.resize(rawSrc, src, newSize, 0, 0, window.cv.INTER_LINEAR);
    rawSrc.delete();

    const matchedTags = [];
    
    // 🎯 用户自定义 ROI 区域 (基于缩放后的 1440px 图像)
    const roiRect = new window.cv.Rect(
      Math.floor(src.cols * 0.2), 
      Math.floor(src.rows * 0.35), 
      Math.floor(src.cols * 0.6), 
      Math.floor(src.rows * 0.35)
    );
    const roi = src.roi(roiRect);

    // 遍历所有已加载的模板进行匹配
    for (const [name, templ] of Object.entries(this.templateMats)) {
      const dst = new window.cv.Mat();
      const mask = new window.cv.Mat();
      
      try {
        window.cv.matchTemplate(roi, templ, dst, window.cv.TM_CCOEFF_NORMED, mask);
        const result = window.cv.minMaxLoc(dst, mask);
        
        // 阈值设定为 0.7，兼顾准确度与不同分辨率模板缩放后的容错性
        if (result.maxVal > 0.75) {
          matchedTags.push(name);
          console.log(`🎯 匹配成功: ${name} (置信度: ${result.maxVal.toFixed(2)})`);
        }
      } catch (e) {
        console.error(`匹配 ${name} 时出错:`, e);
      } finally {
        dst.delete();
        mask.delete();
      }
    }

    roi.delete();
    src.delete();

    return {
      matched: [...new Set(matchedTags)]
    };
  }
}
