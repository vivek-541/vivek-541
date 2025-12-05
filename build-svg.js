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
 * Fetch data from API
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Main build function
 */
async function buildSVG() {
  try {
    console.log('🌍 Fetching weather data...');
    const weatherData = await fetchJSON(WEATHER_API_URL);
    
    console.log('🕐 Fetching time data...');
    const timeData = await fetchJSON(TIME_API_URL);
    
    console.log('📄 Reading template...');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
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
    
    console.log('✅ SVG generated successfully!');
    console.log(`   Temperature: ${temperature}°C`);
    console.log(`   Weather: ${weatherIcon} ${weatherSummary}`);
    console.log(`   Day: ${dayName}`);
    console.log(`   Updated: ${updateTime}`);
    
  } catch (error) {
    console.error('❌ Error building SVG:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildSVG();
}

module.exports = { buildSVG };