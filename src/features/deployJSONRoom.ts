// Basement Renovator can create custom rooms that are saved to XML files
// These XML files can be converted to JSON so that they can be imported by TypeScript code
// Then, existing rooms can be manually replaced with a custom room by manually removing everything
// in the room and rebuilding it from scratch based on the JSON data

import { getUpgradeErrorMsg } from "../errors";
import {
  removeAllBombs,
  removeAllMatchingEntities,
  removeAllPickups,
} from "../functions/entity";
import {
  convertXMLGridEntityType,
  getGridEntities,
  removeAllGridEntitiesExceptFor,
  setGridEntityInvisible,
} from "../functions/gridEntity";
import { getRandomJSONRoom } from "../functions/jsonRoom";
import { log } from "../functions/log";
import { getNPCs } from "../functions/npc";
import { nextSeed } from "../functions/random";
import {
  getRoomListIndex,
  gridToPos,
  setRoomCleared,
  setRoomUncleared,
} from "../functions/rooms";
import { spawnCollectible } from "../functions/spawnCollectible";
import { JSONRoom } from "../types/JSONRoom";
import { ModUpgraded } from "../types/ModUpgraded";
import { PersistentEntityDescription } from "../types/PersistentEntityDescription";
import { saveDataManager } from "./saveDataManager/exports";

const FEATURE_NAME = "JSON room deployer";

const NPC_TYPES_TO_NOT_REMOVE = new Set<EntityType>([
  EntityType.ENTITY_DARK_ESAU,
]);

const PERSISTENT_ENTITY_TYPES = new Set<EntityType>([
  EntityType.ENTITY_WALL_HUGGER,
]);

let initialized = false;

const v = {
  level: {
    deployedRoomListIndexes: new Set<int>(),

    /** Indexed by room list index. */
    persistentEntities: new Map<int, PersistentEntityDescription[]>(),

    /** Indexed by room list index. */
    decorationGridIndexes: new Map<int, int[]>(),
  },
};

/** @hidden */
export function deployJSONRoomInit(mod: ModUpgraded): void {
  initialized = true;
  saveDataManager("deployJSONRoom", v);

  mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, postNewRoom); // 19
}

// ModCallbacks.MC_POST_NEW_ROOM (19)
function postNewRoom() {
  const roomListIndex = getRoomListIndex();

  if (!v.level.deployedRoomListIndexes.has(roomListIndex)) {
    return;
  }

  setDecorationsInvisible();
  respawnPersistentEntities();
}

/**
 * Every time we re-enter a deployed room, the sprites for all of the decorations will come back,
 * so we have to remove them again.
 */
function setDecorationsInvisible() {
  const game = Game();
  const room = game.GetRoom();
  const roomListIndex = getRoomListIndex();

  const decorationGridIndexes =
    v.level.decorationGridIndexes.get(roomListIndex);
  if (decorationGridIndexes === undefined) {
    return;
  }

  for (const gridIndex of decorationGridIndexes) {
    const gridEntity = room.GetGridEntity(gridIndex);
    if (gridEntity !== undefined) {
      setGridEntityInvisible(gridEntity);
    }
  }
}

/** Some entities must be manually respawned every time the player re-enters the room. */
function respawnPersistentEntities() {
  const game = Game();
  const room = game.GetRoom();
  const roomListIndex = getRoomListIndex();

  const persistentEntities = v.level.persistentEntities.get(roomListIndex);
  if (persistentEntities === undefined) {
    return;
  }

  for (const persistentEntity of persistentEntities) {
    const position = room.GetGridPosition(persistentEntity.gridIndex);
    Isaac.Spawn(
      persistentEntity.type,
      persistentEntity.variant,
      persistentEntity.subType,
      position,
      Vector.Zero,
      undefined,
    );
  }
}

