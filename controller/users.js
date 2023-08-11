const { MongoClient } = require('mongodb');
const config = require('../config');
const connect = require('../connect');
const { dbUrl } = config;
const client = new MongoClient(dbUrl);

module.exports = {
  getUsers: async (req, resp, next) => {
    // TODO: Implementa la función necesaria para traer la colección `users`
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page, 10); 
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  
  try {
  const db = await connect();
  const usersCollection = db.collection('users');

  const totalUsers = await usersCollection.countDocuments();
  const totalPages = Math.ceil(totalUsers / limitNum);
  
  const users = await usersCollection
  .find()
  .skip(skip)
  .limit(limitNum)
  .toArray();

  const linkHeaders = {
    first: `</users?page=1&limit=${limitNum}>; rel="first"`,
    prev: `</users?page=${pageNum - 1}&limit=${limitNum}>; rel="prev"`,
    next: `</users?page=${pageNum + 1}&limit=${limitNum}>; rel="next"`,
    last: `</users?page=${totalPages}&limit=${limitNum}>; rel="last"`,
  };

  resp.header('link', Object.values(linkHeaders).join(', '));
  resp.status(200).json(users);

  } catch (err) {
  resp.status(500).json({ error: 'Error en el servidor' });
  next(err);
  } finally {
    client.close();
  }
},
};
