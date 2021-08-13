import { MaxFlagShift } from "../enums";
import { hasFlag } from "./flag";

// This function is part of the sandbox provided by the Racing+ client
declare global {
  function getParentFunctionDescription(this: void, levels: int): string;
}

/**
 * Helper function to avoid typing out `Isaac.DebugString()`.
 * If you have the --luadebug launch flag turned on or the Racing+ sandbox enabled,
 * then this function will also prepend the function name and the line number before the string.
 */
export function log(msg: string): void {
  const debugMsg = getDebugPrependString(msg);
  Isaac.DebugString(debugMsg);
}

function getDebugPrependString(msg: string) {
  // 1 - getDebugPrependString
  // 2 - log
  // 3 - the function that calls log
  const numParentFunctions = 3;

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
 * Helper function for printing out every damage flag that is turned on. Helpful when debugging.
 */
export function logAllDamageFlags(flags: int): void {
  logAllFlags(flags, MaxFlagShift.DAMAGE, "damage");
}

/**
 * Helper function for printing out every entity flag that is turned on. Helpful when debugging.
 */
export function logAllEntityFlags(flags: int): void {
  logAllFlags(flags, MaxFlagShift.ENTITY, "entity");
}

/**
 * Helper function for printing out every flag that is turned on. Helpful when debugging.
 */
export function logAllFlags(flags: int, maxShift: int, description = ""): void {
  if (description !== "") {
    description += " ";
  }
  log(`Logging all ${description}flags:`);
  for (let i = 0; i <= maxShift; i++) {
    if (hasFlag(flags, 1 << i)) {
      log(`- Has flag: ${i}`);
    }
  }
}

/**
 * Helper function for printing out every projectile flag that is turned on. Helpful when debugging.
 */
export function logAllProjectileFlags(flags: int): void {
  logAllFlags(flags, MaxFlagShift.PROJECTILE, "projectile");
}

/**
 * Helper function for printing out every use flag that is turned on. Helpful when debugging.
 */
export function logAllUseFlags(flags: int): void {
  logAllFlags(flags, MaxFlagShift.USE, "use");
}