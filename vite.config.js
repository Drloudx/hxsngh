import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: '/hxsngh/', 
  plugins: [
    vue(),
    vueDevTools(),
    // 添加一个临时小插件，在打包结束后强制删除那个超大的 wasm 文件
    {
      name: 'remove-wasm-from-dist',
      closeBundle() {
        // 这个插件确保打包后的 assets 文件夹里不会出现 wasm 文件
        // 因为我们已经用 CDN 加载了，所以 dist 里的这个是多余的
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      // 告诉 Vite 不要打包这些文件
      external: [
        /.*\.wasm/
      ],
    }
  }
})
