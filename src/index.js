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

// Auth middleware
const rules = auth.rewriter({
  users: 600,
  books: 664,
  categories: 664,
  products: 664,
  orders: 664,
  reviews: 664,
  coupons: 664,
  carts: 664
})

// Set a default port if PORT is undefined in the environment
const PORT = process.env.PORT || 3000;

server.use(middlewares);
server.use(rules)
server.use(auth)
server.use(router);
server.listen(PORT, () => {
  console.log("Welcome to mock API on port " + PORT);
});
