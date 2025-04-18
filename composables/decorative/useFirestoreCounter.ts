import { ref, computed } from 'vue'
import { collection, getCountFromServer, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export function useFirestoreCounter(collectionName: string) {
  const { firestore } = useFirebase()
  const count = ref(0)
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  
  const CACHE_COLLECTION = 'counters_cache'
  const CACHE_DOCUMENT = `${collectionName}_count`
  const CACHE_DURATION = 4 * 60 * 60 * 1000 
  // 4 hour, can probaly be alot less but i want to be ultra-safe with this project
  // or google will make me broke.

  // Format the count with thousands separators
  const formattedCount = computed(() => {
    return count.value.toLocaleString()
  })

  // Animate count from 0 to target
  const animateCount = (targetCount: number, duration = 2000) => {
    const start = performance.now()
    
    const animate = (timestamp: number) => {
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      count.value = Math.floor(progress * targetCount)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        count.value = targetCount
      }
    }
    
    requestAnimationFrame(animate)
  }

  // Function to fetch the count
  const fetchCount = async (fallbackCount = 5000) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Check localStorage first
      const LOCAL_STORAGE_KEY = `webcorner_${collectionName}_count`
      const localData = import.meta.client ? localStorage.getItem(LOCAL_STORAGE_KEY) : null
      
      if (localData) {
        const { cachedCount, timestamp } = JSON.parse(localData)
        
        // If local cache is fresh, use it
        if (Date.now() - timestamp < CACHE_DURATION) {
          animateCount(cachedCount)
          isLoading.value = false
          return cachedCount
        }
      }
      
      // Local cache expired or doesn't exist, check Firestore cache
      const cacheRef = doc(firestore, CACHE_COLLECTION, CACHE_DOCUMENT)
      const cacheSnapshot = await getDoc(cacheRef)
      
      if (cacheSnapshot.exists()) {
        const cacheData = cacheSnapshot.data()
        const cacheTime = cacheData.timestamp?.toMillis() || 0
        
        // If Firestore cache is fresh, use it and update localStorage
        if (Date.now() - cacheTime < CACHE_DURATION) {
          if (import.meta.client) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
              cachedCount: cacheData.count,
              timestamp: Date.now()
            }))
          }
          
          animateCount(cacheData.count)
          isLoading.value = false
          return cacheData.count
        }
      }
      
      // Both caches expired, get fresh count
      const col = collection(firestore, collectionName)
      const snapshot = await getCountFromServer(col)
      const targetCount = snapshot.data().count
      
      // Update Firestore cache
      await setDoc(cacheRef, {
        count: targetCount,
        timestamp: serverTimestamp()
      })
      
      // Update localStorage
      if (import.meta.client) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          cachedCount: targetCount,
          timestamp: Date.now()
        }))
      }
      
      animateCount(targetCount)
      isLoading.value = false
      return targetCount
    } catch (err) {
      console.error(`Error fetching ${collectionName} count:`, err)
      error.value = err instanceof Error ? err : new Error(String(err))
      count.value = fallbackCount
      isLoading.value = false
      return fallbackCount
    }
  }

  return {
    count,
    formattedCount,
    isLoading,
    error,
    fetchCount
  }
}