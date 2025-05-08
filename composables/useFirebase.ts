export const useFirebase = () => {
    const { $firebase, $auth, $firestore, $storage, $functions } = useNuxtApp()
    
    return {
      firebase: $firebase,
      auth: $auth,
      firestore: $firestore,
      storage: $storage,
      functions: $functions
    }
  }