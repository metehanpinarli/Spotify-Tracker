import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Array of Spotify API instances for handling rate limits
 * Each instance is configured with different client credentials
 * This allows rotating between multiple API keys to avoid rate limiting
 */
export const spotifyApis = [
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID1,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET1,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID2,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET2,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID3,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET3,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID4,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET4,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID5,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET5,
  }),
];

// Target Spotify user ID to track followers
export const userId = process.env.TARGET_USER_ID;

// Authentication tokens for Spotify Web API
export const clientToken = process.env.SPOTIFY_CLIENT_TOKEN;
export const spotifyCookie = process.env.SPOTIFY_COOKIE; 