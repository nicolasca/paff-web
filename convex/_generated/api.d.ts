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
import type * as decks from "../decks.js";
import type * as games from "../games.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_gameSetup from "../lib/gameSetup.js";
import type * as lib_normalizeLoginId from "../lib/normalizeLoginId.js";
import type * as lib_unitProfile from "../lib/unitProfile.js";
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
  decks: typeof decks;
  games: typeof games;
  health: typeof health;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/gameSetup": typeof lib_gameSetup;
  "lib/normalizeLoginId": typeof lib_normalizeLoginId;
  "lib/unitProfile": typeof lib_unitProfile;
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
