import {
  refreshAllTokens,
  fetchNewAccessToken,
  fetchFollowersList,
  getFollowersCount,
} from './services/spotify.service.js';
import { sendSmsNotification } from './services/twilio.service.js';
import { compareFollowers, dateOptions, logFollowerChanges } from './utils/helpers.js';

// Global state variables for tracking changes
let previousFollowers = null;
let oldFollowersList = [];

/**
 * Monitors and processes follower changes
 * This function checks for new followers and unfollowers,
 * sends notifications, and logs the changes
 */
async function checkFollowerChanges() {
  try {
    const currentFollowers = await getFollowersCount();
    const currentTime = new Date().toLocaleString('tr-TR', dateOptions);


    // Check if follower count has changed
    if (previousFollowers !== null && currentFollowers !== previousFollowers) {
      console.log(`[LOG] Follower count changed: ${currentFollowers} (${currentTime})`);

      // Get updated follower list and compare
      const newFollowersList = await fetchFollowersList();
      const { added, removed } = compareFollowers(newFollowersList, oldFollowersList);

      // Process new followers
      if (added.length > 0) {
        console.log('New followers:', added);
        for (const follower of added) {
          await sendSmsNotification(follower);
        }
      }

      // Log unfollowers
      if (removed.length > 0) {
        console.log('Unfollowers:', removed);
      }

      // Record changes in log file
      logFollowerChanges({
        timestamp: currentTime,
        followers: currentFollowers,
        added,
        removed,
      });

      // Update follower list
      oldFollowersList = newFollowersList;
    }

    // Update previous follower count
    previousFollowers = currentFollowers;
  } catch (error) {
    console.error('Error during follower check:', error.message);
  }
}

/**
 * Initializes and starts the application
 * This function sets up initial authentication and starts
 * the periodic follower monitoring process
 */
async function startApp() {
  try {
    // Initialize authentication tokens
    await refreshAllTokens();
    await fetchNewAccessToken();

    // Get initial follower list
    oldFollowersList = await fetchFollowersList();
    console.log('Initial follower list retrieved', oldFollowersList);

    // Start periodic monitoring
    setInterval(checkFollowerChanges, 600);
  } catch (error) {
    console.error('Application startup failed:', error.message);
    process.exit(1);
  }
}

// Start the application
startApp(); 