import type { Response } from '@/lib/api/response';
import useLogin from '@/lib/client/hooks/useLogin';
import { useLogout } from '@/lib/client/hooks/useLogout';
import { useSettingsStore } from '@/lib/client/store/settings';
import { useUserStore } from '@/lib/client/store/user';
import { currentLanguage, setLanguage } from '@/lib/i18n';
import { stripLocale, toUrlLocale, type UrlLocale } from '@/lib/i18n/urlLocale';
import type { SafeConfig } from '@/lib/config/safe';
import { fetchApi } from '@/lib/fetchApi';
import { isAdministrator } from '@/lib/role';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Divider,
  Drawer,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconAdjustments,
  IconChevronRight,
  IconClipboardCopy,
  IconExternalLink,
  IconFileText,
  IconFileUpload,
  IconFiles,
  IconFolder,
  IconGraph,
  IconHome,
  IconLink,
  IconLogout,
  IconMenu2,
  IconRefreshDot,
  IconSettingsFilled,
  IconShieldLockFilled,
  IconStopwatch,
  IconTags,
  IconUpload,
  IconUsersGroup,
  IconWorld,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavigateFunction, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import type { dashboardLoader } from '../client/routes';
import ConfigProvider from './ConfigProvider';
import VersionBadge from './VersionBadge';
import DashboardUpload from './upload/DashboardUpload';
import { SETTINGS_EXTERNAL_LINKS } from './pages/serverSettings';

// Same colour strip as the other sunamo.cz sites (--scz-color-bar in fluent-base.css).
const SUNAMO_COLOR_BAR =
  'linear-gradient(to right, #0B0B3F 0%, #0B0B3F 5%, #BB4C2E 5%, #BB4C2E 10%, #20096E 10%, #20096E 15%, ' +
  '#8F750D 15%, #8F750D 20%, #008E40 20%, #008E40 25%, #76D9DE 25%, #76D9DE 30%, ' +
  '#93B51D 30%, #93B51D 35%, #C99397 35%, #C99397 40%, #70C2E5 40%, #70C2E5 45%, ' +
  '#BCE4F7 45%, #BCE4F7 50%, #3B83D2 50%, #3B83D2 55%, #E96997 55%, #E96997 60%, ' +
  '#DEB086 60%, #DEB086 65%, #C77341 65%, #C77341 70%, #6D7F2F 70%, #6D7F2F 75%, ' +
  '#EC897B 75%, #EC897B 80%, #AE485C 80%, #AE485C 85%, #CC08C9 85%, #CC08C9 90%, ' +
  '#C04277 90%, #C04277 95%, #A74B89 95%, #A74B89 100%)';

// Central npe site (root of all sunamo sites): local FE port 4005 on localhost, sunamo.cz otherwise.
const npeRootUrl = () =>
  window.location.hostname === 'localhost' ? 'http://localhost:4005' : 'https://sunamo.cz';

type NavLinks = {
  label: string;
  icon: React.ReactNode;
  active: (path: string) => boolean;
  href?: string;
  links?: NavLinks[];
  if?: (user: Response['/api/user']['user'], config: SafeConfig) => boolean;
};

