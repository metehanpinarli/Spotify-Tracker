import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Twilio client with authentication credentials
 * These credentials are used to authenticate with Twilio's SMS service
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

/**
 * Sends an SMS notification when a new follower is detected
 * This function creates and sends a formatted message using Twilio's SMS service
 * 
 * @param {Object} follower - Information about the new follower
 * @param {string} follower.name - The name of the new follower
 * @param {string} follower.uri - The Spotify URI of the new follower
 * @returns {Promise<Object>} The sent message object from Twilio
 * @throws {Error} If message sending fails
 */
export async function sendSmsNotification(follower) {
  try {
    const message = await twilioClient.messages.create({
      body: `New Follower Alert! 🎉\n\nName: ${follower.name}\nProfile: ${follower.uri}`,
      from: process.env.TWILIO_FROM,
      to: process.env.TWILIO_TO,
    });
    console.log('SMS notification sent for:', follower.name, 'Message SID:', message.sid);
    return message;
  } catch (error) {
    console.error('Failed to send SMS notification:', error.message);
    throw error;
  }
} 