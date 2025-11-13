import express from 'express';
import pg from 'pg';

const app = express();

const dbHost = 'postgres://postgres:postgres@localhost:5432'
const dbName = 'ecratum';
const defaultDbName = 'postgres';

let dbPool = null; // DB connection pool

app.get('/', async function (req, res) {
  try {
    const result = await dbPool.query('SELECT id, name from companies LIMIT 100');

    res.json(result.rows);
  } catch (error) {
    console.error('error running query', error);
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function checkDbConnection() {
  console.log('⏳ Checking database connection...');

  // connect to default pg-DB
  const client = new pg.Client(`${dbHost}/${defaultDbName}`);
  
  try {
    await client.connect();
    console.log('✔️  Connected to PostgreSQL successfully');

    // check if the database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);

      await client.query(`CREATE DATABASE "${dbName}"`);
      console.info(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.info(`✅ Database "${dbName}" already exists.`);
    }

    // initializing DB pool
    dbPool = new pg.Pool({
      connectionString: `${dbHost}/${dbName}`,
    });
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  } 
  finally {
    await client.end();
  }
}

async function initializeDatabase() {
  console.log('⏳ Checking if database is initialized...');
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');

    // check if 'companies' table exists
    const tableExistsRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'companies'
      );
    `);

    if (!tableExistsRes.rows[0].exists) {
      console.log('ℹ️  "companies" table does not exist. Creating...');
      await client.query(`
        CREATE TABLE companies (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `);
      console.info('✅ "companies" table created successfully.');
    }

    // check if 'companies' table is empty
    const rowCountRes = await client.query('SELECT COUNT(*) FROM companies');

    if (parseInt(rowCountRes.rows[0].count, 10) === 0) {
      console.log('ℹ️  "companies" table is empty. Populating with 2000 rows...');

      for (let i = 1; i <= 2000; i++) {
        await client.query('INSERT INTO companies (name) VALUES ($1)', [`Company ${i}`]);
      }
      console.info('✅ "companies" table populated successfully.');
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database initialization:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// check database connection and start server
(async () => {
  await checkDbConnection();
  await initializeDatabase();

  // start the server
  app.listen(3000, function () {
    console.log('Server app listening on port 3000!');
  });
})();
