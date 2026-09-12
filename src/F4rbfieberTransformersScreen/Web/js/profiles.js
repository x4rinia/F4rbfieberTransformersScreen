export const PROFILES = Object.freeze({
  grimlock: {
    id: 'grimlock',
    name: 'GRIMLOCK',
    faction: 'DINOBOT',
    primary: '#a9782d',
    secondary: '#30383d',
    accent: '#d0a247',
    ink: '#f3e6cf',
    robotImage: 'assets/grimlock-robot.png',
    altImage: 'assets/grimlock-trex.png',
    altLabel: 'T-REX',
    factionLogo: 'assets/dinobot-emblem.png'
  },
  hound: {
    id: 'hound',
    name: 'HOUND',
    faction: 'AUTOBOT',
    primary: '#687548',
    secondary: '#4a4137',
    accent: '#ad7b45',
    ink: '#ece7d2',
    robotImage: 'assets/hound-robot.png',
    altImage: 'assets/hound-truck.png',
    altLabel: 'MILITÄR-LKW',
    factionLogo: 'assets/autobot-emblem.png'
  },
  optimus: {
    id: 'optimus',
    name: 'OPTIMUS PRIME',
    faction: 'AUTOBOT',
    primary: '#1559d6',
    secondary: '#f02f3d',
    accent: '#55a6ff',
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
    primary: '#d6dbe2',
    secondary: '#747d87',
    accent: '#761d3b',
    ink: '#f8f9fb',
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
