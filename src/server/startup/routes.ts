import { db } from '@/lib/db';
import { urls } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { npeEnabled } from '@/lib/npe';
import { formatRootUrl } from '@/lib/url';
import { eq, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import loadRoutes from '../routes';
import { filesRoute } from '../routes/files.dy';
import { urlsRoute } from '../routes/urls.dy';

const logger = log('server');

export async function registerRoutes(server: FastifyInstance, mode: string) {
  const config = global.__config__;

  server.get<{ Params: { id: string } }>('/r/:id', async (req, res) => {
    return res.redirect(formatRootUrl('/raw', req.params.id), 301);
  });

  server.get<{ Params: { id: string } }>('/view/:id', async (_req, res) => {
    return res.ssr('view');
  });

  server.get<{ Params: { id: string } }>('/view/url/:id', async (_req, res) => {
    return res.ssr('view-url');
  });

  if (config.files.route === '/' && config.urls.route === '/') {
    logger.debug('files & urls route = /, using catch-all route');

    server.get<{ Params: { id: string }; Querystring: { token?: string; download?: string } }>(
      '/:id',
      async (req, res) => {
        const { id } = req.params;

        if (id === '') return res.callNotFound();
        else if (id === 'dashboard') return res.callNotFound(); // todo render dashboard

        const urlCount = await db.$count(urls, or(eq(urls.code, id), eq(urls.vanity, id)));
        if (urlCount > 0) return urlsRoute(req, res);
        else return filesRoute(req, res);
      },
    );
  } else {
    server.get(config.files.route === '/' ? '/:id' : `${config.files.route}/:id`, filesRoute);
    server.get(config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`, urlsRoute);
  }

  // The login page is never shown on its own: every visit goes to the central npe login.
  // ?local=true (emergency admin account) and ?logged_out=true (right after logout) keep the form.
  server.addHook('onRequest', async (req, res) => {
    if (req.method !== 'GET' || !npeEnabled()) return;

    const [path, query = ''] = req.url.split('?');
    if (path !== '/auth/login' && path !== '/auth/login/') return;

    const params = new URLSearchParams(query);
    if (params.get('local') === 'true' || params.get('logged_out') === 'true') return;

    return res.redirect('/api/auth/npe');
  });

  const routes = await loadRoutes();
  const routePlugins = Object.values(routes);
  await Promise.all(routePlugins.map((route) => server.register(route)));

  if (mode === 'production') {
    server.serveIndex('/dashboard*');
    server.serveIndex('/auth*');
    server.serveIndex('/folder*');
  }

  server.get('/', (_, res) => res.redirect('/dashboard', 301));
}
