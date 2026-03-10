import { Card } from '../model/types';
import { GOBLIN } from './cards';

function makeDeck(card: Card, count: number): Card[] {
  return Array.from({ length: count }, () => ({ ...card }));
}

export const DEFAULT_DECK_1: Card[] = makeDeck(GOBLIN, 20);
export const DEFAULT_DECK_2: Card[] = makeDeck(GOBLIN, 20);
