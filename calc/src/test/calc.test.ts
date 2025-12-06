/* eslint-disable max-len */

import {inGens} from './helper';

describe('calc', () => {
  inGens(9, 9, ({calculate, Pokemon, Move, Field}) => {
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
    test('Talonflame Flame Wheel in Rain', () => {
      const result = calculate(Pokemon('Talonflame', {evs: {atk: 92}}), Pokemon('Pichu', {level: 3, evs: {def: 156}}), Move('Flame Wheel'), Field({weather: 'Rain'}));
      expect((result.damage as number[])[0]).toBe(994);
    });
    test('Garchomp Earthquake+ through Protect', () => {
      const result = calculate(Pokemon('Garchomp', {level: 81, nature: 'Adamant', evs: {atk: 252}, boosts: {atk: 1}}), Pokemon('Blastoise'), Move('Earthquake', {usePlus: true}), Field({defenderSide: {isProtected: true}}));
      expect((result.damage as number[])[3]).toBe(38);
    });
    test('Rogue Dragonite-Mega Outrage', () => {
      const result = calculate(Pokemon('Dragonite-Mega', {level: 59, isRogueMega: true}), Pokemon('Pikachu', {level: 60}), Move('Outrage (B)'));
      expect((result.damage as number[])[8]).toBe(21);
    });
    test('Feraligatr Ice Fang vs. Boss Zygarde-10%', () => {
      const result = calculate(Pokemon('Feraligatr', {evs: {atk: 156}}), Pokemon('Zygarde-10%', {level: 84, isRogueMega: true, ivs: {def: 15}, boosts: {def: -1}}), Move('Ice Fang'));
      expect((result.damage as number[])[13]).toBe(297);
    });
    test('Lv. 50 +1 Red Item 200 Atk Garchomp Dragon Rush vs. Metagross', () => {
      const result = calculate(Pokemon('Garchomp', {level: 50, nature: 'Adamant', evs: {atk: 252}, boosts: {atk: 1}}), Pokemon('Metagross', {level: 50}), Move('Dragon Rush'), Field({attackerSide: {redItem: true}}));
      expect((result.damage as number[])[2]).toBe(96);
    });
    test('Eevee Heat Crash vs. Ange', () => {
      const result = calculate(Pokemon('Eevee', {ivs: {atk: 2}}), Pokemon('Ange'), Move('Heat Crash'));
      expect((result.damage as number[])[14]).toBe(1635);
    });
    test('Sneak Attack Life Orb Delphox vs. Slowbro', () => {
      const result = calculate(Pokemon('Delphox', {item: 'Life Orb', nature: 'Modest', evs: {spa: 252}}), Pokemon('Slowbro', {level: 50, evs: {def: 100}}), Move('Psyshock', {isCrit: true}));
      expect((result.damage as number[])[5]).toBe(186);
    });
    test('Boss Zygarde-50% Dark Pulse vs. Mega Altaria', () => {
      const result = calculate(Pokemon('Zygarde', {level: 84, isRogueMega: true, nature: 'Quiet'}), Pokemon('Altaria-Mega', {evs: {spd: 96}}), Move('Dragon Pulse (B)'));
      expect((result.damage as number[])[10]).toBe(1);
    });
    test('Wild Alpha Delibird Ice Punch vs. Yache Berry Garchomp', () => {
      const result = calculate(Pokemon('Delibird', {level: 44, isAlpha: true, ivs: {atk: 19}}), Pokemon('Garchomp', {level: 82, item: 'Yache Berry'}), Move('Ice Punch'));
      expect((result.damage as number[])[3]).toBe(35);
    });
  });
});
