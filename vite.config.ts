import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-unbundled-assets-and-admin-pwa',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // Generate GitHub Pages SPA 404 fallback and Admin-only PWA HTML shell
          const indexHtmlPath = path.join(distDir, 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
            fs.writeFileSync(path.join(distDir, '404.html'), indexHtml);

            const adminDir = path.join(distDir, 'admin');
            fs.mkdirSync(adminDir, {recursive: true});
            const adminHeadTags = `
    <link rel="manifest" href="/admin-manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Inaya Admin" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="robots" content="noindex, nofollow" />`;
            const adminHtml = indexHtml.replace('</head>', `${adminHeadTags}\n  </head>`);
            fs.writeFileSync(path.join(adminDir, 'index.html'), adminHtml);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
