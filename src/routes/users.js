const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

// Get all users (admin only) or filter by email
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    const usersRef = collection(db, 'users');
    let querySnapshot;

    if (email) {
      // If email is provided, search by email
      const q = query(usersRef, where('email', '==', email));
      querySnapshot = await getDocs(q);
    } else {
      // If no email, check if admin and return all users
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      querySnapshot = await getDocs(usersRef);
    }
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const user = doc.data();
      // Don't include sensitive information
      delete user.password;
      users.push({ id: doc.id, ...user });
    });
    
    if (email && users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(email ? users[0] : users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', req.user.email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();
    delete user.password; // Don't send password hash
    
    res.json({ id: userDoc.id, ...user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userSnap.data();
    delete user.password; // Don't send password hash
    
    res.json({ id: userSnap.id, ...user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullname, email, role } = req.body;
    
    // Get the user document to check email
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Only allow users to update their own profile or admin to update any profile
    const currentUserId = req.user.id || req.user.sub;
    const currentUserEmail = req.user.email;
    
    // Check if current user is the owner of the profile or an admin
    if (currentUserId !== userId && 
        currentUserEmail !== userData.email && 
        req.user.role !== 'admin') {
      console.log('User not authorized to update this profile:', { 
        currentUserId, 
        targetUserId: userId, 
        isAdmin: req.user.role === 'admin' 
      });
      return res.status(403).json({ 
        error: 'Not authorized to update this profile',
        currentUserId,
        currentUserEmail,
        targetUserId: userId,
        targetUserEmail: userData.email
      });
    }
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fullname: fullname || userData.fullname,
      email: email || userData.email,
      ...(req.user.role === 'admin' && role ? { role } : {}), // Only allow admin to update role
      updatedAt: new Date().toISOString()
    });

    const updatedUser = (await getDoc(userRef)).data();
    
    // Don't send password hash in response
    delete updatedUser.password;
    
    res.json({ id: userId, ...updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const userId = req.params.id;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await deleteDoc(userRef);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
