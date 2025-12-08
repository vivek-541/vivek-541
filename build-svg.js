const fs = require('fs');
const https = require('https');

const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/weather?lat=17.3760&lon=78.4928&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
const TEMPLATE_PATH = './template.svg';
const OUTPUT_PATH = './chat.svg';

const WEATHER_ICONS = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️'
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    console.log('Fetching Weather API...');
    
    const request = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
}

async function buildSVG() {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY environment variable not set');
    }

    console.log('🌍 Fetching weather data from OpenWeatherMap...');
    const weatherData = await fetchJSON(WEATHER_API_URL);
    console.log('✅ Weather data received');
    
    console.log('📄 Reading template...');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    // Extract weather data
    const temperature = Math.round(weatherData.main.temp);
    const weatherSummary = weatherData.weather[0].description
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const weatherIcon = WEATHER_ICONS[weatherData.weather[0].icon] || '🌤️';
    
    // Get time from OpenWeatherMap data (no separate API needed!)
    const currentTime = new Date(weatherData.dt * 1000); // Unix timestamp to milliseconds
    const timezoneOffset = weatherData.timezone / 60; // Convert seconds to minutes
    
    // Apply timezone offset to get local time
    const localTime = new Date(currentTime.getTime() + (timezoneOffset - currentTime.getTimezoneOffset()) * 60000);
    
    const dayName = DAY_NAMES[localTime.getDay()];
    const updateTime = localTime.toLocaleString('en-IN', {
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
    console.log(`📍 Location: ${weatherData.name}, ${weatherData.sys.country}`);
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
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

if (require.main === module) {
  buildSVG();
}

module.exports = { buildSVG };
