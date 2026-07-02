export class ImageMatcher {
  constructor() {
    this.templates = [
          // 1440x3200
          { name: '射手', url: './images/job_01_shes_hou.png', refW: 1440 },
          { name: '法师', url: './images/job_02_fa_shi.png', refW: 1440 },
          { name: '光系', url: './images/ele_01_guang.png', refW: 1440 },
          { name: '风系', url: './images/ele_03_feng.png', refW: 1440 },
          { name: '火系', url: './images/ele_05_huo.png', refW: 1440 },
          { name: '水系', url: './images/ele_06_shui.png', refW: 1440 },
          { name: '平原', url: './images/region_02_ping_yuan.png', refW: 1440 },
          { name: '森林', url: './images/region_03_sen_lin.png', refW: 1440 },
          { name: '沙滩', url: './images/region_04_sha_tan.png', refW: 1440 },
          { name: '海洋', url: './images/region_05_hai_yang.png', refW: 1440 },
          { name: '山脉', url: './images/region_06_shan_mai.png', refW: 1440 },
          { name: '沙漠', url: './images/region_08_sha_mo.png', refW: 1440 },
          { name: '生灵', url: './images/race_02_sheng_ling.png', refW: 1440 },
          { name: '亡灵', url: './images/race_05_wang_ling.png', refW: 1440 },
          // 1280x2844
          { name: '战士', url: './images/job_03_zhan_shi.png', refW: 1280 },
          { name: '牧师', url: './images/job_04_mu_shi.png', refW: 1280 },
          { name: '神灵', url: './images/race_01_shen_ling.png', refW: 1280 },
          { name: '史诗', url: './images/star_02_shi_shi.png', refW: 1280 },
          // 1224x2688
          { name: '传说', url: './images/star_01_chuan_shuo.png', refW: 1224 },
          { name: '星界', url: './images/region_01_xing_jie.png', refW: 1224 },
          { name: '暗系', url: './images/ele_02_an.png', refW: 1224 },
          { name: '魔灵', url: './images/race_03_mo_ling.png', refW: 1224 },
          // 1116
          { name: '器灵', url: './images/race_04_qi_ling.png', refW: 1116 },
          // 1080*2400
          { name: '雪原', url: './images/region_07_xue_yuan.png', refW: 1080 },
          // 1084*2412
          { name: '火山', url: './images/region_08_huo_shan.png', refW: 1080 },
          // 1064
          { name: '地系', url: './images/ele_04_di.png', refW: 1064 }
        ];
    this.templateMats = {};
    this.isInitialized = false;
    this.initPromise = null;
    this.referenceWidth = 800; // 降低基准分辨率，显著提升性能
  }

  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log('📦 ImageMatcher: 开始预热...');

      const loadPromises = this.templates.map(async (item) => {
        try {
          const img = await this.loadImage(item.url);
          return { name: item.name, img, refW: item.refW };
        } catch (err) {
          console.error(`❌ 模板下载失败: ${item.name}`, err);
          return null;
        }
      });

      if (!window.cv || !window.cv.Mat) {
        console.log('⏳ ImageMatcher: 等待本地 OpenCV.js 就绪...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            clearInterval(check);
            reject(new Error("本地 OpenCV.js 加载超时。请确认 public/opencv.js 文件存在。"));
          }, 15000);

          const check = setInterval(() => {
            if (window.cv && window.cv.Mat) {
              clearInterval(check);
              clearTimeout(timeout);
              resolve();
            }
          }, 50);
        });
      }

      console.log('✅ OpenCV.js 已就绪，开始处理模板矩阵...');

      const results = await Promise.all(loadPromises);
      
      for (const res of results) {
        if (!res) continue;
        try {
          const { name, img, refW } = res;
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const rawMat = window.cv.imread(canvas);
          const scale = this.referenceWidth / refW;
          const scaledMat = new window.cv.Mat();
          const newSize = new window.cv.Size(
            Math.max(1, Math.floor(rawMat.cols * scale)),
            Math.max(1, Math.floor(rawMat.rows * scale))
          );

          window.cv.resize(rawMat, scaledMat, newSize, 0, 0, window.cv.INTER_AREA);
          
          // 优化：灰度化处理，减少计算量并抗干扰
          const grayMat = new window.cv.Mat();
          window.cv.cvtColor(scaledMat, grayMat, window.cv.COLOR_RGBA2GRAY);
          this.templateMats[name] = grayMat;

          scaledMat.delete();
          rawMat.delete();
          console.log(`📏 模板就绪: ${name}`);
        } catch (err) {
          console.warn(`⚠️ 模板矩阵处理失败: ${res.name}`, err);
        }
      }

      this.isInitialized = true;
      console.log('✨ ImageMatcher: 引擎完全就绪');
    })();

    return this.initPromise;
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  async match(imageElement) {
    if (!this.isInitialized) await this.init();

    const rawSrc = window.cv.imread(imageElement);

    const scale = this.referenceWidth / rawSrc.cols;
    const src = new window.cv.Mat();
    const newSize = new window.cv.Size(this.referenceWidth, Math.floor(rawSrc.rows * scale));
    window.cv.resize(rawSrc, src, newSize, 0, 0, window.cv.INTER_LINEAR);
    rawSrc.delete();

    const matchedTags = [];
    const debugLogs = [];

    const roiRect = new window.cv.Rect(
      Math.floor(src.cols * 0.2),
      Math.floor(src.rows * 0.35),
      Math.floor(src.cols * 0.6),
      Math.floor(src.rows * 0.35)
    );
    const roiRaw = src.roi(roiRect);
    
    // 优化：ROI 灰度化，匹配灰度模板
    const roi = new window.cv.Mat();
    window.cv.cvtColor(roiRaw, roi, window.cv.COLOR_RGBA2GRAY);
    roiRaw.delete();

    const dst = new window.cv.Mat();
    const emptyMask = new window.cv.Mat();
    const algo = window.cv.TM_CCOEFF_NORMED;

    const entries = Object.entries(this.templateMats);

    for (const [name, templ] of entries) {
      try {
        window.cv.matchTemplate(roi, templ, dst, algo, emptyMask);
        const result = window.cv.minMaxLoc(dst, emptyMask);

        if (result.maxVal > 0.82) {
          matchedTags.push(name);
          debugLogs.push(`匹配成功: ${name} (系数: ${result.maxVal.toFixed(2)})`);
        }
      } catch (e) {
        console.error(`匹配 ${name} 时出错:`, e);
      }
    }

    dst.delete();
    emptyMask.delete();
    roi.delete();
    src.delete();

    if (debugLogs.length > 0) {
      console.log(debugLogs.join('\n'));
    }

    return {
      matched: [...new Set(matchedTags)]
    };
    }
    }

    export const imageMatcher = new ImageMatcher()