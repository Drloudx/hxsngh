import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: '/hxsngh/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 👇 关键配置：强制不打包 wasm 文件
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      external: [/onnxruntime-web/, /ort-wasm/]
    }
  }
})
