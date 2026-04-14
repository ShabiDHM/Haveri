// FILE: src/main.tsx
// PHOENIX PROTOCOL - PWA SYNC & LOCALE V6.0

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import i18n from './i18n';
import moment from 'moment';
import 'moment/locale/sq';

// PHOENIX: Import PWA registration logic
import { registerSW } from 'virtual:pwa-register';

// PWA FIX: Type-safe Service Worker update logic
registerSW({
  immediate: true,
  onRegistered(r: ServiceWorkerRegistration | undefined) {
    if (r) {
      setInterval(() => {
        r.update();
      }, 60 * 60 * 1000); // Check for updates every hour
    }
  },
  onRegisterError(error: unknown) {
    console.error('SW registration error', error);
  }
});

// PHOENIX: Global import path for react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const updateMomentLocale = (lng: string | undefined) => {
  const locale = lng || 'en';
  moment.locale(locale);
  console.log(`Moment locale definitively set to: ${locale}`);
};

// 1. Set the initial locale immediately
updateMomentLocale(i18n.language);

// 2. Subscribe to language changes
i18n.on('languageChanged', updateMomentLocale);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);