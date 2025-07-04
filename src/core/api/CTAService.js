/**
 * CTA Bus Tracker API Service
 * Handles all communication with the CTA Bus Tracker API
 */
export class CTAService {
  // API Configuration
  static API_KEY = "BGvNkrNDqwiuYmUuPzb3zDsJS"; // Your API key
  static BASE_URL = "https://www.ctabustracker.com/bustime/api/v2";
  static CACHE = new Map(); // Simple in-memory cache
  static CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get all available bus routes
   * @returns {Promise<Array>} Array of route objects
   */
  static async getRoutes() {
    const cacheKey = 'routes';
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/getroutes?key=${this.API_KEY}&format=json`);
      const data = await this._handleResponse(response);
      
      this._setCache(cacheKey, data.routes || []);
      return data.routes || [];
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      throw new Error('Could not retrieve bus routes');
    }
  }

  /**
   * Get vehicles for a specific route
   * @param {string} routeId - Route number (e.g. '22')
   * @returns {Promise<Array>} Array of vehicle objects
   */
  static async getVehicles(routeId) {
    const cacheKey = `vehicles-${routeId}`;
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}/getvehicles?key=${this.API_KEY}&rt=${routeId}&format=json`
      );
      const data = await this._handleResponse(response);
      
      this._setCache(cacheKey, data.vehicle || []);
      return data.vehicle || [];
    } catch (error) {
      console.error(`Failed to fetch vehicles for route ${routeId}:`, error);
      throw new Error(`Could not retrieve vehicles for route ${routeId}`);
    }
  }

  /**
   * Get bus stops for a specific route
   * @param {string} routeId - Route number
   * @param {string} direction - Optional direction (e.g. 'Northbound')
   * @returns {Promise<Array>} Array of stop objects
   */
  static async getStops(routeId, direction = null) {
    const cacheKey = `stops-${routeId}-${direction || 'all'}`;
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      let url = `${this.BASE_URL}/getstops?key=${this.API_KEY}&rt=${routeId}&format=json`;
      if (direction) url += `&dir=${encodeURIComponent(direction)}`;

      const response = await fetch(url);
      const data = await this._handleResponse(response);
      
      this._setCache(cacheKey, data.stops || []);
      return data.stops || [];
    } catch (error) {
      console.error(`Failed to fetch stops for route ${routeId}:`, error);
      throw new Error(`Could not retrieve stops for route ${routeId}`);
    }
  }

  /**
   * Get arrival predictions for a specific stop
   * @param {string} stopId - Stop ID
   * @param {string|null} routeId - Optional route filter
   * @returns {Promise<Array>} Array of prediction objects
   */
  static async getPredictions(stopId, routeId = null) {
    const cacheKey = `predictions-${stopId}-${routeId || 'all'}`;
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      let url = `${this.BASE_URL}/getpredictions?key=${this.API_KEY}&stpid=${stopId}&format=json`;
      if (routeId) url += `&rt=${routeId}`;

      const response = await fetch(url);
      const data = await this._handleResponse(response);
      
      // Cache predictions for shorter duration (1 minute)
      this._setCache(cacheKey, data.prd || [], 60000);
      return data.prd || [];
    } catch (error) {
      console.error(`Failed to fetch predictions for stop ${stopId}:`, error);
      throw new Error(`Could not retrieve predictions for stop ${stopId}`);
    }
  }

  /**
   * Get the service bulletins (alerts) for routes or stops
   * @param {Array<string>} routeIds - Array of route numbers
   * @param {Array<string>} stopIds - Array of stop IDs
   * @returns {Promise<Array>} Array of alert objects
   */
  static async getServiceBulletins(routeIds = [], stopIds = []) {
    const cacheKey = `alerts-${routeIds.join('-')}-${stopIds.join('-')}`;
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      let url = `${this.BASE_URL}/getservicebulletins?key=${this.API_KEY}&format=json`;
      if (routeIds.length > 0) url += `&rt=${routeIds.join(',')}`;
      if (stopIds.length > 0) url += `&stpid=${stopIds.join(',')}`;

      const response = await fetch(url);
      const data = await this._handleResponse(response);
      
      this._setCache(cacheKey, data.sb || []);
      return data.sb || [];
    } catch (error) {
      console.error('Failed to fetch service bulletins:', error);
      throw new Error('Could not retrieve service bulletins');
    }
  }

  /**
   * Get the direction for a specific route
   * @param {string} routeId - Route number
   * @returns {Promise<Array>} Array of direction objects
   */
  static async getDirections(routeId) {
    const cacheKey = `directions-${routeId}`;
    if (this._checkCache(cacheKey)) {
      return this.CACHE.get(cacheKey).data;
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}/getdirections?key=${this.API_KEY}&rt=${routeId}&format=json`
      );
      const data = await this._handleResponse(response);
      
      this._setCache(cacheKey, data.directions || []);
      return data.directions || [];
    } catch (error) {
      console.error(`Failed to fetch directions for route ${routeId}:`, error);
      throw new Error(`Could not retrieve directions for route ${routeId}`);
    }
  }

  // =====================
  // PRIVATE HELPER METHODS
  // =====================

  /**
   * Handle API response
   * @private
   */
  static async _handleResponse(response) {
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data['bustime-response'].error) {
      const error = data['bustime-response'].error[0];
      throw new Error(`CTA API Error: ${error.msg} (${error.rt})`);
    }

    return data['bustime-response'];
  }

  /**
   * Check if cached data is still valid
   * @private
   */
  static _checkCache(key) {
    if (!this.CACHE.has(key)) return false;
    
    const entry = this.CACHE.get(key);
    return (Date.now() - entry.timestamp) < entry.duration;
  }

  /**
   * Store data in cache
   * @private
   */
  static _setCache(key, data, duration = this.CACHE_DURATION) {
    this.CACHE.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }

  /**
   * Clear the entire cache
   * Useful when user manually refreshes data
   */
  static clearCache() {
    this.CACHE.clear();
  }
}