import type { Response } from '@/lib/api/response';
import useAvatar from '@/lib/client/hooks/useAvatar';
import useLogin from '@/lib/client/hooks/useLogin';
import { useLogout } from '@/lib/client/hooks/useLogout';
import { useSettingsStore } from '@/lib/client/store/settings';
import { useUserStore } from '@/lib/client/store/user';
import { currentLanguage, setLanguage } from '@/lib/i18n';
import { stripLocale, toUrlLocale, type UrlLocale } from '@/lib/i18n/urlLocale';
import type { SafeConfig } from '@/lib/config/safe';
import { SUNAMO_SITES, type SunamoSite } from '@/lib/sunamoSites';
import { fetchApi } from '@/lib/fetchApi';
import { isAdministrator } from '@/lib/role';
import {
  AppShell,
  Box,
  Divider,
  Drawer,
  NavLink,
  Paper,
  ScrollArea,
  Title,
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
  IconMenu2,
  IconRefreshDot,
  IconSettingsFilled,
  IconShieldLockFilled,
  IconStopwatch,
  IconTags,
  IconUpload,
  IconUsersGroup,
  IconMoon,
  IconSun,
  IconUserCircle,
  IconWorld,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavigateFunction, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import type { dashboardLoader } from '../client/routes';
import ConfigProvider from './ConfigProvider';
import VersionBadge from './VersionBadge';
import DashboardUpload from './upload/DashboardUpload';
import { SETTINGS_EXTERNAL_LINKS } from './pages/serverSettings';

// Button look of the Vuetify toolbar on the other sunamo.cz sites (36 px high, pill, 8 % hover overlay).
const SCZ_BUTTON_CSS = `
.scz-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:64px;height:36px;padding:0 16px;border:0;border-radius:24px;background:transparent;color:#fff;font:500 14px/1 inherit;font-family:inherit;letter-spacing:.1px;text-decoration:none;cursor:pointer;transition:box-shadow .28s cubic-bezier(.4,0,.2,1),transform .28s cubic-bezier(.4,0,.2,1),opacity .28s cubic-bezier(.4,0,.2,1),background .28s cubic-bezier(.4,0,.2,1)}
.scz-btn::before{content:'';position:absolute;inset:0;border-radius:inherit;background:currentColor;opacity:0;transition:opacity .2s ease-in-out;pointer-events:none}
.scz-btn:hover::before{opacity:.08}
.scz-btn:focus-visible::before{opacity:.12}
.scz-btn:active::before{opacity:.16}
.scz-drawer{margin-left:16px;overflow-y:auto;height:100vh}
.scz-nav-list{list-style:none;padding:0;margin:8px 0 0 0}
.scz-nav-link{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:6px 10px;border-radius:6px;text-decoration:none;color:inherit;font-size:.95rem;cursor:pointer;transition:background-color .15s ease,padding-left .15s ease}
.scz-nav-link:hover{background-color:rgba(25,118,210,.1);padding-left:14px}
.scz-nav-link svg{width:19px;height:19px;flex:0 0 auto}
`;

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

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ display: 'block', margin: '30px 0', font: 'inherit' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{ color: 'var(--scz-heading-color, #000)', fontSize: '1.25rem', fontWeight: 700 }}>
            {title}
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: -4,
              left: 0,
              width: '100%',
              height: 4,
              background: 'linear-gradient(to right, #ef4444, #fb923c, #ca8a04)',
              borderRadius: 9999,
            }}
          />
        </div>
      </h3>
      <div style={{ marginLeft: 20, marginTop: 8 }}>{children}</div>
    </div>
  );
}

const renderSites = (sites: SunamoSite[]) => {
  const local = window.location.hostname === 'localhost';
  const locale = toUrlLocale(currentLanguage());

  return sites.map((site) => (
    <li key={site.short}>
      <a
        className='scz-nav-link'
        href={local ? `http://localhost:${site.localPort}/${locale}/` : `https://${site.prodHost}/${locale}/`}
      >
        <img
          src={`https://${site.prodHost}/favicon.ico`}
          alt=''
          width={20}
          height={20}
          loading='lazy'
          style={{ flex: '0 0 auto', objectFit: 'contain' }}
          onError={(event) => ((event.target as HTMLImageElement).style.visibility = 'hidden')}
        />
        <span>{local ? site.short : site.prodHost}</span>
      </a>
    </li>
  ));
};

