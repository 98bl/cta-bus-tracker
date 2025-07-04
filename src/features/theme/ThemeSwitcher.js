export class ThemeSwitcher {
  static init() {
    const toggle = document.createElement('div');
    toggle.className = 'theme-toggle';
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
    document.body.appendChild(toggle);
    
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Load saved preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
  }
}