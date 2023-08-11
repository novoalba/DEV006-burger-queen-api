const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const config = require('../config');
const connect = require('../connect');

const {
  requireAuth,
  requireAdmin,
} = require('../middleware/auth');

const {
  getUsers,
} = require('../controller/users');


const initAdminUser = (app, next) => {
  const { adminEmail, adminPassword } = app.get('config');
  if (!adminEmail || !adminPassword) {
    return next();
  }

  const adminUser = {
    // uid: '64c76e6fcc405790e3fa2d80',
    email: adminEmail,
    password: bcrypt.hashSync(adminPassword, 10),
    roles: { admin: true },
  };

  // const { dbUrl } = config;
  // const client = new MongoClient(dbUrl);
  
  async function insertAdminUser() {
    try {
      // await client.connect();
      const db = await connect();
      // const db = client.db('BQAPI-ALBA');
      const usersCollection = db.collection('users');
      const admUser = await usersCollection.findOne({ email: adminUser.email });
      if (!admUser) {
        await usersCollection.insertOne(adminUser);
        console.log('Usuarix admin creado con éxito');
      } else {
        console.log('Ya existe el usuarix admin');
      } 
    } catch (err) {
      console.error('Error al crear el usuarix admin:', err);
      next(err);
    } finally {
      // await client.close();
      next();
    }
  }
  insertAdminUser();
  };
  
module.exports = initAdminUser;

  // TODO: crear usuaria admin
  // Primero ver si ya existe adminUser en base de datos
  // si no existe, hay que guardarlo



/*
 * Diagrama de flujo de una aplicación y petición en node - express :
 *
 * request  -> middleware1 -> middleware2 -> route
 *                                             |
 * response <- middleware4 <- middleware3   <---
 *
 * la gracia es que la petición va pasando por cada una de las funciones
 * intermedias o "middlewares" hasta llegar a la función de la ruta, luego esa
 * función genera la respuesta y esta pasa nuevamente por otras funciones
 * intermedias hasta responder finalmente a la usuaria.
 *
 * Un ejemplo de middleware podría ser una función que verifique que una usuaria
 * está realmente registrado en la aplicación y que tiene permisos para usar la
 * ruta. O también un middleware de traducción, que cambie la respuesta
 * dependiendo del idioma de la usuaria.
 *
 * Es por lo anterior que siempre veremos los argumentos request, response y
 * next en nuestros middlewares y rutas. Cada una de estas funciones tendrá
 * la oportunidad de acceder a la consulta (request) y hacerse cargo de enviar
 * una respuesta (rompiendo la cadena), o delegar la consulta a la siguiente
 * función en la cadena (invocando next). De esta forma, la petición (request)
 * va pasando a través de las funciones, así como también la respuesta
 * (response).
 */

