import { MAX_NUM_DOORS } from "../constants";

export function getDoors(): GridEntityDoor[] {
  const game = Game();
  const room = game.GetRoom();

  const doors: GridEntityDoor[] = [];
  for (let i = 0; i < MAX_NUM_DOORS; i++) {
    const door = room.GetDoor(i);
    if (door !== null) {
      doors.push(door);
    }
  }

  return doors;
}

export function getAngelRoomDoor(): GridEntityDoor | null {
  for (const door of getDoors()) {
    if (isAngelRoomDoor(door)) {
      return door;
    }
  }

  return null;
}

export function getDevilRoomDoor(): GridEntityDoor | null {
  for (const door of getDoors()) {
    if (isDevilRoomDoor(door)) {
      return door;
    }
  }

  return null;
}

export function getDevilRoomOrAngelRoomDoor(): GridEntityDoor | null {
  for (const door of getDoors()) {
    if (isDevilRoomDoor(door) || isAngelRoomDoor(door)) {
      return door;
    }
  }

  return null;
}

export function getRepentanceDoor(): GridEntityDoor | null {
  for (const door of getDoors()) {
    if (isRepentanceDoor(door)) {
      return door;
    }
  }

  return null;
}

export function isAngelRoomDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomType === RoomType.ROOM_ANGEL;
}

export function isDevilRoomDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomType === RoomType.ROOM_DEVIL;
}

export function isHiddenSecretRoomDoor(door: GridEntityDoor): boolean {
  const sprite = door.GetSprite();
  const animation = sprite.GetAnimation();

  return isSecretRoomDoor(door) && animation === "Hidden";
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend one key to open it.
 * It has a sprite filename of "gfx/grid/Door_Downpour.anm2".
 */
export function isDoorToDownpour(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Downpour.anm2";
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend two hearts to open it.
 * It has a sprite filename of "gfx/grid/Door_Mausoleum.anm2".
 */
export function isDoorToMausoleum(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mausoleum.anm2";
}

/**
 * This refers to the "strange door" located on the first room of Depths 2.
 * You open it with either a Polaroid or a Negative.
 * It has a sprite filename of "gfx/grid/Door_Mausoleum_Alt.anm2".
 */
export function isDoorToMausoleumAscent(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mausoleum_Alt.anm2";
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend two bombs to open it.
 * It has a sprite filename of "gfx/grid/Door_Mines.anm2".
 */
export function isDoorToMines(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mines.anm2";
}

/**
 * This refers to the Repentance door that spawns after defeating Mom.
 * You open it with the completed knife.
 * It has a sprite filename of "gfx/grid/Door_MomsHeart.anm2".
 */
export function isDoorToMomsHeart(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_MomsHeart.anm2";
}

export function isRepentanceDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomIndex === GridRooms.ROOM_SECRET_EXIT_IDX;
}

export function isSecretRoomDoor(door: GridEntityDoor): boolean {
  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_08_HoleInWall.anm2";
}

export function openAllDoors(): void {
  for (const door of getDoors()) {
    // If we try to open a hidden Secret Room door (or Super Secret Room door),
    // then nothing will happen
    door.Open();
  }
}
