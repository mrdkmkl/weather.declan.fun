// NO API KEY NEEDED! Using Open-Meteo (100% free)

// Check which page we're on
const isIndexPage = document.querySelector('.index-page');
const isWeatherPage = document.querySelector('.weather-page');

if (isIndexPage) {
    // INDEX PAGE - Handle location input
    const form = document.getElementById('locationForm');
    const input = document.getElementById('locationInput');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const location = input.value.trim();
        if (location) {
            // Save location and go to weather page
            localStorage.setItem('weatherLocation', location);
            window.location.href = 'weather.html';
        }
    });
}

if (isWeatherPage) {
    // WEATHER PAGE - Fetch and display weather
    const location = localStorage.getItem('weatherLocation');
    
    if (!location) {
        window.location.href = 'index.html';
    } else {
        fetchWeather(location);
        updateTime();
        setInterval(updateTime, 1000); // Update time every second

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            fetchWeather(location);
        });

        // Alerts toggle
        document.getElementById('alertsToggle').addEventListener('click', () => {
            const content = document.getElementById('alertsContent');
            const toggle = document.getElementById('alertsToggle');
            content.classList.toggle('show');
            toggle.textContent = content.classList.contains('show') ? '▲' : '▼';
        });
    }
}

// Fetch weather data using Open-Meteo (FREE, no API key!)
async function fetchWeather(location) {
    const weatherStats = document.getElementById('weatherStats');
    weatherStats.innerHTML = '<div class="loading">Fetching weather data...</div>';

    try {
        // Step 1: Get coordinates from location name using Nominatim (free geocoding)
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
            throw new Error('Location not found');
        }

        const { lat, lon, display_name, address } = geoData[0];
        
        // Store coordinates globally
        window.currentLat = lat;
        window.currentLon = lon;
        
        // Check if location is in US
        const countryCode = address.country_code ? address.country_code.toLowerCase() : '';
        const isUS = countryCode === 'us' || countryCode === 'usa';
        
        // Extract city and country from display_name
        const parts = display_name.split(', ');
        const cityName = parts[0];
        const country = parts[parts.length - 1];

        // Step 2: Get weather data from Open-Meteo (completely free!)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
        
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (weatherResponse.ok) {
            displayWeather(weatherData, cityName, country);
            // Load radar
            loadRadar(lat, lon);
            
            // Only load alerts and weather.gov button if in US
            if (isUS) {
                loadAlerts(lat, lon);
                setupWeatherGovButton(lat, lon);
            } else {
                // Hide elements for non-US locations
                document.getElementById('alertsSection').style.display = 'none';
                document.getElementById('weatherGovBtn').style.display = 'none';
            }
        } else {
            throw new Error('Failed to fetch weather data');
        }
    } catch (error) {
        console.error('Error:', error);
        weatherStats.innerHTML = `
            <div class="error">
                <p>❌ Unable to fetch weather data</p>
                <p style="margin-top: 10px; font-size: 14px;">Try a different location or check your spelling</p>
            </div>
        `;
    }
}

// Weather code descriptions (WMO Weather interpretation codes)
const weatherDescriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
};