// flat drawer list of the dashboard navigation (children indented)
const renderDrawerLinks = (
  links: NavLinks[],
  user: Response['/api/user']['user'],
  config: SafeConfig,
  depth: number,
): React.ReactNode[] =>
  links.flatMap((link) => {
    if (link.if && !link.if(user as Response['/api/user']['user'], config)) return [];

    const row = (
      <li key={`${depth}-${link.href ?? link.label}`} style={{ marginLeft: depth * 16 }}>
        {link.href ? (
          <Link className='scz-nav-link' to={link.href}>
            {link.icon}
            {link.label}
          </Link>
        ) : (
          <span className='scz-nav-link' style={{ opacity: 0.7 }}>
            {link.icon}
            {link.label}
          </span>
        )}
      </li>
    );

    return [row, ...renderDrawerLinks(link.links ?? [], user, config, depth + 1)];
  });

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
  // npe appends the shared login to the URL hash after sign-in; drop it so the token does not stay in the address bar
  useEffect(() => {
    if (/authToken=|authMail=/.test(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const modals = useModals();
  const clipboard = useClipboard();
  const setUser = useUserStore((s) => s.setUser);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();

  const loaderData = useLoaderData<typeof dashboardLoader>();
  const config = loaderData.config;

  const { user, mutate } = useLogin();
  const { avatar } = useAvatar();

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
      <style>{SCZ_BUTTON_CSS}</style>
      <DashboardUpload>
        <AppShell
          navbar={{ breakpoint: 'sm', width: { sm: 200, lg: 230 }, collapsed: { mobile: !opened } }}
          header={{ height: 64 }}
          footer={{ height: { base: 0.1 } }}
        >
          <AppShell.Header
            px={0}
            style={{
              backgroundColor: colorScheme === 'dark' ? '#135aa1' : '#1976d2',
              borderBottom: 'none',
              boxShadow:
                '0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <button
                type='button'
                className='scz-btn'
                style={{ marginLeft: 4 }}
                aria-label={t('menu.open')}
                onClick={() => setMenuOpened(true)}
              >
                <IconMenu2 size={24} />
              </button>

              <a
                className='scz-btn'
                style={{ color: '#008000' }}
                href={`${npeRootUrl()}/${urlLocale}`}
                title={t('menu.allSites')}
                aria-label={t('menu.allSites')}
              >
                <IconWorld size={24} />
              </a>

              {location.pathname !== '/dashboard' && (
                <Link
                  className='scz-btn'
                  style={{ color: '#008000' }}
                  to='/dashboard'
                  title={t('menu.home')}
                  aria-label={t('menu.home')}
                >
                  <IconHome size={24} />
                </Link>
              )}

              <div
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', marginRight: 4 }}
              >
                <a
                  className='scz-btn'
                  href={`${npeRootUrl()}/${urlLocale}/profile`}
                  aria-label={user?.username ?? t('header.avatarAlt')}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=''
                      style={{
                        width: 36,
                        height: 36,
                        objectFit: 'cover',
                        borderRadius: '50%',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <IconUserCircle size={36} />
                  )}
                </a>
                <button type='button' className='scz-btn' onClick={logout}>
                  {t('userMenu.logout')}
                  <IconChevronRight size={18} style={{ marginLeft: 8 }} />
                </button>
              </div>
            </div>
          </AppShell.Header>

          <Drawer
            opened={menuOpened}
            onClose={() => setMenuOpened(false)}
            position='left'
            size={256}
            padding={0}
            withCloseButton={false}
            overlayProps={{ color: '#000', opacity: 0.2 }}
            transitionProps={{ duration: 200 }}
            styles={{
              content: {
                backgroundColor: colorScheme === 'dark' ? '#212121' : '#ffffff',
                color: colorScheme === 'dark' ? '#ffffff' : 'rgba(0,0,0,0.87)',
                fontFamily: 'Roboto, sans-serif',
                boxShadow: '0 2px 3px rgba(0,0,0,.3), 0 6px 10px 4px rgba(0,0,0,.15)',
              },
              body: { padding: 0 },
            }}
          >
            <div
              className='scz-drawer'
              style={
                { '--scz-heading-color': colorScheme === 'dark' ? '#fff' : '#000' } as React.CSSProperties
              }
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a[href]:not([href="#"])')) setMenuOpened(false);
              }}
            >
              <DrawerSection title={t('menu.navigation')}>
                <ul className='scz-nav-list'>
                  {renderDrawerLinks(buildNavLinks(t), user as Response['/api/user']['user'], config, 0)}
                </ul>
              </DrawerSection>

              <DrawerSection title='Zipline'>
                <ul className='scz-nav-list'>
                  <li>
                    <a
                      className='scz-nav-link'
                      href='#'
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpened(false);
                        copyToken();
                      }}
                    >
                      <IconClipboardCopy size={19} />
                      {t('userMenu.copyToken')}
                    </a>
                  </li>
                  <li>
                    <a
                      className='scz-nav-link'
                      style={{ color: '#fa5252' }}
                      href='#'
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpened(false);
                        refreshToken();
                      }}
                    >
                      <IconRefreshDot size={19} />
                      {t('userMenu.refreshToken')}
                    </a>
                  </li>
                  <li>
                    <Link className='scz-nav-link' to='/dashboard/settings'>
                      <IconSettingsFilled size={19} />
                      {t('userMenu.settings')}
                    </Link>
                  </li>
                  {user?.role === 'SUPERADMIN' && (
                    <li>
                      <Link className='scz-nav-link' to='/dashboard/admin/settings'>
                        <IconAdjustments size={19} />
                        {t('userMenu.serverSettings')}
                      </Link>
                    </li>
                  )}
                </ul>
              </DrawerSection>

              <DrawerSection title={t('menu.language')}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span
                    style={{ cursor: 'pointer', opacity: urlLocale === 'en' ? 1 : 0.5 }}
                    onClick={() => switchLanguage('en')}
                    title='English'
                  >
                    <svg width='32' height='21' viewBox='0 0 60 30' role='img' aria-label='English'>
                      <rect width='60' height='30' fill='#012169' />
                      <path d='M0,0 L60,30 M60,0 L0,30' stroke='#fff' strokeWidth='6' />
                      <path d='M0,0 L60,30 M60,0 L0,30' stroke='#C8102E' strokeWidth='2' />
                      <path d='M30,0 V30 M0,15 H60' stroke='#fff' strokeWidth='10' />
                      <path d='M30,0 V30 M0,15 H60' stroke='#C8102E' strokeWidth='6' />
                    </svg>
                  </span>
                  <span
                    style={{ cursor: 'pointer', opacity: urlLocale === 'cs' ? 1 : 0.5 }}
                    onClick={() => switchLanguage('cs')}
                    title='Čeština'
                  >
                    <svg width='32' height='21' viewBox='0 0 60 30' role='img' aria-label='Čeština'>
                      <rect width='60' height='30' fill='#fff' />
                      <rect y='15' width='60' height='15' fill='#D7141A' />
                      <path d='M0,0 L30,15 L0,30 Z' fill='#11457E' />
                    </svg>
                  </span>
                </div>
              </DrawerSection>

              <DrawerSection title={t('menu.theme')}>
                <button
                  type='button'
                  className='scz-btn'
                  style={{ color: 'inherit' }}
                  onClick={() => switchTheme(themeChoice === 'dark' ? 'light' : 'dark')}
                >
                  {themeChoice === 'dark' ? (
                    <IconSun size={18} style={{ marginRight: 8 }} />
                  ) : (
                    <IconMoon size={18} style={{ marginRight: 8 }} />
                  )}
                  {themeChoice === 'dark' ? t('menu.themeLight') : t('menu.themeDark')}
                </button>
                {themeChoice !== 'auto' && (
                  <button
                    type='button'
                    className='scz-btn'
                    style={{ color: 'inherit' }}
                    onClick={() => switchTheme('auto')}
                  >
                    {t('menu.themeAuto')}
                  </button>
                )}
              </DrawerSection>

              <DrawerSection title={t('menu.mySites')}>
                <ul className='scz-nav-list'>{renderSites(SUNAMO_SITES.filter((site) => !site.isApp))}</ul>
              </DrawerSection>

              <DrawerSection title={t('menu.myApps')}>
                <ul className='scz-nav-list'>{renderSites(SUNAMO_SITES.filter((site) => site.isApp))}</ul>
              </DrawerSection>

              <div style={{ marginTop: 24, marginBottom: 16, fontSize: 11, opacity: 0.5, lineHeight: 1.6 }}>
                <VersionBadge />
              </div>
            </div>
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
