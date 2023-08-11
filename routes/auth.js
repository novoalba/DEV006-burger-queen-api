const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const connect = require('../connect');

const { secret } = config;

/** @module auth */
module.exports = (app, nextMain) => {
  /**
   * @name /auth
   * @description Crea token de autenticación.
   * @path {POST} /auth
   * @body {String} email Correo
   * @body {String} password Contraseña
   * @response {Object} resp
   * @response {String} resp.token Token a usar para los requests sucesivos
   * @code {200} si la autenticación es correcta
   * @code {400} si no se proveen `email` o `password` o ninguno de los dos
   * @auth No requiere autenticación
   */
  app.post('/login', async (req, resp, next) => {
    console.log('hola');
    const db = await connect();
    const usersCollection = db.collection('users');

    const { email, password } = req.body;
    console.log(email, password, 'loquesea');

    if (!email || !password) {
      return next(400);
    }

    // TODO: autenticar a la usuarix
    // Hay que confirmar si el email y password
    // coinciden con un user en la base de datos
    const user = await usersCollection.findOne({ email });
    console.log(user);
      if (!user) {
        return next(404);
      }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return next(400);
    }
    let tokenRole = "";
    if (user.role.admin === true) {
      tokenRole = "admin";
    }

    if (user.role.waiter === true) {
      tokenRole = "meserx";
    }

    if (user.role.cook === true) {
      tokenRole = "cocinerx";
    }

    // Si coinciden, manda un access token creado con jwt
    console.log(user);
    const accessToken = jwt.sign({ uid: user._id, role: tokenRole, email: user.email }, secret, { expiresIn: '24h' });
    console.log(tokenRole);
    resp.status(200).json({ accessToken });
    next();
  });

  return nextMain();
};