/**
 * Helper function to deconstruct a vanilla room and set up a custom room in its place.
 * Specifically, this will clear the current room of all entities and grid entities, and then spawn
 * all of the entries and grid entities in the provided JSON room.
 *
 * This function is meant to be used in the PostNewRoom callback.
 *
 * @param jsonRoom The JSON room to deploy. In practice, this will be something like:
 * ```
 * import customRooms from "./customRooms";
 *
 * const firstJSONRoom = customRooms.rooms.room[0];
 * deployJSONRoom(firstJSONRoom);
 * ```
 * @param seed Optional. Specifies the seed that will be used for spawning every entity in the room.
 * Equal to `Random()` by default.
 * @param verbose Optional. If specified, will write entries to the "log.txt" file that describe
 * what the function is doing. False by default.
 * @returns Before using the seed for spawning each entity, it is iterated with `nextSeed()`. The
 * function returns the final iterated seed after spawning everything, which can be used in
 * subsequent room deployments.
 */
export function deployJSONRoom(
  jsonRoom: JSONRoom,
  seed = Random(),
  verbose = false,
): int {
  if (!initialized) {
    const msg = getUpgradeErrorMsg(FEATURE_NAME);
    error(msg);
  }

  if (verbose) {
    log("Starting to empty the room of entities and grid entities.");
  }
  emptyRoom(false);
  if (verbose) {
    log("Finished emptying the room of entities and grid entities.");
  }

  if (verbose) {
    log("Starting to spawn all of the new entities and grid entities.");
  }
  const newSeed = spawnAllEntities(jsonRoom, seed, verbose);
  if (verbose) {
    log("Finished spawning all of the new entities and grid entities.");
  }

  fixPitGraphics();
  fillRoomWithDecorations();

  return newSeed;
}

/**
 * Helper function to deconstruct a vanilla room and set up a custom room in its place.
 * Specifically, this will clear the current room of all entities and grid entities, and then spawn
 * all of the entries and grid entities in one of the provided JSON rooms.
 *
 * This function is meant to be used in the PostNewRoom callback.
 *
 * Note that this function does not simply choose a random element in the provided array; it will
 * properly account for each room weight using the algorithm from:
 * https://stackoverflow.com/questions/1761626/weighted-random-numbers
 *
 * @param jsonRooms An array of JSON rooms to randomly select from. In practice, this will be
 * something like:
 * ```
 * import customRooms from "./customRooms";
 *
 * const jsonRooms = customRooms.rooms.room;
 * deployRandomJSONRoom(jsonRooms);
 * ```
 * @param seed Optional. Specifies the seed that will be used for determining the random room. After
 * that, it is also used for spawning every entity in the room. Equal to `Random()` by default.
 * @param verbose Optional. If specified, will write entries to the "log.txt" file that describe
 * what the function is doing. False by default.
 * @returns Before using the seed for spawning each entity, it is iterated with `nextSeed()`. The
 * function returns the final iterated seed after spawning everything, which can be used in
 * subsequent room deployments.
 */
export function deployRandomJSONRoom(
  jsonRooms: JSONRoom[],
  seed = Random(),
  verbose = false,
): int {
  if (!initialized) {
    const msg = getUpgradeErrorMsg(FEATURE_NAME);
    error(msg);
  }

  const randomJSONRoom = getRandomJSONRoom(jsonRooms, seed, verbose);
  if (verbose) {
    log(
      `Randomly chose JSON room ${randomJSONRoom.$.type}.${randomJSONRoom.$.variant}.${randomJSONRoom.$.subtype} with name: ${randomJSONRoom.$.name}`,
    );
  }

  return deployJSONRoom(randomJSONRoom, seed, verbose);
}

/**
 * Helper function to remove all naturally spawning entities and grid entities from a room. Notably,
 * this will not remove players (1), tears (2), familiars (3), lasers (7), knives (8),
 * projectiles (9), blacklisted NPCs such as Dark Esau, charmed NPCs, friendly NPCs, persistent
 * NPCs, most effects (1000), doors, and walls.
 *
 * @param fillWithDecorations Optional. Set to true to fill every grid tile with an invisible
 * decoration, which prevents vanilla entities in the room from respawning the next time that the
 * player enters. False by default.
 */