// built at render time so labels follow the active language
const buildNavLinks = (t: TFunction<['layout', 'common', 'serverSettings']>): NavLinks[] => [
  {
    label: t('nav.home'),
    icon: <IconHome size='1rem' />,
    active: (path: string) => path === '/dashboard',
    href: '/dashboard',
  },
  {
    label: t('nav.metrics'),
    icon: <IconGraph size='1rem' />,
    active: (path: string) => path === '/dashboard/metrics',
    href: '/dashboard/metrics',
    if: (user, config) =>
      config.features.metrics.enabled &&
      (config.features.metrics.adminOnly ? isAdministrator(user?.role) : true),
  },
  {
    label: t('nav.files'),
    icon: <IconFiles size='1rem' />,
    active: (path: string) => path === '/dashboard/files',
    href: '/dashboard/files',
  },
  {
    label: t('nav.folders'),
    icon: <IconFolder size='1rem' />,
    active: (path: string) => path === '/dashboard/folders',
    href: '/dashboard/folders',
  },
  {
    label: t('nav.upload'),
    icon: <IconUpload size='1rem' />,
    active: (path: string) => path.startsWith('/dashboard/upload'),
    links: [
      {
        label: t('nav.uploadFile'),
        icon: <IconFileUpload size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/file',
        href: '/dashboard/upload/file',
      },
      {
        label: t('nav.uploadText'),
        icon: <IconFileText size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/text',
        href: '/dashboard/upload/text',
      },
    ],
  },
  {
    label: t('nav.urls'),
    icon: <IconLink size='1rem' />,
    active: (path: string) => path === '/dashboard/urls',
    href: '/dashboard/urls',
  },
  {
    label: t('nav.administrator'),
    icon: <IconShieldLockFilled size='1rem' />,
    if: (user) => isAdministrator(user?.role),
    active: (path: string) => path.startsWith('/dashboard/admin'),
    links: [
      {
        label: t('nav.adminDashboard'),
        icon: <IconHome size='1rem' />,
        active: (path: string) => path === '/dashboard/admin',
        href: '/dashboard/admin',
      },
      {
        label: t('nav.serverSettings'),
        icon: <IconAdjustments size='1rem' />,
        active: (path: string) => path.startsWith('/dashboard/admin/settings'),
        if: (user) => user?.role === 'SUPERADMIN',
        href: '/dashboard/admin/settings',
        links: SETTINGS_EXTERNAL_LINKS.map(({ labelKey, href, icon: Icon }) => ({
          label: t(labelKey, { ns: 'serverSettings' }),
          icon: <Icon size='1rem' />,
          active: (path: string) => path === href,
          href,
        })),
      },
      {
        label: t('nav.serverActions'),
        icon: <IconStopwatch size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/actions',
        href: '/dashboard/admin/actions',
      },
      {
        label: t('nav.users'),
        icon: <IconUsersGroup size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/users',
        href: '/dashboard/admin/users',
      },
      {
        label: t('nav.invites'),
        icon: <IconTags size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/invites',
        href: '/dashboard/admin/invites',
        if: (_, config) => config.invites.enabled,
      },
    ],
  },
];

const renderLinks = (
  links: NavLinks[],
  pathname: string,
  user: Response['/api/user']['user'],
  config: SafeConfig,
  navigate: NavigateFunction,
) => {
  const visible = (link: NavLinks) => !link.if || link.if(user as Response['/api/user']['user'], config);

  const active = (link: NavLinks): boolean => {
    if (!visible(link)) return false;
    if (link.active(pathname)) return true;

    return (link.links || []).some((child) => active(child));
  };

  return links.map((link) => {
    if (visible(link)) {
      const sublinks = link.links;
      const isActive = link.active(pathname);

      if (!sublinks) {
        return (
          <NavLink
            key={link.href ?? link.label}
            label={link.label}
            leftSection={link.icon}
            variant='light'
            rightSection={<IconChevronRight size='0.7rem' />}
            active={isActive}
            component={Link}
            to={link.href || ''}
            prefetch='intent'
          />
        );
      } else {
        return (
          <NavLink
            key={link.href ?? link.label}
            label={link.label}
            leftSection={link.icon}
            variant='light'
            rightSection={<IconChevronRight size='0.7rem' />}
            active={isActive && !sublinks.some((child) => active(child))}
            defaultOpened={isActive || sublinks.some((child) => active(child))}
            onClick={(event) => {
              if (!link.href) return;
              event.preventDefault();
              navigate(link.href);
            }}
          >
            {renderLinks(sublinks, pathname, user as Response['/api/user']['user'], config, navigate)}
          </NavLink>
        );
      }
    }
    return null;
  });
};

