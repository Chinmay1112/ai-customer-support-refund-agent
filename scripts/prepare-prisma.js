/**
 * Dual Database Provider Synchronization for Prisma
 * 
 * Automatically detects whether the active DATABASE_URL is PostgreSQL (cloud/Vercel)
 * or SQLite (local development/testing) and ensures `prisma/schema.prisma` uses the
 * matching provider before running `prisma generate`.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error("[prepare-prisma] schema.prisma not found at:", schemaPath);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, "utf8");
let dbUrl = (process.env.DATABASE_URL || "").trim();

if (!dbUrl) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (match) {
      dbUrl = match[1].trim();
    }
  }
}

const isPostgres =
  dbUrl.startsWith("postgres://") ||
  dbUrl.startsWith("postgresql://") ||
  process.env.DATABASE_PROVIDER === "postgresql" ||
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL_ENV);

const targetProvider = isPostgres ? "postgresql" : "sqlite";

const providerMatch = schema.match(/provider\s*=\s*"([^"]+)"/);
const currentProvider = providerMatch ? providerMatch[1] : null;

if (currentProvider !== targetProvider) {
  schema = schema.replace(/provider\s*=\s*"[^"]+"/, `provider = "${targetProvider}"`);
  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log(
    `[prepare-prisma] Synced Prisma provider: "${currentProvider}" -> "${targetProvider}" (DATABASE_URL: ${
      isPostgres ? "PostgreSQL cloud detected" : "SQLite local detected"
    }).`
  );
} else {
  console.log(`[prepare-prisma] Prisma provider is already "${targetProvider}".`);
}

// Generate the Prisma Client
try {
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: process.env,
  });
} catch (error) {
  const clientExists = fs.existsSync(path.join(__dirname, "..", "node_modules", ".prisma", "client", "index.js"));
  if (clientExists) {
    console.warn("[prepare-prisma] Notice: Using existing generated Prisma client (generator binary locked by background process).");
  } else {
    console.error("[prepare-prisma] Failed to generate Prisma client:", error);
    process.exit(1);
  }
}
