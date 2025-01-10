# Spotify Follower Tracker 🎵

Real-time monitoring application that tracks follower changes of a specific Spotify user and sends SMS notifications about these changes.

## 🎯 Features

- Real-time follower monitoring
- Instant SMS notifications for new followers
- Unfollower tracking
- Multiple API rotation to bypass rate limits
- Smart rate limit handling with automatic backoff strategy
- Detailed logging system
- Spotify Web API restriction bypass

## 🚨 Upcoming Features

- Automated client token retrieval
- Enhanced error handling
- Web interface for monitoring
- Multiple target user support
- Customizable notification templates

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/metehanpinarli/spotify-follower-tracker.git
cd spotify-follower-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file and add required variables:
```env
# Spotify API Credentials (Create 5 different projects in one developer account)
SPOTIFY_CLIENT_ID1=your_client_id1
SPOTIFY_CLIENT_SECRET1=your_client_secret1
SPOTIFY_CLIENT_ID2=your_client_id2
SPOTIFY_CLIENT_SECRET2=your_client_secret2
SPOTIFY_CLIENT_ID3=your_client_id3
SPOTIFY_CLIENT_SECRET3=your_client_secret3
SPOTIFY_CLIENT_ID4=your_client_id4
SPOTIFY_CLIENT_SECRET4=your_client_secret4
SPOTIFY_CLIENT_ID5=your_client_id5
SPOTIFY_CLIENT_SECRET5=your_client_secret5

# Spotify Web Player Credentials
SPOTIFY_CLIENT_TOKEN=your_client_token
SPOTIFY_COOKIE=your_spotify_cookie

# Target User
TARGET_USER_ID=spotify_user_id_to_track

# Twilio SMS Credentials
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM=your_twilio_phone_number
TWILIO_TO=your_phone_number
```

## 📝 Required Credentials

### Spotify API Setup
1. Create a Spotify Developer account
2. Create 5 different projects in your developer dashboard
3. Get Client ID and Client Secret for each project
4. Configure redirect URIs if necessary

### Getting Spotify Cookie
1. Log in to Spotify Web Player (https://open.spotify.com)
2. Open Browser Developer Tools (F12)
3. Go to Network tab
4. Select any request and copy the cookie value from Headers section

### Getting Client Token
1. With Developer Tools open in Spotify Web Player
2. Go to Network tab
3. Find and copy the `client-token` header from any request
(Note: This process will be automated in future updates)

## 🔧 Usage

To start the application:
```bash
npm start
```

To run in development mode:
```bash
npm run dev
```

## ⚠️ Important Notes

- Uses 5 different API projects (from single developer account) to handle rate limits
- Requires Spotify Web Player cookies for accessing follower list
- Cookies need to be updated periodically as they expire
- Valid Twilio account required for SMS notifications
- Currently supports single target user monitoring

## 📊 Logging System

The application maintains two types of logs:
- `error_log.txt`: Error tracking and debugging information
- `followers_log.json`: Detailed follower change history

## 🔑 Keywords

- Spotify Follower Tracker
- Real-time Follower Monitoring
- Spotify API Integration
- SMS Notifications
- Follower Analytics
- Node.js
- Twilio Integration
- Web Scraping
- API Rate Limiting
- Automated Monitoring

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 

## 🔒 Rate Limit Management

The application implements a sophisticated rate limit handling strategy:
- Automatically detects rate limit responses (HTTP 429)
- Respects Spotify's `Retry-After` header with additional 2-second safety margin
- Maintains individual delay timers for each API instance
- Rotates between available APIs while delayed ones cool down
- Automatically selects the API with shortest remaining delay when all are rate limited
- Provides detailed logging of API states and delay periods 
