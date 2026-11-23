import type { Response } from '@/lib/api/response';
import { useUserStore } from '@/lib/client/store/user';
import { currentLanguage } from '@/lib/i18n';
import { toUrlLocale } from '@/lib/i18n/urlLocale';
import { showNotification } from '@mantine/notifications';
import { IconLogout } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';

export function useLogout() {
  const setUser = useUserStore((state) => state.setUser);
  const { t } = useTranslation('layout');

  const logout = async () => {
    showNotification({
      message: t('userMenu.loggingOut'),
      icon: <IconLogout size='1rem' />,
      autoClose: 700,
    });

    const res = await fetch('/api/auth/logout');
    if (res.ok) {
      const data: Response['/api/auth/logout'] = await res.json();
      setUser(null);
      await mutate('/api/user', null, false);
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Same sign-out as the other sunamo.cz sites: npe clears the shared cookies, then returns here.
      const root = window.location.hostname === 'localhost' ? 'http://localhost:4005' : 'https://sunamo.cz';
      const returnTo = `${window.location.origin}/auth/login`;
      const locale = toUrlLocale(currentLanguage());
      window.location.href = `${root}/${locale}/logout?returnTo=${encodeURIComponent(returnTo)}`;
    }
  };

  return logout;
}
