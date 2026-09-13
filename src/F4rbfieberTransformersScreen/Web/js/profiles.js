const palette = (primary, secondary, accent, ink = '#f3f8ff') =>
  Object.freeze({ primary, secondary, accent, ink });

const imageSet = id => Object.freeze({
  robot: `assets/transformers/${id}/comic-robot.png`,
  alt: `assets/transformers/${id}/comic-alt.png`
});

export const PROFILES = Object.freeze({
  grimlock: {
    id: 'grimlock',
    name: 'GRIMLOCK',
    faction: 'DINOBOT',
    images: imageSet('grimlock'),
    altLabel: 'T-REX',
    colors: palette('#d9dde4', '#e2b423', '#7fdcff'),
    factionLogo: 'assets/dinobot-emblem.png'
  },
  hound: {
    id: 'hound',
    name: 'HOUND',
    faction: 'AUTOBOT',
    images: imageSet('hound'),
    altLabel: 'MILITÄR-JEEP',
    colors: palette('#668f32', '#d2c7a4', '#b9e66f'),
    factionLogo: 'assets/autobot-emblem.png'
  },
  optimus: {
    id: 'optimus',
    name: 'OPTIMUS PRIME',
    faction: 'AUTOBOT',
    images: imageSet('optimus'),
    altLabel: 'SATTELSCHLEPPER',
    colors: palette('#df3338', '#1d58b5', '#70c7ff'),
    factionLogo: 'assets/autobot-emblem.png'
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'BUMBLEBEE',
    faction: 'AUTOBOT',
    images: imageSet('bumblebee'),
    altLabel: 'VW KÄFER',
    colors: palette('#f2c514', '#30353d', '#fff17b', '#fffbe2'),
    factionLogo: 'assets/autobot-emblem.png'
  },
  ironhide: {
    id: 'ironhide',
    name: 'IRONHIDE',
    faction: 'AUTOBOT',
    images: imageSet('ironhide'),
    altLabel: 'TRANSPORTER',
    colors: palette('#d92832', '#333a43', '#75c9ff'),
    factionLogo: 'assets/autobot-emblem.png'
  },
  jazz: {
    id: 'jazz',
    name: 'JAZZ',
    faction: 'AUTOBOT',
    images: imageSet('jazz'),
    altLabel: 'SPORTWAGEN',
    colors: palette('#e5e8ea', '#2359a8', '#f04a43'),
    factionLogo: 'assets/autobot-emblem.png'
  },
  megatron: {
    id: 'megatron',
    name: 'MEGATRON',
    faction: 'DECEPTICON',
    images: imageSet('megatron'),
    altLabel: 'LASERPISTOLE',
    colors: palette('#c6c9cd', '#34363d', '#f14a55'),
    factionLogo: 'assets/decepticon-emblem.png'
  },
  shockwave: {
    id: 'shockwave',
    name: 'SHOCKWAVE',
    faction: 'DECEPTICON',
    images: imageSet('shockwave'),
    altLabel: 'LASERKANONE',
    colors: palette('#65329a', '#b52aaf', '#ff69e1'),
    factionLogo: 'assets/decepticon-emblem.png'
  },
  soundwave: {
    id: 'soundwave',
    name: 'SOUNDWAVE',
    faction: 'DECEPTICON',
    images: imageSet('soundwave'),
    altLabel: 'KASSETTENDECK',
    colors: palette('#174b91', '#d1d6dc', '#f0be32'),
    factionLogo: 'assets/decepticon-emblem.png'
  }
});

export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));

export function getProfile(id) {
  return PROFILES[String(id || '').toLowerCase()] || PROFILES.optimus;
}

export function getProfileAppearance(profile) {
  return {
    ...profile.colors,
    altLabel: profile.altLabel
  };
}

export function getProfileAsset(profile, form) {
  const normalizedForm = form === 'alt' ? 'alt' : 'robot';
  return profile.images[normalizedForm];
}

export function getEnabledProfileIds(settings, fallbackProfileId = 'optimus') {
  const configured = Array.isArray(settings?.selectedTransformerProfiles)
    ? settings.selectedTransformerProfiles
    : PROFILE_IDS;
  const enabled = configured
    .map(id => String(id || '').toLowerCase())
    .filter((id, index, ids) => PROFILES[id] && ids.indexOf(id) === index);
  return enabled.length ? enabled : [getProfile(fallbackProfileId).id];
}
