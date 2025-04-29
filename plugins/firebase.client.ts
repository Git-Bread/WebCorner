import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
    getAuth, 
    connectAuthEmulator, 
    type Auth,
} from "firebase/auth";
import { 
    connectFirestoreEmulator, 
    type Firestore, 
    initializeFirestore
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

// Define a type for the injected properties
type FirebaseInjections = {
  firebase: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

// Create mock objects that simulate Firebase interfaces
const createMocks = () => {
  // Mock Firebase App
  const mockApp: Partial<FirebaseApp> = { 
    name: 'mock-app',
    options: {},
    automaticDataCollectionEnabled: false,
  };

  // Mock Auth
  const mockAuth: Partial<Auth> = {
    currentUser: null,
    app: mockApp as FirebaseApp,
    name: 'mock-auth',
    onAuthStateChanged: () => { return () => {} },
    onIdTokenChanged: () => { return () => {} },
  };

  // Mock Firestore
  const mockFirestore: Partial<Firestore> = {
    app: mockApp as FirebaseApp,
    type: 'firestore',
    toJSON: () => { return {} },
  };

  // Mock Storage
  const mockStorage: Partial<FirebaseStorage> = {
    app: mockApp as FirebaseApp,
    maxUploadRetryTime: 0,
    maxOperationRetryTime: 0,
  };

  return {
    firebase: mockApp as unknown as FirebaseApp,
    auth: mockAuth as unknown as Auth,
    firestore: mockFirestore as unknown as Firestore,
    storage: mockStorage as unknown as FirebaseStorage
  };
};

// Nuxt 3 Firebase Plugin
export default defineNuxtPlugin<FirebaseInjections>(() => {    
    try {
        const config = useRuntimeConfig();
        const firebaseConfig = config.public.firebaseConfig;
        const isDevelopment = config.public.isDevelopment || false;

        // Validate required configuration
        if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error('Missing required Firebase configuration parameters');
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        // Initialize Firestore without any persistence configuration
        const firestore = initializeFirestore(app, {});
        const storage = getStorage(app);

        // Connect to emulators in development mode
        if (isDevelopment) {
            try {
                // Connect to emulators with explicit error handling
                connectFirestoreEmulator(firestore, 'localhost', 8080);
                connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
                
                // Connect to storage emulator as defined in firebase.json
                connectStorageEmulator(storage, 'localhost', 9199);
                
                console.log('Using Firebase emulators');
            } catch (emulatorError) {
                console.error('Failed to connect to Firebase emulators:', emulatorError);
                // Continue execution - for testing reasons
            }
        }
        
        return {
            provide: {
                firebase: app,
                auth: auth,
                firestore: firestore,
                storage: storage
            }
        };
    } catch (error) {
        // Categorize errors for debugging
        if (error instanceof Error) {
            if (error.message.includes('configuration')) {
                console.error('Firebase configuration error:', error);
            } else if (error.message.includes('network')) {
                console.error('Firebase network error:', error);
            } else {
                console.error('Firebase initialization error:', error);
            }
        } else {
            console.error('Unknown Firebase error:', error);
        }

        // mocks with minimal functionality
        const mocks = createMocks();
        return {
            provide: mocks
        };
    }
});
