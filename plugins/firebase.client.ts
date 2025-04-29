import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
    getAuth, 
    connectAuthEmulator, 
    setPersistence, 
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
    type Auth,
    type Persistence
} from "firebase/auth";
import { 
    connectFirestoreEmulator, 
    type Firestore, 
    CACHE_SIZE_UNLIMITED,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
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

/**
 * Get the appropriate persistence mechanism based on configuration
 * @param persistenceType The type of persistence to use
 * @returns The Firebase persistence mechanism
 */
const getPersistenceType = (persistenceType?: string): Persistence => {
  switch (persistenceType?.toLowerCase()) {
    case 'session':
      return browserSessionPersistence;
    case 'none':
      return inMemoryPersistence;
    case 'local':
    default:
      return browserLocalPersistence;
  }
};

// Nuxt 3 Firebase Plugin
export default defineNuxtPlugin<FirebaseInjections>(() => {    
    try {
        const config = useRuntimeConfig();
        const firebaseConfig = config.public.firebaseConfig;
        const isDevelopment = config.public.isDevelopment || false;
        const persistenceType = config.public.firebasePersistence || 'local';

        // Validate required configuration
        if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error('Missing required Firebase configuration parameters');
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        // Initialize Firestore with persistence configuration
        const firestore = initializeFirestore(app, {
          // Use persistent local cache with unlimited size for offline support
          localCache: persistentLocalCache({
            cacheSizeBytes: CACHE_SIZE_UNLIMITED,
            tabManager: persistentMultipleTabManager()
          })
        });

        const storage = getStorage(app);

        // Setup persistence for authentication
        const persistence = getPersistenceType();
        setPersistence(auth, persistence)
            .then(() => {
                console.log(`Firebase auth persistence set to: ${persistenceType}`);
            })
            .catch(error => {
                console.error('Auth persistence error:', error);
            });

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
