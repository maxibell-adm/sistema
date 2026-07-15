import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/modules/layout/AppContext.jsx';

export function ToastNotificacao({ notificacao, onAbrir, onFechar }) {
  return (
    <div className={`toast-push toast-push-${notificacao.tipo}`}>
      <div className="toast-push-corpo">
        <div className="toast-push-texto">{notificacao.texto}</div>
        <div className="toast-push-data">{notificacao.data} · {notificacao.hora}</div>
      </div>
      <div className="toast-push-acoes">
        {notificacao.obraId && <button onClick={onAbrir}>Ver obra</button>}
        <button onClick={onFechar}>×</button>
      </div>
    </div>
  );
}

export default function Toast() {
  const { toast, setToast, toasts, removerToast } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast, setToast]);

  return (
    <>
      {toast && <div className={`toast ${toast.tipo}`}>{toast.texto}</div>}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastNotificacao
            key={t.id}
            notificacao={t}
            onAbrir={() => {
              if (t.obraId) navigate(`/obras/${t.obraId}`);
              removerToast(t.id);
            }}
            onFechar={() => removerToast(t.id)}
          />
        ))}
      </div>
    </>
  );
}
