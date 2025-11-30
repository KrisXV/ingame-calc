import type {Natures, Generation, TypeName, StatID, StatsTable} from './data/interface';
import {toID} from './util';

const RBY: Array<StatID | 'spc'> = ['hp', 'atk', 'def', 'spc', 'spe'];
const GSC: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const ADV: StatID[] = GSC;
const DPP: StatID[] = GSC;
const BW: StatID[] = GSC;
const XY: StatID[] = GSC;
const SM: StatID[] = GSC;
const SS: StatID[] = GSC;
const SV: StatID[] = GSC;

export const STATS: Array<Array<StatID | 'spc'> | StatID[]> =
  [[], RBY, GSC, ADV, DPP, BW, XY, SM, SS, SV];

type HPTypeName = Exclude<TypeName, 'Normal' | 'Fairy' | 'Stellar' | '???'>;

const HP_TYPES = [
  'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
  'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
];

const HP: {[type in HPTypeName]: {ivs: Partial<StatsTable>; dvs: Partial<StatsTable>}} = {
  Bug: {ivs: {atk: 30, def: 30, spd: 30}, dvs: {atk: 13, def: 13}},
  Dark: {ivs: {}, dvs: {}},
  Dragon: {ivs: {atk: 30}, dvs: {def: 14}},
  Electric: {ivs: {spa: 30}, dvs: {atk: 14}},
  Fighting: {ivs: {def: 30, spa: 30, spd: 30, spe: 30}, dvs: {atk: 12, def: 12}},
  Fire: {ivs: {atk: 30, spa: 30, spe: 30}, dvs: {atk: 14, def: 12}},
  Flying: {ivs: {hp: 30, atk: 30, def: 30, spa: 30, spd: 30}, dvs: {atk: 12, def: 13}},
  Ghost: {ivs: {def: 30, spd: 30}, dvs: {atk: 13, def: 14}},
  Grass: {ivs: {atk: 30, spa: 30}, dvs: {atk: 14, def: 14}},
  Ground: {ivs: {spa: 30, spd: 30}, dvs: {atk: 12}},
  Ice: {ivs: {atk: 30, def: 30}, dvs: {def: 13}},
  Poison: {ivs: {def: 30, spa: 30, spd: 30}, dvs: {atk: 12, def: 14}},
  Psychic: {ivs: {atk: 30, spe: 30}, dvs: {def: 12}},
  Rock: {ivs: {def: 30, spd: 30, spe: 30}, dvs: {atk: 13, def: 12}},
  Steel: {ivs: {spd: 30}, dvs: {atk: 13}},
  Water: {ivs: {atk: 30, def: 30, spa: 30}, dvs: {atk: 14, def: 13}},
};

