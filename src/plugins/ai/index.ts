/**
 * Public surface of the AI plugin layer.
 * Feature code should import from here, never from a concrete provider file.
 */
export { getAiProvider } from "./registry";
export type {
  AiProviderPlugin,
  AiCapability,
  CompleteRequest,
  CompleteResponse,
  ProviderHealth,
} from "./types";
