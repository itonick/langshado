import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 個人利用・静的ホスティング前提。base はサブパス配信にも耐えるよう相対指定。
export default defineConfig({
  base: './',
  plugins: [react()],
});
