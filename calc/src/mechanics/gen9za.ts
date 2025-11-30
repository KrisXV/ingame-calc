import type {Generation, AbilityName} from '../data/interface';
import {toID} from '../util';
import {
  getBerryResistType,
} from '../items';
import type {RawDesc} from '../desc';
import type {Field} from '../field';
import type {Move} from '../move';
import type {Pokemon} from '../pokemon';
import {Result} from '../result';
import {
  chainMods,
  checkItem,
  checkMultihitBoost,
  computeFinalStatsZA,
  getBaseDamage,
  getStatDescriptionText,
  getFinalDamage,
  getFinalDamageFloat,
  getModifiedStat,
  getMoveEffectiveness,
  getWeight,
  handleFixedDamageMoves,
  OF16, OF32,
  pokeRound,
  getStabMod,
} from './util';

export function calculateZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  // #region Initial

  checkItem(attacker, field.isMagicRoom);
  checkItem(defender, field.isMagicRoom);

  computeFinalStatsZA(gen, attacker, defender, field, 'atk', 'def', 'spa', 'spd', 'spe');

  const desc: RawDesc = {
    attackerName: attacker.name,
    moveName: move.name,
    defenderName: defender.name,
  };

  const result = new Result(gen, attacker, defender, move, field, 0, desc);

  const breaksProtect = move.breaksProtect;

  if (field.defenderSide.isProtected && !(move.usePlus || attacker.name.includes('Mega'))) {
    desc.isProtected = true;
    return result;
  }

  attacker.ability = '' as AbilityName;
  defender.ability = '' as AbilityName;

  const type = move.type;
  if (move.named('Brick Break')) {
    field.defenderSide.isReflect = false;
    field.defenderSide.isLightScreen = false;
    field.defenderSide.isAuroraVeil = false;
  }

  const type1Effectiveness = getMoveEffectiveness(
    gen,
    move,
    defender.types[0],
    false,
    false,
    false
  );
  let type2Effectiveness = defender.types[1]
    ? getMoveEffectiveness(
      gen,
      move,
      defender.types[1],
      false,
      false,
      false
    )
    : 1;
  let type3Effectiveness = field.defenderSide.trickOrTreat && !defender.hasType('Ghost')
    ? getMoveEffectiveness(
      gen,
      move,
      'Ghost',
      false,
      false,
      false,
    ) : field.defenderSide.forestsCurse && !defender.hasType('Grass')
      ? getMoveEffectiveness(
        gen,
        move,
        'Grass',
        false,
        false,
        false,
      ) : 1;
  if (!defender.types[1]) {
    type2Effectiveness = type3Effectiveness;
    type3Effectiveness = 1;
  }

  let typeEffectiveness = type1Effectiveness * type2Effectiveness * type3Effectiveness;

  if (typeEffectiveness === 0 && move.named('Thousand Arrows')) {
    typeEffectiveness = 1;
  }

  if (typeEffectiveness === 0.5) typeEffectiveness = move.usePlus ? 0.72 : 0.6;
  if (typeEffectiveness === 0.25) typeEffectiveness = move.usePlus ? 0.36 : 0.3;
  if (typeEffectiveness === 0.125) typeEffectiveness = move.usePlus ? 0.18 : 0.15;
  if (typeEffectiveness === 1 && move.usePlus) typeEffectiveness = 1.2;
  if (typeEffectiveness === 2 && move.usePlus) typeEffectiveness = 2.6;
  if (typeEffectiveness === 4 && move.usePlus) typeEffectiveness = 5.2;
  if (typeEffectiveness === 8 && move.usePlus) typeEffectiveness = 10.4;

  if (typeEffectiveness === 0 && attacker.isRogueMega) typeEffectiveness = 0.3;

  if (typeEffectiveness === 0) {
    return result;
  }

  desc.HPEVs = getStatDescriptionText(gen, defender, 'hp');

  const fixedDamage = handleFixedDamageMoves(attacker, move);
  if (fixedDamage) {
    if (attacker.hasAbility('Parental Bond')) {
      result.damage = [fixedDamage, fixedDamage];
      desc.attackerAbility = attacker.ability;
    } else {
      result.damage = fixedDamage;
    }
    return result;
  }

  if (move.named('Final Gambit')) {
    result.damage = attacker.curHP();
    return result;
  }

  if (move.named('Guardian of Alola')) {
    let zLostHP = Math.floor((defender.curHP() * 3) / 4);
    if (field.defenderSide.isProtected && attacker.item && attacker.item.includes(' Z')) {
      zLostHP = Math.ceil(zLostHP / 4 - 0.5);
    }
    result.damage = zLostHP;
    return result;
  }

  if (move.named('Nature\'s Madness')) {
    const lostHP = field.defenderSide.isProtected ? 0 : Math.floor(defender.curHP() / 2);
    result.damage = lostHP;
    return result;
  }

  if (move.hits > 1) {
    desc.hits = move.hits;
  }

  // #endregion
  // #region Base Power

  const basePower = calculateBasePowerZA(
    gen,
    attacker,
    defender,
    move,
    desc
  );
  if (basePower === 0) {
    return result;
  }

  // #endregion
  // #region (Special) Attack
  const attack = calculateAttackZA(gen, attacker, defender, move, field, desc, move.isCrit);
  const attackStat =
    move.named('Body Press') ? 'def' : move.category === 'Special' ? 'spa' : 'atk';
  // #endregion

  // #region (Special) Defense

  const defense = calculateDefenseZA(gen, attacker, defender, move, field, desc, move.isCrit);

  // #endregion
  // #region Damage

  const baseDamage = calculateBaseDamageZA(
    gen,
    attacker,
    defender,
    basePower,
    attack,
    defense,
    move,
    field,
    desc,
    move.isCrit
  );

  // the random factor is applied between the crit mod and the stab mod, so don't apply anything
  // below this until we're inside the loop
  let stabMod = getStabMod(attacker, move, desc);

  const applyBurn =
    attacker.hasStatus('brn') &&
    move.category === 'Physical';
  desc.isBurned = applyBurn;
  const finalMod = calculateFinalModsZA(
    gen,
    attacker,
    defender,
    move,
    field,
    desc,
    move.isCrit,
    typeEffectiveness
  );

  let protect = false;
  if (field.defenderSide.isProtected && (move.usePlus || attacker.isRogueMega)) {
    protect = true;
    desc.isProtected = true;
  }

  const isSpread = field.gameType !== 'Singles' &&
     ['allAdjacent', 'allAdjacentFoes'].includes(move.target);

  let childDamage: number[] | undefined;
  if (attacker.hasAbility('Parental Bond') && move.hits === 1 && !isSpread) {
    const child = attacker.clone();
    child.ability = 'Parental Bond (Child)' as AbilityName;
    checkMultihitBoost(gen, child, defender, move, field, desc);
    childDamage = calculateZA(gen, child, defender, move, field).damage as number[];
    desc.attackerAbility = attacker.ability;
  }

  const damage = [];
  for (let i = 0; i < 16; i++) {
    damage[i] =
      getFinalDamageFloat(baseDamage, i, typeEffectiveness, applyBurn, stabMod, finalMod, protect);
  }
  result.damage = childDamage ? [damage, childDamage] : damage;

  desc.attackBoost = attacker.boosts[attackStat];

  if (move.timesUsed! > 1 || move.hits > 1) {
    // store boosts so intermediate boosts don't show.
    const origDefBoost = desc.defenseBoost;
    const origAtkBoost = desc.attackBoost;

    let numAttacks = 1;
    if (move.timesUsed! > 1) {
      desc.moveTurns = `over ${move.timesUsed} turns`;
      numAttacks = move.timesUsed!;
    } else {
      numAttacks = move.hits;
    }
    let usedItems = [false, false];
    const damageMatrix = [damage];
    for (let times = 1; times < numAttacks; times++) {
      usedItems = checkMultihitBoost(gen, attacker, defender, move,
        field, desc, usedItems[0], usedItems[1]);
      const newAttack = calculateAttackZA(gen, attacker, defender, move,
        field, desc, move.isCrit);
      const newDefense = calculateDefenseZA(gen, attacker, defender, move,
        field, desc, move.isCrit);

      if (move.timesUsed! > 1) {
        // Adaptability does not change between hits of a multihit, only between turns
        stabMod = getStabMod(attacker, move, desc);
      }

      const newBasePower = calculateBasePowerZA(
        gen,
        attacker,
        defender,
        move,
        desc
      );
      const newBaseDamage = calculateBaseDamageZA(
        gen,
        attacker,
        defender,
        newBasePower,
        newAttack,
        newDefense,
        move,
        field,
        desc,
        move.isCrit
      );
      const newFinalMod = calculateFinalModsZA(
        gen,
        attacker,
        defender,
        move,
        field,
        desc,
        move.isCrit,
        typeEffectiveness,
        times
      );

      const damageArray = [];
      for (let i = 0; i < 16; i++) {
        const newFinalDamage = getFinalDamageFloat(
          newBaseDamage,
          i,
          typeEffectiveness,
          applyBurn,
          stabMod,
          newFinalMod,
          protect
        );
        damageArray[i] = newFinalDamage;
      }
      damageMatrix[times] = damageArray;
    }
    result.damage = damageMatrix;
    desc.defenseBoost = origDefBoost;
    desc.attackBoost = origAtkBoost;
  }


  // #endregion

  return result;
}

