import { Card, Keyword } from '../model/types';

// 1-cost
export const GOBLIN: Card = {
  name: 'Goblin',
  cost: 1,
  power: 1,
  life: 1,
  keywords: [],
  inkable: true,
  inkValue: 1,
};

export const SCOUT: Card = {
  name: 'Scout',
  cost: 1,
  power: 1,
  life: 1,
  keywords: [Keyword.Evasion],
  inkable: true,
  inkValue: 1,
};

export const SENTINEL: Card = {
  name: 'Sentinel',
  cost: 1,
  power: 0,
  life: 2,
  keywords: [Keyword.Tough],
  inkable: true,
  inkValue: 1,
};

// 2-cost
export const ORC_WARRIOR: Card = {
  name: 'Orc Warrior',
  cost: 2,
  power: 2,
  life: 2,
  keywords: [],
  inkable: true,
  inkValue: 1,
};

export const RAIDER: Card = {
  name: 'Raider',
  cost: 2,
  power: 2,
  life: 1,
  keywords: [Keyword.Cleave],
  inkable: true,
  inkValue: 1,
};

export const TIDEWALKER: Card = {
  name: 'Tidewalker',
  cost: 2,
  power: 1,
  life: 2,
  keywords: [Keyword.Tide],
  inkable: true,
  inkValue: 1,
};

export const MERCHANT: Card = {
  name: 'Merchant',
  cost: 2,
  power: 1,
  life: 1,
  keywords: [Keyword.Rich],
  inkable: true,
  inkValue: 2,
};

// 3-cost
export const OGRE: Card = {
  name: 'Ogre',
  cost: 3,
  power: 3,
  life: 2,
  keywords: [],
  inkable: true,
  inkValue: 1,
};

export const SHADOW: Card = {
  name: 'Shadow',
  cost: 3,
  power: 2,
  life: 2,
  keywords: [Keyword.Evasion],
  inkable: true,
  inkValue: 1,
};

export const BULWARK: Card = {
  name: 'Bulwark',
  cost: 3,
  power: 1,
  life: 3,
  keywords: [Keyword.Tough],
  inkable: true,
  inkValue: 1,
};

export const RECRUITER: Card = {
  name: 'Recruiter',
  cost: 3,
  power: 2,
  life: 2,
  keywords: [Keyword.Rich],
  inkable: true,
  inkValue: 2,
};

// 4-cost
export const WAR_CHIEF: Card = {
  name: 'War Chief',
  cost: 4,
  power: 3,
  life: 3,
  keywords: [],
  inkable: true,
  inkValue: 1,
};

export const ASSASSIN: Card = {
  name: 'Assassin',
  cost: 4,
  power: 3,
  life: 1,
  keywords: [Keyword.Cleave],
  inkable: true,
  inkValue: 1,
};

export const TEMPEST: Card = {
  name: 'Tempest',
  cost: 4,
  power: 2,
  life: 3,
  keywords: [Keyword.Tide],
  inkable: true,
  inkValue: 1,
};

export const LUMBERING_GIANT: Card = {
  name: 'Lumbering Giant',
  cost: 4,
  power: 4,
  life: 3,
  keywords: [Keyword.Slow],
  inkable: true,
  inkValue: 1,
};

// 5-cost
export const DRAGON: Card = {
  name: 'Dragon',
  cost: 5,
  power: 4,
  life: 4,
  keywords: [],
  inkable: false,
  inkValue: 0,
};

export const HYDRA: Card = {
  name: 'Hydra',
  cost: 5,
  power: 3,
  life: 5,
  keywords: [Keyword.Tough],
  inkable: false,
  inkValue: 0,
};

export const ALL_CARDS: Card[] = [
  GOBLIN, SCOUT, SENTINEL,
  ORC_WARRIOR, RAIDER, TIDEWALKER, MERCHANT,
  OGRE, SHADOW, BULWARK, RECRUITER,
  WAR_CHIEF, ASSASSIN, TEMPEST, LUMBERING_GIANT,
  DRAGON, HYDRA,
];
