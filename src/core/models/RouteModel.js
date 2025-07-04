export class Route {
  constructor(data) {
    this.id = data.rt;
    this.name = data.rtnm;
    this.directions = {
      primary: data.rtdir1,
      secondary: data.rtdir2
    };
    this.color = this._assignColor(data.rt);
  }

  _assignColor(routeId) {
    const colors = {
      '22': '#1A73E8', // Blue
      '151': '#FF9500' // Orange
    };
    return colors[routeId] || '#8E8E93'; // Default gray
  }
}