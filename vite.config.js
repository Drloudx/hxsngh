import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  assetsInclude: ['**/*.onnx', '**/*.wasm'],

  build: {
    rollupOptions: {
      external: [/\.onnx$/, /\.wasm$/]
    }
  }
})
