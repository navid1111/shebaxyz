#!/usr/bin/env node
/*
  scripts/generate-synthetic.js

  Deterministic synthetic CSV generator for Part 1.
  Usage examples:
    # small smoke test
    node scripts/generate-synthetic.js --seed 123 --out ./data --users 10 --workers 5 --bookings 20 --events 100

    # full default run
    node scripts/generate-synthetic.js --seed 42 --out ./data

  This script uses @faker-js/faker with seed to produce repeatable outputs.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { faker } from '@faker-js/faker';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

const argv = yargs(hideBin(process.argv))
  .option('seed', { type: 'number', describe: 'Random seed', default: 42 })
  .option('out', { type: 'string', describe: 'Output directory', default: './data' })
  .option('users', { type: 'number', describe: 'Number of users', default: 1000 })
  .option('workers', { type: 'number', describe: 'Number of workers', default: 50 })
  .option('bookings', { type: 'number', describe: 'Number of bookings', default: 2000 })
  .option('events', { type: 'number', describe: 'Number of events', default: 15000 })
  .help()
  .argv;

const OUT_DIR = path.resolve(process.cwd(), argv.out);
const SEED = Number(argv.seed) || 42;
const NUM_USERS = Number(argv.users);
const NUM_WORKERS = Number(argv.workers);
const NUM_BOOKINGS = Number(argv.bookings);
const NUM_EVENTS = Number(argv.events);

faker.seed(SEED);

// Use a deterministic reference timestamp so outputs are reproducible
// across different run times. Set to a fixed date (kept near current dev date).
const BASE_TIME_MS = Date.parse('2025-11-03T00:00:00.000Z');

function ensureOutDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isoString(d) {
  return new Date(d).toISOString();
}

function randInt(min, max) {
  return Math.floor(faker.number.int({ min, max }));
}

function pick(arr) {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

function makeUsers(n) {
  const users = [];
  const cities = ['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Sylhet', 'Barishal'];
  for (let i = 0; i < n; i++) {
    const user_id = faker.string.uuid();
    const name = faker.person.fullName();
    const phone = '+880' + faker.phone.number('1#########');
    const preferred_language = faker.datatype.boolean(0.2) ? 'en' : 'bn';
    const city = pick(cities);
    const postal_code = faker.location.zipCode('#####');
  const daysAgo = faker.number.int({ min: 0, max: 400 });
  const signup_date = isoString(BASE_TIME_MS - daysAgo * 24 * 3600 * 1000);
  const last_active = isoString(BASE_TIME_MS - faker.number.int({ min: 0, max: daysAgo }) * 24 * 3600 * 1000);
    const device_type = faker.datatype.boolean(0.85) ? 'mobile' : 'web';
    const opt_in_notifications = faker.datatype.boolean(0.9);
    const timezone = 'Asia/Dhaka';
    users.push({ user_id, name, phone, preferred_language, city, postal_code, signup_date, last_active, device_type, opt_in_notifications, timezone });
  }
  return users;
}

function makeWorkers(n) {
  const workers = [];
  const categoriesPool = ['plumber', 'electrician', 'beauty', 'cleaning', 'carpentry', 'pest_control', 'ac_repair'];
  const contactMethods = ['whatsapp', 'in-app', 'sms', 'call'];
  for (let i = 0; i < n; i++) {
    const worker_id = faker.string.uuid();
    const name = faker.person.fullName();
    const phone = '+880' + faker.phone.number('1#########');
    const city = pick(['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi']);
    const categories = faker.helpers.arrayElements(categoriesPool, faker.number.int({ min: 1, max: 3 }));
    const primary_language = faker.datatype.boolean(0.3) ? 'en' : 'bn';
    const literacy_level = pick(['low', 'medium', 'high']);
    const certifications = faker.helpers.arrayElements(['certA', 'certB', 'certC', 'none'], faker.number.int({ min: 0, max: 2 }));
    const rating = (faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 })).toFixed(1);
    const total_tasks = faker.number.int({ min: 0, max: 2000 });
    const avg_task_time = faker.number.int({ min: 900, max: 7200 });
  const last_active = isoString(BASE_TIME_MS - faker.number.int({ min: 0, max: 30 }) * 24 * 3600 * 1000);
    const preferred_contact_method = pick(contactMethods);
    workers.push({ worker_id, name, phone, city, categories: categories.join('|'), primary_language, literacy_level, certifications: certifications.join('|'), rating, total_tasks, avg_task_time, last_active, preferred_contact_method });
  }
  return workers;
}

function makeBookings(users, workers, n) {
  const bookings = [];
  const statuses = ['requested', 'accepted', 'completed', 'cancelled'];
  for (let i = 0; i < n; i++) {
    const booking_id = faker.string.uuid();
    const user = pick(users);
    const worker = faker.datatype.boolean(0.8) ? pick(workers) : null;
    const category = worker ? worker.categories.split('|')[0] : pick(['plumber', 'electrician', 'beauty', 'cleaning']);
    const subcategory = category + '_general';
  const created_offset = faker.number.int({ min: 0, max: 120 });
  const created_time = isoString(BASE_TIME_MS - created_offset * 24 * 3600 * 1000 - faker.number.int({ min: 0, max: 86400 }) * 1000);
  const scheduled_time = isoString(BASE_TIME_MS + faker.number.int({ min: 0, max: 14 }) * 24 * 3600 * 1000 + faker.number.int({ min: 0, max: 86400 }) * 1000);
    const status = pick(statuses);
    const price = faker.number.int({ min: 100, max: 5000 });
    const tip = faker.datatype.boolean(0.3) ? faker.number.int({ min: 10, max: 500 }) : 0;
    const feedback_rating = status === 'completed' ? faker.number.int({ min: 1, max: 5 }) : '';
    const feedback_text = feedback_rating ? faker.lorem.sentence() : '';
    const rework_required = faker.datatype.boolean(0.05);
    bookings.push({ booking_id, user_id: user.user_id, worker_id: worker ? worker.worker_id : '', category, subcategory, scheduled_time, created_time, status, price, tip, feedback_rating, feedback_text, rework_required });
  }
  return bookings;
}

function makeEvents(users, n) {
  const events = [];
  const pages = ['home', 'search', 'booking_flow', 'profile', 'checkout'];
  for (let i = 0; i < n; i++) {
    const event_id = faker.string.uuid();
    const user = pick(users);
    const page = pick(pages);
    const time_spent = faker.number.int({ min: 1, max: 600 });
  const timestamp = isoString(BASE_TIME_MS - faker.number.int({ min: 0, max: 120 }) * 24 * 3600 * 1000 - faker.number.int({ min: 0, max: 86400 }) * 1000);
    const metadata = JSON.stringify({ search: faker.lorem.word() });
    events.push({ event_id, user_id: user.user_id, page, time_spent, timestamp, metadata });
  }
  return events;
}

async function writeCsv(filename, header, records) {
  const csvWriter = createCsvWriter({ path: path.join(OUT_DIR, filename), header });
  await csvWriter.writeRecords(records);
}

async function main() {
  ensureOutDir(OUT_DIR);
  console.log(`Seed: ${SEED} | out: ${OUT_DIR}`);
  console.log(`Generating users=${NUM_USERS}, workers=${NUM_WORKERS}, bookings=${NUM_BOOKINGS}, events=${NUM_EVENTS}`);

  const users = makeUsers(NUM_USERS);
  const workers = makeWorkers(NUM_WORKERS);
  const bookings = makeBookings(users, workers, NUM_BOOKINGS);
  const events = makeEvents(users, NUM_EVENTS);

  // write CSVs
  await writeCsv('users.csv', [
    { id: 'user_id', title: 'user_id' }, { id: 'name', title: 'name' }, { id: 'phone', title: 'phone' }, { id: 'preferred_language', title: 'preferred_language' }, { id: 'city', title: 'city' }, { id: 'postal_code', title: 'postal_code' }, { id: 'signup_date', title: 'signup_date' }, { id: 'last_active', title: 'last_active' }, { id: 'device_type', title: 'device_type' }, { id: 'opt_in_notifications', title: 'opt_in_notifications' }, { id: 'timezone', title: 'timezone' }
  ], users);

  await writeCsv('workers.csv', [
    { id: 'worker_id', title: 'worker_id' }, { id: 'name', title: 'name' }, { id: 'phone', title: 'phone' }, { id: 'city', title: 'city' }, { id: 'categories', title: 'categories' }, { id: 'primary_language', title: 'primary_language' }, { id: 'literacy_level', title: 'literacy_level' }, { id: 'certifications', title: 'certifications' }, { id: 'rating', title: 'rating' }, { id: 'total_tasks', title: 'total_tasks' }, { id: 'avg_task_time', title: 'avg_task_time' }, { id: 'last_active', title: 'last_active' }, { id: 'preferred_contact_method', title: 'preferred_contact_method' }
  ], workers);

  await writeCsv('bookings.csv', [
    { id: 'booking_id', title: 'booking_id' }, { id: 'user_id', title: 'user_id' }, { id: 'worker_id', title: 'worker_id' }, { id: 'category', title: 'category' }, { id: 'subcategory', title: 'subcategory' }, { id: 'scheduled_time', title: 'scheduled_time' }, { id: 'created_time', title: 'created_time' }, { id: 'status', title: 'status' }, { id: 'price', title: 'price' }, { id: 'tip', title: 'tip' }, { id: 'feedback_rating', title: 'feedback_rating' }, { id: 'feedback_text', title: 'feedback_text' }, { id: 'rework_required', title: 'rework_required' }
  ], bookings);

  await writeCsv('events.csv', [
    { id: 'event_id', title: 'event_id' }, { id: 'user_id', title: 'user_id' }, { id: 'page', title: 'page' }, { id: 'time_spent', title: 'time_spent' }, { id: 'timestamp', title: 'timestamp' }, { id: 'metadata', title: 'metadata' }
  ], events);

  console.log('Done. CSVs written to', OUT_DIR);
}

main().catch(err => {
  console.error('Error generating data:', err);
  process.exit(1);
});
