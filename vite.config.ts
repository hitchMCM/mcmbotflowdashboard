import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "https";
import http from "http";

/**
 * Vite plugin: server-side proxy for uploading media to Meta's Resumable Upload API.
 * Avoids CORS issues by running the fetch+upload on the Node server side.
 * 
 * POST /meta-upload  { imageUrl, accessToken, mimeType }
 * Returns { success, handle } or { success: false, error }
 */
function metaUploadProxy(): Plugin {
  return {
    name: 'meta-upload-proxy',
    configureServer(server) {
      server.middlewares.use('/meta-upload', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          return;
        }

        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let params: { imageUrl: string; accessToken: string; mimeType: string };
        try {
          params = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
          return;
        }

        const { imageUrl, accessToken, mimeType = 'image/png' } = params;
        if (!imageUrl || !accessToken) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing imageUrl or accessToken' }));
          return;
        }

        try {
          console.log('[meta-upload-proxy] Downloading image:', imageUrl);

          // Step 1: Download the image (server-side, no CORS)
          const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
            const client = imageUrl.startsWith('https') ? https : http;
            client.get(imageUrl, (imgRes) => {
              // Follow redirects
              if (imgRes.statusCode && imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
                const redirectClient = imgRes.headers.location.startsWith('https') ? https : http;
                redirectClient.get(imgRes.headers.location, (redirectRes) => {
                  const chunks: Buffer[] = [];
                  redirectRes.on('data', (chunk: Buffer) => chunks.push(chunk));
                  redirectRes.on('end', () => resolve(Buffer.concat(chunks)));
                  redirectRes.on('error', reject);
                });
                return;
              }
              const chunks: Buffer[] = [];
              imgRes.on('data', (chunk: Buffer) => chunks.push(chunk));
              imgRes.on('end', () => resolve(Buffer.concat(chunks)));
              imgRes.on('error', reject);
            }).on('error', reject);
          });

          console.log('[meta-upload-proxy] Downloaded:', imageBuffer.length, 'bytes');

          // Step 2: Create upload session on Meta
          const sessionUrl = `https://graph.facebook.com/v25.0/app/uploads?file_length=${imageBuffer.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${encodeURIComponent(accessToken)}`;
          const sessionData = await fetchJson(sessionUrl, 'POST');
          console.log('[meta-upload-proxy] Session:', JSON.stringify(sessionData));

          if (!sessionData.id) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `Upload session failed: ${sessionData.error?.message || JSON.stringify(sessionData)}` }));
            return;
          }

          // Step 3: Upload binary data
          // The session ID contains ?sig=... which MUST be preserved as part of the URL path+query
          const uploadUrl = `https://graph.facebook.com/v25.0/${sessionData.id}`;
          const uploadData = await new Promise<any>((resolve, reject) => {
            const urlObj = new URL(uploadUrl);
            console.log('[meta-upload-proxy] Upload URL path:', urlObj.pathname + urlObj.search);
            const uploadReq = https.request({
              hostname: urlObj.hostname,
              path: urlObj.pathname + urlObj.search,
              method: 'POST',
              headers: {
                'Authorization': `OAuth ${accessToken}`,
                'file_offset': '0',
                'Content-Type': mimeType,
                'Content-Length': imageBuffer.length.toString(),
              },
            }, (uploadRes) => {
              let data = '';
              uploadRes.on('data', (chunk: string) => data += chunk);
              uploadRes.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
              });
              uploadRes.on('error', reject);
            });
            uploadReq.on('error', reject);
            uploadReq.write(imageBuffer);
            uploadReq.end();
          });

          console.log('[meta-upload-proxy] Upload result:', JSON.stringify(uploadData));

          if (uploadData.h) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, handle: uploadData.h }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `Upload failed: ${uploadData.error?.message || JSON.stringify(uploadData)}` }));
          }

        } catch (err: any) {
          console.error('[meta-upload-proxy] Error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
        }
      });
    },
  };
}

/** Helper: fetch JSON from a URL using Node https */
function fetchJson(url: string, method: string = 'GET'): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
    }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://207.180.232.14:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/upload': {
        target: 'https://vmi3040053.contaboserver.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), metaUploadProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