export function emptyRoom(fillWithDecorations: boolean) {
  if (!initialized) {
    const msg = getUpgradeErrorMsg(FEATURE_NAME);
    error(msg);
  }

  const roomListIndex = getRoomListIndex();

  v.level.deployedRoomListIndexes.add(roomListIndex);

  removeAllBombs(); // 4
  removeAllPickups(); // 5
  removeAllMatchingEntities(EntityType.ENTITY_SLOT); // 6
  removeSpecificNPCs();
  removeAllMatchingEntities(EntityType.ENTITY_EFFECT, EffectVariant.DEVIL);
  removeAllMatchingEntities(EntityType.ENTITY_EFFECT, EffectVariant.ANGEL);

  removeAllGridEntitiesExceptFor(
    GridEntityType.GRID_WALL, // 15
    GridEntityType.GRID_DOOR, // 16
  );

  setRoomCleared();

  if (fillWithDecorations) {
    fillRoomWithDecorations();
  }
}

/**
 * We remove entities in the PostNewRoom callback instead of in the PreRoomEntitySpawn callback so
 * that they will not re-appear when we re-enter the room.
 */
function removeSpecificNPCs() {
  const game = Game();
  const room = game.GetRoom();

  for (const npc of getNPCs()) {
    if (NPC_TYPES_TO_NOT_REMOVE.has(npc.Type)) {
      continue;
    }

    if (
      npc.HasEntityFlags(EntityFlag.FLAG_CHARM) ||
      npc.HasEntityFlags(EntityFlag.FLAG_FRIENDLY) ||
      npc.HasEntityFlags(EntityFlag.FLAG_PERSISTENT)
    ) {
      continue;
    }

    npc.ClearEntityFlags(EntityFlag.FLAG_APPEAR);
    npc.Remove();

    // When fire places are removed, they will leave behind a "path" that will prevent future grid
    // entities from being spawned on the same tile
    // Thus, reset the path for this tile if this is a fire place
    if (npc.Type === EntityType.ENTITY_FIREPLACE) {
      const gridIndex = room.GetGridIndex(npc.Position);
      room.SetGridPath(gridIndex, 0);
    }
  }
}

/**
 * We removed most normal entities, which should prevent them from respawning when the player
 * re-enters the room. However, this is not the case for grid entities; even if they are removed,
 * they will come back when the player re-enters the room.
 *
 * In order to prevent this from happening, we can spawn a grid entity on every tile that does not
 * already have a grid entity. The natural grid entity to choose for this purpose is a decoration,
 * since it is non-interacting.
 *
 * Another option besides decorations would be to use a pressure plates with a state of 1, which is
 * a state that is normally unused by the game and makes it invisible & persistent. However, pickups
 * will not be able to spawn on pressure plates, which lead to various bugs (e.g. pickups spawning
 * on top of pits). Thus, we use a decoration and remove its sprite to make it invisible.
 */
function fillRoomWithDecorations() {
  const game = Game();
  const room = game.GetRoom();
  const gridSize = room.GetGridSize();
  const roomListIndex = getRoomListIndex();

  let decorationGridIndexes = v.level.decorationGridIndexes.get(roomListIndex);
  if (decorationGridIndexes === undefined) {
    decorationGridIndexes = [];
    v.level.decorationGridIndexes.set(roomListIndex, decorationGridIndexes);
  }

  for (let gridIndex = 0; gridIndex < gridSize; gridIndex++) {
    const existingGridEntity = room.GetGridEntity(gridIndex);
    if (existingGridEntity !== undefined) {
      continue;
    }

    const position = room.GetGridPosition(gridIndex);
    const decoration = Isaac.GridSpawn(
      GridEntityType.GRID_DECORATION,
      0,
      position,
      true,
    );

    setGridEntityInvisible(decoration);
    decorationGridIndexes.push(gridIndex);
  }
}

