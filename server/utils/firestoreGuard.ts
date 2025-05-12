import fs from 'node:fs/promises';
import path from 'node:path';

// --- Configuration ---
const MAX_FETCHES = 1000; // User updated this
const DECREMENT_AMOUNT = 2;
const DECREMENT_INTERVAL_HOURS = 24;
// ---------------------

// Configuration for the data file
const DATA_DIR = path.resolve(process.cwd(), 'server/data');
const COUNTER_FILE_PATH = path.join(DATA_DIR, 'firestore-blocker.json');

interface UsageStats {
  fetchCount: number;
  lastDecrementTimestamp?: string; // ISO 8601 string
}

// Ensure the data directory exists
async function ensureDataDirExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
      console.error('Failed to create data directory:', error);
      throw error;
    } else if (!(error instanceof Error && 'code' in error)) {
      console.error('An unexpected error occurred while creating data directory:', error);
      throw error;
    }
  }
}

async function readStats(): Promise<UsageStats> {
  await ensureDataDirExists();
  try {
    const data = await fs.readFile(COUNTER_FILE_PATH, 'utf-8');
    const parsedData = JSON.parse(data) as Partial<UsageStats>; // Add type assertion
    return {
      fetchCount: typeof parsedData.fetchCount === 'number' ? parsedData.fetchCount : 0,
      lastDecrementTimestamp: typeof parsedData.lastDecrementTimestamp === 'string' ? parsedData.lastDecrementTimestamp : undefined
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const initialStats: UsageStats = { fetchCount: 0 };
      await writeStats(initialStats);
      return initialStats;
    }
    console.error('Error reading stats file, re-initializing:', error);
    const initialStats: UsageStats = { fetchCount: 0 };
    await writeStats(initialStats);
    return initialStats;
  }
}

async function writeStats(stats: UsageStats): Promise<void> {
  await ensureDataDirExists();
  try {
    await fs.writeFile(COUNTER_FILE_PATH, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write stats file:', error);
  }
}

/**
 * Checks if the fetch count has reached or exceeded the defined limit.
 * Does NOT increment the counter.
 *
 * @returns {Promise<boolean>} True if the limit is reached, false otherwise.
 */
export async function isFetchLimitReached(): Promise<boolean> {
  try {
    const stats = await readStats();
    const limitReached = stats.fetchCount >= MAX_FETCHES;
    if (limitReached) {
       console.warn(`Fetch limit check: Reached (${stats.fetchCount}/${MAX_FETCHES})`);
    }
    return limitReached;
  } catch (error) {
    console.error('Failed to check fetch limit:', error);
    return false;
  }
}

/**
 * Increments the fetch counter.
 * Does NOT check the limit.
 * Should be called only *after* checking the limit and deciding to proceed.
 */
export async function incrementFetchCount(): Promise<void> {
  try {
    const stats = await readStats();
    stats.fetchCount++;
    await writeStats(stats);
  } catch (error) {
    console.error('Failed to increment fetch count:', error);
  }
}

/**
 * Utility function to manually reset the fetch counter.
 */
export async function resetFetchCount(): Promise<void> {
  const initialStats: UsageStats = { fetchCount: 0, lastDecrementTimestamp: undefined };
  await writeStats(initialStats);
  console.log('Fetch counter and last decrement timestamp have been manually reset.');
}

/**
 * Decrements the fetch counter if the DECREMENT_INTERVAL_HOURS has passed since the last decrement.
 */
export async function decrementFetchCountIfDue(): Promise<void> {
  try {
    const stats = await readStats();
    const now = new Date();
    let dueForDecrement = true;

    if (stats.lastDecrementTimestamp) {
      const lastDecrementDate = new Date(stats.lastDecrementTimestamp);
      const hoursSinceLastDecrement = (now.getTime() - lastDecrementDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastDecrement < DECREMENT_INTERVAL_HOURS) {
        dueForDecrement = false;
      }
    }

    if (dueForDecrement) {
      stats.fetchCount = Math.max(0, stats.fetchCount - DECREMENT_AMOUNT);
      stats.lastDecrementTimestamp = now.toISOString();
      await writeStats(stats);
      console.log(`Fetch counter decremented by ${DECREMENT_AMOUNT}. New count: ${stats.fetchCount}`);
    } else {
      // console.log('Fetch counter not yet due for decrement.'); // Optional: for debugging
    }
  } catch (error) {
    console.error('Failed to perform daily decrement check:', error);
  }
}

// Initialize the file if it doesn't exist or is malformed
(async () => {
  await ensureDataDirExists();
  try {
    const currentStats = await readStats();
    const statsToSave: UsageStats = {
        fetchCount: typeof currentStats.fetchCount === 'number' ? currentStats.fetchCount : 0,
        lastDecrementTimestamp: typeof currentStats.lastDecrementTimestamp === 'string' ? currentStats.lastDecrementTimestamp : undefined
    };
    if (typeof statsToSave.fetchCount !== 'number') statsToSave.fetchCount = 0; // Redundant due to readStats, but safe

    await writeStats(statsToSave);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.log('Initializing fetch counter file (firestore-blocker.json)...');
    } else if (error instanceof Error) {
        console.warn('Could not ensure fetch counter file integrity on init:', error.message);
    } else {
        console.warn('Could not ensure fetch counter file integrity on init due to unknown error.');
    }
  }
})(); 