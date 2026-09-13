const palette = (primary, secondary, accent, ink = '#f3f8ff') =>
  Object.freeze({ primary, secondary, accent, ink });

const imageSet = id => Object.freeze({
  comic: Object.freeze({
    robot: `assets/transformers/${id}/comic-robot.png`,
    alt: `assets/transformers/${id}/comic-alt.png`
  }),
  film: Object.freeze({
    robot: `assets/transformers/${id}/film-robot.png`,
    alt: `assets/transformers/${id}/film-alt.png`
  })
});

export const PROFILES = Object.freeze({
  grimlock: {
    id: 'grimlock',
    name: 'GRIMLOCK',
    faction: 'DINOBOT',
    images: imageSet('grimlock'),
    altLabels: { comic: 'T-REX', film: 'T-REX' },
    palettes: {
      comic: palette('#d9dde4', '#e2b423', '#7fdcff'),
      film: palette('#a67b3f', '#4b5158', '#f0c86d')
    },
    factionLogo: 'assets/dinobot-emblem.png'
  },
  hound: {
    id: 'hound',
    name: 'HOUND',
    faction: 'AUTOBOT',
    images: imageSet('hound'),
    altLabels: { comic: 'MILITÄR-JEEP', film: 'TAKTIK-JEEP' },
    palettes: {
      comic: palette('#668f32', '#d2c7a4', '#b9e66f'),
      film: palette('#596b3b', '#8b7658', '#b7d875')
    },
    factionLogo: 'assets/autobot-emblem.png'
  },
  optimus: {
    id: 'optimus',
    name: 'OPTIMUS PRIME',
    faction: 'AUTOBOT',
    images: imageSet('optimus'),
    altLabels: { comic: 'SATTELSCHLEPPER', film: 'PETERBILT-TRUCK' },
    palettes: {
      comic: palette('#df3338', '#1d58b5', '#70c7ff'),
      film: palette('#245394', '#bd3439', '#71bcff')
    },
    factionLogo: 'assets/autobot-emblem.png'
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'BUMBLEBEE',
    faction: 'AUTOBOT',
    images: imageSet('bumblebee'),
    altLabels: { comic: 'VW KÄFER', film: 'CAMARO' },
    palettes: {
      comic: palette('#f2c514', '#30353d', '#fff17b', '#fffbe2'),
      film: palette('#d9a80e', '#292d31', '#ffe06a', '#fff9d9')
    },
    factionLogo: 'assets/autobot-emblem.png'
  },
  ironhide: {
    id: 'ironhide',
    name: 'IRONHIDE',
    faction: 'AUTOBOT',
    images: imageSet('ironhide'),
    altLabels: { comic: 'TRANSPORTER', film: 'TAKTIK-PICKUP' },
    palettes: {
      comic: palette('#d92832', '#333a43', '#75c9ff'),
      film: palette('#343a40', '#a43135', '#ff6a68')
    },
    factionLogo: 'assets/autobot-emblem.png'
  },
  jazz: {
    id: 'jazz',
    name: 'JAZZ',
    faction: 'AUTOBOT',
    images: imageSet('jazz'),
    altLabels: { comic: 'SPORTWAGEN', film: 'PONTIAC SOLSTICE' },
    palettes: {
      comic: palette('#e5e8ea', '#2359a8', '#f04a43'),
      film: palette('#aeb5bd', '#313942', '#68b8ff')
    },
    factionLogo: 'assets/autobot-emblem.png'
  },
  megatron: {
    id: 'megatron',
    name: 'MEGATRON',
    faction: 'DECEPTICON',
    images: imageSet('megatron'),
    altLabels: { comic: 'LASERPISTOLE', film: 'CYBERTRON-JET' },
    palettes: {
      comic: palette('#c6c9cd', '#34363d', '#f14a55'),
      film: palette('#7e858c', '#2b2e34', '#ff3544')
    },
    factionLogo: 'assets/decepticon-emblem.png'
  },
  shockwave: {
    id: 'shockwave',
    name: 'SHOCKWAVE',
    faction: 'DECEPTICON',
    images: imageSet('shockwave'),
    altLabels: { comic: 'LASERKANONE', film: 'HOVERTANK' },
    palettes: {
      comic: palette('#65329a', '#b52aaf', '#ff69e1'),
      film: palette('#47335f', '#b829a4', '#f45bd7')
    },
    factionLogo: 'assets/decepticon-emblem.png'
  },
  soundwave: {
    id: 'soundwave',
    name: 'SOUNDWAVE',
    faction: 'DECEPTICON',
    images: imageSet('soundwave'),
    altLabels: { comic: 'KASSETTENDECK', film: 'CYBERTRON-SUPERCAR' },
    palettes: {
      comic: palette('#174b91', '#d1d6dc', '#f0be32'),
      film: palette('#3e4855', '#1f4f99', '#72a8ff')
    },
    factionLogo: 'assets/decepticon-emblem.png'
  }
});

export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));

export function normalizeVisualStyle(style) {
  return String(style || '').toLowerCase() === 'film' ? 'film' : 'comic';
}

export function getProfile(id) {
  return PROFILES[String(id || '').toLowerCase()] || PROFILES.optimus;
}

export function getProfileAppearance(profile, visualStyle) {
  const style = normalizeVisualStyle(visualStyle);
  return {
    ...profile.palettes[style],
    altLabel: profile.altLabels[style]
  };
}

export function getProfileAsset(profile, visualStyle, form) {
  const style = normalizeVisualStyle(visualStyle);
  const normalizedForm = form === 'alt' ? 'alt' : 'robot';
  return profile.images[style][normalizedForm];
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
