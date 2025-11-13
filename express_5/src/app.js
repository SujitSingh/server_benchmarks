import express from 'express';
import dbConnect from './utils/db-connection.js';

const app = express();

app.get('/', async function (req, res) {
  try {
    const result = await dbConnect.dbPool.query('SELECT id, name from companies LIMIT 100');

    res.json(result.rows);
  } catch (error) {
    console.error('error running query', error);
    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// check database connection and start server
(async () => {
  await dbConnect.checkDbConnection(); // check DB connection or create
  await dbConnect.initializeTableData(); // check data in the table or add

  // start the server
  app.listen(3000, function () {
    console.log('Server app listening on port 3000!');
  });
})();
