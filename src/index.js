const jsonServer = require("json-server");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('./config/firebase-config');
const booksRouter = require('./routes/books');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc 
} = require('firebase/firestore');

dotenv.config();

const server = jsonServer.create();
const middlewares = jsonServer.defaults();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

server.use(middlewares);
server.use(jsonServer.bodyParser);

// CORS middleware
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Token verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log('=== TOKEN VERIFICATION ===');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('Auth header:', authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token.substring(0, 30) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log('✅ Token verified successfully');
      console.log('User info:', { email: decoded.email, sub: decoded.sub });
    } catch (err) {
      console.log('❌ Token verification failed:', err.message);
      req.user = null;
    }
  } else {
    console.log('No authorization header');
    req.user = null;
  }
  
  console.log('Final req.user:', req.user ? 'EXISTS' : 'NULL');
  console.log('=== END VERIFICATION ===\n');
  next();
};

// Apply token verification
server.use(verifyToken);

// Mount routers
server.use('/api/books', booksRouter);
server.use('/api/users', usersRouter);
server.use('/api/orders', ordersRouter);

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.email) {
    console.log('🚫 Auth required but user not found');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid token required'
    });
  }
  console.log('✅ Auth check passed for:', req.user.email);
  next();
};

// Custom login route with bcrypt password comparison
server.post('/login', async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const userDoc = querySnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ Login successful');
    
    const token = jwt.sign(
      { 
        email: user.email, 
        sub: user.id,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      JWT_SECRET
    );
    
    res.json({
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Custom register route with bcrypt password hashing
server.post('/register', async (req, res) => {
  const { email, password, fullname, role = 'user' } = req.body;
  
  try {
    // Kiểm tra email đã tồn tại chưa
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      password: hashedPassword,
      fullname,
      role,
      nickName: "",
      birthDay: "",
      birthDate: {
        day: "",
        month: "",
        year: ""
      },
      gender: "",
      nationality: "",
      phone: "",
      address: "",
      createdAt: new Date().toISOString()
    };

    // Thêm user mới vào Firestore
    const docRef = await addDoc(collection(db, 'users'), newUser);
    
    const token = jwt.sign(
      { 
        email: newUser.email, 
        sub: docRef.id,
        role: newUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60)
      },
      JWT_SECRET
    );
    
    res.status(201).json({
      accessToken: token,
      user: {
        id: docRef.id,
        email: newUser.email,
        fullname: newUser.fullname,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cart routes
server.get('/cart', requireAuth, async (req, res) => {
  console.log('=== GET CART ===');
  const userId = req.user.email;
  console.log('Getting cart for user:', userId);
  
  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      const newCart = {
        userId,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'carts'), newCart);
      console.log('✅ Created new empty cart');
      return res.status(200).json({ id: docRef.id, ...newCart });
    }
    
    const cartDoc = querySnapshot.docs[0];
    const cart = { id: cartDoc.id, ...cartDoc.data() };
    
    // Enrich cart items with book details
    const booksRef = collection(db, 'books');
    const enrichedItems = cart.items.map(async item => {
      const bookDoc = await getDoc(doc(booksRef, item.bookId));
      if (bookDoc.exists()) {
        return {
          ...bookDoc.data(),
          quantity: item.quantity,
          cartItemId: item.id
        };
      }
      return null;
    });
    
    const results = await Promise.all(enrichedItems);
    const filteredResults = results.filter(Boolean);
    
    console.log('✅ Cart retrieved with', filteredResults.length, 'items');
    res.status(200).json({ ...cart, items: filteredResults });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

server.post('/cart/items', requireAuth, async (req, res) => {
  const userId = req.user.email;
  const { bookId, quantity = 1 } = req.body;

  console.log('=== ADD CART ITEM ===');
  console.log('User:', userId);
  console.log('Book ID:', bookId);
  console.log('Quantity:', quantity);

  if (!bookId || typeof quantity !== 'number' || quantity <= 0) {
    console.log('❌ Invalid request body');
    return res.status(400).json({ error: 'Invalid bookId or quantity' });
  }

  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      const newCart = {
        userId,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'carts'), newCart);
      console.log('✅ Created new cart for user:', userId);
      
      const cartId = docRef.id;
      const newItem = {
        id: `item_${Date.now()}`,
        bookId,
        quantity,
        addedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'carts', cartId, 'items'), newItem);
      console.log('✅ Added new item to cart');
      
      res.status(201).json({ message: 'Item added to cart' });
    } else {
      const cartDoc = querySnapshot.docs[0];
      const cartId = cartDoc.id;
      
      const existingItemRef = collection(db, 'carts', cartId, 'items');
      const existingItemQ = query(existingItemRef, where('bookId', '==', bookId));
      const existingItemQuerySnapshot = await getDocs(existingItemQ);
      
      if (!existingItemQuerySnapshot.empty) {
        const existingItemDoc = existingItemQuerySnapshot.docs[0];
        const existingItemId = existingItemDoc.id;
        
        const updatedItem = {
          quantity: existingItemDoc.data().quantity + quantity
        };
        
        await updateDoc(doc(existingItemRef, existingItemId), updatedItem);
        console.log('✅ Updated existing item quantity');
      } else {
        const newItem = {
          id: `item_${Date.now()}`,
          bookId,
          quantity,
          addedAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'carts', cartId, 'items'), newItem);
        console.log('✅ Added new item to cart');
      }
      
      res.status(201).json({ message: 'Item added to cart' });
    }
  } catch (error) {
    console.error('Error adding cart item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

server.put('/cart/items/:id', requireAuth, async (req, res) => {
  const userId = req.user.email;
  const { id: itemId } = req.params;
  const { quantity } = req.body;

  if (typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const cartDoc = querySnapshot.docs[0];
    const cartId = cartDoc.id;
    
    const itemsRef = collection(db, 'carts', cartId, 'items');
    const itemQ = query(itemsRef, where('id', '==', itemId));
    const itemQuerySnapshot = await getDocs(itemQ);
    
    if (itemQuerySnapshot.empty) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    const itemDoc = itemQuerySnapshot.docs[0];
    const itemId = itemDoc.id;
    
    if (quantity === 0) {
      await deleteDoc(doc(itemsRef, itemId));
    } else {
      const updatedItem = {
        quantity
      };
      
      await updateDoc(doc(itemsRef, itemId), updatedItem);
    }
    
    res.status(200).json({ message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

server.delete('/cart/items/:id', requireAuth, async (req, res) => {
  const userId = req.user.email;
  const { id: itemId } = req.params;

  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const cartDoc = querySnapshot.docs[0];
    const cartId = cartDoc.id;
    
    const itemsRef = collection(db, 'carts', cartId, 'items');
    const itemQ = query(itemsRef, where('id', '==', itemId));
    const itemQuerySnapshot = await getDocs(itemQ);
    
    if (itemQuerySnapshot.empty) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    const itemDoc = itemQuerySnapshot.docs[0];
    const itemId = itemDoc.id;
    
    await deleteDoc(doc(itemsRef, itemId));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting cart item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Debug endpoint
server.get('/debug/token', (req, res) => {
  res.json({
    hasAuthHeader: !!req.headers.authorization,
    user: req.user,
    timestamp: new Date().toISOString(),
    jwtSecret: JWT_SECRET
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database
const initializeDatabase = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    if (snapshot.empty) {
      // Create test users with hashed passwords
      const testUsers = [
        {
          email: 'test@example.com',
          password: '$2a$10$3OyHnkJgGwUETl4t4htKbenhRrhMaRJvyXDmeMyYv6K281Dsqcjha', // hash của '123456'
          fullname: 'Test User',
          role: 'user',
          createdAt: new Date().toISOString()
        },
        {
          email: 'admin@gmail.com',
          password: '$2a$10$3OyHnkJgGwUETl4t4htKbe.anotherhash', // hash của 'admin123'
          fullname: 'Admin User',
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Add test users to Firestore
      for (const user of testUsers) {
        await addDoc(usersRef, user);
      }
      
      console.log('✅ Test users created with hashed passwords');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 JWT Secret: ${JWT_SECRET}`);
  
  initializeDatabase();
});