/** @module users */
module.exports = (app, next) => {
  /**
   * @name GET /users
   * @description Lista usuarias
   * @path {GET} /users
   * @query {String} [page=1] Página del listado a consultar
   * @query {String} [limit=10] Cantitad de elementos por página
   * @header {Object} link Parámetros de paginación
   * @header {String} link.first Link a la primera página
   * @header {String} link.prev Link a la página anterior
   * @header {String} link.next Link a la página siguiente
   * @header {String} link.last Link a la última página
   * @auth Requiere `token` de autenticación y que la usuaria sea **admin**
   * @response {Array} users
   * @response {String} users[]._id
   * @response {Object} users[].email
   * @response {Object} users[].roles
   * @response {Boolean} users[].roles.admin
   * @code {200} si la autenticación es correcta
   * @code {401} si no hay cabecera de autenticación
   * @code {403} si no es ni admin
   */
  app.get('/users', requireAdmin, getUsers);

  /**
   * @name GET /users/:uid
   * @description Obtiene información de una usuaria
   * @path {GET} /users/:uid
   * @params {String} :uid `id` o `email` de la usuaria a consultar
   * @auth Requiere `token` de autenticación y que la usuaria sea **admin** o la usuaria a consultar
   * @response {Object} user
   * @response {String} user._id
   * @response {Object} user.email
   * @response {Object} user.roles
   * @response {Boolean} user.roles.admin
   * @code {200} si la autenticación es correcta
   * @code {401} si no hay cabecera de autenticación
   * @code {403} si no es ni admin o la misma usuaria
   * @code {404} si la usuaria solicitada no existe
   */
  app.get('/users/:uid', requireAuth, async (req, resp) => {
    console.log('Route: /users/:uid is handling the request'); 
    const uid = req.params.uid;
    const email = uid;
    // const _id = uid;

    const db = await connect();
    const usersCollection = db.collection('users');
    const { dbUrl } = config;
    const client = new MongoClient(dbUrl);
    let users;

    // Verificar si el token pertenece a una usuaria administradora
    const isAdmin = req.isAdmin === true;

    // Verificar si el token pertenece a la misma usuaria o si es una usuaria administradora
    const isAuthorized = req.userId === uid || isAdmin || req.thisEmail === uid;

    if (!isAuthorized) {
      await client.close();
      return resp.status(403).json({
        error: 'No estás autorizadx',
      });
    }
    // Verificar si ya existe una usuaria con el id o email insertado
    console.log('uid: ', uid);
    // console.log(email);
    if (uid.includes('@')) {
      users = await usersCollection.findOne({ email });
    } else if (typeof uid === 'string') {
      const _id = new ObjectId(uid);
      users = await usersCollection.findOne({ _id });
    }

    if (users) {
      await client.close();
      resp.status(200).json({
        id: users._id,
        email: users.email,
        role: users.role,
      });
    } else {
      await client.close();
      resp.status(404).json({
        error: 'No se encontró al usuarix',
      });
    }
  });
  /**
   * @name POST /users
   * @description Crea una usuaria
   * @path {POST} /users
   * @body {String} email Correo
   * @body {String} password Contraseña
   * @body {Object} [roles]
   * @body {Boolean} [roles.admin]
   * @auth Requiere `token` de autenticación y que la usuaria sea **admin**
   * @response {Object} user
   * @response {String} user._id
   * @response {Object} user.email
   * @response {Object} user.roles
   * @response {Boolean} user.roles.admin
   * @code {200} si la autenticación es correcta
   * @code {400} si no se proveen `email` o `password` o ninguno de los dos
   * @code {401} si no hay cabecera de autenticación
   * @code {403} si ya existe usuaria con ese `email`
   */
  app.post('/users', requireAdmin, async (req, resp, next) => {
    // TODO: implementar la ruta para agregar
    // nuevos usuarios
    const { email, password, role } = req.body;
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    const passwordRegex = /^(?=\w*\d)(?=\w*[A-Z])(?=\w*[a-z])\S{8,16}$/;


    // verificar que email y password son proporcionados:
      if (!email || !password) {
        return resp.status(400).json( {error: 'Debes proporcionar un email y una contraseña'});
      }

      if (!emailRegex.test(email)) {
      return resp.status(400).json({ error: 'Debes proporcionar un email válido' });
      }

      if (!passwordRegex.test(password)) {
        return resp.status(400).json({ error: 'La contraseña debe tener entre 8 y 16 caracteres. Debe tener al menos un número, al menos una mayúscula y al menos una minúscula.'})
      }

      const db = await connect();
      const usersCollection = db.collection('users');

    // verificar si usuarix es admin: 
    const isAdmin = req.isAdmin === true;
      if (!isAdmin) {
        return resp.status(403).json({ error: 'No tienes permitido insertar unx nuevx usuarix' });
      }

    // verificar si hay ya un usuarix con el mismo email: 
    const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return resp.status(403).json({ error: 'Mail ya asignado a unx usuarix existente' });
      } else {
    // crear nuevx usuarix: 
    const newUser = {
      email,
      password: bcrypt.hashSync(password, 10),
      role,
    }
    const userInDB = await usersCollection.insertOne(newUser);
    console.log(userInDB);
    resp.status(200).json({
      user: {
        id: userInDB.insertedId,
        email,
        role,
      }
    })
  }


  });

  /**
   * @name PATCH /users
   * @description Modifica una usuaria
   * @params {String} :uid `id` o `email` de la usuaria a modificar
   * @path {PATCH} /users
   * @body {String} email Correo
   * @body {String} password Contraseña
   * @body {Object} [roles]
   * @body {Boolean} [roles.admin]
   * @auth Requiere `token` de autenticación y que la usuaria sea **admin** o la usuaria a modificar
   * @response {Object} user
   * @response {String} user._id
   * @response {Object} user.email
   * @response {Object} user.roles
   * @response {Boolean} user.roles.admin
   * @code {200} si la autenticación es correcta
   * @code {400} si no se proveen `email` o `password` o ninguno de los dos
   * @code {401} si no hay cabecera de autenticación
   * @code {403} si no es ni admin o la misma usuaria
   * @code {403} una usuaria no admin intenta de modificar sus `roles`
   * @code {404} si la usuaria solicitada no existe
   */
  app.patch('/users/:uid', requireAuth, async (req, resp, next) => {

      const { uid } = req.params;
      const { email, password, role } = req.body;

      const db = await connect();
      const usersCollection = db.collection('users');
      const { dbUrl } = config;
      const client = new MongoClient(dbUrl);
      let users;

      const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
      const passwordRegex = /^(?=\w*\d)(?=\w*[A-Z])(?=\w*[a-z])\S{8,16}$/;

      // verificar que email y password son proporcionados:
      if (!email || !password) {
        return resp.status(400).json({ error: 'Debes proporcionar un email y una contraseña' });
      }

      if (!emailRegex.test(email)) {
      return resp.status(400).json({ error: 'Debes proporcionar un email válido' });
      }

      if (!passwordRegex.test(password)) {
        return resp.status(400).json({ error: 'Debes proporcionar una contraseña válida. La contraseña debe tener entre 8 y 16 caracteres. Debe tener al menos un número, al menos una mayúscula y al menos una minúscula' })
      } 
      // Validar que el objeto role no esté vacío
      if (!role || Object.keys(role).length === 0) {
        return resp.status(400).json({ error: 'El objeto "role" no puede estar vacío' });
        } else {
        // verificar si el token pertenece a una usuaria administradora
        const isAdmin = req.isAdmin === true;
        const isUser = req.userId === uid || req.thisEmail === uid;
        // verificar si el token pertenece a la misma usuaria o si es una usuaria administradora
        const isAuthorized = isUser || isAdmin;
  
        if (!isAuthorized) {
          await client.close();
          return resp.status(403).json({
            error: 'No tienes autorización para modificar este usuarix',
          });
        }
  
        if (!isAdmin && role && role !== req.isAdmin) {
          await client.close();
          return resp.status(403).json({
            error: 'No tienes autorización para cambiar el rol del usuarix',
          });
        }
  
        // verificar si la contraseña se está actualizando
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10); // encriptar la nueva contraseña
          req.body.password = hashedPassword; // actualizar la contraseña en req.body
        }
  
        // verificar si ya existe una usuaria con el id o email insertado
        if (uid.includes('@')) {
          users = await usersCollection.findOneAndUpdate(
            { email: uid },
            { $set: req.body },
            { returnOriginal: false },
          );
        } else {
          const userId = new ObjectId(uid);
          users = await usersCollection.findOneAndUpdate(
            { _id: userId },
            { $set: req.body },
            { returnOriginal: false },
          );
        }
  
        if (users.value) {
          await client.close();
          return resp.status(200).json({
            id: users.value._id,
            email: users.value.email,
            role: users.value.role,
          });
        }
        // si el usuario no existe y el usuario es administrador, devolver un error 404
        if (isAdmin) {
          await client.close();
          return resp.status(404).json({
            error: 'Usuarix no encontradx',
          });
        }
        await client.close();
        return resp.status(404).json({
          error: 'Usuarix no encontradx',
        });
      }
    });

  /**
   * @name DELETE /users
   * @description Elimina una usuaria
   * @params {String} :uid `id` o `email` de la usuaria a modificar
   * @path {DELETE} /users
   * @auth Requiere `token` de autenticación y que la usuaria sea **admin** o la usuaria a eliminar
   * @response {Object} user
   * @response {String} user._id
   * @response {Object} user.email
   * @response {Object} user.roles
   * @response {Boolean} user.roles.admin
   * @code {200} si la autenticación es correcta
   * @code {401} si no hay cabecera de autenticación
   * @code {403} si no es ni admin o la misma usuaria
   * @code {404} si la usuaria solicitada no existe
   */
  app.delete('/users/:uid', requireAuth, async (req, resp, next) => {

    const { uid } = req.params;

    const db = await connect();
    const usersCollection = db.collection('users');
    const { dbUrl } = config;
    const client = new MongoClient(dbUrl);
    let users;


    // Verificar si el token pertenece a una usuaria administradora
    const isAdmin = req.isAdmin === true;

    // Verificar si el token pertenece a la misma usuaria o si es una usuaria administradora
    const isAuthorized = req.userId === uid || isAdmin || req.thisEmail === uid;

    if (!isAuthorized) {
      await client.close();
      return resp.status(403).json({
        error: 'No tienes autorización para eliminar al usuarix',
      });
    }

    // Verificar si ya existe una usuaria con el id o email insertado
    if (uid.includes('@')) {
      users = await usersCollection.findOneAndDelete({ email: uid });
    } else {
      const userId = new ObjectId(uid);
      users = await usersCollection.findOneAndDelete({ _id: userId });
    }
    if (users.value) {
      await client.close();
      return resp.status(200).json({
        id: users.value._id,
        email: users.value.email,
        role: users.value.role,
      });
    }
    await client.close();
    return resp.status(404).json({
      error: 'Usuarix no encontradx',
    });
  });
  initAdminUser(app, next);
};
