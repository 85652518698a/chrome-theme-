export class WeatherService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.unit = config.unit || 'metric';
    this.cacheDuration = config.cacheDuration || 30 * 60 * 1000;
    this.cache = {};
  }

  async getCurrentWeather(lat, lon) {
    const cacheKey = `current_${lat}_${lon}_${this.unit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchWithFallback(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.unit}&appid=${this.apiKey}`
      );

      const result = this.parseCurrentWeather(data);
      this.addToCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('Weather fetch failed, using fallback:', err);
      return this.getFallbackWeather();
    }
  }

  async getForecast(lat, lon) {
    const cacheKey = `forecast_${lat}_${lon}_${this.unit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchWithFallback(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${this.unit}&appid=${this.apiKey}`
      );

      const result = this.parseForecast(data);
      this.addToCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('Forecast fetch failed, using fallback:', err);
      return this.getFallbackForecast();
    }
  }

  async getWeatherByCity(city) {
    const cacheKey = `city_${city}_${this.unit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchWithFallback(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${this.unit}&appid=${this.apiKey}`
      );

      const result = this.parseCurrentWeather(data);
      this.addToCache(cacheKey, result);

      const forecast = await this.getForecast(data.coord.lat, data.coord.lon);
      result.forecast = forecast;

      return result;
    } catch (err) {
      console.warn('Weather by city failed:', err);
      return this.getFallbackWeather();
    }
  }

  async fetchWithFallback(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  parseCurrentWeather(data) {
    return {
      location: data.name,
      country: data.sys?.country || '',
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      pressure: data.main.pressure,
      sunrise: data.sys?.sunrise,
      sunset: data.sys?.sunset,
      timestamp: Date.now()
    };
  }

  parseForecast(data) {
    const dailyMap = new Map();

    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          day: date,
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          icon: item.weather[0].icon,
          condition: item.weather[0].main
        });
      } else {
        const existing = dailyMap.get(date);
        existing.tempMin = Math.min(existing.tempMin, item.main.temp_min);
        existing.tempMax = Math.max(existing.tempMax, item.main.temp_max);
      }
    }

    return Array.from(dailyMap.values()).slice(0, 5);
  }

  getFallbackWeather() {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    return {
      location: 'Local',
      country: '',
      temp: 22,
      feelsLike: 20,
      condition: isDay ? 'Clear' : 'Night',
      description: isDay ? 'Clear sky' : 'Clear night',
      icon: isDay ? '01d' : '01n',
      humidity: 60,
      windSpeed: 5,
      pressure: 1013,
      sunrise: null,
      sunset: null,
      timestamp: Date.now(),
      forecast: this.getFallbackForecast(),
      isFallback: true
    };
  }

  getFallbackForecast() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const conditions = ['Clear', 'Clouds', 'Partly Cloudy', 'Clear', 'Clouds'];
    return days.map((day, i) => ({
      day,
      tempMin: 18 + Math.floor(Math.random() * 4),
      tempMax: 24 + Math.floor(Math.random() * 6),
      icon: i % 2 === 0 ? '01d' : '02d',
      condition: conditions[i]
    }));
  }

  getWeatherIcon(condition, iconCode) {
    const iconMap = {
      '01d': `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="14" fill="#FFD93D"/><g stroke="#FFD93D" stroke-width="2" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="58"/><line x1="6" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="58" y2="32"/><line x1="12.7" y1="12.7" x2="16.9" y2="16.9"/><line x1="47.1" y1="47.1" x2="51.3" y2="51.3"/><line x1="12.7" y1="51.3" x2="16.9" y2="47.1"/><line x1="47.1" y1="16.9" x2="51.3" y2="12.7"/></g></svg>`,
      '01n': `<svg viewBox="0 0 64 64" fill="none"><path d="M40 12C28.954 12 20 20.954 20 32s8.954 20 20 20a20 20 0 0 1-20-20 20 20 0 0 1 20-20z" fill="#C4C4C4"/><path d="M42 16a18 18 0 0 0-18 18 18 18 0 0 0 18 18 20 20 0 0 1-20-20 20 20 0 0 1 20-20z" fill="#F0ECE4"/></svg>`,
      '02d': `<svg viewBox="0 0 64 64" fill="none"><circle cx="28" cy="28" r="12" fill="#FFD93D"/><path d="M20 36c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#B0B0B0"/></svg>`,
      '02n': `<svg viewBox="0 0 64 64" fill="none"><path d="M36 16C26.058 16 18 24.058 18 34s8.058 18 18 18a17.9 17.9 0 0 1-6.5-14c0-10.412 8.588-19 19-19-.7 0-1.4.04-2.5.5z" fill="#C4C4C4"/><path d="M28 38c5.523 0 10-4.477 10-10 0 5.523 4.477 10 10 10H28z" fill="#B0B0B0"/></svg>`,
      '03d': `<svg viewBox="0 0 64 64" fill="none"><path d="M20 34c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#B0B0B0"/><path d="M24 40c4.418 0 8-3.582 8-8 0 4.418 3.582 8 8 8H24z" fill="#909090"/></svg>`,
      '03n': `<svg viewBox="0 0 64 64" fill="none"><path d="M20 34c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#A0A0A0"/><path d="M24 40c4.418 0 8-3.582 8-8 0 4.418 3.582 8 8 8H24z" fill="#808080"/></svg>`,
      '04d': `<svg viewBox="0 0 64 64" fill="none"><path d="M16 36c8.284 0 15-6.716 15-15 0 8.284 6.716 15 15 15H16z" fill="#909090"/><path d="M20 44c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#707070"/></svg>`,
      '04n': `<svg viewBox="0 0 64 64" fill="none"><path d="M16 36c8.284 0 15-6.716 15-15 0 8.284 6.716 15 15 15H16z" fill="#808080"/><path d="M20 44c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#606060"/></svg>`,
      '09d': `<svg viewBox="0 0 64 64" fill="none"><path d="M20 30c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#B0B0B0"/><path d="M16 44c4.418 0 8-3.582 8-8 0 4.418 3.582 8 8 8H16z" fill="#C0C0C0"/><line x1="20" y1="48" x2="20" y2="54" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="46" x2="28" y2="52" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/><line x1="36" y1="48" x2="36" y2="54" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/></svg>`,
      '10d': `<svg viewBox="0 0 64 64" fill="none"><circle cx="28" cy="28" r="12" fill="#FFD93D"/><path d="M20 34c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#B0B0B0"/><line x1="24" y1="42" x2="24" y2="50" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="40" x2="32" y2="48" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="42" x2="40" y2="50" stroke="#6BB5FF" stroke-width="2" stroke-linecap="round"/></svg>`,
      '11d': `<svg viewBox="0 0 64 64" fill="none"><path d="M20 28c6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12H20z" fill="#606060"/><path d="M32 38l-4 8h8l-4 8" stroke="#FFD93D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      '13d': `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="24" r="6" fill="#E0E0E0"/><circle cx="20" cy="30" r="4" fill="#D0D0D0"/><circle cx="44" cy="28" r="5" fill="#D5D5D5"/><circle cx="28" cy="36" r="3" fill="#C8C8C8"/><circle cx="38" cy="34" r="4" fill="#D0D0D0"/></svg>`,
      '50d': `<svg viewBox="0 0 64 64" fill="none"><path d="M16 28h32M12 34h40M20 40h24" stroke="#B0B0B0" stroke-width="3" stroke-linecap="round" opacity="0.5"/></svg>`
    };

    return iconMap[iconCode] || iconMap['01d'];
  }

  getFromCache(key) {
    if (this.cache[key] && Date.now() - this.cache[key].timestamp < this.cacheDuration) {
      return this.cache[key].data;
    }
    return null;
  }

  addToCache(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };

    if (Object.keys(this.cache).length > 50) {
      const oldest = Object.keys(this.cache).sort(
        (a, b) => this.cache[a].timestamp - this.cache[b].timestamp
      )[0];
      delete this.cache[oldest];
    }
  }

  clearCache() {
    this.cache = {};
  }
}

export class WeatherWidget {
  constructor(config = {}) {
    this.container = config.container || document.body;
    this.service = config.service || new WeatherService(config);
    this.currentWeather = null;
    this.forecast = null;
    this.userLocation = null;
  }

  async init() {
    try {
      this.userLocation = await this.getUserLocation();
      if (this.userLocation) {
        this.currentWeather = await this.service.getCurrentWeather(
          this.userLocation.lat,
          this.userLocation.lon
        );
        this.forecast = await this.service.getForecast(
          this.userLocation.lat,
          this.userLocation.lon
        );
      }
    } catch (err) {
      console.warn('Could not get location, using fallback:', err);
      this.currentWeather = this.service.getFallbackWeather();
      this.forecast = this.service.getFallbackForecast();
    }

    this.render();
  }

  getUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  render() {
    if (!this.container) return;

    if (!this.currentWeather) {
      this.showSkeleton();
      return;
    }

    const weather = this.currentWeather;
    const unit = this.service.unit === 'metric' ? '°C' : '°F';

    this.container.innerHTML = `
      <div class="weather-main">
        <div class="weather-temp">${weather.temp}${unit}</div>
        <div class="weather-icon">
          ${this.service.getWeatherIcon(weather.condition, weather.icon)}
        </div>
      </div>
      <div class="weather-condition">${weather.description}</div>
      <div class="weather-location">${weather.location}${weather.country ? ', ' + weather.country : ''}</div>
      ${this.forecast && this.forecast.length > 0 ? `
        <div class="weather-forecast">
          ${this.forecast.slice(0, 4).map(day => `
            <div class="forecast-day">
              <div class="day-name">${day.day}</div>
              <div class="day-icon">${this.service.getWeatherIcon(day.condition, day.icon)}</div>
              <div class="day-temp">${Math.round(day.tempMax)}${unit}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  showSkeleton() {
    this.container.innerHTML = `
      <div class="weather-main">
        <div class="skeleton" style="width:60px;height:32px;border-radius:4px;"></div>
        <div class="skeleton" style="width:36px;height:36px;border-radius:50%;"></div>
      </div>
      <div class="skeleton" style="width:100px;height:14px;margin-top:4px;border-radius:4px;"></div>
      <div class="skeleton" style="width:120px;height:12px;margin-top:2px;border-radius:4px;"></div>
    `;
  }

  update(config) {
    if (config.unit && config.unit !== this.service.unit) {
      this.service.unit = config.unit;
      this.init();
    }
  }

  refresh() {
    this.service.clearCache();
    this.init();
  }
}
