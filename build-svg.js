const fs = require('fs');
const https = require('https');

// Configuration
const WEATHER_API_URL = `https://api.pirateweather.net/forecast/${process.env.PIRATE_WEATHER_API_KEY}/17.3760,78.4928?units=si&lang=en`;
const TIME_API_URL = 'https://worldtimeapi.org/api/timezone/Asia/Kolkata';
const TEMPLATE_PATH = './template.svg';
const OUTPUT_PATH = './chat.svg';

// Weather icon mapping
const WEATHER_ICONS = {
  'clear-day': '☀️',
  'clear-night': '🌙',
  'rain': '🌧️',
  'snow': '❄️',
  'sleet': '🌨️',
  'wind': '💨',
  'fog': '🌫️',
  'cloudy': '☁️',
  'partly-cloudy-day': '⛅',
  'partly-cloudy-night': '☁️'
};

// Day names
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Fetch data from API with retry logic
 */
function fetchJSON(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptFetch = (attemptsLeft) => {
      console.log(`Attempting to fetch: ${url.replace(/\/forecast\/[^/]+\//, '/forecast/***/')}`);
      console.log(`Attempts remaining: ${attemptsLeft}`);
      
      const request = https.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => data += chunk);
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(new Error(`Failed to parse JSON: ${err.message}`));
            }
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${data}`);
            if (attemptsLeft > 0) {
              console.log(`Request failed, retrying... (${attemptsLeft} attempts left)`);
              setTimeout(() => attemptFetch(attemptsLeft - 1), 2000);
            } else {
              reject(error);
            }
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        const error = new Error('Request timeout');
        if (attemptsLeft > 0) {
          console.log(`Timeout, retrying... (${attemptsLeft} attempts left)`);
          setTimeout(() => attemptFetch(attemptsLeft - 1), 2000);
        } else {
          reject(error);
        }
      });

      request.on('error', (err) => {
        if (attemptsLeft > 0) {
          console.log(`Error: ${err.message}, retrying... (${attemptsLeft} attempts left)`);
          setTimeout(() => attemptFetch(attemptsLeft - 1), 2000);
        } else {
          reject(err);
        }
      });
    };

    attemptFetch(retries);
  });
}

/**
 * Main build function
 */
async function buildSVG() {
  try {
    // Check if API key is set
    if (!process.env.PIRATE_WEATHER_API_KEY) {
      console.error('❌ ERROR: PIRATE_WEATHER_API_KEY environment variable is not set!');
      console.error('Please add it to GitHub Secrets: Settings → Secrets → Actions → New secret');
      process.exit(1);
    }

    console.log('✅ API key found');
    console.log('🌍 Fetching weather data...');
    const weatherData = await fetchJSON(WEATHER_API_URL);
    console.log('✅ Weather data received');
    
    console.log('🕐 Fetching time data...');
    const timeData = await fetchJSON(TIME_API_URL);
    console.log('✅ Time data received');
    
    console.log('📄 Reading template...');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    console.log('✅ Template loaded');
    
    // Extract data
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
    console.log('✅ SVG generated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Location: Secunderabad, Telangana`);
    console.log(`🌡️  Temperature: ${temperature}°C`);
    console.log(`${weatherIcon}  Weather: ${weatherSummary}`);
    console.log(`📅 Day: ${dayName}`);
    console.log(`🕐 Updated: ${updateTime}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR building SVG:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check if PIRATE_WEATHER_API_KEY is set in GitHub Secrets');
    console.error('2. Verify your API key is valid at https://pirate-weather.apiable.io/');
    console.error('3. Check API status at https://pirate-weather.apiable.io/products/weather-data/');
    console.error('');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildSVG();
}

module.exports = { buildSVG };
