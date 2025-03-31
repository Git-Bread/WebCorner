<template>
  <div>
    <h1>Firebase Connection Test</h1>
    <div>
      <p>Firebase status: {{ firebaseStatus }}</p>
      <button @click="testFirebase">Test Firebase Connection</button>
      <pre v-if="firebaseData">{{ JSON.stringify(firebaseData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Composable from your setup
const { firestore } = useFirebase();
const firebaseStatus = ref('Not tested');
const firebaseData = ref(null);

const testFirebase = async () => {
  try {
    firebaseStatus.value = 'Testing...';
    
    // Add a document to Firestore
    const testCollection = collection(firestore, 'test');
    const docRef = await addDoc(testCollection, {
      message: 'Hello from WebCorner',
      timestamp: new Date().toISOString()
    });
    
    // Fetch documents to verify
    const querySnapshot = await getDocs(testCollection);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    firebaseData.value = documents;
    firebaseStatus.value = `Connected! Added document with ID: ${docRef.id}`;
  } catch (error) {
    console.error('Firebase test failed:', error);
    firebaseStatus.value = `Error: ${error.message}`;
    firebaseData.value = null;
  }
};
</script>