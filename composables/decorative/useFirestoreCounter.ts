import { ref, computed } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { useFirebase } from '~/composables/useFirebase'

export function useFirestoreCounter(collectionName: string) {
  const { firestore } = useFirebase()
  const count = ref(0)
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  let actualCount = 0
  
  // Constants
  const CACHE_COLLECTION = 'counters'
  const CACHE_DOCUMENT = `${collectionName}_count`
  const CACHE_KEY = `webcorner_counter_${collectionName}`
  const CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours
  
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
    isLoading.value = true
    error.value = null
    
    try {
      // Try localStorage first (if on client)
      if (import.meta.client) {
        try {
          const storageItem = localStorage.getItem(CACHE_KEY)
          if (storageItem) {
            const storageData = JSON.parse(storageItem)
            // Check if cache is still valid
            if (storageData && 
                storageData.timestamp && 
                Date.now() - storageData.timestamp < CACHE_DURATION) {
              
              actualCount = storageData.count
              
              if (animate) {
                animateCount(storageData.count)
              } else {
                count.value = storageData.count
              }
              
              isLoading.value = false
              return storageData.count
            }
          }
        } catch (storageErr) {
          console.warn('Failed to read counter from localStorage:', storageErr)
        }
      }
      
      // If no valid localStorage data, fetch from Firestore
      if (!firestore) {
        console.warn('Firestore is not available, using fallback count')
        actualCount = fallbackCount
        if (animate) {
          animateCount(fallbackCount)
        } else {
          count.value = fallbackCount
        }
        isLoading.value = false
        return fallbackCount
      }

      // Call Firestore for fresh data
      const cacheRef = doc(firestore, CACHE_COLLECTION, CACHE_DOCUMENT)
      const cacheSnapshot = await getDoc(cacheRef)
      
      let countValue = fallbackCount
      if (cacheSnapshot.exists()) {
        const cacheData = cacheSnapshot.data()
        countValue = cacheData?.count || fallbackCount
      }
      
      // Store in localStorage for future use
      if (import.meta.client) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            count: countValue,
            timestamp: Date.now()
          }))
        } catch (storageErr) {
          console.warn('Failed to save counter to localStorage:', storageErr)
        }
      }
      
      actualCount = countValue
      
      if (animate) {
        animateCount(countValue)
      } else {
        count.value = countValue
      }
      
      isLoading.value = false
      return countValue
    } catch (err) {
      console.error(`Error fetching ${collectionName} count:`, err)
      error.value = err instanceof Error ? err : new Error(String(err))
      
      // Use fallback on error
      actualCount = fallbackCount
      count.value = fallbackCount
      isLoading.value = false
      return fallbackCount
    }
  }

  // Start the animation with the previously fetched count
  const startAnimation = () => {
    if (actualCount > 0) {
      // Reset count to a lower value (70% of the actual) for a visible animation
      const startingValue = Math.floor(actualCount * 0.7)
      count.value = startingValue
      animateCount(actualCount)
      return true
    }
    return false
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