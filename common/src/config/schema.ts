/**
 * Configuration schema types and interfaces
 */

import type { LogLevel } from "../cli/logger.ts";

/**
 * Base type for configuration values
 */
export type ConfigValue = string | number | boolean | LogLevel;

/**
 * Configuration field definition with default value and optional transform
 */
export interface ConfigFieldDef<T extends ConfigValue = ConfigValue> {
  default: T;
  transform?: (value: string) => T;
  description?: string;
}

/**
 * Configuration schema - nested structure of field definitions
 */
export type ConfigSchema = {
  [section: string]: {
    [field: string]: ConfigFieldDef;
  } | ConfigFieldDef;
};

/**
 * Extract the resolved type from a config schema
 */
export type ResolvedFromSchema<S extends ConfigSchema> = {
  [K in keyof S]: S[K] extends ConfigFieldDef
    ? S[K]["default"]
    : S[K] extends Record<string, ConfigFieldDef>
    ? { [P in keyof S[K]]: S[K][P] extends ConfigFieldDef ? S[K][P]["default"] : never }
    : never;
};

/**
 * Partial config loaded from sources (file, env, CLI) - just the raw values
 */
export type PartialConfigData = {
  [section: string]: {
    [field: string]: ConfigValue;
  } | ConfigValue;
};

export interface ConfigSource {
  name: string;
  data: PartialConfigData;
}
