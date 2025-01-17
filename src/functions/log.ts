import { arrayToString } from "./array";
import { getCollectibleName } from "./collectibles";
import { hasFlag } from "./flag";
import { getTrinketName } from "./trinkets";

/**
 * Helper function to prefix the name of the function and the line number before a debug message.
 */
export function getDebugPrependString(
  msg: string,
  // We use 3 as a default because:
  // 1 - getDebugPrependString
  // 2 - calling function
  // 3 - the function that calls the calling function
  numParentFunctions = 3,
): string {
  if (debug !== undefined) {
    // The --luadebug launch flag is enabled
    const debugTable = debug.getinfo(numParentFunctions);
    if (debugTable !== undefined) {
      return `${debugTable.name}:${debugTable.linedefined} - ${msg}`;
    }
  }

  if (getParentFunctionDescription !== undefined) {
    // The Racing+ sandbox is enabled
    return `${getParentFunctionDescription(numParentFunctions + 1)} - ${msg}`;
  }

  return msg;
}

/**
 * Helper function to avoid typing out `Isaac.DebugString()`. If you have the --luadebug launch flag
 * turned on or the Racing+ sandbox enabled, then this function will also prepend the function name
 * and the line number before the string.
 */
export function log(this: void, msg: string): void {
  const debugMsg = getDebugPrependString(msg);
  Isaac.DebugString(debugMsg);
}

/** Helper function for printing out every damage flag that is turned on. Helpful when debugging. */
export function logAllDamageFlags(this: void, flags: int): void {
  logAllFlags(flags, DamageFlag as unknown as LuaTable, "damage");
}

/** Helper function for printing out every entity flag that is turned on. Helpful when debugging. */
export function logAllEntityFlags(this: void, flags: int): void {
  logAllFlags(flags, EntityFlag as unknown as LuaTable, "entity");
}

/** Helper function for printing out every flag that is turned on. Helpful when debugging. */
export function logAllFlags(
  this: void,
  flags: int,
  flagEnum: LuaTable,
  description = "",
): void {
  if (description !== "") {
    description += " ";
  }

  log(`Logging all ${description}flags:`);
  let hasNoFlags = true;
  let i = 1;
  for (const [key, value] of pairs(flagEnum)) {
    if (hasFlag(flags, value as int)) {
      log(`  ${i}) Has flag: ${key} (${value})`);
      hasNoFlags = false;
    }

    i += 1;
  }

  if (hasNoFlags) {
    log("  n/a (no flags)");
  }
}

/**
 * Helper function for printing out every game state flag that is turned on. Helpful when debugging.
 */
export function logAllGameStateFlags(this: void): void {
  const game = Game();

  log("Logging all game state flags:");
  let hasNoFlags = true;
  let i = 1;
  for (const [key, value] of pairs(GameStateFlag)) {
    const gameStateFlag = value as GameStateFlag;
    const flagValue = game.GetStateFlag(gameStateFlag);
    if (flagValue) {
      log(`  ${i}) Has flag: ${key} (${value})`);
      hasNoFlags = false;
    }

    i += 1;
  }

  if (hasNoFlags) {
    log("  n/a (no flags)");
  }
}

/**
 * Helper function for printing out every projectile flag that is turned on. Helpful when debugging.
 */
export function logAllProjectileFlags(this: void, flags: int): void {
  logAllFlags(flags, ProjectileFlags as unknown as LuaTable, "projectile");
}

/**
 * Helper function for printing out every seed effect (i.e. Easter Egg) that is turned on for the
 * particular run.
 */
export function logAllSeedEffects(this: void): void {
  const game = Game();
  const seeds = game.GetSeeds();

  log("Logging all seed effects:");
  let hasNoSeedEffects = true;
  let i = 1;
  for (const [key, value] of pairs(SeedEffect)) {
    const seedEffect = value as SeedEffect;
    if (seeds.HasSeedEffect(seedEffect)) {
      log(`  ${i}) ${key} (${value})`);
      hasNoSeedEffects = false;
    }

    i += 1;
  }

  if (hasNoSeedEffects) {
    log("  n/a (no seed effects)");
  }
}

