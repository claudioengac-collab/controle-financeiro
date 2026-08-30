import app from "./app";
import { logger } from "./lib/logger";
import { query } from "./lib/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runProductionMigrations() {
  if (process.env["NODE_ENV"] !== "production") return;
  try {
    await query(`
      ALTER TABLE lancamentos
      ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT FALSE
    `);
    logger.info("Migration OK: arquivado column ready");
  } catch (err) {
    logger.warn({ err }, "Migration warning");
  }
}

runProductionMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
});
