import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // 强制让 Vite 在打包时将 onnxruntime-web 标记为外部引入（External）
    // 这样它就只会老老实实引用 CDN，绝对不会把 25MB 的本地 WASM 搬运到 dist 目录里
    rollupOptions: {
      external: [
        'onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
        'onnxruntime-web/dist/ort-wasm-simd.wasm'
      ]
    }
  }
})