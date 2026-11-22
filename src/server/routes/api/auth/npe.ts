import { createToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import { createUser } from '@/lib/db/models/user';
import { users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { npeEnabled, npeLoginUrl, verifyNpeToken } from '@/lib/npe';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';

const logger = log('api').c('auth').c('npe');

export const PATH = '/api/auth/npe';
export default typedPlugin(
  async (server) => {
    // Sign-in through the central npe login: the shared `token` cookie (JWT) set by npe is verified here.
    server.get(PATH, async (req, res) => {
      if (!npeEnabled()) return res.status(503).type('text/plain').send('npe sign-in is not configured.');

      const host = req.headers.host ?? '';
      const origin = `${req.protocol}://${host}`;
      const cookieToken = req.cookies?.token;

      if (!cookieToken) {
        const alreadyBack = (req.query as Record<string, string | undefined>)?.back === '1';
        if (alreadyBack) {
          logger.warn('returned from npe without a token cookie', { host });
          return res
            .status(401)
            .type('text/plain')
            .send('Sign-in via npe did not complete: no shared login cookie was found.');
        }

        return res.redirect(npeLoginUrl(host, `${origin}${PATH}?back=1`));
      }

      const identity = verifyNpeToken(cookieToken);
      if (!identity) {
        logger.warn('invalid npe token', { host, ip: req.ip ?? 'unknown' });
        return res.status(401).type('text/plain').send('The npe login token is not valid. Sign in again.');
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, identity.email))
        .limit(1);

      const user = existing
        ? { id: existing.id }
        : await createUser({ username: identity.email, token: createToken() });

      if (!existing) logger.info('created user from npe login', { username: identity.email });

      const session = await getSession(req, res);
      await saveSession(session, user, false);

      logger.info('user logged in via npe', { username: identity.email, ip: req.ip ?? 'unknown' });

      return res.redirect('/dashboard');
    });
  },
  { name: PATH },
);
