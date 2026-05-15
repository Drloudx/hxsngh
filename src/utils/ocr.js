import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';
ort.env.wasm.numThreads = 1; 

export class OCRService {
  constructor() {
    this.detSession = null;
    this.recSession = null;
    this.keys = [];
    this.initPromise = null;
    this.isProcessing = false; // 任务锁
  }

  async init() {
    if (!this.initPromise) {
      this.initPromise = this._internalInit();
    }
    return this.initPromise;
  }

  async _internalInit() {
    if (!window.cv || !window.cv.Mat) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (window.cv && window.cv.Mat) { clearInterval(check); resolve(); }
        }, 50);
      });
    }

    try {
      const [detModel, recModel, keysText] = await Promise.all([
        fetch('/ocr/det.onnx').then(res => res.arrayBuffer()),
        fetch('/ocr/rec.onnx').then(res => res.arrayBuffer()),
        fetch('/ocr/keys.txt').then(res => res.text())
      ]);

      const sessionOptions = { 
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true
      };

      this.detSession = await ort.InferenceSession.create(detModel, sessionOptions);
      this.recSession = await ort.InferenceSession.create(recModel, sessionOptions);
      this.keys = keysText.split('\n').map(k => k.trim());
      console.log('OCR 核心引擎就绪');
    } catch (e) {
      this.initPromise = null;
      throw e;
    }
  }

  /**
   * 核心识别函数
   */
  async recognizeTags(imageElement, possibleTags) {
    if (this.isProcessing) throw new Error('识别任务正在运行中，请稍候');
    this.isProcessing = true;

    try {
      await this.init();

      // --- ⚡️ 优化：使用 Canvas 进行硬件级 ROI 裁剪和初步降采样 ---
      const roiCanvas = document.createElement('canvas');
      const roiCtx = roiCanvas.getContext('2d', { alpha: false });
      
      const srcX = Math.floor(imageElement.width * 0.10);
      const srcY = Math.floor(imageElement.height * 0.30);
      const srcW = Math.floor(imageElement.width * 0.80);
      const srcH = Math.floor(imageElement.height * 0.30);

      // 将 ROI 区域长边限制在 960px，利用 Canvas 硬件加速完成第一次 Downsample
      const targetLimit = 960;
      const ratio = targetLimit / Math.max(srcW, srcH);
      const drawW = srcW * ratio;
      const drawH = srcH * ratio;
      
      roiCanvas.width = drawW;
      roiCanvas.height = drawH;
      roiCtx.imageSmoothingEnabled = true;
      roiCtx.imageSmoothingQuality = 'high';
      roiCtx.drawImage(imageElement, srcX, srcY, srcW, srcH, 0, 0, drawW, drawH);

      // 将降采样后的图像送入 OpenCV
      const src = window.cv.imread(roiCanvas);

      // 1. 文本检测 (由于已经降采样过，这里的 detect 会非常快)
      const boxes = await this.detect(src);
      
      // 2. ⚡️ 优化：严格串行识别，避免 Session 锁死
      const matchedTags = [];
      const allFoundTexts = [];

      for (const box of boxes) {
        const text = await this.recognize(src, box);
        if (text) {
          let cleanText = text.trim();
          
          // 像素风补全
          const corrections = [
              [/山肠|山月永|服|山腋|山脈/, '山脉'],
              [/也系|地票/, '地系'],
              [/磨灵|麻灵|魔壳/, '魔灵'],
              [/森材|森休|森森林/, '森林'],
              [/沙江|沙难|沙流/, '沙滩'],
              [/专说|传悦|傅说|传话/, '传说'],
              [/生员|生园/, '生灵']
          ];
          corrections.forEach(([regex, replacement]) => { cleanText = cleanText.replace(regex, replacement); });
          if (cleanText === '灵') cleanText = '魔灵';
          
          allFoundTexts.push(cleanText);

          possibleTags.forEach(tag => {
            if (cleanText === tag || (cleanText.includes(tag) && cleanText.length <= tag.length + 1)) {
              matchedTags.push(tag);
            } 
            else if (tag === '山脉' && (cleanText === '山' || cleanText === '脉')) {
              matchedTags.push(tag);
            }
            else if (tag === '沙滩' && (cleanText === '滩' || (cleanText === '沙' && !allFoundTexts.some(t => t.includes('沙漠'))))) {
              matchedTags.push(tag);
            }
            else if (tag === '传说' && (cleanText.includes('传') || cleanText.includes('说'))) {
              matchedTags.push(tag);
            }
            else if (tag === '魔灵' && (cleanText.includes('魔') || cleanText === '灵')) {
              matchedTags.push(tag);
            }
            else if (tag.endsWith('灵') && cleanText.length >= 2) {
              if (cleanText.includes(tag[0])) matchedTags.push(tag);
            }
          });
        }
      }

      src.delete();
      return { matched: [...new Set(matchedTags)], allTexts: allFoundTexts };

    } finally {
      this.isProcessing = false; // 释放锁
    }
  }

  /**
   * 文本检测
   */
  async detect(src) {
    const width = src.cols;
    const height = src.rows;
    // 由于外部已经降采样到 960，这里直接使用 640 或 480 进行进一步加速
    const targetSize = 480; 
    const ratio = targetSize / Math.max(width, height);
    const newWidth = Math.ceil((width * ratio) / 32) * 32;
    const newHeight = Math.ceil((height * ratio) / 32) * 32;

    const resized = new window.cv.Mat();
    window.cv.resize(src, resized, new window.cv.Size(newWidth, newHeight), 0, 0, window.cv.INTER_LINEAR);
    
    const size = newHeight * newWidth;
    const input = new Float32Array(3 * size);
    const data = resized.data;
    // 极致优化转换循环
    for (let i = 0; i < size; i++) {
      const j = i << 2; // i * 4
      input[i] = (data[j] * 0.003921568 - 0.485) * 4.36681; // /255, -0.485, /0.229
      input[i + size] = (data[j+1] * 0.003921568 - 0.456) * 4.46428;
      input[i + 2 * size] = (data[j+2] * 0.003921568 - 0.406) * 4.44444;
    }

    const tensor = new ort.Tensor('float32', input, [1, 3, newHeight, newWidth]);
    const output = await this.detSession.run({ [this.detSession.inputNames[0]]: tensor });
    const pred = new window.cv.Mat(newHeight, newWidth, window.cv.CV_32F);
    pred.data32F.set(output[this.detSession.outputNames[0]].data);

    const bitMap = new window.cv.Mat();
    window.cv.threshold(pred, bitMap, 0.3, 255, window.cv.THRESH_BINARY);
    bitMap.convertTo(bitMap, window.cv.CV_8U);

    const contours = new window.cv.MatVector();
    window.cv.findContours(bitMap, contours, new window.cv.Mat(), window.cv.RETR_LIST, window.cv.CHAIN_APPROX_SIMPLE);

    const boxes = [];
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      if (window.cv.contourArea(cnt) < 30) continue;
      const rect = window.cv.minAreaRect(cnt);
      const points = window.cv.rotatedRectPoints(rect);
      boxes.push(this.orderPoints(points.map(p => [p.x / (newWidth / width), p.y / (newHeight / height)])));
    }
    resized.delete(); pred.delete(); bitMap.delete(); contours.delete();
    return boxes;
  }

  /**
   * 文字识别
   */
  async recognize(src, box) {
    const padding = 3;
    const width = Math.max(
      Math.sqrt(Math.pow(box[0][0] - box[1][0], 2) + Math.pow(box[0][1] - box[1][1], 2)),
      Math.sqrt(Math.pow(box[2][0] - box[3][0], 2) + Math.pow(box[2][1] - box[3][1], 2))
    ) + padding * 2;
    const height = Math.max(
      Math.sqrt(Math.pow(box[0][0] - box[3][0], 2) + Math.pow(box[0][1] - box[3][1], 2)),
      Math.sqrt(Math.pow(box[1][0] - box[2][0], 2) + Math.pow(box[1][1] - box[2][1], 2))
    ) + padding * 2;

    if (height > width * 1.5 || width < 10) return null;

    const dstPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
    const srcPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, box.flat());
    const M = window.cv.getPerspectiveTransform(srcPoints, dstPoints);
    const warped = new window.cv.Mat();
    window.cv.warpPerspective(src, warped, M, new window.cv.Size(width, height));

    // 高质量识别预处理
    const enhanced = new window.cv.Mat();
    warped.convertTo(enhanced, -1, 1.3, 15);
    const sharpened = new window.cv.Mat();
    const kernel = window.cv.matFromArray(3, 3, window.cv.CV_32F, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
    window.cv.filter2D(enhanced, sharpened, -1, kernel);

    const recHeight = 48;
    const recWidth = Math.floor(width * (recHeight / height));
    const resized = new window.cv.Mat();
    // 强制使用高质量插值
    window.cv.resize(sharpened, resized, new window.cv.Size(recWidth, recHeight), 0, 0, window.cv.INTER_CUBIC);

    const size = recHeight * recWidth;
    const input = new Float32Array(3 * size);
    const data = resized.data;
    for (let i = 0; i < size; i++) {
      const j = i << 2;
      input[i] = (data[j] * 0.003921568 - 0.5) * 2; // (x/255 - 0.5) / 0.5
      input[i + size] = (data[j+1] * 0.003921568 - 0.5) * 2;
      input[i + 2 * size] = (data[j+2] * 0.003921568 - 0.5) * 2;
    }

    const tensor = new ort.Tensor('float32', input, [1, 3, recHeight, recWidth]);
    const output = await this.recSession.run({ [this.recSession.inputNames[0]]: tensor });
    const logits = output[this.recSession.outputNames[0]].data;
    const dims = output[this.recSession.outputNames[0]].dims;

    let text = '';
    let lastIdx = -1;
    for (let t = 0; t < dims[1]; t++) {
      let maxProb = -1, maxIdx = -1;
      const offset = t * dims[2];
      for (let c = 0; c < dims[2]; c++) {
        const p = logits[offset + c];
        if (p > maxProb) { maxProb = p; maxIdx = c; }
      }
      if (maxIdx > 0 && maxIdx !== lastIdx && maxIdx < this.keys.length) {
        text += this.keys[maxIdx - 1];
      }
      lastIdx = maxIdx;
    }

    dstPoints.delete(); srcPoints.delete(); M.delete(); warped.delete(); 
    enhanced.delete(); sharpened.delete(); kernel.delete(); resized.delete();
    return text;
  }

  orderPoints(pts) {
    const rect = new Array(4);
    const s = pts.map(p => p[0] + p[1]);
    rect[0] = pts[s.indexOf(Math.min(...s))];
    rect[2] = pts[s.indexOf(Math.max(...s))];
    const diff = pts.map(p => p[1] - p[0]);
    rect[1] = pts[diff.indexOf(Math.min(...diff))];
    rect[3] = pts[diff.indexOf(Math.max(...diff))];
    return rect;
  }
}
