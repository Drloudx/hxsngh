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
        // 1280x2844 阵营
        { name: '战士', url: '/images/job_03_zhan_shi.png', refW: 1280 },
        { name: '牧师', url: '/images/job_04_mu_shi.png', refW: 1280 },
        { name: '神灵', url: '/images/race_01_shen_ling.png', refW: 1280 },
        // 1224x2688 阵营
        { name: '传说', url: '/images/star_01_chuan_shuo.png', refW: 1224 },
        { name: '星界', url: '/images/region_01_xing_jie.png', refW: 1224 },
        { name: '暗系', url: '/images/ele_02_an.png', refW: 1224 },
        { name: '魔灵', url: '/images/race_03_mo_ling.png', refW: 1224 },
        // 1116 阵营
        { name: '器灵', url: '/images/race_04_qi_ling.png', refW: 1116 },
        // 1064 阵营
        { name: '地系', url: '/images/ele_04_di.png', refW: 1064 }


    ];
    this.templateMats = {};
    this.isInitialized = false;
    // 💡 升级：将全局基准提到 1080 宽。在 1080 像素下，去均值算法能清晰抓住字体边缘
    this.referenceWidth = 1080;
  }

  async init() {
    if (this.isInitialized) return;

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

        const scale = this.referenceWidth / item.refW;
        const scaledMat = new window.cv.Mat();
        const newSize = new window.cv.Size(
          Math.max(1, Math.floor(rawMat.cols * scale)),
          Math.max(1, Math.floor(rawMat.rows * scale))
        );

        window.cv.resize(rawMat, scaledMat, newSize, 0, 0, window.cv.INTER_AREA);
        this.templateMats[item.name] = scaledMat;

        rawMat.delete();
        console.log(`📏 模板预热: ${item.name} 对齐至 1080 基准`);
      } catch (err) {
        console.warn(`⚠️ 模板加载失败: ${item.name}`, err);
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

    const scale = this.referenceWidth / rawSrc.cols;
    const src = new window.cv.Mat();
    const newSize = new window.cv.Size(this.referenceWidth, Math.floor(rawSrc.rows * scale));
    window.cv.resize(rawSrc, src, newSize, 0, 0, window.cv.INTER_LINEAR);
    rawSrc.delete();

    const matchedTags = [];
    const debugLogs = [];

    // 局部裁剪（ROI）
    const roiRect = new window.cv.Rect(
      Math.floor(src.cols * 0.2),
      Math.floor(src.rows * 0.35),
      Math.floor(src.cols * 0.6),
      Math.floor(src.rows * 0.35)
    );
    const roi = src.roi(roiRect);

    const dst = new window.cv.Mat();
    const emptyMask = new window.cv.Mat();

    // 💡 核心修正：死死锁定对边框/纯色极度免疫、只看文字图案轮廓的 TM_CCOEFF_NORMED 算法
    const algo = window.cv.TM_CCOEFF_NORMED;

    const entries = Object.entries(this.templateMats);
    let loopCount = 0;

    for (const [name, templ] of entries) {
      try {
        loopCount++;
        // 每 3 个标签让出 1ms 呼吸时间
        if (loopCount % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        window.cv.matchTemplate(roi, templ, dst, algo, emptyMask);
        const result = window.cv.minMaxLoc(dst, emptyMask);

        // 💡 重点：换回相关系数算法后，没有出现的标签分值会直接暴跌。
        // 我们把及格线严厉地卡在 0.82。只有真正存在的标签才能越过这条线！
        if (result.maxVal > 0.82) {
          matchedTags.push(name);
          debugLogs.push(`匹配成功: ${name} (系数: ${result.maxVal.toFixed(2)})`);
        }
      } catch (e) {
        console.error(`匹配 ${name} 时出错:`, e);
      }
    }

    // 垃圾回收
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