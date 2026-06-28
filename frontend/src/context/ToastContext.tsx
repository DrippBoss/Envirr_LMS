import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ToastApi {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastCtx = createContext<ToastApi>({ toast: () => {}, success: () => {}, error: () => {} });

export const useToast = () => useContext(ToastCtx);

const META: Record<ToastType, { icon: string; text: string; border: string }> = {
  success: { icon: 'check_circle', text: 'text-secondary', border: 'border-secondary/30' },
  error:   { icon: 'error',        text: 'text-error',     border: 'border-error/30' },
  info:    { icon: 'info',         text: 'text-primary',   border: 'border-primary/30' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((m: string) => toast(m, 'success'), [toast]);
  const error = useCallback((m: string) => toast(m, 'error'), [toast]);

  return (
    <ToastCtx.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map(t => {
          const m = META[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-surface-container border ${m.border} shadow-xl animate-fade-in-up`}
            >
              <span className={`material-symbols-outlined text-lg ${m.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
              <p className="flex-1 text-sm font-bold text-on-surface">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="material-symbols-outlined text-base text-outline hover:text-on-surface"
              >
                close
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
