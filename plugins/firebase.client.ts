import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

//Nuxt 3 Firebase Plugin
export default defineNuxtPlugin(nuxtApp =>{    

    const config = useRuntimeConfig();
    const firebaseConfig = config.public.firebaseConfig as FirebaseOptions;
    const isDevelopment = config.public.isDevelopment || false;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app)
    const firestore = getFirestore(app)

    // Connect to emulators in development mode
    if (isDevelopment) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log('Using Firebase emulators');
    }
    
    return {
        provide: {
            firebase: app,
            auth: auth,
            firestore: firestore
        }
    };
})
