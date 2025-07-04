export class FavoritesManager {
  static STORAGE_KEY = 'cta-favorites';

  static getFavorites() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
  }

  static toggleFavorite(routeId) {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(routeId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(routeId);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    return !(index > -1); // Returns true if added, false if removed
  }

  static isFavorite(routeId) {
    return this.getFavorites().includes(routeId);
  }
}