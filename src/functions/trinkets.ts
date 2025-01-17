import { GOLDEN_TRINKET_SHIFT } from "../constants";
import { TRINKET_DESCRIPTION_MAP } from "../maps/trinketDescriptionMap";
import { TRINKET_NAME_MAP } from "../maps/trinketNameMap";
import { getPickups } from "./entity";
import { useActiveItemTemp } from "./player";
import { giveTrinketsBack, temporarilyRemoveTrinkets } from "./trinketGive";

export function getMaxTrinketID(): int {
  const itemConfig = Isaac.GetItemConfig();
  return itemConfig.GetTrinkets().Size - 1;
}

/**
 * Returns the slot number corresponding to where a trinket can be safely inserted.
 *
 * Example:
 * ```
 * const player = Isaac.GetPlayer();
 * const trinketSlot = getOpenTrinketSlotNum(player);
 * if (trinketSlot !== undefined) {
 *   // They have one or more open trinket slots
 *   player.AddTrinket(TrinketType.TRINKET_SWALLOWED_PENNY);
 * }
 * ```
 */
export function getOpenTrinketSlot(player: EntityPlayer): int | undefined {
  const maxTrinkets = player.GetMaxTrinkets();
  const trinket0 = player.GetTrinket(TrinketSlot.SLOT_1);
  const trinket1 = player.GetTrinket(TrinketSlot.SLOT_2);

  if (maxTrinkets === 1) {
    return trinket0 === TrinketType.TRINKET_NULL ? 0 : undefined;
  }

  if (maxTrinkets === 2) {
    if (trinket0 === TrinketType.TRINKET_NULL) {
      return 0;
    }

    return trinket1 === TrinketType.TRINKET_NULL ? 1 : undefined;
  }

  return error(
    `The player has an unknown number of trinket slots: ${maxTrinkets}`,
  );
}

/** Helper function to get all of the trinket entities in the room. */
export function getTrinkets(matchingSubType = -1): EntityPickup[] {
  return getPickups(PickupVariant.PICKUP_TRINKET, matchingSubType);
}

/**
 * Helper function to get the in-game description for a trinket. Returns "Unknown" if the provided
 * trinket type was not valid.
 */
export function getTrinketDescription(trinketType: TrinketType | int): string {
  const itemConfig = Isaac.GetItemConfig();
  const defaultDescription = "Unknown";

  if (type(trinketType) !== "number") {
    return defaultDescription;
  }

  // "ItemConfigItem.Description" is bugged with vanilla items on patch v1.7.6,
  // so we use a hard-coded map as a workaround
  const trinketDescription = TRINKET_DESCRIPTION_MAP.get(trinketType);
  if (trinketDescription !== undefined) {
    return trinketDescription;
  }

  const itemConfigItem = itemConfig.GetCollectible(trinketType);
  if (itemConfigItem === undefined) {
    return defaultDescription;
  }

  return itemConfigItem.Description;
}

/**
 * Helper function to get the name of a trinket. Returns "Unknown" if the provided trinket type is
 * not valid.
 *
 * Example:
 * ```
 * const trinketType = TrinketType.TRINKET_SWALLOWED_PENNY;
 * const trinketName = getTrinketName(trinketType); // trinketName is "Swallowed Penny"
 * ```
 */
export function getTrinketName(trinketType: TrinketType | int): string {
  const itemConfig = Isaac.GetItemConfig();
  const defaultName = "Unknown";

  if (type(trinketType) !== "number") {
    return defaultName;
  }

  // "ItemConfigItem.Name" is bugged with vanilla items on patch v1.7.6,
  // so we use a hard-coded map as a workaround
  const trinketName = TRINKET_NAME_MAP.get(trinketType);
  if (trinketName !== undefined) {
    return trinketName;
  }

  const itemConfigItem = itemConfig.GetCollectible(trinketType);
  if (itemConfigItem === undefined) {
    return defaultName;
  }

  return itemConfigItem.Name;
}

/**
 * Returns whether or not the player can hold an additional trinket, beyond what they are currently
 * carrying. This takes into account items that modify the max number of trinkets, like Mom's Purse.
 *
 * If the player is the Tainted Soul, this always returns false, since that character cannot pick up
 * items. (Only Tainted Forgotten can pick up items.)
 */
export function hasOpenTrinketSlot(player: EntityPlayer): boolean {
  const character = player.GetPlayerType();
  if (character === PlayerType.PLAYER_THESOUL_B) {
    return false;
  }

  const openTrinketSlot = getOpenTrinketSlot(player);
  return openTrinketSlot !== undefined;
}

export function isGoldenTrinket(trinketType: TrinketType | int): boolean {
  return trinketType > GOLDEN_TRINKET_SHIFT;
}

/**
 * Helper function to smelt a trinket. Before smelting, this function will automatically remove the
 * trinkets that the player is holding, if any, and then give them back after the new trinket is
 * smelted.
 *
 * @param player The player to smelt the trinkets to.
 * @param trinketType The trinket type to smelt.
 * @param numTrinkets Optional. If specified, will smelt the given number of trinkets. Use this to
 * avoid calling this function multiple times. 1 by default.
 */
export function smeltTrinket(
  player: EntityPlayer,
  trinketType: TrinketType | int,
  numTrinkets = 1,
): void {
  const trinketSituation = temporarilyRemoveTrinkets(player);

  for (let i = 0; i < numTrinkets; i++) {
    player.AddTrinket(trinketType);
    useActiveItemTemp(player, CollectibleType.COLLECTIBLE_SMELTER);
  }

  giveTrinketsBack(player, trinketSituation);
}
