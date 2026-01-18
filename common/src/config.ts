/**
 * Configuration system - backward compatibility re-exports
 * Actual implementation is in config/ subdirectory
 */

export type { 
  ConfigSchema, 
  ConfigFieldDef, 
  ResolvedFromSchema,
  ConfigValue,
  PartialConfigData,
  ConfigSource,
} from "./config/index.ts";
export { Config, loadConfig } from "./config/index.ts";