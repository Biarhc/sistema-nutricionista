import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import gerarPlanoHandler from './api/gerar-plano.js'
import gerarOpcaoHandler from './api/gerar-opcao.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'api-serverless-routes',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const isGerarPlano = req.url === '/api/gerar-plano' || req.url.startsWith('/api/gerar-plano?');
            const isGerarOpcao = req.url === '/api/gerar-opcao' || req.url.startsWith('/api/gerar-opcao?');

            if (isGerarPlano || isGerarOpcao) {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {};
                } catch (e) {
                  req.body = {};
                }

                const resMock = {
                  setHeader(name, value) {
                    res.setHeader(name, value);
                    return this;
                  },
                  status(code) {
                    res.statusCode = code;
                    return this;
                  },
                  json(data) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end(data) {
                    res.end(data);
                  }
                };

                try {
                  if (isGerarPlano) {
                    await gerarPlanoHandler(req, resMock);
                  } else {
                    await gerarOpcaoHandler(req, resMock);
                  }
                } catch (err) {
                  console.error("Erro no middleware de API local:", err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ]
  }
})
