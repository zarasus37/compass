/**
 * Centralized typed config. Fail fast at startup on missing required values
 * (per fullstack-dev Section 2). Optional values get safe defaults.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for the contract.`,
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  database: {
    /** Prisma-format URL. The CLI parses it as schema-relative; the app
     * uses `dbFilePath` below (which we compute from cwd) because the
     * driver adapter's path resolution is cwd-relative, not schema-
     * relative. Keeping `url` for the CLI + a separate `dbFilePath`
     * for the app avoids the two-context path drift that bit us on
     * the first integration test. */
    url: requireEnv("DATABASE_URL"),
  },
  ai: {
    provider: optionalEnv("COMPASS_AI_PROVIDER", "mavis-internal") as
      | "mavis-internal"
      | "ollama",
    mavis: {
      baseUrl: optionalEnv("COMPASS_AI_MAVIS_BASE_URL", "http://127.0.0.1:52100"),
      apiKey: optionalEnv("COMPASS_AI_MAVIS_API_KEY", ""),
    },
    ollama: {
      baseUrl: optionalEnv("COMPASS_AI_OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
      model: optionalEnv("COMPASS_AI_OLLAMA_MODEL", "llama3.1"),
    },
  },
} as const;

export type AppConfig = typeof config;