function spawnAllEntities(jsonRoom: JSONRoom, seed: int, verbose = false) {
  let shouldUnclearRoom = false;

  for (const spawn of jsonRoom.spawn) {
    const xString = spawn.$.x;
    const x = tonumber(xString);
    if (x === undefined) {
      error(
        `Failed to convert the following x coordinate to a number (for a spawn): ${xString}`,
      );
    }

    const yString = spawn.$.y;
    const y = tonumber(yString);
    if (y === undefined) {
      error(
        `Failed to convert the following y coordinate to a number (for a spawn): ${yString}`,
      );
    }

    if (spawn.entity.length > 1) {
      error("Stacked entities are not implemented for JSON rooms.");
    }

    const xmlEntity = spawn.entity[0];

    const entityTypeString = xmlEntity.$.type;
    const entityType = tonumber(entityTypeString);
    if (entityType === undefined) {
      error(
        `Failed to convert the entity type to a number: ${entityTypeString}`,
      );
    }

    const variantString = xmlEntity.$.variant;
    const variant = tonumber(variantString);
    if (variant === undefined) {
      error(`Failed to convert the entity variant to a number: ${variant}`);
    }

    const subTypeString = xmlEntity.$.subtype;
    const subType = tonumber(subTypeString);
    if (subType === undefined) {
      error(`Failed to convert the entity sub-type to a number: ${subType}`);
    }

    // Note that XML entity type 1000 is a rock, not an effect
    if (entityType >= 1000) {
      if (verbose) {
        log(`Spawning grid entity ${entityType}.${variant} at: (${x}, ${y})`);
      }
      spawnGridEntity(entityType, variant, x, y);
    } else {
      seed = nextSeed(seed);
      if (verbose) {
        log(
          `Spawning normal entity ${entityType}.${variant}.${subType} at: (${x}, ${y})`,
        );
      }
      const entity = spawnNormalEntity(
        entityType,
        variant,
        subType,
        x,
        y,
        seed,
      );
      const npc = entity.ToNPC();
      if (npc !== undefined && npc.CanShutDoors) {
        shouldUnclearRoom = true;
      }
    }
  }

  // After emptying the room, we manually cleared the room
  // However, if the room layout contains an battle NPC,
  // then we need to reset the clear state and close the doors again
  if (shouldUnclearRoom) {
    if (verbose) {
      log(
        "Setting the room to be uncleared since there were one or more battle NPCs spawned.",
      );
    }
    setRoomUncleared();
  } else if (verbose) {
    log("Leaving the room cleared since there were no battle NPCs spawned.");
  }

  return seed;
}

function spawnGridEntity(
  xmlEntityType: int,
  xmlEntityVariant: int,
  x: int,
  y: int,
) {
  const gridEntityArray = convertXMLGridEntityType(
    xmlEntityType,
    xmlEntityVariant,
  );
  if (gridEntityArray === undefined) {
    return undefined;
  }
  const [entityType, variant] = gridEntityArray;
  const position = gridToPos(x, y);
  const gridEntity = Isaac.GridSpawn(entityType, variant, position, true);

  // For some reason, spawned pits start with a collision class of COLLISION_NONE,
  // so we have to manually set it
  if (entityType === GridEntityType.GRID_PIT) {
    const pit = gridEntity.ToPit();
    if (pit !== undefined) {
      pit.UpdateCollision();
    }
  }

  // Prevent poops from playing an appear animation,
  // since that is not supposed to normally happen when entering a new room
  if (entityType === GridEntityType.GRID_POOP) {
    const sprite = gridEntity.GetSprite();
    sprite.Play("State1", true);
    sprite.SetLastFrame();
  }

  return gridEntity;
}

function spawnNormalEntity(
  entityType: int,
  variant: int,
  subType: int,
  x: int,
  y: int,
  seed: int,
) {
  const game = Game();
  const room = game.GetRoom();
  const roomType = room.GetType();
  const position = gridToPos(x, y);

  let entity: Entity;
  if (
    entityType === EntityType.ENTITY_PICKUP &&
    variant === PickupVariant.PICKUP_COLLECTIBLE
  ) {
    const options = roomType === RoomType.ROOM_ANGEL;
    entity = spawnCollectible(subType, position, seed, options);
  } else {
    entity = game.Spawn(
      entityType,
      variant,
      position,
      Vector.Zero,
      undefined,
      subType,
      seed,
    );
  }

  // For some reason, Pitfalls do not spawn with the correct collision classes
  if (
    entityType === EntityType.ENTITY_PITFALL &&
    variant === PitfallVariant.PITFALL
  ) {
    entity.EntityCollisionClass = EntityCollisionClass.ENTCOLL_ENEMIES;
    entity.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }

  storePersistentEntity(entity);

  return entity;
}

/**
 * Some entities must be manually respawned every time the player re-enters the room. If we just
 * spawned one such entity, then record it for later.
 */
