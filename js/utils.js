// utils.js - Helper functions

// Translation
// utils.js - Only change this function

// Translation
function translatePage() {
    const lang = localStorage.getItem('lang') || CONFIG.DEFAULT_LANG;
    
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    if (lang === 'ar') {
        document.querySelectorAll('[ar]').forEach(el => {
            if (!el.dataset.enText) {
                el.dataset.enText = el.textContent.trim();
            }
            el.textContent = el.getAttribute('ar');
        });
        document.querySelectorAll('[ar-placeholder]').forEach(el => {
            if (!el.dataset.enPlaceholder) {
                el.dataset.enPlaceholder = el.placeholder;
            }
            el.placeholder = el.getAttribute('ar-placeholder');
        });
    } else {
        document.querySelectorAll('[ar]').forEach(el => {
            const enText = el.dataset.enText || el.textContent.trim();
            el.textContent = enText;
        });
        document.querySelectorAll('[ar-placeholder]').forEach(el => {
            const enPlaceholder = el.dataset.enPlaceholder || el.placeholder;
            el.placeholder = enPlaceholder;
        });
    }
    
    // Update welcome message
    const welcomeEl = document.getElementById('welcomeMsg');
    if (welcomeEl) {
        const name = currentProfile?.full_name || '';
        welcomeEl.textContent = lang === 'ar' ? `مرحباً، ${name}` : `Welcome, ${name}`;
    }
    
    updateDynamicContent();
}

// Add this helper function - it updates any dynamically rendered content
function updateDynamicContent() {
    // Update dates
    document.querySelectorAll('[data-date]').forEach(el => {
        const date = el.dataset.date;
        if (date) {
            el.textContent = formatDate(date);
        }
    });
    
    // Update currency
    document.querySelectorAll('[data-amount]').forEach(el => {
        const amount = parseFloat(el.dataset.amount);
        if (!isNaN(amount)) {
            el.textContent = formatCurrency(amount);
        }
    });
    
    // Update statuses
    document.querySelectorAll('[data-status]').forEach(el => {
        const status = el.dataset.status;
        if (status) {
            el.textContent = formatStatus(status);
        }
    });
}

// Formatting
function formatDate(date) {
    return new Date(date).toLocaleDateString(
        localStorage.getItem('lang') === 'ar' ? 'ar-SA' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' }
    );
}

function formatCurrency(amount) {
    return new Intl.NumberFormat(
        localStorage.getItem('lang') === 'ar' ? 'ar-SA' : 'en-US',
        { style: 'currency', currency: 'USD' }
    ).format(amount || 0);
}

function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// DOM helpers
function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function hideModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Storage
function getFileUrl(bucket, path) {
    return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}