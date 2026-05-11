import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const pushToast = useCallback((message, kind = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastItem({ toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger CSS enter transition on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`toast toast--${toast.kind}${visible ? ' toast--in' : ''}`}>
      {toast.message}
    </div>
  );
}

function ToastStack({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
