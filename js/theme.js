// theme.js - Dark/Light mode + Language toggle

function loadTheme() {
    const theme = localStorage.getItem('theme') || CONFIG.DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function toggleLang() {
    const current = localStorage.getItem('lang') || CONFIG.DEFAULT_LANG;
    const next = current === 'en' ? 'ar' : 'en';
    localStorage.setItem('lang', next);
    translatePage();
    
    const btn = document.querySelector('[onclick="toggleLang()"]');
    if (btn) btn.textContent = next === 'en' ? 'AR' : 'EN';
}

function loadLang() {
    const lang = localStorage.getItem('lang') || CONFIG.DEFAULT_LANG;
    const btn = document.querySelector('[onclick="toggleLang()"]');
    if (btn) btn.textContent = lang === 'en' ? 'AR' : 'EN';
}