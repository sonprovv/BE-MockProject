const jsonServer = require("json-server");
const path = require("path");
const dotenv = require("dotenv")
const auth = require("json-server-auth")
dotenv.config()

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "api.json"));
const middlewares = jsonServer.defaults();
// /!\ Bind the router db to the app
server.db = router.db;

server.use(middlewares);
server.use(auth)
server.use(router);
server.listen(process.env.PORT, () => {
  console.log("Welcome to mock API on port " + process.env.PORT);
});
