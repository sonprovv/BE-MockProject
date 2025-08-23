const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} = require('firebase/firestore');

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

// Test Firebase connection
router.get('/test-firebase', async (req, res) => {
  try {
    const testRef = doc(db, 'test', 'connection');
    await setDoc(testRef, { test: 'success', timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Firebase connection successful' });
  } catch (error) {
    console.error('Firebase test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    console.log('=== UPDATE USER REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.params.id;
    console.log('User ID to update:', userId);
    
    const { fullname, email, role } = req.body;
    
    // Get the user document to check email
    console.log('Fetching user document...');
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    console.log('Current user data:', JSON.stringify(userData, null, 2));
    
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
    
    // Create update data from request body, only including allowed fields
    const updateData = {
      ...(fullname && { fullname }),
      ...(email && { email }),
      ...(req.body.phone && { phone: req.body.phone }), // Add phone field if present
      ...(req.user.role === 'admin' && role && { role }), // Only allow admin to update role
      updatedAt: new Date().toISOString()
    };
    
    console.log('Final update data:', JSON.stringify(updateData, null, 2));
    
    console.log('Attempting to update with data:', JSON.stringify(updateData, null, 2));
    
    try {
      await updateDoc(userRef, updateData);
      console.log('Successfully updated user in Firebase');
      
      // Verify the update
      const updatedDoc = await getDoc(userRef);
      if (!updatedDoc.exists()) {
        console.error('Failed to verify update - document not found after update');
        return res.status(500).json({ error: 'Failed to verify update' });
      }
      
      const updatedUser = updatedDoc.data();
      console.log('Updated user data:', JSON.stringify(updatedUser, null, 2));
      
      // Don't send password hash in response
      delete updatedUser.password;
      
      res.json({ 
        success: true,
        message: 'User updated successfully',
        user: { id: userId, ...updatedUser } 
      });
    } catch (updateError) {
      console.error('Firebase update error:', updateError);
      throw new Error(`Failed to update user: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Error in user update route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
