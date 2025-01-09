import SpotifyWebApi from 'spotify-web-api-node';
import { appendFileSync } from 'fs';
import axios from 'axios';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();


// Twilio API bilgileri
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);


// Türkiye saatine göre zaman
const options = {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};


const spotifyApis = [
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID1, //Tacker1
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET1,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID2, //Tacker2
    clientSecret:process.env.SPOTIFY_CLIENT_SECRET2,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID3, //Tacker3
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET3,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID4, //Tacker4
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET4,
  }),
  new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID5, //Tacker5
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET5,
  }),
];

let currentApiIndex = 0; // Hangi API'nin kullanılacağı
const userId = process.env.TARGET_USER_ID;

let previousFollowers = null; // Önceki takipçi sayısı
let oldFollowersList = []; // Eski takipçi listesi
let fetchFollowersListCurrentToken = null; // Geçerli access token


// Twilio ile WhatsApp mesajı gönderme
async function sendWhatsAppMessage(follower) {
  try {
    await twilioClient.messages
      .create({
        body: `Yeni bir takipçi geldi! 🎉\n\nAdı: ${follower.name}\nURI: ${follower.uri}`,
        from: process.env.TWILIO_FROM,
        to: process.env.TWILIO_TO,
      })
      .then(message => console.log(message.sid));
    console.log('Mesaj gönderildi:', follower.name);
  } catch (error) {
    console.error('Mesaj gönderimi sırasında hata oluştu:', error.message);
  }
}


// Geçerli Spotify API nesnesini döndürür
function getNextSpotifyApi() {
  const api = spotifyApis[currentApiIndex];
  currentApiIndex = (currentApiIndex + 1) % spotifyApis.length
  return api;
}


// Access token'ları her bir API için yenile
async function refreshAllTokens() {
  for (const api of spotifyApis) {
    try {
      const data = await api.clientCredentialsGrant();
      console.log(`Access token alındı: ${api.getClientId()}`);
      api.setAccessToken(data.body['access_token']);
    } catch (error) {
      console.error(
        `Access token alınamadı: ${api.getClientId()}`,
        error.message
      );
    }
  }
}

// Spotify Web Player'dan yeni bir token al
async function fetchNewAccessToken() {
  const url = 'https://open.spotify.com/intl-tr';
  const headers = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'tr,en;q=0.9,en-US;q=0.8,tr-TR;q=0.7',
    'cache-control': 'max-age=0',
    cookie: process.env.SPOTIFY_COOKIE,
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.get(url, { headers });
    const htmlContent = response.data;

    const tokenMatch = htmlContent.match(/"accessToken":"(.*?)"/);
    if (tokenMatch) {
      fetchFollowersListCurrentToken = tokenMatch[1];
      console.log('Yeni fetchFollowersListCurrentToken alındı:', fetchFollowersListCurrentToken);
    } else {

      console.error('fetchFollowersListCurrentToken bulunamadı.');
    }
  } catch (error) {
    console.error('fetchFollowersListCurrentToken yenileme sırasında hata oluştu:', error.message);
  }
}



// Takipçi listesini çek
async function fetchFollowersList() {
  const url = `https://spclient.wg.spotify.com/user-profile-view/v3/profile/${userId}/followers?market=from_token`;
  const headers = {
    accept: 'application/json',
    'accept-language': 'tr',
    'app-platform': 'WebPlayer',
    authorization: `Bearer ${fetchFollowersListCurrentToken}`,
    'client-token':process.env.SPOTIFY_CLIENT_TOKEN,
    origin: 'https://open.spotify.com',
    'spotify-app-version': '1.2.55.140.g17be258d',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.get(url, { headers });
    return response.data.profiles.map((profile) => ({
      name: profile.name,
      uri: profile.uri,
    }));
  } catch (error) {
    console.error('Takipçi listesi alınırken hata oluştu:', error.message);

    if (error.response && error.response.status === 401) {
  
      await fetchNewAccessToken();
      return await fetchFollowersList(); 
    }

    return []; 
  }
}

// Takipçi listesini karşılaştırma fonksiyonu
function compareFollowers(newFollowers, oldFollowers) {
  const added = newFollowers.filter(
    (newFollower) =>
      !oldFollowers.some((oldFollower) => oldFollower.uri === newFollower.uri)
  );
  const removed = oldFollowers.filter(
    (oldFollower) =>
      !newFollowers.some((newFollower) => newFollower.uri === oldFollower.uri)
  );
  return { added, removed };
}





// Access token al
refreshAllTokens().then(
  async () => {
    await fetchNewAccessToken();
    oldFollowersList = await fetchFollowersList();
    console.log('Eski takipçi listesi:', oldFollowersList);


    // Her 2 saniyede bir takipçi sayısını kontrol et
     setInterval(() => {
      const api = getNextSpotifyApi(); // Sonraki API'yi al
      api.getUser(userId).then(
        async (response) => {
          const currentFollowers = response.body.followers.total;
          const currentTime = new Date().toLocaleString('tr-TR', options);

          console.log('Takipçi sayısı :', response.body.followers.total);
          const clientId = api.getClientId();
          const maskedClientId = `****${clientId.slice(-4)}`;
          console.log('İstek yapılan hesap:', maskedClientId);

          // Eğer takipçi sayısı değişmişse
          if (previousFollowers !== null && currentFollowers !== previousFollowers) {

            console.log(`[LOG] Takipçi değişimi tespit edildi: ${currentFollowers} (${currentTime})`);

            // Yeni takipçi listesini çek
            const newFollowersList = await fetchFollowersList();

            // Liste değişikliklerini karşılaştır
            const { added, removed } = compareFollowers(newFollowersList, oldFollowersList);

            if (added.length > 0) {
              console.log("Yeni takipçiler:", added);

               for (const follower of added) {
                 await sendWhatsAppMessage(follower); // Yeni takipçi için mesaj gönder
               }

            }


            if (removed.length > 0) {
              console.log("Takipten çıkanlar:", removed);
            }

            // Yeni listeyi eski listeye kaydet
            oldFollowersList = newFollowersList;

            // Değişimi bir dosyaya kaydet
            const logData = {
              timestamp: currentTime,
              followers: currentFollowers,
              added,
              removed,
            };

            appendFileSync('followers_log.json', JSON.stringify(logData) + '\n');
          }

          // Mevcut takipçi sayısını sakla
          previousFollowers = currentFollowers;

        },
        (err) => {
          if (err.statusCode === 401) {
            console.log('Access token süresi doldu. Yenileniyor...');
            refreshAllTokens();
          } else {

            console.error('Takipçi bilgisi alınırken hata oluştu:', err);

            // Hataları log dosyasına yaz
            const errorLog = {
              timestamp: new Date().toLocaleString('tr-TR', options),
              error: err.message || 'Bilinmeyen hata',
            };

            appendFileSync('error_log.txt', JSON.stringify(errorLog) + '\n');

          }
        }
      );
    }, 600); //  kontrol aralığı
  },
  (err) => {
    console.error('Access token alınamadı:', err);

    // Hataları log dosyasına yaz
    const errorLog = {
      timestamp: new Date().toLocaleString('tr-TR', options),
      error: err.message || 'Bilinmeyen hata',
    };

    appendFileSync('error_log.txt', JSON.stringify(errorLog) + '\n');
  }
);