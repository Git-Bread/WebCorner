export const useFirebase = () => {
    const { $firebase, $auth, $firestore, $storage } = useNuxtApp()
    
    return {
      firebase: $firebase,
      auth: $auth,
      firestore: $firestore,
      storage: $storage
    }
  }