import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  // 关键改动：改为相对路径，适配 Cloudflare Pages 根目录部署
  base: './', 
  plugins: [
    vue(),
    {
      name: 'cleanup-wasm',
      closeBundle() {
        const distAssets = path.resolve(__dirname, 'dist/assets');
        if (fs.existsSync(distAssets)) {
          const files = fs.readdirSync(distAssets);
          files.forEach(file => {
            if (file.endsWith('.wasm')) {
              fs.unlinkSync(path.join(distAssets, file));
              console.log(`已强制删除超大文件: ${file}`);
            }
          });
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  }
})
