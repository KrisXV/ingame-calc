/* eslint-disable max-len */

import {inGens} from './helper';

describe('calc', () => {
  inGens(9, 9, ({gen, calculate, Pokemon, Move, Field}) => {
    test('Mega Feraligatr vs. Krokorok', () => {
      const result = calculate(Pokemon('Feraligatr-Mega', {nature: 'Adamant', evs: {atk: 252}}), Pokemon('Krokorok', {evs: {def: 16}, level: 26}), Move('Aqua Jet', {usePlus: true}));
      expect((result.damage as number[])[5]).toBe(771);
    });
    test('Chesnaught Close Combat vs. Rogue Tyranitar-Mega', () => {
      const result = calculate(Pokemon('Chesnaught', {nature: 'Hardy', evs: {atk: 116}}), Pokemon('Tyranitar-Mega', {level: 59, isRogueMega: true}), Move('Close Combat'));
      expect((result.damage as number[])[2]).toBe(97);
    });
    test('Chesnaught Brick Break+ vs. Rogue Tyranitar-Mega', () => {
      const result = calculate(Pokemon('Chesnaught', {nature: 'Hardy', evs: {atk: 116}}), Pokemon('Tyranitar-Mega', {level: 59, isRogueMega: true}), Move('Brick Break', {usePlus: true}));
      expect((result.damage as number[])[3]).toBe(268);
    });
    test('Excadrill Drill Run vs. Boss Rush Gengar-Mega', () => {
      const result = calculate(Pokemon('Excadrill'), Pokemon('Gengar-Mega', {level: 62, ivs: {def: 0}, isRogueMega: true, rogueMegaQuest: 'endgame'}), Move('Drill Run'));
      expect((result.damage as number[])[12]).toBe(404);
    });
    test('Excadrill Drill Run vs. Ange', () => {
      const result = calculate(Pokemon('Excadrill'), Pokemon('Ange'), Move('Drill Run'));
      expect((result.damage as number[])[15]).toBe(4319);
    });
    test('Pidgeot Hurricane vs. Ange', () => {
      const result = calculate(Pokemon('Pidgeot', {evs: {spa: 180}}), Pokemon('Ange'), Move('Hurricane'));
      expect((result.damage as number[])[15]).toBe(4290);
    });
    test('Feraligatr Aqua Jet in Rain', () => {
      const result = calculate(Pokemon('Feraligatr', {nature: 'Adamant', evs: {atk: 252}}), Pokemon('Pichu', {level: 3, evs: {def: 156}}), Move('Aqua Jet'), Field({weather: 'Rain'}));
      expect((result.damage as number[])[0]).toBe(1143);
    });
  });
});