export const Stats = new (class {
  displayStat(stat: StatID | 'spc') {
    switch (stat) {
    case 'hp':
      return 'HP';
    case 'atk':
      return 'Atk';
    case 'def':
      return 'Def';
    case 'spa':
      return 'SpA';
    case 'spd':
      return 'SpD';
    case 'spe':
      return 'Spe';
    case 'spc':
      return 'Spc';
    default:
      throw new Error(`unknown stat ${stat}`);
    }
  }

  shortForm(stat: StatID | 'spc') {
    switch (stat) {
    case 'hp':
      return 'hp';
    case 'atk':
      return 'at';
    case 'def':
      return 'df';
    case 'spa':
      return 'sa';
    case 'spd':
      return 'sd';
    case 'spe':
      return 'sp';
    case 'spc':
      return 'sl';
    }
  }

  getHPDV(ivs: {atk: number; def: number; spe: number; spc: number}) {
    return (
      (this.IVToDV(ivs.atk) % 2) * 8 +
      (this.IVToDV(ivs.def) % 2) * 4 +
      (this.IVToDV(ivs.spe) % 2) * 2 +
      (this.IVToDV(ivs.spc) % 2)
    );
  }

  IVToDV(iv: number) {
    return Math.floor(iv / 2);
  }

  DVToIV(dv: number) {
    return dv * 2;
  }

  DVsToIVs(dvs: Readonly<Partial<StatsTable>>) {
    const ivs: Partial<StatsTable> = {};
    let dv: StatID;
    for (dv in dvs) {
      ivs[dv] = Stats.DVToIV(dvs[dv]!);
    }
    return ivs;
  }

  calcStat(
    gen: Generation,
    stat: StatID,
    base: number,
    iv: number,
    ev: number,
    level: number,
    nature?: string,
    isAlpha = false,
    isAlphaReboot = false,
    isRogueMega: string | boolean = false,
    rogueMegaQuest: 'yveltal' | 'endgame' | 'simulator' | boolean = false
  ) {
    if (gen.num < 1 || gen.num > 9) throw new Error(`Invalid generation ${gen.num}`);
    if (gen.num < 3) return this.calcStatRBY(stat, base, iv, level);
    return this.calcStatADV(
      gen.natures, stat, base, iv, ev, level, nature,
      isAlpha, isAlphaReboot, isRogueMega, rogueMegaQuest
    );
  }

  getRogueMegaModifier(
    rogueMega: string | boolean,
    postGame: 'yveltal' | 'simulator' | 'endgame' | boolean = false
  ) {
    const ROGUE_MEGAS: {[k: string]: {[k: string]: number}} = {
      'Absol-Mega': {hp: postGame === 'simulator' ? 20 : 22},
      'Slowbro-Mega': {hp: postGame === 'simulator' ? 20 : 11},
      'Camerupt-Mega': {hp: postGame === 'simulator' ? 20 : 12},
      'Victreebel-Mega': {hp: postGame === 'simulator' ? 20 : postGame === 'yveltal' ? 17 : 12},
      'Beedrill-Mega': {hp: postGame === 'simulator' ? 24 : 20},
      'Hawlucha-Mega': {
        hp: postGame === 'simulator' ? 20 : postGame === 'yveltal' ? 17 : 13,
        spa: 1.3,
      },
      'Banette-Mega': {hp: postGame === 'simulator' ? 20 : 12},
      'Ampharos-Mega': {hp: postGame === 'simulator' ? 20 : 14},
      'Barbaracle-Mega': {hp: postGame === 'simulator' ? 20 : 14},
      'Mawile-Mega': {hp: postGame === 'simulator' ? 20 : 14},
      'Froslass-Mega': {hp: postGame === 'simulator' ? 20 : 18},
      'Altaria-Mega': {hp: postGame === 'simulator' ? 20 : 14},
      'Venusaur-Mega': {hp: postGame === 'simulator' ? 20 : 18},
      'Dragonite-Mega': {hp: postGame === 'simulator' ? 20 : 16},
      'Tyranitar-Mega': {hp: postGame === 'simulator' ? 20 : postGame === 'yveltal' ? 17 : 16},
      'Starmie-Mega': {hp: postGame === 'simulator' ? 20 : 18},
      'Zygarde-10%': {hp: 10, atk: 2, spa: 2},
      'Zygarde': {hp: 12, atk: 2, spa: 1.5},
      'Zygarde-Complete': {hp: 12, atk: 2, spa: 2},
    };
    const ENDGAME_MEGAS: {[k: string]: {[k: string]: number}} = {
      'Gengar-Mega': {hp: 12},
      'Heracross-Mega': {hp: 10},
      'Kangaskhan-Mega': {hp: 8},
      'Pidgeot-Mega': {hp: 8},
      'Garchomp-Mega': {hp: 6},
      'Blastoise-Mega': {hp: 10},
      'Steelix-Mega': {hp: 6},
      'Salamence-Mega': {hp: 6},
      'Aggron-Mega': {hp: 6},
      'Gardevoir-Mega': {hp: 12},
      'Gallade-Mega': {hp: 10},
      'Metagross-Mega': {hp: 12},
      'Aerodactyl-Mega': {hp: 12},
      'Alakazam-Mega': {hp: 12},
    };
    if (!rogueMega || typeof rogueMega !== 'string') return {hp: 1};
    return ROGUE_MEGAS[rogueMega] || ENDGAME_MEGAS[rogueMega] || {hp: 1};
  }

  calcStatADV(
    natures: Natures,
    stat: StatID,
    base: number,
    iv: number,
    ev: number,
    level: number,
    nature?: string,
    isAlpha = false,
    isAlphaReboot = false,
    isRogueMega: string | boolean = false,
    isPostGameRogueMega: 'yveltal' | 'simulator' | 'endgame' | boolean = false,
  ) {
    const rogueMegaModifier = this.getRogueMegaModifier(isRogueMega, isPostGameRogueMega);
    const alphaModifier = 2;
    if (stat === 'hp') {
      if (isRogueMega === 'Ange') return 25000;
      return base === 1
        ? base
        : rogueMegaModifier.hp *
          (isAlpha ? alphaModifier : 1) *
          Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
      if (isRogueMega === 'Ange' && (stat === 'def' || stat === 'spd')) return 5;
      let mods: [StatID?, StatID?] = [undefined, undefined];
      if (nature) {
        const nat = natures.get(toID(nature));
        mods = [nat?.plus, nat?.minus];
      }
      const n =
        mods[0] === stat && mods[1] === stat
          ? 1
          : mods[0] === stat
            ? 1.1
            : mods[1] === stat
              ? 0.9
              : 1;

      return (rogueMegaModifier[stat] || 1) * (isAlpha && !isAlphaReboot ? alphaModifier : 1) *
        Math.floor((Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5) * n);
    }
  }

  calcStatRBY(stat: StatID, base: number, iv: number, level: number) {
    return this.calcStatRBYFromDV(stat, base, this.IVToDV(iv), level);
  }

  calcStatRBYFromDV(stat: StatID, base: number, dv: number, level: number) {
    if (stat === 'hp') {
      return Math.floor((((base + dv) * 2 + 63) * level) / 100) + level + 10;
    } else {
      return Math.floor((((base + dv) * 2 + 63) * level) / 100) + 5;
    }
  }

  getHiddenPowerIVs(gen: Generation, hpType: HPTypeName) {
    const hp = HP[hpType];
    if (!hp) return undefined;
    return gen.num === 2 ? Stats.DVsToIVs(hp.dvs) : hp.ivs;
  }

  getHiddenPower(gen: Generation, ivs: StatsTable) {
    const tr = (num: number, bits = 0) => {
      if (bits) return (num >>> 0) % (2 ** bits);
      return num >>> 0;
    };
    const stats = {hp: 31, atk: 31, def: 31, spe: 31, spa: 31, spd: 31};
    if (gen.num <= 2) {
      // Gen 2 specific Hidden Power check. IVs are still treated 0-31 so we get them 0-15
      const atkDV = tr(ivs.atk / 2);
      const defDV = tr(ivs.def / 2);
      const speDV = tr(ivs.spe / 2);
      const spcDV = tr(ivs.spa / 2);
      return {
        type: HP_TYPES[4 * (atkDV % 4) + (defDV % 4)] as TypeName,
        power: tr(
          (5 * ((spcDV >> 3) +
            (2 * (speDV >> 3)) +
            (4 * (defDV >> 3)) +
            (8 * (atkDV >> 3))) +
            (spcDV % 4)) / 2 + 31
        ),
      };
    } else {
      // Hidden Power check for Gen 3 onwards
      let hpTypeX = 0;
      let hpPowerX = 0;
      let i = 1;
      for (const s in stats) {
        hpTypeX += i * (ivs[s as StatID] % 2);
        hpPowerX += i * (tr(ivs[s as StatID] / 2) % 2);
        i *= 2;
      }
      return {
        type: HP_TYPES[tr(hpTypeX * 15 / 63)] as TypeName,
        // After Gen 6, Hidden Power is always 60 base power
        power: (gen.num && gen.num < 6) ? tr(hpPowerX * 40 / 63) + 30 : 60,
      };
    }
  }
})();
