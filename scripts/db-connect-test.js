const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.tyadjthzqcjmhldvuvsz',
    password: 'G2!zY/W*p&#5PPw',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('CONNECTED!');

    const sql = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Migration completed!');

    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    try { await client.end(); } catch (e) {}
  }
}
run();