export function calculateBasePowerZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  desc: RawDesc
) {
  let basePower: number;

  switch (move.name) {
  case 'Low Kick':
  case 'Grass Knot':
    const w = getWeight(defender, desc, 'defender');
    basePower = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20;
    desc.moveBP = basePower;
    break;
  case 'Barb Barrage':
    basePower = move.bp * (defender.hasStatus('psn', 'tox') ? 2 : 1);
    desc.moveBP = basePower;
    break;
  case 'Heavy Slam':
  case 'Heat Crash':
    const wr =
        getWeight(attacker, desc, 'attacker') /
        getWeight(defender, desc, 'defender');
    basePower = wr >= 5 ? 120 : wr >= 4 ? 100 : wr >= 3 ? 80 : wr >= 2 ? 60 : 40;
    if (defender.named('Ange Flower')) basePower = 120;
    desc.moveBP = basePower;
    break;
  case 'Water Shuriken':
    basePower = move.usePlus || attacker.name.includes('Mega') ? 75 : 15;
    desc.moveBP = basePower;
    break;
  default:
    basePower = move.bp;
  }
  if (basePower === 0) {
    return 0;
  }
  if (move.usePlus ||
    (attacker.name.includes('Mega') && !attacker.isRogueMega)) desc.plusMove = true;
  const bpMods = calculateBPModsZA(
    gen,
    attacker,
    defender,
    move,
    desc,
    basePower
  );
  basePower = OF16(Math.max(1, pokeRound((basePower * chainMods(bpMods, 41, 2097152)) / 4096)));
  return basePower;
}

