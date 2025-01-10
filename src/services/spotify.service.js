import axios from 'axios';
import { spotifyApis, userId, clientToken, spotifyCookie } from '../config/spotify.config.js';

// Track the current API instance index for rotation
let currentApiIndex = 0;
let fetchFollowersListCurrentToken = null;

// Store rate limit delays for each API
const apiDelays = new Map();

/**
 * Sets a delay for a specific API instance based on rate limit response
 * Adds 2 seconds extra delay as a safety measure
 * 
 * @param {SpotifyWebApi} api - The API instance to set delay for
 * @param {number} retryAfter - Number of seconds to wait before retrying
 */
function setApiDelay(api, retryAfter) {
  // Add 2 seconds extra delay as safety measure
  const safeRetryAfter = retryAfter + 2;
  const delayUntil = Date.now() + (safeRetryAfter * 1000);
  apiDelays.set(api.getClientId(), delayUntil);
  console.log(`Set delay for API ${api.getClientId()} for ${safeRetryAfter}s (${retryAfter}s + 2s safety) until ${new Date(delayUntil).toISOString()}`);
}

/**
 * Checks if an API has an active delay
 * 
 * @param {SpotifyWebApi} api - The API instance to check
 * @returns {Object} Object containing delay status and remaining time
 */
function checkApiDelay(api) {
  const now = Date.now();
  const delay = apiDelays.get(api.getClientId());
  
  if (!delay) {
    return { hasDelay: false, remainingTime: 0 };
  }

  const remainingTime = Math.max(0, Math.ceil((delay - now) / 1000));
  const hasDelay = remainingTime > 0;

  if (!hasDelay) {
    // Clean up expired delay
    apiDelays.delete(api.getClientId());
    console.log(`Delay expired for API ${api.getClientId()}, now available for use`);
  }

  return { hasDelay, remainingTime };
}

/**
 * Returns the next available Spotify API instance
 * This function implements a round-robin rotation between available API instances
 * and handles rate limiting delays
 * 
 * @returns {SpotifyWebApi} The next Spotify API instance to use
 */
export function getNextSpotifyApi() {
  // Get all available APIs without delay
  const availableApis = [];
  const delayedApis = [];

  // First, collect all APIs and their delay status
  for (let i = 0; i < spotifyApis.length; i++) {
    const api = spotifyApis[i];
    const { hasDelay, remainingTime } = checkApiDelay(api);
    
    if (hasDelay) {
      delayedApis.push({ api, index: i, remainingTime });
    } else {
      availableApis.push({ api, index: i });
    }
  }

  // Log only if there are delayed APIs
  if (delayedApis.length > 0) {
    console.log('Delayed APIs:', delayedApis.map(({ api, remainingTime }) => 
      `${api.getClientId()} (${remainingTime}s remaining)`
    ));
  }

  if (availableApis.length > 0) {
    // Find the next available API after the current index
    const nextAvailable = availableApis.find(({ index }) => index > currentApiIndex);
    
    if (nextAvailable) {
      // Found an available API after current index
      currentApiIndex = nextAvailable.index;
      return nextAvailable.api;
    } else {
      // No available APIs after current index, wrap around to the first available
      currentApiIndex = availableApis[0].index;
      return availableApis[0].api;
    }
  }

  // If all APIs have active delays, use the one with shortest remaining delay
  const shortestDelay = delayedApis.reduce((min, current) => 
    current.remainingTime < min.remainingTime ? current : min
  , delayedApis[0]);

  currentApiIndex = shortestDelay.index;
  console.log(`All APIs delayed, using API ${shortestDelay.api.getClientId()} with shortest delay (${shortestDelay.remainingTime}s)`);
  return shortestDelay.api;
}

/**
 * Refreshes access tokens for all Spotify API instances
 * This function ensures all API instances have valid authentication tokens
 * by requesting new ones from Spotify's authentication service
 * 
 * @throws {Error} If token refresh fails for any API instance
 */
export async function refreshAllTokens() {
  for (const api of spotifyApis) {
    try {
      const data = await api.clientCredentialsGrant();
      console.log(`Access token refreshed for client: ${api.getClientId()}`);
      api.setAccessToken(data.body['access_token']);
    } catch (error) {
      console.error(`Failed to refresh access token for client ${api.getClientId()}:`, error.message);
      throw error;
    }
  }
}

/**
 * Retrieves a new access token from Spotify Web Player
 * This function scrapes the Spotify web player to obtain a fresh access token
 * for accessing private API endpoints
 * 
 * @returns {string} The new access token
 * @throws {Error} If token retrieval fails
 */
export async function fetchNewAccessToken() {
  const url = 'https://open.spotify.com/intl-tr';
  const headers = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'tr,en;q=0.9,en-US;q=0.8,tr-TR;q=0.7',
    'cache-control': 'max-age=0',
    cookie: spotifyCookie,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.get(url, { headers });
    const tokenMatch = response.data.match(/"accessToken":"(.*?)"/);
    
    if (tokenMatch) {
      fetchFollowersListCurrentToken = tokenMatch[1];
      console.log('Successfully obtained new access token');
      return fetchFollowersListCurrentToken;
    }
    
    throw new Error('Access token not found in response');
  } catch (error) {
    console.error('Failed to obtain new access token:', error.message);
    throw error;
  }
}

/**
 * Retrieves the current list of followers for the target user
 * This function fetches the complete list of followers using Spotify's private API
 * 
 * @returns {Promise<Array>} List of followers with their names and URIs
 * @throws {Error} If follower list retrieval fails
 */
export async function fetchFollowersList() {
  const url = `https://spclient.wg.spotify.com/user-profile-view/v3/profile/${userId}/followers?market=from_token`;
  const headers = {
    accept: 'application/json',
    'accept-language': 'tr',
    'app-platform': 'WebPlayer',
    authorization: `Bearer ${fetchFollowersListCurrentToken}`,
    'client-token': clientToken,
    origin: 'https://open.spotify.com',
    'spotify-app-version': '1.2.55.140.g17be258d',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.get(url, { headers });
    return response.data.profiles.map(profile => ({
      name: profile.name,
      uri: profile.uri,
    }));
  } catch (error) {
    if (error.response?.status === 401) {
      await fetchNewAccessToken();
      return fetchFollowersList();
    }
    console.error('Failed to fetch followers list:', error.message);
    throw error;
  }
}

/**
 * Retrieves the total number of followers for the target user
 * This function uses the Spotify Web API to get the follower count
 * Implements backoff-retry strategy for rate limiting
 * 
 * @returns {Promise<number>} Total number of followers
 * @throws {Error} If follower count retrieval fails after all retries
 */
export async function getFollowersCount() {
  const api = getNextSpotifyApi();
  try {
    console.log('Requesting from account:', api.getClientId());
    const response = await api.getUser(userId);
    const followersCount = response.body.followers.total;
    console.log('Current followers count:', followersCount);
    return followersCount;
  } catch (error) {
    console.log('Error occurred with account:', api.getClientId());
    
    if (error.statusCode === 429) {
      // Get retry delay from response headers
      const retryAfter = parseInt(error.headers?.['retry-after']) || 30;
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
      
      // Set delay for this API
      setApiDelay(api, retryAfter);
      
      // Try again with next available API
      return getFollowersCount();
    }
    
    if (error.statusCode === 401) {
      await refreshAllTokens();
      return getFollowersCount();
    }
    
    throw error;
  }
} 