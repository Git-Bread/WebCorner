import { ref, computed } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { useFirebase } from '~/composables/useFirebase'

export function useFirestoreCounter(collectionName: string) {
  const { firestore } = useFirebase()
  const count = ref(0)
  const actualCount = ref<number | null>(null) // Store the actual count separately
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  
  // Constants
  const CACHE_COLLECTION = 'counters'
  const CACHE_DOCUMENT = `${collectionName}_count`
  const CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours
  const LOCAL_STORAGE_KEY = `webcorner_${collectionName}_count`
  
  // For cleanup
  let animationFrameId: number | null = null;

  // Format the count with thousands separators
  const formattedCount = computed(() => {
    return count.value.toLocaleString()
  })

  // Animate count from 0 to target
  const animateCount = (targetCount: number, duration = 2000) => {
    // Cancel any existing animation
    stopAnimation();
    
    const startCount = count.value
    const countDifference = targetCount - startCount
    const start = performance.now()
    
    const animate = (timestamp: number) => {
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      
      // Use easeOutCubic for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      count.value = Math.floor(startCount + (countDifference * easedProgress))
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        count.value = targetCount
        animationFrameId = null
      }
    }
    
    animationFrameId = requestAnimationFrame(animate)
  }
  
  // Stop any running animation
  const stopAnimation = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // Function to fetch the count without animation
  const fetchCount = async (fallbackCount = 15236, animate = true): Promise<number> => {
    if (!firestore) {
      console.warn('Firestore is not available, using fallback count');
      actualCount.value = fallbackCount;
      if (animate) {
        animateCount(fallbackCount);
      } else {
        count.value = fallbackCount;
      }
      isLoading.value = false;
      return fallbackCount;
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // Check localStorage first
      let cachedData = null;
      
      if (import.meta.client) {
        try {
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
          if (localData) {
            cachedData = JSON.parse(localData)
          }
        } catch (storageErr) {
          // Silent fail for localStorage issues - will fallback to Firestore
          console.warn('Failed to read from localStorage:', storageErr)
        }
      }
      
      // If local cache is fresh, use it
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        const countValue = cachedData.cachedCount;
        actualCount.value = countValue;
        
        if (animate) {
          animateCount(countValue);
        } else {
          count.value = countValue;
        }
        
        isLoading.value = false;
        return countValue;
      }
      
      // Local cache expired or doesn't exist, check Firestore counter document
      const cacheRef = doc(firestore, CACHE_COLLECTION, CACHE_DOCUMENT)
      const cacheSnapshot = await getDoc(cacheRef)
      
      if (cacheSnapshot.exists()) {
        const cacheData = cacheSnapshot.data()
        const countValue = cacheData?.count || fallbackCount
        actualCount.value = countValue;
        
        // Update localStorage
        if (import.meta.client) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
              cachedCount: countValue,
              timestamp: Date.now()
            }))
          } catch (storageErr) {
            // Silent fail for localStorage issues
            console.warn('Failed to write to localStorage:', storageErr)
          }
        }
        
        if (animate) {
          animateCount(countValue);
        } else {
          count.value = countValue;
        }
        
        isLoading.value = false;
        return countValue;
      }
      
      // If no cache exists, use fallback
      actualCount.value = fallbackCount;
      
      if (animate) {
        animateCount(fallbackCount);
      } else {
        count.value = fallbackCount;
      }
      
      isLoading.value = false;
      return fallbackCount;
    } catch (err) {
      console.error(`Error fetching ${collectionName} count:`, err)
      error.value = err instanceof Error ? err : new Error(String(err))
      actualCount.value = fallbackCount;
      count.value = fallbackCount;
      isLoading.value = false;
      return fallbackCount;
    }
  }

  // Start the animation with the previously fetched count
  const startAnimation = () => {
    if (actualCount.value !== null) {
      // Reset count to a lower value (70% of the actual) for a visible animation
      const startingValue = Math.floor(actualCount.value * 0.7);
      count.value = startingValue;
      animateCount(actualCount.value);
      return true;
    }
    return false;
  }

  return {
    count,
    formattedCount,
    isLoading,
    error,
    fetchCount,
    startAnimation,
    cleanup: stopAnimation // Export the animation cleanup function
  }
}