import { appendFileSync } from 'fs';

/**
 * Date formatting options for timestamps
 * Configured to use Istanbul timezone and 24-hour format
 */
export const dateOptions = {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

/**
 * Compares two lists of followers to find changes
 * This function identifies both new followers and unfollowers
 * 
 * @param {Array} newFollowers - Current list of followers
 * @param {Array} oldFollowers - Previous list of followers
 * @returns {Object} Object containing arrays of added and removed followers
 */
export function compareFollowers(newFollowers, oldFollowers) {
  const added = newFollowers.filter(
    newFollower => !oldFollowers.some(oldFollower => oldFollower.uri === newFollower.uri)
  );
  
  const removed = oldFollowers.filter(
    oldFollower => !newFollowers.some(newFollower => newFollower.uri === oldFollower.uri)
  );
  
  return { added, removed };
}

/**
 * Logs follower changes to a JSON file
 * This function appends follower change events to a log file for tracking history
 * 
 * @param {Object} logData - Data to be logged
 * @param {string} logData.timestamp - Time of the change
 * @param {number} logData.followers - Total follower count
 * @param {Array} logData.added - List of new followers
 * @param {Array} logData.removed - List of users who unfollowed
 */
export function logFollowerChanges(logData) {
  try {
    appendFileSync('followers_log.json', JSON.stringify(logData) + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
} 