export const mapLayers = {
  standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }),
  
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
  }),
  
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '© CartoDB'
  })
};

export function initLayerControl(map) {
  return L.control.layers({
    'Standard': mapLayers.standard,
    'Satellite': mapLayers.satellite,
    'Dark Mode': mapLayers.dark
  }, null, { position: 'topright' }).addTo(map);
}