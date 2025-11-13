import pg from 'pg';

const dbHost = 'postgres://postgres:postgres@localhost:5432'
const defaultDbName = 'postgres';
const dbName = 'ecratum'; // target DB name

class DBConnection {
  constructor() {
    this.dbPool = null; // connection pool
  }

  async checkDbConnection() {
    // check DB connection or create
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
  
      // initializing DB connection pool
      this.dbPool = new pg.Pool({
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
  
  async initializeTableData() {
    // check data in the table or add
    console.log('⏳ Checking if table has data...');
    const client = await this.dbPool.connect();
  
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
}

const dbConnect = new DBConnection();

export default dbConnect;