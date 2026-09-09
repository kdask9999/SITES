const D1_BINDING_KEY = "__GM_WEB_EXTRACTOR_DB__" as const;

type RuntimeGlobal = typeof globalThis & {
  [D1_BINDING_KEY]?: D1Database;
};

export function setRuntimeDatabase(database: D1Database | undefined) {
  const runtime = globalThis as RuntimeGlobal;
  runtime[D1_BINDING_KEY] = database;
}

export function getRuntimeDatabase() {
  const runtime = globalThis as RuntimeGlobal;
  return runtime[D1_BINDING_KEY] || null;
}