export function calculateBPModsZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  desc: RawDesc,
  basePower: number
) {
  const bpMods = [];

  // Move effects
  const defenderItem = (defender.item && defender.item !== '')
    ? defender.item : defender.disabledItem;
  let resistedKnockOffDamage = !defenderItem ||
    (defender.name.includes('Genesect') && defenderItem.includes('Drive')) ||
    (defender.named('Groudon', 'Groudon-Primal') && defenderItem === 'Red Orb') ||
    (defender.named('Kyogre', 'Kyogre-Primal') && defenderItem === 'Blue Orb');

  // The last case only applies when the Pokemon has the Mega Stone that matches its species
  // (or when it's already a Mega-Evolution)
  if (!resistedKnockOffDamage && defenderItem) {
    const item = gen.items.get(toID(defenderItem))!;
    resistedKnockOffDamage = !!item.megaEvolves && defender.name.includes(item.megaEvolves);
    if (item.name === 'Zygardite') resistedKnockOffDamage = defender.name.includes('Zygarde');
  }

  if (move.named('Knock Off') && !resistedKnockOffDamage) {
    bpMods.push(6144);
    desc.moveBP = basePower * 1.5;
  }

  // Items

  if (attacker.hasItem(`${move.type} Gem`)) {
    bpMods.push(1.3);
    desc.attackerItem = attacker.item;
  } else if (
    (attacker.hasItem('Muscle Band') && move.category === 'Physical') ||
    (attacker.hasItem('Wise Glasses') && move.category === 'Special')
  ) {
    bpMods.push(1.1);
    desc.attackerItem = attacker.item;
  }
  return bpMods;
}

export function calculateAttackZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false
) {
  let attack: number;
  const attackStat = move.category === 'Special' ? 'spa' : 'atk';
  desc.attackEVs = getStatDescriptionText(gen, attacker, attackStat, attacker.nature);
  const attackSource = attacker;

  if (attackSource.boosts[attackStat] === 0 ||
      (isCritical && attackSource.boosts[attackStat] < 0)) {
    attack = attackSource.rawStats[attackStat];
  } else {
    attack = getModifiedStat(attackSource.rawStats[attackStat]!, attackSource.boosts[attackStat]!,
      undefined, true);
    desc.attackBoost = attackSource.boosts[attackStat];
  }
  const atMods = calculateAtModsZA(gen, attacker, defender, move, field, desc);
  attack = OF16(Math.max(1, pokeRound((attack * chainMods(atMods, 410, 131072)) / 4096)));
  return attack;
}

export function calculateAtModsZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc
) {
  const atMods = [];

  if ((attacker.hasItem('Thick Club') &&
       attacker.named('Cubone', 'Marowak', 'Marowak-Alola') &&
       move.category === 'Physical') ||
      (attacker.hasItem('Light Ball') && attacker.named('Pikachu'))
  ) {
    atMods.push(8192);
    desc.attackerItem = attacker.item;
  }
  return atMods;
}

