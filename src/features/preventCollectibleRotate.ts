// Keep specific items from being affected by the Glitched Crown, Binge Eater,
// and the Tainted Isaac switching mechanic

import { getUpgradeErrorMsg } from "../errors";
import { setCollectibleSubType } from "../functions/collectibles";
import { ModUpgraded } from "../types/ModUpgraded";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "prevent collectible rotation";

let initialized = false;

const v = {
  room: {
    /** Index is the InitSeed of the collectible. */
    trackedItems: new Map<int, CollectibleType | int>(),
  },
};

/** @internal */
export function preventCollectibleRotateInit(mod: ModUpgraded): void {
  initialized = true;
  saveDataManager("preventCollectibleRotate", v);

  mod.AddCallback(
    ModCallbacks.MC_USE_CARD,
    useCardSoulOfIsaac,
    Card.CARD_SOUL_ISAAC,
  ); // 5

  mod.AddCallback(
    ModCallbacks.MC_POST_PICKUP_UPDATE,
    postPickupUpdateCollectible,
    PickupVariant.PICKUP_COLLECTIBLE,
  ); // 35
}

// ModCallbacks.MC_USE_CARD (5)
// Card.CARD_SOUL_ISAAC (81)
function useCardSoulOfIsaac() {
  // Soul of Isaac causes items to flip
  // Delete all tracked items (assuming that the player deliberately wants to roll a quest item)
  v.room.trackedItems.clear();
}

// ModCallbacks.MC_POST_PICKUP_UPDATE (35)
// PickupVariant.PICKUP_COLLECTIBLE (100)
function postPickupUpdateCollectible(pickup: EntityPickup) {
  // Ignore empty pedestals (i.e. items that have already been taken by the player)
  if (pickup.SubType === CollectibleType.COLLECTIBLE_NULL) {
    return;
  }

  const trackedCollectibleType = v.room.trackedItems.get(pickup.InitSeed);
  if (
    trackedCollectibleType !== undefined &&
    pickup.SubType !== trackedCollectibleType
  ) {
    // This item has switched, so restore it back to the way it was
    setCollectibleSubType(pickup, trackedCollectibleType);
  }
}

/**
 * Helper function to prevent a collectible from being affected by Tainted Isaac's rotation
 * mechanic. (This mechanic also happens from Glitched Crown and Binge Eater.) This is useful
 * because quest items that are manually spawned by mods will be automatically be affected by this
 * mechanic.
 *
 * It is required to pass the intended collectible type to this function since it is possible for
 * collectibles to rotate on the first frame that they are spawned.
 */
export function preventCollectibleRotate(
  collectible: EntityPickup,
  collectibleType: CollectibleType | int,
): void {
  if (!initialized) {
    const msg = getUpgradeErrorMsg(FEATURE_NAME);
    error(msg);
  }

  if (collectible.Variant !== PickupVariant.PICKUP_COLLECTIBLE) {
    error(
      `You cannot prevent the rotation for pickups of variant: ${collectible.Variant}`,
    );
  }

  v.room.trackedItems.set(collectible.InitSeed, collectibleType);

  // The item might have already shifted on the first frame that it spawns,
  // so change it back if necessary
  postPickupUpdateCollectible(collectible);
}
