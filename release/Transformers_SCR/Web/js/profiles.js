export const PROFILES = Object.freeze({
  optimus: {
    id: 'optimus',
    name: 'OPTIMUS PRIME',
    faction: 'AUTOBOT',
    primary: '#ef3340',
    secondary: '#1769e8',
    accent: '#59baff',
    ink: '#e9f7ff',
    robotImage: 'assets/optimus-robot.png',
    altImage: 'assets/optimus-truck.png',
    altLabel: 'TRUCK',
    factionLogo: 'assets/autobot-emblem.png'
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'BUMBLEBEE',
    faction: 'AUTOBOT',
    primary: '#ffd000',
    secondary: '#121416',
    accent: '#ffb800',
    ink: '#fff4ad',
    robotImage: 'assets/bumblebee-robot.png',
    altImage: 'assets/bumblebee-car.png',
    altLabel: 'SPORTWAGEN',
    factionLogo: 'assets/autobot-emblem.png'
  },
  grimlock: {
    id: 'grimlock',
    name: 'GRIMLOCK',
    faction: 'AUTOBOT',
    primary: '#aebbb3',
    secondary: '#4d8060',
    accent: '#78d59a',
    ink: '#effff4',
    robotImage: 'assets/grimlock-robot.png',
    altImage: 'assets/grimlock-trex.png',
    altLabel: 'T-REX',
    factionLogo: 'assets/autobot-emblem.png'
  },
  megatron: {
    id: 'megatron',
    name: 'MEGATRON',
    faction: 'DECEPTICON',
    primary: '#9d4edd',
    secondary: '#555d69',
    accent: '#c66cff',
    ink: '#f2edff',
    robotImage: 'assets/megatron-robot.png',
    altImage: 'assets/megatron-tank.png',
    altLabel: 'CYBERTRON-PANZER',
    factionLogo: 'assets/decepticon-emblem.png'
  }
});

export function getProfile(id) {
  return PROFILES[String(id || '').toLowerCase()] || PROFILES.optimus;
}
