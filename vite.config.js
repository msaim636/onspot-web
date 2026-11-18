import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import url from 'url';

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        const endpoint = pathname.replace('/api/', '').split('/')[0].split('?')[0];
        const apiPath = `./api/${endpoint}.js`;

        try {
          // Parse query
          const query = {};
          parsedUrl.searchParams.forEach((val, key) => {
            query[key] = val;
          });
          req.query = query;

          // Parse body for POST/PUT/DELETE
          if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const bodyStr = Buffer.concat(buffers).toString('utf-8');
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              req.body = bodyStr;
            }
          } else {
            req.body = {};
          }

          // Polyfill express-like res helpers used in serverless functions
          res.status = function (code) {
            this.statusCode = code;
            return this;
          };
          res.json = function (data) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(data));
            return this;
          };

          // Import and execute API function
          const module = await server.ssrLoadModule(apiPath);
          const handler = module.default;
          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            res.status(404).json({ error: `Handler for ${endpoint} not found` });
          }
        } catch (err) {
          console.error(`API Error in ${pathname}:`, err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal API Server Error', details: err.message });
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env so API routes have access to GEMINI_API_KEY, RESEND_API_KEY, etc.
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiDevMiddleware()],
    server: {
      port: 3000,
    },
  };
});