function storePersistentEntity(entity: Entity) {
  if (!PERSISTENT_ENTITY_TYPES.has(entity.Type)) {
    return;
  }

  const game = Game();
  const room = game.GetRoom();
  const gridIndex = room.GetGridIndex(entity.Position);
  const roomListIndex = getRoomListIndex();

  const persistentEntity = {
    gridIndex,
    type: entity.Type,
    variant: entity.Variant,
    subType: entity.SubType,
  };

  let persistentEntities = v.level.persistentEntities.get(roomListIndex);
  if (persistentEntities === undefined) {
    persistentEntities = [];
    v.level.persistentEntities.set(roomListIndex, persistentEntities);
  }
  persistentEntities.push(persistentEntity);
}

/**
 * By default, when spawning multiple pits next to each other, the graphics will not "meld"
 * together. Thus, now that all of the entities in the room are spawned, we must iterate over the
 * pits in the room and manually fix their sprites, if necessary.
 */
function fixPitGraphics() {
  const game = Game();
  const room = game.GetRoom();
  const gridWidth = room.GetGridWidth();
  const pitMap = getPitMap();

  for (const [gridIndex, gridEntity] of pitMap.entries()) {
    const gridIndexLeft = gridIndex - 1;
    const L = pitMap.has(gridIndexLeft);
    const gridIndexRight = gridIndex + 1;
    const R = pitMap.has(gridIndexRight);
    const gridIndexUp = gridIndex - gridWidth;
    const U = pitMap.has(gridIndexUp);
    const gridIndexDown = gridIndex + gridWidth;
    const D = pitMap.has(gridIndexDown);
    const gridIndexUpLeft = gridIndex - gridWidth - 1;
    const UL = pitMap.has(gridIndexUpLeft);
    const gridIndexUpRight = gridIndex - gridWidth + 1;
    const UR = pitMap.has(gridIndexUpRight);
    const gridIndexDownLeft = gridIndex + gridWidth - 1;
    const DL = pitMap.has(gridIndexDownLeft);
    const gridIndexDownRight = gridIndex + gridWidth + 1;
    const DR = pitMap.has(gridIndexDownRight);

    const pitFrame = getPitFrame(L, R, U, D, UL, UR, DL, DR);
    const sprite = gridEntity.GetSprite();
    sprite.SetFrame(pitFrame);
  }
}

function getPitMap() {
  const pitMap = new Map<int, GridEntity>();
  for (const gridEntity of getGridEntities(GridEntityType.GRID_PIT)) {
    const gridIndex = gridEntity.GetGridIndex();
    pitMap.set(gridIndex, gridEntity);
  }

  return pitMap;
}

/** The logic in this function is copied from Basement Renovator. */
function getPitFrame(
  L: boolean,
  R: boolean,
  U: boolean,
  D: boolean,
  UL: boolean,
  UR: boolean,
  DL: boolean,
  DR: boolean,
) {
  let F = 0;

  // First bitwise frames (works for all combinations of just left up right and down)
  if (L) {
    F |= 1;
  }
  if (U) {
    F |= 2;
  }
  if (R) {
    F |= 4;
  }
  if (D) {
    F |= 8;
  }

  // Then a bunch of other combinations
  if (U && L && !UL && !R && !D) {
    F = 17;
  }
  if (U && R && !UR && !L && !D) {
    F = 18;
  }
  if (L && D && !DL && !U && !R) {
    F = 19;
  }
  if (R && D && !DR && !L && !U) {
    F = 20;
  }
  if (L && U && R && D && !UL) {
    F = 21;
  }
  if (L && U && R && D && !UR) {
    F = 22;
  }
  if (U && R && D && !L && !UR) {
    F = 25;
  }
  if (L && U && D && !R && !UL) {
    F = 26;
  }

  if (L && U && R && D && !DL && !DR) {
    F = 24;
  }
  if (L && U && R && D && !UR && !UL) {
    F = 23;
  }
  if (L && U && R && UL && !UR && !D) {
    F = 27;
  }
  if (L && U && R && UR && !UL && !D) {
    F = 28;
  }
  if (L && U && R && !D && !UR && !UL) {
    F = 29;
  }
  if (L && R && D && DL && !U && !DR) {
    F = 30;
  }
  if (L && R && D && DR && !U && !DL) {
    F = 31;
  }
  if (L && R && D && !U && !DL && !DR) {
    F = 32;
  }

  return F;
}