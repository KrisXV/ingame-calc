/* eslint-disable max-len */

// import type {AbilityName, Terrain, Weather} from '../data/interface';
import {inGens} from './helper';

describe('calc', () => {
  inGens(9, 9, ({gen, calculate, Pokemon, Move}) => {
    test('Mega Feraligatr vs. Krokorok', () => {
      const result = calculate(Pokemon('Feraligatr-Mega', {nature: 'Adamant', evs: {atk: 252}}), Pokemon('Krokorok', {evs: {def: 16}, level: 26}), Move('Aqua Jet', {usePlus: true}));
      console.log(result.damage);
      expect((result.damage as number[])[5]).toBe(771);
    });
  });
});
