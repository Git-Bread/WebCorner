import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Define a type for the injected properties
type FirebaseInjections = {
  firebase: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// Nuxt 3 Firebase Plugin
export default defineNuxtPlugin<FirebaseInjections>(() => {    

    try {
        const config = useRuntimeConfig();
        const firebaseConfig = config.public.firebaseConfig;
        const isDevelopment = config.public.isDevelopment || false;

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestore = getFirestore(app);

        // Setup persistence for authentication
        setPersistence(auth, browserLocalPersistence)
            .catch(error => console.error('Auth persistence error:', error));

        // Connect to emulators in development mode
        if (isDevelopment) {
            connectFirestoreEmulator(firestore, 'localhost', 8080);
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            console.log('Using Firebase emulators');
        }
        
        return {
            provide: {
                firebase: app,
                auth: auth,
                firestore: firestore
            }
        };
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return {
            provide: {
                firebase: { name: 'mock-app' } as unknown as FirebaseApp,
                auth: { currentUser: null } as unknown as Auth,
                firestore: {} as unknown as Firestore
            }
        };
    }
});