// Display weather data
function displayWeather(data, cityName, country) {
    const locationName = document.getElementById('locationName');
    const weatherStats = document.getElementById('weatherStats');

    // Update location name
    locationName.textContent = `${cityName}, ${country}`;

    // Extract weather data from current conditions
    const current = data.current;
    const temp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const humidity = current.relative_humidity_2m;
    const pressure = Math.round(current.surface_pressure);
    const windSpeed = Math.round(current.wind_speed_10m);
    const windDirection = current.wind_direction_10m;
    const cloudiness = current.cloud_cover;
    const weatherCode = current.weather_code;
    const description = weatherDescriptions[weatherCode] || 'Unknown';

    // Calculate wind direction text
    const windDir = getWindDirection(windDirection);

    // Build stats HTML
    weatherStats.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Temperature</div>
            <div class="stat-value">${temp}<span class="stat-unit">°F</span></div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Feels Like</div>
            <div class="stat-value">${feelsLike}<span class="stat-unit">°F</span></div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Humidity</div>
            <div class="stat-value">${humidity}<span class="stat-unit">%</span></div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Wind Speed</div>
            <div class="stat-value">${windSpeed}<span class="stat-unit">mph</span></div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Wind Direction</div>
            <div class="stat-value">${windDir}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Pressure</div>
            <div class="stat-value">${pressure}<span class="stat-unit">hPa</span></div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Cloudiness</div>
            <div class="stat-value">${cloudiness}<span class="stat-unit">%</span></div>
        </div>

        <div class="weather-description">
            ${description}
        </div>
    `;
}

// Load radar using embedded Windy
function loadRadar(lat, lon) {
    const radarFrame = document.getElementById('radarFrame');
    // Use Windy.com embed which works great!
    const radarUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1`;
    radarFrame.src = radarUrl;
}

// Load weather alerts from Weather.gov (US only)
async function loadAlerts(lat, lon) {
    const alertsSection = document.getElementById('alertsSection');
    const alertsContent = document.getElementById('alertsContent');
    
    // Always show section to let user know we're trying
    alertsSection.style.display = 'block';
    alertsContent.innerHTML = '<div class="alert-loading">Checking for alerts...</div>';

    try {
        // Try multiple alert endpoints
        let alertsData = null;
        
        // Try method 1: Direct point query
        try {
            const response1 = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
                mode: 'cors'
            });
            if (response1.ok) {
                alertsData = await response1.json();
            }
        } catch (e) {
            console.log('Method 1 failed, trying method 2...');
        }
        
        // Try method 2: Get grid point first, then alerts
        if (!alertsData) {
            try {
                const pointResponse = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
                    mode: 'cors'
                });
                if (pointResponse.ok) {
                    const pointData = await pointResponse.json();
                    const zone = pointData.properties.forecastZone;
                    if (zone) {
                        const zoneId = zone.split('/').pop();
                        const alertResponse = await fetch(`https://api.weather.gov/alerts/active/zone/${zoneId}`, {
                            mode: 'cors'
                        });
                        if (alertResponse.ok) {
                            alertsData = await alertResponse.json();
                        }
                    }
                }
            } catch (e) {
                console.log('Method 2 failed');
            }
        }

        if (alertsData && alertsData.features && alertsData.features.length > 0) {
            // Show alerts
            let alertsHTML = '';
            alertsData.features.forEach(alert => {
                const props = alert.properties;
                const event = props.event || 'Weather Alert';
                const headline = props.headline || props.description || 'No details available';
                const severity = props.severity || 'Unknown';

                const severityClass = severity === 'Severe' || severity === 'Extreme' ? 'severe' : 
                                     severity === 'Moderate' ? 'moderate' : 'minor';

                alertsHTML += `
                    <div class="alert-item ${severityClass}">
                        <div class="alert-event">${event}</div>
                        <div class="alert-headline">${headline}</div>
                    </div>
                `;
            });

            alertsContent.innerHTML = alertsHTML;
        } else {
            // No alerts found
            alertsContent.innerHTML = '<div class="alert-none">✅ No active weather alerts for this location</div>';
        }
    } catch (error) {
        console.error('Alerts error:', error);
        // Show error message
        alertsContent.innerHTML = '<div class="alert-error">⚠️ Unable to load alerts (Weather.gov API may be blocking requests)</div>';
    }
}

// Setup Weather.gov button (US only)
function setupWeatherGovButton(lat, lon) {
    const btn = document.getElementById('weatherGovBtn');
    btn.style.display = 'flex'; // Show button
    
    btn.onclick = () => {
        // Direct link always works
        window.open(`https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`, '_blank');
    };
}

// Convert wind direction degrees to compass direction
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Update time display
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        };
        timeElement.textContent = now.toLocaleTimeString('en-US', options);
    }
}