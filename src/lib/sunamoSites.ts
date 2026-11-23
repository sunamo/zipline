// Sibling sunamo.cz sites for the drawer menu (same list and local ports as sczSiblingSites in sunamo.net UriUtils.ts).
export type SunamoSite = { name: string; short: string; prodHost: string; localPort: number; isApp: boolean };

export const SUNAMO_SITES: SunamoSite[] = [
  { name: 'GeoCaching', short: 'geo', prodHost: 'geocaching.sunamo.cz', localPort: 4016, isApp: false },
  { name: 'Apps', short: 'app', prodHost: 'apps.sunamo.cz', localPort: 4001, isApp: false },
  { name: 'Photos', short: 'phs', prodHost: 'photos.sunamo.cz', localPort: 4015, isApp: false },
  { name: 'Lyrics', short: 'lyr', prodHost: 'lyrics.sunamo.cz', localPort: 4004, isApp: false },
  { name: 'Developer', short: 'dev', prodHost: 'developer.sunamo.cz', localPort: 4002, isApp: false },
  { name: 'Shortener', short: 'sho', prodHost: 'shortener.sunamo.cz', localPort: 4014, isApp: false },
  { name: 'Dart', short: 'var', prodHost: 'dart.sunamo.cz', localPort: 4007, isApp: false },
  {
    name: 'English Line By Line',
    short: 'eng',
    prodHost: 'english-line-by-line.sunamo.cz',
    localPort: 4008,
    isApp: true,
  },
  { name: 'PerfectHome', short: 'pho', prodHost: 'perfect-home.sunamo.cz', localPort: 4003, isApp: true },
  {
    name: 'Notify About Local Changes',
    short: 'nal',
    prodHost: 'notify-about-local-changes.sunamo.cz',
    localPort: 4018,
    isApp: true,
  },
  {
    name: 'Photos.sunamo.net client',
    short: 'psn',
    prodHost: 'photos-client.sunamo.cz',
    localPort: 4019,
    isApp: true,
  },
  { name: 'LiteTerm', short: 'lit', prodHost: 'liteterm.sunamo.cz', localPort: 4021, isApp: true },
  {
    name: 'Ants - Multiplayer online',
    short: 'ant',
    prodHost: 'ants.sunamo.cz',
    localPort: 4020,
    isApp: true,
  },
  { name: 'Meow', short: 'meo', prodHost: 'meow.sunamo.cz', localPort: 4022, isApp: false },
  { name: 'Box', short: 'box', prodHost: 'box.sunamo.cz', localPort: 4023, isApp: false },
  { name: 'Connections', short: 'cnn', prodHost: 'connections.sunamo.cz', localPort: 4025, isApp: false },
];
