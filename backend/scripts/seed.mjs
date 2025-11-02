#!/usr/bin/env node
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import csvParser from "csv-parser";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("uri", { type: "string", describe: "MongoDB URI" })
  .option("dir", { type: "string", default: "./data", describe: "Directory with CSV files" })
  .option("db", { type: "string", default: "sheba", describe: "Database name to use" })
  .option("drop", { type: "boolean", default: false, describe: "Drop existing collections before insert" })
  .option("force", { type: "boolean", default: false, describe: "When used with --drop, skip interactive confirm" })
  .option("dry-run", { type: "boolean", default: false, describe: "Parse CSVs and show counts without touching DB" })
  .option("batch-size", { type: "number", default: 1000, describe: "Batch size for bulk inserts" })
  .option("only", { type: "string", describe: "Comma-separated list of collections to insert (users,workers,bookings,events)" })
  .help()
  .argv;

const DATA_DIR = path.resolve(process.cwd(), argv.dir);

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function parseCsvToArray(file) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

async function countAndSampleCsv(file, sampleSize = 3) {
  return new Promise((resolve, reject) => {
    const result = { count: 0, sample: [] };
    fs.createReadStream(file)
      .pipe(csvParser())
      .on("data", (row) => {
        result.count += 1;
        if (result.sample.length < sampleSize) result.sample.push(row);
      })
      .on("end", () => resolve(result))
      .on("error", (err) => reject(err));
  });
}

function mapRowToUser(row) {
  // Keep fields as-is but map user_id -> _id if present
  const doc = { ...row };
  if (row.user_id) {
    doc._id = row.user_id;
    delete doc.user_id;
  }
  return doc;
}

function mapRowToWorker(row) {
  const doc = { ...row };
  if (row.worker_id) {
    doc._id = row.worker_id;
    delete doc.worker_id;
  }
  // normalize categories from pipe or comma to array
  if (doc.categories && typeof doc.categories === "string") {
    doc.categories = doc.categories.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
  }
  return doc;
}

function mapRowToBooking(row) {
  const doc = { ...row };
  if (row.booking_id) {
    doc._id = row.booking_id;
    delete doc.booking_id;
  }
  if (row.user_id) doc.user_id = row.user_id;
  if (row.worker_id) doc.worker_id = row.worker_id;
  return doc;
}

function mapRowToEvent(row) {
  const doc = { ...row };
  if (row.event_id) {
    doc._id = row.event_id;
    delete doc.event_id;
  }
  return doc;
}

