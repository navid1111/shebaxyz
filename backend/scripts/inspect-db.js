#!/usr/bin/env node
import mongoose from 'mongoose';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('uri', { type: 'string', describe: 'MongoDB URI' })
  .help()
  .argv;

const uri = argv.uri || process.env.MONGODB_URI;
if (!uri) {
  console.error('No --uri provided and MONGODB_URI not set.');
  process.exit(2);
}

async function main() {
  console.log('Connecting to', uri.replace(/([^:]+:\/\/)[^@]+@/, '$1***@'));
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const admin = mongoose.connection.db.admin();
  const info = await admin.listDatabases();
  console.log('Databases found:');
  for (const dbInfo of info.databases) {
    const dbName = dbInfo.name;
    try {
      const db = mongoose.connection.client.db(dbName);
      const collections = await db.listCollections().toArray();
      console.log(`- ${dbName} (${collections.length} collections)`);
      for (const col of ['users', 'workers', 'bookings', 'events']) {
        const exists = collections.find((c) => c.name === col);
        if (exists) {
          const count = await db.collection(col).countDocuments();
          console.log(`   ${col}: ${count}`);
        }
      }
    } catch (e) {
      console.warn('  could not inspect db', dbName, e.message || e);
    }
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('inspect-db error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
