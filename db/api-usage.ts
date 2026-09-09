import { getRuntimeDatabase } from "./runtime";

type UsageIncrement = {
  searchActions: number;
  textSearchProRequests: number;
  textSearchEnterpriseRequests: number;
};

export type StoredApiUsage = UsageIncrement & {
  month: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StoredDailyApiUsage = UsageIncrement & {
  date: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const CREATE_USAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS api_usage_monthly (
    month TEXT PRIMARY KEY NOT NULL,
    search_actions INTEGER NOT NULL DEFAULT 0,
    text_search_pro_requests INTEGER NOT NULL DEFAULT 0,
    text_search_enterprise_requests INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const CREATE_DAILY_USAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS api_usage_daily (
    date TEXT PRIMARY KEY NOT NULL,
    search_actions INTEGER NOT NULL DEFAULT 0,
    text_search_pro_requests INTEGER NOT NULL DEFAULT 0,
    text_search_enterprise_requests INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthKey(date = new Date()) {
  return dateKey(date).slice(0, 7);
}

function timestampDateKey(timestamp: string | null) {
  if (!timestamp) return null;

  const normalized = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T");
  const includesTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parsed = new Date(includesTimezone ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed.valueOf()) ? null : dateKey(parsed);
}

function getD1() {
  return getRuntimeDatabase();
}

async function ensureUsageTables(db: D1Database) {
  await db.batch([
    db.prepare(CREATE_USAGE_TABLE),
    db.prepare(CREATE_DAILY_USAGE_TABLE),
  ]);
}

export async function recordApiUsage(increment: UsageIncrement) {
  const db = getD1();
  if (!db) return false;

  const searchActions = Math.max(0, Math.trunc(increment.searchActions));
  const textSearchProRequests = Math.max(0, Math.trunc(increment.textSearchProRequests));
  const textSearchEnterpriseRequests = Math.max(
    0,
    Math.trunc(increment.textSearchEnterpriseRequests),
  );
  if (!searchActions && !textSearchProRequests && !textSearchEnterpriseRequests) return true;

  try {
    await ensureUsageTables(db);
    await db.batch([
      db
        .prepare(
          `INSERT INTO api_usage_monthly (
            month,
            search_actions,
            text_search_pro_requests,
            text_search_enterprise_requests,
            updated_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(month) DO UPDATE SET
            search_actions = search_actions + excluded.search_actions,
            text_search_pro_requests = text_search_pro_requests + excluded.text_search_pro_requests,
            text_search_enterprise_requests = text_search_enterprise_requests + excluded.text_search_enterprise_requests,
            updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          monthKey(),
          searchActions,
          textSearchProRequests,
          textSearchEnterpriseRequests,
        ),
      db
        .prepare(
          `INSERT INTO api_usage_daily (
            date,
            search_actions,
            text_search_pro_requests,
            text_search_enterprise_requests,
            updated_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(date) DO UPDATE SET
            search_actions = search_actions + excluded.search_actions,
            text_search_pro_requests = text_search_pro_requests + excluded.text_search_pro_requests,
            text_search_enterprise_requests = text_search_enterprise_requests + excluded.text_search_enterprise_requests,
            updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          dateKey(),
          searchActions,
          textSearchProRequests,
          textSearchEnterpriseRequests,
        ),
    ]);
    return true;
  } catch (error) {
    console.error("Could not record Google Places usage estimate", error);
    return false;
  }
}

export async function readApiUsage(): Promise<{
  configured: boolean;
  current: StoredApiUsage;
  daily: StoredDailyApiUsage;
  lifetime: UsageIncrement;
}> {
  const currentMonth = monthKey();
  const currentDate = dateKey();
  const emptyCurrent: StoredApiUsage = {
    month: currentMonth,
    searchActions: 0,
    textSearchProRequests: 0,
    textSearchEnterpriseRequests: 0,
    createdAt: null,
    updatedAt: null,
  };
  const emptyDaily: StoredDailyApiUsage = {
    date: currentDate,
    searchActions: 0,
    textSearchProRequests: 0,
    textSearchEnterpriseRequests: 0,
    createdAt: null,
    updatedAt: null,
  };
  const db = getD1();
  if (!db) {
    return {
      configured: false,
      current: emptyCurrent,
      daily: emptyDaily,
      lifetime: {
        searchActions: 0,
        textSearchProRequests: 0,
        textSearchEnterpriseRequests: 0,
      },
    };
  }

  await ensureUsageTables(db);
  const currentRow = await db
    .prepare(
      `SELECT
        month,
        search_actions AS searchActions,
        text_search_pro_requests AS textSearchProRequests,
        text_search_enterprise_requests AS textSearchEnterpriseRequests,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM api_usage_monthly
      WHERE month = ?`,
    )
    .bind(currentMonth)
    .first<StoredApiUsage>();
  let dailyRow = await db
    .prepare(
      `SELECT
        date,
        search_actions AS searchActions,
        text_search_pro_requests AS textSearchProRequests,
        text_search_enterprise_requests AS textSearchEnterpriseRequests,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM api_usage_daily
      WHERE date = ?`,
    )
    .bind(currentDate)
    .first<StoredDailyApiUsage>();

  // The monthly tracker was introduced before the daily tracker. If both began
  // on the same day, seed today's counter once so the current usage is preserved.
  if (!dailyRow && timestampDateKey(currentRow?.createdAt || null) === currentDate) {
    await db
      .prepare(
        `INSERT INTO api_usage_daily (
          date,
          search_actions,
          text_search_pro_requests,
          text_search_enterprise_requests,
          updated_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(date) DO NOTHING`,
      )
      .bind(
        currentDate,
        currentRow.searchActions,
        currentRow.textSearchProRequests,
        currentRow.textSearchEnterpriseRequests,
      )
      .run();
    dailyRow = await db
      .prepare(
        `SELECT
          date,
          search_actions AS searchActions,
          text_search_pro_requests AS textSearchProRequests,
          text_search_enterprise_requests AS textSearchEnterpriseRequests,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM api_usage_daily
        WHERE date = ?`,
      )
      .bind(currentDate)
      .first<StoredDailyApiUsage>();
  }
  const lifetimeRow = await db
    .prepare(
      `SELECT
        COALESCE(SUM(search_actions), 0) AS searchActions,
        COALESCE(SUM(text_search_pro_requests), 0) AS textSearchProRequests,
        COALESCE(SUM(text_search_enterprise_requests), 0) AS textSearchEnterpriseRequests
      FROM api_usage_monthly`,
    )
    .first<UsageIncrement>();

  return {
    configured: true,
    current: currentRow || emptyCurrent,
    daily: dailyRow || emptyDaily,
    lifetime: lifetimeRow || {
      searchActions: 0,
      textSearchProRequests: 0,
      textSearchEnterpriseRequests: 0,
    },
  };
}
