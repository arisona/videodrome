import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'src/renderer/editor.html'),
        output: resolve(__dirname, 'src/renderer/output.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '../shared': resolve(__dirname, 'src/shared'),
    },
  },
  define: {
    global: 'globalThis',
  },
  plugins: [
    {
      // this would be needed for watching renderer process local files in dev mode
      // watching is currently not working properly, but leaving this here for future reference
      name: 'local-file-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Intercept requests for local files and serve them
          if (req.url?.startsWith('/@local-file/')) {
            const filePath = decodeURIComponent(req.url.slice('/@local-file/'.length));
            try {
              const content = readFileSync(filePath);
              const ext = filePath.split('.').pop()?.toLowerCase();
              const mimeTypes: Record<string, string> = {
                gif: 'image/gif',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                webp: 'image/webp',
                mp4: 'video/mp4',
                webm: 'video/webm',
              };
              res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
            } catch (error) {
              res.statusCode = 404;
              res.end('File not found');
            }
          } else {
            next();
          }
        });
      },
    },
  ],
});
