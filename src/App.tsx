import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { useDirection } from './hooks/useDirection';
import { router } from './router';
import { ToastProvider } from './components/ui/Toast';
import './i18n';

export default function App() {
  const dir = useDirection();
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language || 'tr';
    document.documentElement.dir = dir;
  }, [i18n.language, dir]);

  return (
    <div dir={dir} className={dir === 'rtl' ? 'app-rtl' : 'app-ltr'}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </div>
  );
}
