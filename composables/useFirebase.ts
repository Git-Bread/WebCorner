export const useFirebase = () => {
    const { $firebase, $auth, $firestore } = useNuxtApp()
    
    return {
      firebase: $firebase,
      auth: $auth,
      firestore: $firestore
    }
  }