export function calculateDefenseZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false
) {
  let defense: number;
  const hitsPhysical = move.overrideDefensiveStat === 'def' || move.category === 'Physical';
  const defenseStat = hitsPhysical ? 'def' : 'spd';
  const boosts = defender.boosts[defenseStat];
  desc.defenseEVs = getStatDescriptionText(gen, defender, defenseStat, defender.nature);

  if (boosts === 0 ||
      (isCritical && boosts > 0) ||
      move.ignoreDefensive) {
    defense = defender.rawStats[defenseStat];
  } else if (move.name === 'Nihil Light') {
    defense = defender.rawStats[defenseStat];
  } else {
    defense = getModifiedStat(defender.rawStats[defenseStat]!, boosts, undefined, true);
    desc.defenseBoost = boosts;
  }

  const dfMods = calculateDfModsZA(
    gen,
    attacker,
    defender,
    move,
    field,
    desc,
    isCritical,
    hitsPhysical
  );

  return OF16(Math.max(1, pokeRound((defense * chainMods(dfMods, 410, 131072)) / 4096)));
}

export function calculateDfModsZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false,
  hitsPhysical = false
) {
  const dfMods = [];
  if (defender.hasItem('Eviolite') ||
      (!hitsPhysical && defender.hasItem('Assault Vest'))) {
    dfMods.push(6144);
    desc.defenderItem = defender.item;
  }
  return dfMods;
}

function calculateBaseDamageZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  basePower: number,
  attack: number,
  defense: number,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false,
) {
  let baseDamage = getBaseDamage(attacker.level, basePower, attack, defense);
  const isSpread = field.gameType !== 'Singles' &&
     ['allAdjacent', 'allAdjacentFoes'].includes(move.target);
  if (isSpread) {
    baseDamage = pokeRound(OF32(baseDamage * 3072) / 4096);
  }

  if (attacker.hasAbility('Parental Bond (Child)')) {
    baseDamage = pokeRound(OF32(baseDamage * 1024) / 4096);
  }

  if (field.hasWeather('Rain')) {
    if (move.hasType('Water')) {
      baseDamage = pokeRound(OF32(baseDamage * 1.2));
      desc.weather = field.weather;
    }
    if (move.hasType('Fire')) {
      baseDamage = pokeRound(OF32(baseDamage * 0.8));
      desc.weather = field.weather;
    }
  }

  if (isCritical) {
    baseDamage = Math.floor(OF32(baseDamage * 1.5));
    desc.isCritical = isCritical;
  }

  return baseDamage;
}

export function calculateFinalModsZA(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false,
  typeEffectiveness: number,
  hitCount = 0
) {
  const finalMod = [];

  // Rogue Megas hit by non-Plus moves have a 0.3x modifier for damage dealt to them - Anubis
  if (defender.isRogueMega && !move.usePlus && !defender.name.includes('Zygarde')) {
    finalMod.push(0.3);
    desc.defenderRogueMega = true;
  }

  const moveEffectiveness = gen.types.get(toID(move.type))?.effectiveness;

  const defenderTypes = [...defender.types];
  if (field.defenderSide.trickOrTreat && !defenderTypes.includes('Ghost')) {
    defenderTypes.push('Ghost');
  }
  if (field.defenderSide.forestsCurse && !defenderTypes.includes('Grass')) {
    defenderTypes.push('Grass');
  }

  let totalEffectiveness = 1;

  for (const type of defenderTypes) {
    if (moveEffectiveness?.[type]) totalEffectiveness *= moveEffectiveness[type]!;
  }

  // megas with a >2x weakness to a move have an additional 0.63x multiplier - Anubis
  if (defender.isRogueMega && totalEffectiveness >= 4) {
    finalMod.push(0.63);
    desc.defenderRogueMega = '4x';
  }

  // screens are a 0.66x multiplier to damage - Anubis
  if (field.defenderSide.isReflect && move.category === 'Physical' &&
      !isCritical && !field.defenderSide.isAuroraVeil) {
    // doesn't stack with Aurora Veil
    finalMod.push(0.66);
    desc.isReflect = true;
  } else if (
    field.defenderSide.isLightScreen && move.category === 'Special' &&
    !isCritical && !field.defenderSide.isAuroraVeil
  ) {
    // doesn't stack with Aurora Veil
    finalMod.push(0.66);
    desc.isLightScreen = true;
  }
  // Veil isn't in Z-A, keeping this around for a potential convenience button
  if (field.defenderSide.isAuroraVeil && !isCritical) {
    finalMod.push(0.66);
    desc.isAuroraVeil = true;
  }

  if (attacker.hasItem('Expert Belt') && typeEffectiveness > 1) {
    finalMod.push(1.2);
    desc.attackerItem = attacker.item;
  } else if (attacker.hasItem('Life Orb')) {
    finalMod.push(1.3);
    desc.attackerItem = attacker.item;
  }

  // Overall 0.7x modifier
  finalMod.push(0.7);

  if (move.hasType(getBerryResistType(defender.item)) &&
      (typeEffectiveness > 1 || move.hasType('Normal')) &&
      hitCount === 0) {
    finalMod.push(0.5);
    desc.defenderItem = defender.item;
  }

  return finalMod;
}
