/**
 * Entry point for the CTA Bus Tracker application
 * Initializes the app and sets up global configurations
 */

import App from './App.js';
import { NotificationManager } from './features/notifications/NotificationManager.js';
import { registerServiceWorker } from './core/utils/serviceWorker.js';

// Import styles
import './styles/main.css';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Create app instance
    const app = new App();
    
    // Initialize app
    app.init();
    
    // Register service worker for offline support
    registerServiceWorker();
    
    // Add to window for debugging (remove in production)
    window.app = app;
    
    // Show welcome message
    NotificationManager.showToast('CTA Tracker Ready!', 'success');
    
  } catch (error) {
    console.error('Application failed to start:', error);
    NotificationManager.showToast('App failed to load', 'error');
    
    // Create fallback UI
    document.body.innerHTML = `
      <div class="error-fallback">
        <h1>⚠️ Application Error</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Reload App</button>
      </div>
    `;
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  NotificationManager.showToast('An unexpected error occurred', 'error');
});

// Register service worker function
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      
      // Check for updates every hour
      setInterval(() => {
        registration.update().catch(err => 
          console.warn('SW update check failed:', err)
        );
      }, 60 * 60 * 1000);
      
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
}

// Install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  NotificationManager.showToast(
    'Install this app for better experience',
    'info',
    5000,
    () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
      });
    }
  );
});
import App from './App.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  
  window.app = app; // For debugging
});