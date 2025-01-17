import { getUpgradeErrorMsg } from "../errors";
import { ModUpgraded } from "../types/ModUpgraded";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "forgotten switcher";

let initialized = false;

const v = {
  run: {
    shouldSwitch: false,
  },
};

/** @internal */
export function forgottenSwitchInit(mod: ModUpgraded): void {
  initialized = true;
  saveDataManager("forgottenSwitch", v);

  mod.AddCallback(
    ModCallbacks.MC_INPUT_ACTION, // 13
    isActionTriggered,
    InputHook.IS_ACTION_TRIGGERED, // 1
  );
}

// ModCallbacks.MC_INPUT_ACTION (13)
// InputHook.IS_ACTION_TRIGGERED (1)
function isActionTriggered(
  _entity: Entity | undefined,
  _inputHook: InputHook,
  buttonAction: ButtonAction,
) {
  if (buttonAction === ButtonAction.ACTION_DROP && v.run.shouldSwitch) {
    v.run.shouldSwitch = false;
    return true;
  }

  return undefined;
}

/**
 * When used on The Forgotten, switches to The Soul. When used on The Soul, switches to The
 * Forgotten. This takes 1 game frame to take effect.
 */
export function forgottenSwitch(): void {
  if (!initialized) {
    const msg = getUpgradeErrorMsg(FEATURE_NAME);
    error(msg);
  }

  v.run.shouldSwitch = true;
}
