const fs = require('fs');
const https = require('https');

const WEATHER_API_URL = `https://api.pirateweather.net/forecast/${process.env.PIRATE_WEATHER_API_KEY}/17.3760,78.4928?units=si&lang=en`;
const TIME_API_URL = 'https://worldtimeapi.org/api/timezone/Asia/Kolkata';
const TEMPLATE_PATH = './template.svg';
const OUTPUT_PATH = './chat.svg';

const WEATHER_ICONS = {
  'clear-day': '☀️', 'clear-night': '🌙', 'rain': '🌧️', 'snow': '❄️',
  'sleet': '🌨️', 'wind': '💨', 'fog': '🌫️', 'cloudy': '☁️',
  'partly-cloudy-day': '⛅', 'partly-cloudy-night': '☁️'
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Fetch with exponential backoff - works around GitHub Actions network issues
 */
function fetchJSON(url, maxRetries = 5) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryFetch = () => {
      attempt++;
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
      
      console.log(`Attempt ${attempt}/${maxRetries}: ${url.includes('pirateweather') ? 'Weather API' : 'Time API'}`);
      
      const options = {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'GitHub-Profile-Bot/1.0'
        }
      };

      const request = https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log(`✅ Success on attempt ${attempt}`);
              resolve(parsed);
            } catch (err) {
              console.error(`❌ Parse error: ${err.message}`);
              if (attempt < maxRetries) {
                console.log(`⏳ Retrying in ${backoffDelay}ms...`);
                setTimeout(tryFetch, backoffDelay);
              } else {
                reject(new Error(`Failed to parse JSON after ${maxRetries} attempts`));
              }
            }
          } else {
            console.error(`❌ HTTP ${res.statusCode}`);
            if (attempt < maxRetries) {
              console.log(`⏳ Retrying in ${backoffDelay}ms...`);
              setTimeout(tryFetch, backoffDelay);
            } else {
              reject(new Error(`HTTP ${res.statusCode} after ${maxRetries} attempts`));
            }
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        console.error(`❌ Timeout on attempt ${attempt}`);
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${backoffDelay}ms...`);
          setTimeout(tryFetch, backoffDelay);
        } else {
          reject(new Error(`Timeout after ${maxRetries} attempts`));
        }
      });

      request.on('error', (err) => {
        console.error(`❌ Network error: ${err.message}`);
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${backoffDelay}ms...`);
          setTimeout(tryFetch, backoffDelay);
        } else {
          reject(new Error(`${err.message} after ${maxRetries} attempts`));
        }
      });
    };

    tryFetch();
  });
}

async function buildSVG() {
  try {
    if (!process.env.PIRATE_WEATHER_API_KEY) {
      throw new Error('PIRATE_WEATHER_API_KEY not set');
    }

    console.log('🌍 Fetching weather data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const weatherData = await fetchJSON(WEATHER_API_URL);
    
    console.log('');
    console.log('🕐 Fetching time data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const timeData = await fetchJSON(TIME_API_URL);
    
    console.log('');
    console.log('📄 Reading template...');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    const temperature = Math.round(weatherData.currently.temperature);
    const weatherSummary = weatherData.currently.summary;
    const weatherIcon = WEATHER_ICONS[weatherData.currently.icon] || '🌤️';
    const dayName = DAY_NAMES[timeData.day_of_week];
    const updateTime = new Date(timeData.datetime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log('✏️  Replacing placeholders...');
    let svg = template
      .replace('{{TEMPERATURE}}', temperature)
      .replace('{{WEATHER_SUMMARY}}', weatherSummary)
      .replace('{{WEATHER_ICON}}', weatherIcon)
      .replace('{{DAY_NAME}}', dayName)
      .replace('{{UPDATE_TIME}}', updateTime);
    
    console.log('💾 Writing output...');
    fs.writeFileSync(OUTPUT_PATH, svg);
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SVG GENERATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Location: Secunderabad, Telangana`);
    console.log(`🌡️  Temperature: ${temperature}°C`);
    console.log(`${weatherIcon}  Weather: ${weatherSummary}`);
    console.log(`📅 Day: ${dayName}`);
    console.log(`🕐 Updated: ${updateTime}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FAILED TO BUILD SVG');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('This is likely a network connectivity issue between');
    console.error('GitHub Actions and the weather API.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

if (require.main === module) {
  buildSVG();
}

module.exports = { buildSVG };