/** Helper function for printing out every use flag that is turned on. Helpful when debugging. */
export function logAllTearFlags(this: void, flags: int): void {
  logAllFlags(flags, TearFlags as unknown as LuaTable, "tear");
}

/** Helper function for printing out every use flag that is turned on. Helpful when debugging. */
export function logAllUseFlags(this: void, flags: int): void {
  logAllFlags(flags, UseFlag as unknown as LuaTable, "use");
}

export function logArray<T>(this: void, array: T[]): void {
  const arrayString = arrayToString(array);
  log(`Array: ${arrayString}`);
}

export function logColor(this: void, color: Color): void {
  log(
    `Color: R${color.R}, G${color.G}, B${color.B}, A${color.A}, RO${color.RO}, BO${color.BO}, GO${color.GO}`,
  );
}

export function logEntity(this: void, entity: Entity): void {
  log(`Entity: ${entity.Type}.${entity.Variant}.${entity.SubType}`);
}

export function logKColor(this: void, kColor: KColor): void {
  log(
    `Color: R${kColor.Red}, G${kColor.Green}, B${kColor.Blue}, A${kColor.Alpha}`,
  );
}

export function logMap(this: void, map: Map<AnyNotNil, unknown>): void {
  log("Printing out a TSTL Map:");
  for (const [key, value] of map.entries()) {
    log(`  Key: ${key}, Value: ${value}`);
  }
  log(`The size of the map was: ${map.size}`);
}

export function logTable(this: void, table: unknown): void {
  log("Printing out a Lua table:");
  for (const [key, value] of pairs(table)) {
    log(`  Key: ${key}, Value: ${value}`);
  }
}

export function logTemporaryEffects(this: void, player: EntityPlayer): void {
  const effects = player.GetEffects();
  const effectsList = effects.GetEffectsList();

  log("Logging all player temporary effects:");

  if (effectsList.Size === 0) {
    log("  n/a (no temporary effects)");
    return;
  }

  for (let i = 0; i < effectsList.Size; i++) {
    const effect = effectsList.Get(i);
    if (effect === undefined) {
      continue;
    }

    if (effect.Item.IsCollectible()) {
      const collectibleName = getCollectibleName(effect.Item.ID);
      log(`  ${i + 1}) ${collectibleName}`);
    } else if (effect.Item.IsTrinket()) {
      const trinketName = getTrinketName(effect.Item.ID);
      log(`  ${i + 1}) ${trinketName}`);
    } else if (effect.Item.IsNull()) {
      log(`  ${i + 1}) Null item: ${effect.Item.ID}`);
    } else {
      log(`  ${i + 1}) Unknown type of temporary effect: ${effect.Item.ID}`);
    }
  }
}

export function logSet(this: void, set: Set<AnyNotNil>): void {
  log("Printing out a TSTL Set:");
  for (const value of set.values()) {
    log(`  Value: ${value}`);
  }
  log(`The size of the set was: ${set.size}`);
}

export function logVector(this: void, vector: Vector): void {
  log(`Vector: (${vector.X}, ${vector.Y})`);
}

/**
 * Converts every `isaacscript-common` function that begins with "log" to a global function.
 * This is useful for printing out variables from the in-game debug console.
 */
export function setLogFunctionsGlobal(): void {
  const globals = _G as Record<string, unknown>;

  globals.log = log;
  globals.logAllDamageFlags = logAllDamageFlags;
  globals.logAllEntityFlags = logAllEntityFlags;
  globals.logAllFlags = logAllFlags;
  globals.logAllGameStateFlags = logAllGameStateFlags;
  globals.logAllProjectileFlags = logAllProjectileFlags;
  globals.logAllSeedEffects = logAllSeedEffects;
  globals.logAllTearFlags = logAllTearFlags;
  globals.logAllUseFlags = logAllUseFlags;
  globals.logArray = logArray;
  globals.logColor = logColor;
  globals.logEntity = logEntity;
  globals.logKColor = logKColor;
  globals.logMap = logMap;
  globals.logTable = logTable;
  globals.logTemporaryEffects = logTemporaryEffects;
  globals.logSet = logSet;
  globals.logVector = logVector;
}
