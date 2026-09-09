/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as catalogImport from "../catalogImport.js";
import type * as catalogue from "../catalogue.js";
import type * as catalogue2026 from "../catalogue2026.js";
import type * as decks from "../decks.js";
import type * as games from "../games.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_battle from "../lib/battle.js";
import type * as lib_battleEngine from "../lib/battleEngine.js";
import type * as lib_gameSetup from "../lib/gameSetup.js";
import type * as lib_manualBattle from "../lib/manualBattle.js";
import type * as lib_manualState from "../lib/manualState.js";
import type * as lib_normalizeLoginId from "../lib/normalizeLoginId.js";
import type * as lib_unitProfile from "../lib/unitProfile.js";
import type * as manual from "../manual.js";
import type * as migrations from "../migrations.js";
import type * as players from "../players.js";
import type * as provisioning from "../provisioning.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  catalogImport: typeof catalogImport;
  catalogue: typeof catalogue;
  catalogue2026: typeof catalogue2026;
  decks: typeof decks;
  games: typeof games;
  health: typeof health;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/battle": typeof lib_battle;
  "lib/battleEngine": typeof lib_battleEngine;
  "lib/gameSetup": typeof lib_gameSetup;
  "lib/manualBattle": typeof lib_manualBattle;
  "lib/manualState": typeof lib_manualState;
  "lib/normalizeLoginId": typeof lib_normalizeLoginId;
  "lib/unitProfile": typeof lib_unitProfile;
  manual: typeof manual;
  migrations: typeof migrations;
  players: typeof players;
  provisioning: typeof provisioning;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
