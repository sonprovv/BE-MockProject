const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } = require('firebase/firestore');

// Get all orders (admin) or user's orders
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;
    const ordersRef = collection(db, 'orders');
    let q = ordersRef;

    // If not admin, only return user's orders
    if (req.user.role !== 'admin') {
      q = query(ordersRef, where('userId', '==', req.user.id));
    } else if (userId) {
      // Admin can filter by user ID
      q = query(ordersRef, where('userId', '==', userId));
    }

    const snapshot = await getDocs(q);
    let orders = [];
    
    // Process each order to include book details
    for (const doc of snapshot.docs) {
      const order = { id: doc.id, ...doc.data() };
      
      // Filter by status if provided
      if (status && order.status !== status) continue;
      
      // Get book details for each item
      const itemsWithBooks = await Promise.all(
        order.items.map(async (item) => {
          const bookRef = doc(db, 'books', item.bookId);
          const bookSnap = await getDoc(bookRef);
          return {
            ...item,
            book: bookSnap.exists() ? { id: bookSnap.id, ...bookSnap.data() } : null
          };
        })
      );
      
      orders.push({
        ...order,
        items: itemsWithBooks
      });
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderSnap.data();
    
    // Check if user is authorized to view this order
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    
    // Get book details for each item
    const itemsWithBooks = await Promise.all(
      order.items.map(async (item) => {
        const bookRef = doc(db, 'books', item.bookId);
        const bookSnap = await getDoc(bookRef);
        return {
          ...item,
          book: bookSnap.exists() ? { id: bookSnap.id, ...bookSnap.data() } : null
        };
      })
    );
    
    res.json({
      id: orderSnap.id,
      ...order,
      items: itemsWithBooks
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }
    
    // Calculate total price and validate items
    let totalPrice = 0;
    const validatedItems = [];
    
    for (const item of items) {
      if (!item.bookId || !item.quantity) {
        return res.status(400).json({ error: 'Each item must have a bookId and quantity' });
      }
      
      const bookRef = doc(db, 'books', item.bookId);
      const bookSnap = await getDoc(bookRef);
      
      if (!bookSnap.exists()) {
        return res.status(400).json({ error: `Book with ID ${item.bookId} not found` });
      }
      
      const book = bookSnap.data();
      const price = book.discount_price || book.original_price;
      totalPrice += price * item.quantity;
      
      validatedItems.push({
        bookId: item.bookId,
        quantity: item.quantity,
        price: price,
        name: book.name
      });
    }
    
    // Create order
    const newOrder = {
      userId: req.user.id,
      items: validatedItems,
      totalPrice,
      status: 'pending',
      shippingAddress,
      paymentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'orders'), newOrder);
    
    // Clear user's cart after successful order
    try {
      const cartsRef = collection(db, 'carts');
      const q = query(cartsRef, where('userId', '==', req.user.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const cartDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'carts', cartDoc.id), { items: [] });
      }
    } catch (cartError) {
      console.error('Error clearing cart after order:', cartError);
      // Don't fail the order if cart clearing fails
    }
    
    res.status(201).json({ id: docRef.id, ...newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (admin only)
router.patch('/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const orderId = req.params.id;
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await updateDoc(orderRef, { 
      status,
      updatedAt: new Date().toISOString() 
    });
    
    res.json({ 
      id: orderId, 
      ...orderSnap.data(),
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
