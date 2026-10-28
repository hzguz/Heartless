import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@codemirror') || id.includes('@lezer') || id.includes('@replit/codemirror')) {
              return 'vendor-codemirror';
            }
            if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('tiptap-markdown') || id.includes('markdown-it') || id.includes('linkifyjs')) {
              return 'vendor-tiptap';
            }
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'vendor-motion';
            }
          }
          return undefined;
        },
      },
    },
  },
});
