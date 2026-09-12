import { setupEventListeners } from './ui/events.js';
import { updateActionsVisibility } from './ui/renderer.js';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateActionsVisibility();
    console.log('🚀 Bedrock Addon Installer inicializado com sucesso.');

    // Registro do Service Worker para suporte PWA e offline
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('📡 PWA Service Worker registrado:', reg.scope);
                })
                .catch(err => {
                    console.warn('⚠️ Falha ao registrar Service Worker:', err);
                });
        });
    }
});

