import PickingUpItem from "../../types/PickingUpItem";

type CallbackType = (
  player: EntityPlayer,
  pickingUpItem: PickingUpItem,
) => void;

const subscriptions: Array<
  [CallbackType, ItemType | undefined, int | undefined]
> = [];

export function hasSubscriptions(): boolean {
  return subscriptions.length > 0;
}

export function register(
  callback: CallbackType,
  itemType?: ItemType,
  itemID?: int,
): void {
  subscriptions.push([callback, itemType, itemID]);
}

export function fire(player: EntityPlayer, pickingUpItem: PickingUpItem): void {
  for (const [callback, itemType, itemID] of subscriptions) {
    // Handle the optional 2nd callback argument
    if (itemType !== undefined && itemType !== pickingUpItem.type) {
      return;
    }

    // Handle the optional 3rd callback argument
    if (itemID !== undefined && itemID !== pickingUpItem.id) {
      return;
    }

    callback(player, pickingUpItem);
  }
}