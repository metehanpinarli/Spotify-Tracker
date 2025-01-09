import axios from 'axios';
import { spotifyApis, userId, clientToken, spotifyCookie } from '../config/spotify.config.js';

// Track the current API instance index for rotation
let currentApiIndex = 0;
let fetchFollowersListCurrentToken = null;

/**
 * Returns the next available Spotify API instance
 * This function implements a round-robin rotation between multiple API instances
 * to prevent rate limiting issues
 * 
 * @returns {SpotifyWebApi} The next Spotify API instance to use
 */
export function getNextSpotifyApi() {
  const api = spotifyApis[currentApiIndex];
  currentApiIndex = (currentApiIndex + 1) % spotifyApis.length;
  return api;
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
 * 
 * @returns {Promise<number>} Total number of followers
 * @throws {Error} If follower count retrieval fails
 */
export async function getFollowersCount() {
  const api = getNextSpotifyApi();
  try {
    const response = await api.getUser(userId);
    const followersCount= response.body.followers.total;
    console.log('currentFollowersCount', followersCount);
    console.log('requested account:', api.getClientId());
    return followersCount;

  } catch (error) {
    if (error.statusCode === 401) {
      await refreshAllTokens();
      return getFollowersCount();
    }
    throw error;
  }
} 