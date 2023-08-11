const jwt = require('jsonwebtoken');
const connect = require('../connect');

module.exports = (secret) => async (req, resp, next) => {
  console.log('Middleware: checkAuthMiddleware is executing');
  const { authorization } = req.headers;

  if (!authorization) {
    return next();
  }

  const [type, token] = authorization.split(' ');

  if (type.toLowerCase() !== 'bearer') {
    return next();
  }
  console.log('Token recibido:', token); // Agregar esta línea para verificar el token


  if (secret !== 'esta-es-la-api-burger-queen') {
    console.error('El secret key no coincide');
    return next(403);
  } console.log('El secret key coincide')



  jwt.verify(token, secret, async (err, decodedToken) => {
    if (err) {
      console.error('Error al verificar el token', err)
      return next(403);
    }

    req.userId = decodedToken.uid;
    req.isAdmin = decodedToken.role === 'admin';
    console.log('req.isAdmin: ', req.isAdmin);
    req.thisEmail = decodedToken.email;

    if (req.isAdmin) {
      console.log('El usuarix es admin');
    } else {
      console.log('El usuarix no es admin');
    }
    
    next();
  });
};

module.exports.isAuthenticated = (req) => (
  // TODO: decidir por la informacion del request si la usuaria esta autenticada
  !!req.userId
  /* false */
);

module.exports.isAdmin = (req) => (
  // TODO: decidir por la informacion del request si la usuaria es admin
  !!req.isAdmin
  /* false */
);

module.exports.requireAuth = (req, resp, next) => (
  (!module.exports.isAuthenticated(req))
    ? next(401)
    : next()
);

module.exports.requireAdmin = (req, resp, next) => (
  // eslint-disable-next-line no-nested-ternary
  (!module.exports.isAuthenticated(req))
    ? next(401)
    : (!module.exports.isAdmin(req))
      ? next(403)
      : next()
);