async function insertCsvToCollection({ file, modelName, mapper, batchSize, dbName }) {
  const fullPath = filePath(file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Skipping ${file} - not found at ${fullPath}`);
    return { inserted: 0, errors: 0 };
  }
  // Use the underlying native driver to insert documents into the explicit DB/collection.
  // This avoids Mongoose schema casting issues (e.g., UUID _id -> ObjectId cast failures)
  const db = mongoose.connection.client.db(dbName || mongoose.connection.db.databaseName);
  const rows = await parseCsvToArray(fullPath);
  console.log(`[${modelName}] ${fullPath} -> rows=${rows.length}; db=${db.databaseName}`);
  const docs = rows.map(mapper);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      const res = await db.collection(modelName).insertMany(batch, { ordered: false });
      inserted += res.insertedCount || batch.length;
    } catch (err) {
      errors += 1;
      console.error(`Error inserting batch into ${modelName}:`, err.message || err);
    }
  }

  return { inserted, errors };
}

async function createIndices() {
  // create helpful indices on collections that exist
  const db = mongoose.connection.db;
  const ops = [];
  try {
    if (await db.listCollections({ name: "users" }).hasNext()) {
      ops.push(db.collection("users").createIndex({ phone: 1 }));
    }
  } catch (e) {
    // ignore
  }
  try {
    if (await db.listCollections({ name: "bookings" }).hasNext()) {
      ops.push(db.collection("bookings").createIndex({ user_id: 1 }));
      ops.push(db.collection("bookings").createIndex({ worker_id: 1 }));
      ops.push(db.collection("bookings").createIndex({ created_time: -1 }));
    }
  } catch (e) {}

  try {
    if (await db.listCollections({ name: "events" }).hasNext()) {
      ops.push(db.collection("events").createIndex({ user_id: 1 }));
      ops.push(db.collection("events").createIndex({ created_time: -1 }));
      ops.push(db.collection("events").createIndex({ status: 1 }));
    }
  } catch (e) {}

  await Promise.all(ops).catch((e) => console.warn("Index creation issue:", e.message || e));
}

async function main() {
  console.log("Seeder starting. Dry-run:", !!argv["dry-run"]);

  // Ensure data dir exists
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    process.exit(2);
  }

  const targets = [
    { file: "users.csv", name: "users" },
    { file: "workers.csv", name: "workers" },
    { file: "bookings.csv", name: "bookings" },
    { file: "events.csv", name: "events" },
  ];

  // Dry run: just count and sample
  if (argv["dry-run"]) {
    for (const t of targets) {
      const fp = filePath(t.file);
      if (!fs.existsSync(fp)) {
        console.log(`${t.file}: not found`);
        continue;
      }
      const { count, sample } = await countAndSampleCsv(fp, 3);
      console.log(`${t.file}: rows=${count}`);
      console.log(` sample:`, sample);
    }
    console.log("Dry-run complete. No DB changes made.");
    process.exit(0);
  }

  // Not dry-run: require URI
  const uri = argv.uri || process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MongoDB URI provided. Use --uri or set MONGODB_URI in env.");
    process.exit(3);
  }

  // Confirm drop
  if (argv.drop && !argv.force) {
    // interactive confirmation
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((res) => rl.question("--drop specified. Type 'yes' to confirm: ", res));
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("Drop aborted.");
      process.exit(0);
    }
  }

  // Connect
  console.log(`Connecting to MongoDB: ${uri.replace(/([^:]+:\/\/)[^@]+@/, "$1***@")} (db=${argv.db})`);
  await mongoose.connect(uri, { dbName: argv.db });
  console.log("Connected. Using DB:", mongoose.connection.db.databaseName);

  if (mongoose.connection.db.databaseName !== argv.db) {
    console.error('Refusing to seed: connected DB does not match --db value', mongoose.connection.db.databaseName);
    process.exit(4);
  }

  if (argv.drop) {
    console.log("Dropping collections: users, workers, bookings, events (if they exist)");
    const db = mongoose.connection.db;
    for (const name of ["users", "workers", "bookings", "events"]) {
      try {
        const exists = await db.listCollections({ name }).hasNext();
        if (exists) await db.collection(name).drop();
      } catch (e) {
        console.warn(`Drop ${name} issue:`, e.message || e);
      }
    }
  }

  // Insert each CSV (respect --only)
  const batchSize = argv["batch-size"] || 1000;
  const onlyList = argv.only ? argv.only.split(',').map(s => s.trim().toLowerCase()) : null;

  const tasks = [
    { file: 'users.csv', name: 'users', mapper: mapRowToUser },
    { file: 'workers.csv', name: 'workers', mapper: mapRowToWorker },
    { file: 'bookings.csv', name: 'bookings', mapper: mapRowToBooking },
    { file: 'events.csv', name: 'events', mapper: mapRowToEvent },
  ];

  for (const t of tasks) {
    if (onlyList && !onlyList.includes(t.name)) {
      console.log(`Skipping ${t.name} (not in --only)`);
      continue;
    }
    if (!fs.existsSync(filePath(t.file))) {
      console.log(`Skipping ${t.file} - file not present`);
      continue;
    }
    console.log(`Inserting ${t.name} from ${t.file}...`);
    const result = await insertCsvToCollection({ file: t.file, modelName: t.name, mapper: t.mapper, batchSize, dbName: argv.db });
    console.log(` -> ${t.name}: inserted=${result.inserted} errors=${result.errors || 0}`);
  }

  console.log("Creating indices...");
  await createIndices();

  console.log("Seeder finished.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeder error:", err && err.stack ? err.stack : err);
  process.exit(1);
});
