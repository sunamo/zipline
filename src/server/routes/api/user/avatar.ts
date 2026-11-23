import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import z from 'zod';

export type ApiUserAvatarResponse = string;

export const PATH = '/api/user/avatar';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: "Return the current user's avatar as a base64 data URL.",
          response: {
            200: z.string().describe('data URL with base64'),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const [user] = await db
          .select({ avatar: users.avatar, username: users.username })
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1);

        if (user?.avatar) return res.send(user.avatar);

        // Sunamo accounts are e-mails: use the shared avatar cache of npe (same image as on the other sunamo.cz sites).
        const mail = user?.username?.trim().toLowerCase();
        if (mail?.includes('@')) {
          const hash = createHash('md5').update(mail).digest('hex');
          return res.send(`https://cats.sunamo.cz/npe/Avatar/Get?hash=${hash}`);
        }

        throw new ApiError(9002);
      },
    );
  },
  { name: PATH },
);
