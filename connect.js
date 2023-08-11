const { MongoClient } = require('mongodb');
const config = require('./config');

// eslint-disable-next-line no-unused-vars
const { dbUrl } = config;
const client = new MongoClient(dbUrl);

async function connect() {
  // TODO: Conexión a la Base de Datos
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const db = client.db('BQAPI-ALBA');
    return db;
  } catch(err) {
    console.error('No se pudo conectar a la base de datos', err);
    throw err;
  }
}

module.exports = connect;
