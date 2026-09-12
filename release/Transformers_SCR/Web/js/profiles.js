export const PROFILES = Object.freeze({
  grimlock: {
    id: 'grimlock',
    name: 'GRIMLOCK',
    faction: 'DINOBOT',
    primary: '#f2f4f1',
    secondary: '#aeb4b0',
    accent: '#d6b660',
    ink: '#ffffff',
    robotImage: 'assets/grimlock-robot.png',
    altImage: 'assets/grimlock-trex.png',
    altLabel: 'T-REX',
    factionLogo: 'assets/dinobot-emblem.png'
  },
  hound: {
    id: 'hound',
    name: 'HOUND',
    faction: 'AUTOBOT',
    primary: '#5d9139',
    secondary: '#284b31',
    accent: '#8fce55',
    ink: '#effbe6',
    robotImage: 'assets/hound-robot.png',
    altImage: 'assets/hound-truck.png',
    altLabel: 'MILITÄR-LKW',
    factionLogo: 'assets/autobot-emblem.png'
  },
  optimus: {
    id: 'optimus',
    name: 'OPTIMUS PRIME',
    faction: 'AUTOBOT',
    primary: '#174fbd',
    secondary: '#ef2b3b',
    accent: '#4d8cff',
    ink: '#edf6ff',
    robotImage: 'assets/optimus-robot.png',
    altImage: 'assets/optimus-truck.png',
    altLabel: 'TRUCK',
    factionLogo: 'assets/autobot-emblem.png'
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'BUMBLEBEE',
    faction: 'AUTOBOT',
    primary: '#ffdc25',
    secondary: '#353a3f',
    accent: '#fff08a',
    ink: '#fff9cf',
    robotImage: 'assets/bumblebee-robot.png',
    altImage: 'assets/bumblebee-car.png',
    altLabel: 'SPORTWAGEN',
    factionLogo: 'assets/autobot-emblem.png'
  },
  megatron: {
    id: 'megatron',
    name: 'MEGATRON',
    faction: 'DECEPTICON',
    primary: '#2b2c30',
    secondary: '#0f1115',
    accent: '#8a0f2b',
    ink: '#e8e8e8',
    robotImage: 'assets/megatron-robot.png',
    altImage: 'assets/megatron-tank.png',
    altLabel: 'CYBERTRON-PANZER',
    factionLogo: 'assets/decepticon-emblem.png'
  },
  shockwave: {
    id: 'shockwave',
    name: 'SHOCKWAVE',
    faction: 'DECEPTICON',
    primary: '#4b1778',
    secondary: '#281039',
    accent: '#ff2bd6',
    ink: '#f7eaff',
    robotImage: 'assets/shockwave-robot.png',
    altImage: 'assets/shockwave-tank.png',
    altLabel: 'CYBERTRON-HOVERTANK',
    factionLogo: 'assets/decepticon-emblem.png'
  }
});

export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));

export function getProfile(id) {
  return PROFILES[String(id || '').toLowerCase()] || PROFILES.optimus;
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
