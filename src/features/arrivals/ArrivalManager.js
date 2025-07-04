export class ArrivalManager {
  static async displayPredictions(map, stopId) {
    try {
      const data = await CTAService.getPredictions(stopId);
      const predictions = data.prd || [];
      
      const content = predictions.map(pred => `
        <div class="arrival-item">
          <span class="route-badge" style="background:${this.getRouteColor(pred.rt)}">
            ${pred.rt}
          </span>
          <span>To ${pred.des}</span>
          <span class="arrival-time">
            ${this.formatMinutes(pred.prdctdn)} min
          </span>
        </div>
      `).join('');

      L.popup()
        .setLatLng([stopLat, stopLon])
        .setContent(`<div class="arrivals-popup">${content}</div>`)
        .openOn(map);
        
    } catch (error) {
      NotificationManager.showToast('Failed to load predictions', 'error');
    }
  }

  static formatMinutes(minutes) {
    return minutes === 'DUE' ? 'Now' : minutes;
  }
}