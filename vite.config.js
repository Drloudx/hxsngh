import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// 自定义微型插件：在打包完成后强行粉碎指定的大体积 WASM 文件
const removeBigWasmPlugin = () => {
  return {
    name: 'remove-big-wasm',
    closeBundle() {
      try {
        // 锁定打包输出的 dist/assets 目录
        const assetsDir = path.resolve(__dirname, 'dist/assets');
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          // 寻找那个该死的 ort-wasm-simd-threaded 巨型文件
          const targetFile = files.find(f => f.startsWith('ort-wasm-simd-threaded') && f.endsWith('.wasm'));

          if (targetFile) {
            const targetPath = path.join(assetsDir, targetFile);
            fs.unlinkSync(targetPath); // 物理删除
            console.log(`\n🔥 [Success] 已强行粉碎大体积资产文件: ${targetFile}，Cloudflare 警报解除！\n`);
          }
        }
      } catch (err) {
        console.error('删除大体积 WASM 失败，不过没关系:', err);
      }
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    removeBigWasmPlugin() // 挂载粉碎机插件
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // 提升代码块大小警告限制，防止报别的小警告
    chunkSizeWarningLimit: 2000
  }
})