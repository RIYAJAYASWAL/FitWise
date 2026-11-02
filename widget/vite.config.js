import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
  const publishableKey = env.VITE_PUBLISHABLE_KEY || 'fw_pub_demo_984f1a23c7e0';

  return {
    plugins: [
      react(),
      {
        name: 'fitwise-demo-html-plugin',
        // In dev server, intercept demo.html requests to inject env vars and live entry
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const urlPath = req.url?.split('?')[0];
            if (urlPath === '/' || urlPath === '/demo.html') {
              const demoPath = path.resolve(__dirname, 'public/demo.html');
              if (fs.existsSync(demoPath)) {
                let content = fs.readFileSync(demoPath, 'utf-8');
                content = content
                  .replace(/%VITE_API_URL%/g, apiUrl)
                  .replace(/%VITE_PUBLISHABLE_KEY%/g, publishableKey)
                  .replace(/\.\/fitwise\.js/g, '/src/embed.js');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(content);
                return;
              }
            }
            next();
          });
        },
        // In build mode, copy and transform public/demo.html into dist/demo.html
        closeBundle() {
          const publicDemoPath = path.resolve(__dirname, 'public/demo.html');
          const distDir = path.resolve(__dirname, 'dist');
          const distDemoPath = path.resolve(distDir, 'demo.html');
          if (fs.existsSync(publicDemoPath)) {
            if (!fs.existsSync(distDir)) {
              fs.mkdirSync(distDir, { recursive: true });
            }
            let content = fs.readFileSync(publicDemoPath, 'utf-8');
            content = content
              .replace(/%VITE_API_URL%/g, apiUrl)
              .replace(/%VITE_PUBLISHABLE_KEY%/g, publishableKey);
            fs.writeFileSync(distDemoPath, content, 'utf-8');
          }
        },
      },
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/embed.js'),
        name: 'FitWise',
        formats: ['iife'],
        fileName: () => 'fitwise.js',
      },
      outDir: 'dist',
      emptyOutDir: true,
      cssCodeSplit: false,
      rollupOptions: {
        // Self-contained: React & ReactDOM are bundled directly into fitwise.js (NOT externalized)
        output: {
          format: 'iife',
          name: 'FitWise',
          exports: 'named',
          entryFileNames: 'fitwise.js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'fitwise.css';
            return '[name][extname]';
          },
        },
      },
    },
  };
});