export default function Layout() {
  const { t } = useTranslation(['layout', 'common', 'serverSettings']);
  const { colorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const urlLocale = toUrlLocale(currentLanguage());
  const themeSetting = useSettingsStore((state) => state.settings.theme);
  const updateSetting = useSettingsStore((state) => state.update);
  const themeChoice = themeSetting === 'system' ? 'auto' : colorScheme === 'dark' ? 'dark' : 'light';

  // language lives in the URL token, so switching it means opening the same page under the other token
  const switchLanguage = (lng: string) => {
    const locale = toUrlLocale(lng) as UrlLocale;
    setLanguage(locale);
    window.location.assign(
      `/${locale}${stripLocale(window.location.pathname)}${window.location.search}${window.location.hash}`,
    );
  };

  const switchTheme = (choice: string) => {
    updateSetting(
      'theme',
      choice === 'auto' ? 'system' : choice === 'dark' ? 'builtin:dark_blue' : 'builtin:light_blue',
    );
  };
  const modals = useModals();
  const clipboard = useClipboard();
  const setUser = useUserStore((s) => s.setUser);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();

  const loaderData = useLoaderData<typeof dashboardLoader>();
  const config = loaderData.config;

  const { user, mutate } = useLogin();

  const [prev, setPrev] = useState(location.pathname);
  if (prev !== location.pathname) {
    setPrev(location.pathname);
    setOpened(false);
  }

  const copyToken = () => {
    modals.openConfirmModal({
      title: t('token.copy.title'),
      children: t('token.copy.message'),
      labels: { confirm: t('common:actions.copy'), cancel: t('token.cancel') },
      onConfirm: async () => {
        const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token');
        if (error) {
          showNotification({
            title: t('common:status.error'),
            message: error.error,
            color: 'red',
            icon: <IconClipboardCopy size='1rem' />,
          });
        } else {
          clipboard.copy(data?.token ?? '');
          showNotification({
            title: t('token.copied.title'),
            message: t('token.copied.message'),
            color: 'green',
            icon: <IconClipboardCopy size='1rem' />,
          });
        }
      },
    });
  };

  const refreshToken = () => {
    modals.openConfirmModal({
      title: t('token.refresh.title'),

      children: t('token.refresh.message'),
      labels: { confirm: t('common:actions.refresh'), cancel: t('token.cancel') },
      onConfirm: async () => {
        const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token', 'PATCH');
        if (error) {
          showNotification({
            title: t('common:status.error'),
            message: error.error,
            color: 'red',
            icon: <IconRefreshDot size='1rem' />,
          });
        } else {
          setUser(data?.user);
          mutate(data as Response['/api/user']);

          showNotification({
            title: t('token.refreshed.title'),
            message: t('token.refreshed.message'),
            color: 'green',
            icon: <IconRefreshDot size='1rem' />,
          });
        }
      },
    });
  };

  return (
    <ConfigProvider data={loaderData}>
      <DashboardUpload>
        <AppShell
          navbar={{ breakpoint: 'sm', width: { sm: 200, lg: 230 }, collapsed: { mobile: !opened } }}
          header={{ height: 60 }}
          footer={{ height: { base: 0.1 } }}
        >
          <AppShell.Header
            px='md'
            style={{ backgroundColor: colorScheme === 'dark' ? '#135aa1' : '#1976d2', borderBottom: 'none' }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -5,
                height: 5,
                pointerEvents: 'none',
                background: SUNAMO_COLOR_BAR,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <ActionIcon
                variant='subtle'
                color='white'
                size='lg'
                radius='xl'
                mr='xs'
                aria-label={t('menu.open')}
                onClick={() => setMenuOpened(true)}
              >
                <IconMenu2 size='1.4rem' />
              </ActionIcon>

              {config.website.titleLogo && (
                <Avatar
                  src={config.website.titleLogo}
                  alt={t('header.logoAlt')}
                  radius='sm'
                  size='md'
                  mr='md'
                />
              )}

              <Group gap='xs' wrap='nowrap'>
                <Tooltip label={t('menu.allSites')}>
                  <ActionIcon
                    component='a'
                    href={`${npeRootUrl()}/${urlLocale}`}
                    variant='subtle'
                    color='white'
                    size='lg'
                    radius='xl'
                    aria-label={t('menu.allSites')}
                  >
                    <IconWorld size='1.4rem' />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t('menu.home')}>
                  <ActionIcon
                    component={Link}
                    to='/dashboard'
                    variant='subtle'
                    color='white'
                    size='lg'
                    radius='xl'
                    aria-label={t('menu.home')}
                  >
                    <IconHome size='1.4rem' />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </div>
          </AppShell.Header>

          <Drawer
            opened={menuOpened}
            onClose={() => setMenuOpened(false)}
            title={t('menu.title')}
            position='left'
            size='xs'
          >
            <Stack gap='lg'>
              <div>
                <Text size='sm' fw={500} mb={4}>
                  {t('menu.language')}
                </Text>
                <SegmentedControl
                  fullWidth
                  value={urlLocale}
                  onChange={switchLanguage}
                  data={[
                    { value: 'cs', label: 'Čeština' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </div>

              <div>
                <Text size='sm' fw={500} mb={4}>
                  {t('menu.theme')}
                </Text>
                <SegmentedControl
                  fullWidth
                  value={themeChoice}
                  onChange={switchTheme}
                  data={[
                    { value: 'light', label: t('menu.themeLight') },
                    { value: 'dark', label: t('menu.themeDark') },
                    { value: 'auto', label: t('menu.themeAuto') },
                  ]}
                />
              </div>

              <div>
                <Text size='sm' fw={500} mb={4}>
                  {isAdministrator(user?.role)
                    ? t('userMenu.administratorLabel', { username: user?.username })
                    : user?.username}
                </Text>
                <Stack gap={0}>
                  <NavLink
                    label={t('userMenu.copyToken')}
                    leftSection={<IconClipboardCopy size='1rem' />}
                    onClick={() => {
                      setMenuOpened(false);
                      copyToken();
                    }}
                  />
                  <NavLink
                    label={t('userMenu.refreshToken')}
                    color='red'
                    c='red'
                    leftSection={<IconRefreshDot size='1rem' />}
                    onClick={() => {
                      setMenuOpened(false);
                      refreshToken();
                    }}
                  />
                  <NavLink
                    label={t('userMenu.settings')}
                    leftSection={<IconSettingsFilled size='1rem' />}
                    component={Link}
                    to='/dashboard/settings'
                    onClick={() => setMenuOpened(false)}
                  />
                  {user?.role === 'SUPERADMIN' && (
                    <NavLink
                      label={t('userMenu.serverSettings')}
                      leftSection={<IconAdjustments size='1rem' />}
                      component={Link}
                      to='/dashboard/admin/settings'
                      onClick={() => setMenuOpened(false)}
                    />
                  )}
                  <NavLink
                    label={t('userMenu.logout')}
                    c='red'
                    leftSection={<IconLogout size='1rem' />}
                    onClick={logout}
                  />
                </Stack>
              </div>

              <Box hiddenFrom='sm' onClick={() => setMenuOpened(false)}>
                {renderLinks(
                  buildNavLinks(t),
                  location.pathname,
                  user as Response['/api/user']['user'],
                  config,
                  navigate,
                )}
              </Box>
            </Stack>
          </Drawer>

          <AppShell.Navbar hidden={!opened} zIndex={90}>
            <Title hiddenFrom='sm' size={24} m='sm' style={{ marginBottom: 20 }}>
              {config.website.title.trim()}
            </Title>
            <Divider hiddenFrom='sm' />

            <ScrollArea mah='calc(100vh - 200px)'>
              {renderLinks(
                buildNavLinks(t),
                location.pathname,
                user as Response['/api/user']['user'],
                config,
                navigate,
              )}
            </ScrollArea>

            <div style={{ marginTop: 'auto' }}>
              <VersionBadge />

              <Divider />

              <ScrollArea mah='auto'>
                <Box>
                  {config.website.externalLinks.map(({ name, url }, i) => (
                    <NavLink
                      key={i}
                      label={name}
                      leftSection={<IconExternalLink size='1rem' />}
                      variant='light'
                      component={Link}
                      to={url}
                      target='_blank'
                    />
                  ))}
                </Box>
              </ScrollArea>
            </div>
          </AppShell.Navbar>

          <AppShell.Main>
            <Paper withBorder m='md' p='xs' radius='md'>
              <Outlet />
            </Paper>
          </AppShell.Main>

          <AppShell.Footer display='none' />
        </AppShell>
      </DashboardUpload>
    </ConfigProvider>
  );
}
