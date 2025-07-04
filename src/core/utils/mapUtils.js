import { CTAService } from './core/api/CTAService.js';
import { Route } from './core/models/RouteModel.js';
import { NotificationManager } from './features/notifications/NotificationManager.js';
import { ThemeSwitcher } from './features/theme/ThemeSwitcher.js';
import { FavoritesManager } from './features/favorites/FavoritesManager.js';
import { ArrivalManager } from './features/arrivals/ArrivalManager.js';
import { initLayerControl, mapLayers } from './features/map-layers/MapLayers.js';
import config from './core/config/settings.js';

export default class App {
  constructor() {
    this.state = {
      routes: [],
      activeRoute: null,
      map: null,
      busMarkers: new Map(),
      stopMarkers: new Map(),
      userLocation: null,
      settings: {
        autoRefresh: true,
        showStops: false,
        darkMode: false,
        selectedLayer: 'standard'
      }
    };
  }

  async init() {
    this.initUI();
    this.initMap();
    await this.loadInitialData();
    this.setupEventListeners();
    this.setupAutoRefresh();
  }

  // =====================
  // INITIALIZATION METHODS
  // =====================

  initUI() {
    ThemeSwitcher.init(this.toggleDarkMode.bind(this));
    this.ui = {
      routeList: document.getElementById('route-list'),
      searchInput: document.getElementById('route-search'),
      refreshBtn: document.getElementById('refresh-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      locateBtn: document.getElementById('locate-btn'),
      sheet: document.querySelector('.route-sheet'),
      sheetHandle: document.querySelector('.sheet-handle')
    };
  }

  initMap() {
    this.state.map = L.map('map', {
      center: config.map.defaultCenter,
      zoom: config.map.defaultZoom,
      zoomControl: false,
      preferCanvas: true
    });

    // Initialize layers
    this.layerControl = initLayerControl(this.state.map);
    mapLayers.standard.addTo(this.state.map);

    // Add custom controls
    this.addMapControls();
  }

  addMapControls() {
    // Custom zoom controls
    const zoomControl = L.control.zoom({
      position: 'bottomright'
    }).addTo(this.state.map);

    // Style Leaflet controls to match iOS
    document.querySelectorAll('.leaflet-control-zoom-in, .leaflet-control-zoom-out')
      .forEach(btn => {
        btn.style.background = 'rgba(255,255,255,0.9)';
        btn.style.borderRadius = '50%';
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.fontSize = '20px';
        btn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        btn.style.margin = '10px';
      });
  }

  // =====================
  // DATA LOADING METHODS
  // =====================

  async loadInitialData() {
    try {
      await Promise.all([
        this.loadRoutes(),
        this.loadUserPreferences()
      ]);
    } catch (error) {
      NotificationManager.showToast('Failed to load initial data', 'error');
    }
  }

  async loadRoutes() {
    try {
      const data = await CTAService.getRoutes();
      this.state.routes = data.routes.map(r => new Route(r));
      this.renderRouteList();
    } catch (error) {
      NotificationManager.showToast('Failed to load routes', 'error');
    }
  }

  async loadUserPreferences() {
    // Load dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    this.toggleDarkMode(darkMode);

    // Load favorites
    this.renderRouteList();
  }

  // =====================
  // RENDERING METHODS
  // =====================

  renderRouteList(filter = '') {
    const term = filter.toLowerCase();
    const favorites = FavoritesManager.getFavorites();

    this.ui.routeList.innerHTML = this.state.routes
      .filter(route => 
        route.id.toLowerCase().includes(term) || 
        route.name.toLowerCase().includes(term)
      )
      .map(route => `
        <div class="route-item" data-route="${route.id}">
          <div class="route-color" style="background:${route.color}">
            ${route.id}
          </div>
          <div class="route-info">
            <h3>${route.name}</h3>
            <p>${route.directions.primary} / ${route.directions.secondary}</p>
          </div>
          <button class="favorite-btn ${favorites.includes(route.id) ? 'active' : ''}">
            <i class="fas fa-star"></i>
          </button>
        </div>
      `).join('');
  }

  renderBusMarkers(routeId, buses) {
    // Clear existing buses
    this.clearMarkers(routeId, this.state.busMarkers);

    // Add new markers
    const route = this.state.routes.find(r => r.id === routeId);
    const markers = buses.map(bus => {
      const marker = L.marker([bus.lat, bus.lon], {
        icon: this.createBusIcon(route),
        rotationAngle: bus.hdg
      }).addTo(this.state.map);

      marker.bindPopup(this.createBusPopup(bus));
      return marker;
    });

    this.state.busMarkers.set(routeId, markers);
  }

  renderStopMarkers(routeId, stops) {
    if (!this.state.settings.showStops) return;

    this.clearMarkers(routeId, this.state.stopMarkers);

    const route = this.state.routes.find(r => r.id === routeId);
    const markers = stops.map(stop => {
      const marker = L.marker([stop.lat, stop.lon], {
        icon: this.createStopIcon(route)
      }).addTo(this.state.map);

      marker.on('click', () => {
        ArrivalManager.displayPredictions(this.state.map, stop.stpid);
      });

      return marker;
    });

    this.state.stopMarkers.set(routeId, markers);
  }

  // =====================
  // MARKER METHODS
  // =====================

  createBusIcon(route) {
    return L.divIcon({
      html: `
        <div class="bus-marker" style="background:${route.color}">
          <span>${route.id}</span>
          <div class="bus-direction"></div>
        </div>
      `,
      className: 'bus-marker-container',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  createStopIcon(route) {
    return L.divIcon({
      html: `
        <div class="stop-marker" style="border-color:${route.color}">
          <div class="inner-circle" style="background:${route.color}"></div>
        </div>
      `,
      className: 'stop-marker-container',
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });
  }

  createBusPopup(bus) {
    return `
      <div class="bus-popup">
        <h3>Route ${bus.rt}</h3>
        <p><strong>Destination:</strong> ${bus.des}</p>
        <p><strong>Speed:</strong> ${bus.spd} mph</p>
        <p><strong>Updated:</strong> ${new Date(bus.tmstmp * 1000).toLocaleTimeString()}</p>
      </div>
    `;
  }

  clearMarkers(routeId, markerMap) {
    if (markerMap.has(routeId)) {
      markerMap.get(routeId).forEach(marker => {
        this.state.map.removeLayer(marker);
      });
      markerMap.delete(routeId);
    }
  }

  // =====================
  // EVENT HANDLERS
  // =====================

  setupEventListeners() {
    // Route selection
    this.ui.routeList.addEventListener('click', (e) => {
      const routeItem = e.target.closest('.route-item');
      const favoriteBtn = e.target.closest('.favorite-btn');
      
      if (favoriteBtn) {
        this.handleFavoriteClick(routeItem);
      } else if (routeItem) {
        this.handleRouteSelection(routeItem.dataset.route);
      }
    });

    // Search input
    this.ui.searchInput.addEventListener('input', () => {
      this.renderRouteList(this.ui.searchInput.value);
    });

    // Refresh button
    this.ui.refreshBtn.addEventListener('click', () => {
      CTAService.clearCache();
      this.loadRoutes();
      NotificationManager.showToast('Data refreshed', 'success');
    });

    // Locate button
    this.ui.locateBtn.addEventListener('click', () => {
      this.locateUser();
    });

    // Sheet handle for drag interactions
    this.ui.sheetHandle.addEventListener('mousedown', this.startSheetDrag.bind(this));
    document.addEventListener('mouseup', this.endSheetDrag.bind(this));

    // Layer control changes
    this.state.map.on('baselayerchange', (e) => {
      this.state.settings.selectedLayer = e.name.toLowerCase();
      localStorage.setItem('mapLayer', this.state.settings.selectedLayer);
    });
  }

  handleRouteSelection(routeId) {
    this.state.activeRoute = routeId;
    this.loadRouteData(routeId);
    this.highlightRoute(routeId);
  }

  handleFavoriteClick(routeItem) {
    const routeId = routeItem.dataset.route;
    const isNowFavorite = FavoritesManager.toggleFavorite(routeId);
    
    NotificationManager.showToast(
      isNowFavorite ? 'Added to favorites' : 'Removed from favorites',
      'success'
    );
    
    // Update UI
    const favoriteBtn = routeItem.querySelector('.favorite-btn');
    favoriteBtn.classList.toggle('active', isNowFavorite);
  }

  // =====================
  // ROUTE DATA METHODS
  // =====================

  async loadRouteData(routeId) {
    try {
      const [vehicles, stops] = await Promise.all([
        CTAService.getVehicles(routeId),
        this.state.settings.showStops ? CTAService.getStops(routeId) : Promise.resolve({})
      ]);

      this.renderBusMarkers(routeId, vehicles.vehicle || []);
      
      if (stops.stops) {
        this.renderStopMarkers(routeId, stops.stops);
      }

      this.zoomToRoute(routeId);
    } catch (error) {
      NotificationManager.showToast(`Failed to load route data`, 'error');
    }
  }

  highlightRoute(routeId) {
    document.querySelectorAll('.route-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === routeId);
    });
  }

  zoomToRoute(routeId) {
    const markers = this.state.busMarkers.get(routeId) || [];
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
      this.state.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // =====================
  // USER LOCATION
  // =====================

  locateUser() {
    if (!navigator.geolocation) {
      NotificationManager.showToast('Geolocation not supported', 'error');
      return;
    }

    NotificationManager.showToast('Locating...', 'info');

    navigator.geolocation.getCurrentPosition(
      position => {
        this.handleLocationSuccess(position);
      },
      error => {
        this.handleLocationError(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  handleLocationSuccess(position) {
    this.state.userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    this.state.map.setView([this.state.userLocation.lat, this.state.userLocation.lng], 15);
    this.addUserMarker();
    NotificationManager.showToast('Location found', 'success');
  }

  handleLocationError(error) {
    let message = 'Location access denied';
    if (error.code === error.TIMEOUT) {
      message = 'Location request timed out';
    }
    NotificationManager.showToast(message, 'error');
  }

  addUserMarker() {
    if (this.userMarker) {
      this.state.map.removeLayer(this.userMarker);
    }

    this.userMarker = L.marker(
      [this.state.userLocation.lat, this.state.userLocation.lng],
      {
        icon: L.divIcon({
          html: '<div class="user-marker"><i class="fas fa-user"></i></div>',
          className: 'user-marker-container',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        }),
        zIndexOffset: 2000
      }
    ).addTo(this.state.map);
  }

  // =====================
  // SHEET DRAG INTERACTION
  // =====================

  startSheetDrag(e) {
    e.preventDefault();
    this.isDraggingSheet = true;
    this.sheetStartY = e.clientY;
    this.sheetStartHeight = window.innerHeight - this.ui.sheet.getBoundingClientRect().top;
    document.addEventListener('mousemove', this.handleSheetDrag.bind(this));
  }

  handleSheetDrag(e) {
    if (!this.isDraggingSheet) return;
    
    const deltaY = this.sheetStartY - e.clientY;
    const newHeight = this.sheetStartHeight + deltaY;
    const maxHeight = window.innerHeight * 0.8;
    const minHeight = 150;

    if (newHeight > maxHeight) {
      this.ui.sheet.style.height = `${maxHeight}px`;
    } else if (newHeight < minHeight) {
      this.ui.sheet.style.height = `${minHeight}px`;
    } else {
      this.ui.sheet.style.height = `${newHeight}px`;
    }
  }

  endSheetDrag() {
    this.isDraggingSheet = false;
    document.removeEventListener('mousemove', this.handleSheetDrag.bind(this));
  }

  // =====================
  // UTILITY METHODS
  // =====================

  toggleDarkMode(enable) {
    this.state.settings.darkMode = enable;
    document.body.classList.toggle('dark-mode', enable);
    localStorage.setItem('darkMode', enable);
    
    // Switch map layer if needed
    if (enable && this.state.settings.selectedLayer !== 'dark') {
      this.state.map.removeLayer(mapLayers[this.state.settings.selectedLayer]);
      mapLayers.dark.addTo(this.state.map);
      this.state.settings.selectedLayer = 'dark';
    } else if (!enable && this.state.settings.selectedLayer === 'dark') {
      this.state.map.removeLayer(mapLayers.dark);
      mapLayers.standard.addTo(this.state.map);
      this.state.settings.selectedLayer = 'standard';
    }
  }

  setupAutoRefresh() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    
    this.refreshInterval = setInterval(() => {
      if (this.state.activeRoute) {
        this.loadRouteData(this.state.activeRoute);
      }
    }, config.refreshInterval);
  }

  // Cleanup
  destroy() {
    clearInterval(this.refreshInterval);
    this.state.map.remove();
  }
}