const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} = require('firebase/firestore');

// Get all books
router.get('/', async (req, res) => {
  try {
    const booksRef = collection(db, 'books');
    const snapshot = await getDocs(booksRef);
    const books = [];
    
    snapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(books);
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single book by ID
router.get('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ id: bookSnap.id, ...bookSnap.data() });
  } catch (error) {
    console.error('Error getting book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new book (protected route)
router.post('/', async (req, res) => {
  try {
    const { name, description, categories, list_price, original_price } = req.body;
    
    if (!name || !original_price) {
      return res.status(400).json({ error: 'Name and original price are required' });
    }
    
    const newBook = {
      name,
      description: description || '',
      categories: categories || {},
      list_price: list_price || original_price,
      original_price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'books'), newBook);
    res.status(201).json({ id: docRef.id, ...newBook });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a book (protected route)
router.put('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const { name, description, categories, list_price, original_price } = req.body;
    
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const updatedBook = {
      ...bookSnap.data(),
      name: name || bookSnap.data().name,
      description: description !== undefined ? description : bookSnap.data().description,
      categories: categories || bookSnap.data().categories,
      list_price: list_price !== undefined ? list_price : bookSnap.data().list_price,
      original_price: original_price || bookSnap.data().original_price,
      updated_at: new Date().toISOString()
    };
    
    await updateDoc(bookRef, updatedBook);
    res.json({ id: bookId, ...updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a book (protected route)
router.delete('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    await deleteDoc(bookRef);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
