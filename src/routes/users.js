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

// Test Firebase connection and permissions
router.get('/test-update', async (req, res) => {
  try {
    const testId = 'test-user-' + Date.now();
    const testRef = doc(db, 'users', testId);
    
    // Test write operation
    const testData = {
      email: 'test@example.com',
      fullname: 'Test User',
      phone: '123456789',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Testing write operation...');
    await setDoc(testRef, testData);
    console.log('Write test successful');
    
    // Test read operation
    console.log('Testing read operation...');
    const docSnap = await getDoc(testRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to read test document');
    }
    console.log('Read test successful');
    
    // Test update operation
    console.log('Testing update operation...');
    await updateDoc(testRef, { phone: '987654321' });
    console.log('Update test successful');
    
    // Clean up
    console.log('Cleaning up test document...');
    await deleteDoc(testRef);
    
    res.json({
      success: true,
      message: 'All Firebase operations completed successfully',
      testData: {
        ...testData,
        id: testId,
        phone: '987654321' // Updated value
      }
    });
    
  } catch (error) {
    console.error('Firebase test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Make sure we have a valid user ID
    const userId = String(req.params.id).trim();
    if (!userId) {
      console.error('No user ID provided');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    console.log('Processing update for user ID:', userId);
    
    // Get all fields from request body
    const { fullname, email, phone, role, ...otherFields } = req.body;
    
    // Log all received fields
    console.log('=== REQUEST BODY FIELDS ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Extracted fields:', {
      fullname,
      email,
      phone,
      role,
      otherFields
    });
    
    // Get user reference
    const userRef = doc(db, 'users', userId);
    console.log('User reference:', userRef.path);
    
    // Get current user data
    console.log('Fetching current user data...');
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User document does not exist:', userId);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const currentData = userDoc.data();
    console.log('Current user data:', JSON.stringify(currentData, null, 2));
    
    // Check authorization
    const currentUserId = req.user.id || req.user.sub;
    const currentUserEmail = req.user.email;
    
    if (currentUserId !== userId && currentUserEmail !== currentData.email && req.user.role !== 'admin') {
      console.error('Unauthorized update attempt:', {
        currentUserId,
        currentUserEmail,
        targetUserId: userId,
        targetUserEmail: currentData.email,
        isAdmin: req.user.role === 'admin'
      });
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to update this profile'
      });
    }
    
    // Prepare update data
    const updateData = {
      ...(fullname !== undefined && { fullname }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(role !== undefined && req.user.role === 'admin' && { role }),
      ...otherFields, // Include any other fields that were passed
      updatedAt: new Date().toISOString()
    };
    
    console.log('Prepared update data:', JSON.stringify(updateData, null, 2));
    
    // Only proceed if there are fields to update (more than just updatedAt)
    if (Object.keys(updateData).filter(k => k !== 'updatedAt').length === 0) {
      console.warn('No valid fields to update');
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }
    
    console.log('Attempting to update user document...');
    try {
      // First try with updateDoc
      console.log('Trying updateDoc...');
      await updateDoc(userRef, updateData);
      console.log('Successfully updated using updateDoc');
    } catch (updateError) {
      console.warn('updateDoc failed, trying setDoc with merge...', updateError);
      try {
        await setDoc(userRef, updateData, { merge: true });
        console.log('Successfully updated using setDoc with merge');
      } catch (setDocError) {
        console.error('Both update methods failed:', setDocError);
        return res.status(500).json({
          success: false,
          error: `Failed to update user: ${setDocError.message}`
        });
      }
    }
    
    // Verify the update
    console.log('Verifying update...');
    const updatedDoc = await getDoc(userRef);
    if (!updatedDoc.exists()) {
      console.error('Failed to verify update - document not found after update');
      return res.status(500).json({ 
        success: false,
        error: 'Failed to verify update' 
      });
    }
    
    const updatedData = updatedDoc.data();
    console.log('Updated user data:', JSON.stringify(updatedData, null, 2));
    
    // Remove sensitive data from response
    delete updatedData.password;
    
    console.log('Update successful');
    return res.json({
      success: true,
      message: 'User updated successfully',
      user: { id: userId, ...updatedData }
    });
    
    console.log('=== UPDATE OPERATION ===');
    console.log('Document ID to update:', userId);
    console.log('Update data to apply:', JSON.stringify(updateData, null, 2));
    
    try {
      // Get the current document first
      console.log('Fetching current document from Firestore...');
      
      // Get the current document to ensure it exists
      const currentDoc = await getDoc(userRef);
      if (!currentDoc.exists()) {
        console.error('❌ Document does not exist:', userId);
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }
      
      const currentData = currentDoc.data();
      console.log('📄 Current document data:', JSON.stringify(currentData, null, 2));
      
      // Log the update operation details
      console.log('🔄 Attempting to update document with data:', JSON.stringify(updateData, null, 2));
      
      try {
        // First try with updateDoc
        console.log('1️⃣ Trying updateDoc...');
        await updateDoc(userRef, updateData);
        console.log('✅ Successfully updated using updateDoc');
      } catch (updateError) {
        console.warn('⚠️ updateDoc failed, trying setDoc with merge...', updateError);
        try {
          // If updateDoc fails, try setDoc with merge
          await setDoc(userRef, updateData, { merge: true });
          console.log('✅ Successfully updated using setDoc with merge');
        } catch (setDocError) {
          console.error('❌ Both update methods failed:', setDocError);
          throw new Error(`Failed to update document: ${setDocError.message}`);
        }
      }
      
      console.log('🔍 Verifying update...');
      const updatedDoc = await getDoc(userRef);
      if (!updatedDoc.exists()) {
        console.error('❌ Failed to verify update - document not found after update');
        return res.status(500).json({ 
          success: false,
          error: 'Failed to verify update' 
        });
      }
      
      const updatedUser = updatedDoc.data();
      console.log('Successfully verified update. New data:', JSON.stringify(updatedUser, null, 2));
      
      // Don't send sensitive data in response
      delete updatedUser.password;
      
      // Return the updated user data
      res.json({ 
        success: true,
        message: 'User updated successfully',
        user: { 
          id: userId, 
          ...updatedUser 
        } 
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
