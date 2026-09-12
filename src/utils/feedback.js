let toastTimeout = null;

export function showToast(message, type = 'info', duration = 3000) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Forçar reflow para reiniciar animação
    void toast.offsetHeight;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

export function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [50, 30, 50]
        };
        navigator.vibrate(patterns[type] || patterns.light);
    }
}
