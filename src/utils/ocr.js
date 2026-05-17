import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';
// 限制为 1 个线程以确保在所有浏览器环境下的绝对稳定性，配合串行识别
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
      console.log('🚀 开始并行下载模型碎片...');

      // 1. 对应你 public/ocr/ 下实际的 5 个碎片文件名
      const detParts = ['det_part_00', 'det_part_01', 'det_part_02', 'det_part_03', 'det_part_04'];
      const recParts = ['rec_part_00', 'rec_part_01', 'rec_part_02', 'rec_part_03', 'rec_part_04'];

      // 2. 使用纯相对路径并发下载，无跨域问题，速度拉满
      const [detBuffers, recBuffers, keysText] = await Promise.all([
        Promise.all(detParts.map(part => fetch(`/ocr/${part}`).then(res => {
          if (!res.ok) throw new Error(`碎片 ${part} 下载失败`);
          return res.arrayBuffer();
        }))),
        Promise.all(recParts.map(part => fetch(`/ocr/${part}`).then(res => {
          if (!res.ok) throw new Error(`碎片 ${part} 下载失败`);
          return res.arrayBuffer();
        }))),
        fetch('/ocr/keys.txt').then(res => res.text())
      ]);

      console.log('📦 碎片下载完成，开始内存拼装...');

      // 3. 动态拼接 det.onnx 的二进制流
      const totalDetLength = detBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
      const detBuffer = new Uint8Array(totalDetLength);
      let detOffset = 0;
      for (const buf of detBuffers) {
        detBuffer.set(new Uint8Array(buf), detOffset);
        detOffset += buf.byteLength;
      }

      // 4. 动态拼接 rec.onnx 的二进制流
      const totalRecLength = recBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
      const recBuffer = new Uint8Array(totalRecLength);
      let recOffset = 0;
      for (const buf of recBuffers) {
        recBuffer.set(new Uint8Array(buf), recOffset);
        recOffset += buf.byteLength;
      }

      const sessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true
      };

      // 5. 将组装回来的完整 ArrayBuffer 塞给 ONNX Runtime
      this.detSession = await ort.InferenceSession.create(detBuffer.buffer, sessionOptions);
      this.recSession = await ort.InferenceSession.create(recBuffer.buffer, sessionOptions);
      this.keys = keysText.split('\n').map(k => k.trim());

      console.log('🎉 OCR 核心引擎组装成功并就绪！');
    } catch (e) {
      console.error('❌ OCR 初始化失败:', e);
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
      if (!imageElement.complete || imageElement.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          imageElement.onload = () => resolve();
          imageElement.onerror = () => reject(new Error('图片加载失败，无法进行 OCR 识别'));
        });
      }

      await this.init();

      const roiCanvas = document.createElement('canvas');
      const roiCtx = roiCanvas.getContext('2d', { alpha: false });

      const srcX = Math.floor(imageElement.width * 0.10);
      const srcY = Math.floor(imageElement.height * 0.30);
      const srcW = Math.floor(imageElement.width * 0.80);
      const srcH = Math.floor(imageElement.height * 0.30);

      const targetLimit = 960;
      const ratio = targetLimit / Math.max(srcW, srcH);
      const drawW = srcW * ratio;
      const drawH = srcH * ratio;

      roiCanvas.width = drawW;
      roiCanvas.height = drawH;
      roiCtx.imageSmoothingEnabled = true;
      roiCtx.imageSmoothingQuality = 'high';
      roiCtx.drawImage(imageElement, srcX, srcY, srcW, srcH, 0, 0, drawW, drawH);

      const src = window.cv.imread(roiCanvas);

      const boxes = await this.detect(src);

      const matchedTags = [];
      const allFoundTexts = [];

      for (const box of boxes) {
        const text = await this.recognize(src, box);
        if (text) {
          let cleanText = text.trim();

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
            else if (tag === '星界' && (cleanText.includes('星') || cleanText.includes('界'))) {
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
      this.isProcessing = false;
    }
  }

  /**
   * 文本检测
   */
  async detect(src) {
    const width = src.cols;
    const height = src.rows;
    const targetSize = 480;
    const ratio = targetSize / Math.max(width, height);
    const newWidth = Math.ceil((width * ratio) / 32) * 32;
    const newHeight = Math.ceil((height * ratio) / 32) * 32;

    const resized = new window.cv.Mat();
    window.cv.resize(src, resized, new window.cv.Size(newWidth, newHeight), 0, 0, window.cv.INTER_LINEAR);

    const size = newHeight * newWidth;
    const input = new Float32Array(3 * size);
    const data = resized.data;
    for (let i = 0; i < size; i++) {
      const j = i << 2;
      input[i] = (data[j] * 0.003921568 - 0.485) * 4.36681;
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
   * 文字识别（已移除对比度增强与拉普拉斯锐化高耗能算法）
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

    // 💡 核心优化点：直接跳过旧代码中的 enhanced 和 sharpened 图像矩阵计算
    const recHeight = 48;
    const recWidth = Math.floor(width * (recHeight / height));
    const resized = new window.cv.Mat();

    // 直接传入透视变换后的原始切片 warped
    window.cv.resize(warped, resized, new window.cv.Size(recWidth, recHeight), 0, 0, window.cv.INTER_CUBIC);

    const size = recHeight * recWidth;
    const input = new Float32Array(3 * size);
    const data = resized.data;
    for (let i = 0; i < size; i++) {
      const j = i << 2;
      input[i] = (data[j] * 0.003921568 - 0.5) * 2;
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

    // 💡 清理内存：仅销毁实际开辟的本地矩阵，防止单线程 GC 阻塞
    dstPoints.delete(); srcPoints.delete(); M.delete(); warped.delete(); resized.delete();
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