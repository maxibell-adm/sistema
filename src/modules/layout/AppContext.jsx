import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ATIVIDADES_EXEMPLO } from '@/modules/agenda/atividadesData.js';
import { NOTIFICACOES_EXEMPLO } from '@/modules/notificacoes/notificacoesData.js';
import { tocarSomNotificacao } from '@/rules/notificacoesRules.js';
import { verificarNotificacoesAmanha } from '@/rules/eventosRules.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [atividades, setAtividades] = useState(ATIVIDADES_EXEMPLO);
  const [notificacoes, setNotificacoes] = useState(NOTIFICACOES_EXEMPLO);
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);
  const { usuario } = useAuth();

  function mostrarToast(texto, tipo = 'info') {
    setToast({ texto, tipo, id: Date.now() });
  }

  function removerToast(id) {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
  }

  function adicionarToast(notif) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((atuais) => [...atuais, { ...notif, id }]);
    setTimeout(() => removerToast(id), 6000);
  }

  function gerarNotificacao(nova) {
    const agora = new Date();
    const notif = {
      id: String(Date.now()),
      data: 'Hoje',
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nova: true,
      lida: false,
      cor: nova.cor || '#1E5799',
      ...nova,
    };
    setNotificacoes((atuais) => [notif, ...atuais]);

    if (usuario && (nova.para === usuario.nome || nova.para === usuario.role)) {
      tocarSomNotificacao(nova.tipo);
      adicionarToast(notif);
    }
  }

  useEffect(() => {
    if (atividades.length > 0) {
      verificarNotificacoesAmanha(atividades, gerarNotificacao);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function marcarNotificacoesLidas() {
    setNotificacoes((atuais) => atuais.map((n) => ({ ...n, nova: false, lida: true })));
  }

  function criarAtividade(atividade) {
    setAtividades((atuais) => [{ id: String(Date.now()), status: 'programado', pendencias: '', ...atividade }, ...atuais]);
    mostrarToast('Atividade adicionada à agenda.', 'success');
  }

  function atualizarAtividade(id, patch) {
    setAtividades((atuais) => atuais.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    mostrarToast('Agenda atualizada.', 'success');
  }

  const value = useMemo(
    () => ({ atividades, setAtividades, notificacoes, gerarNotificacao, marcarNotificacoesLidas, criarAtividade, atualizarAtividade, toast, setToast, mostrarToast, toasts, removerToast }),
    [atividades, notificacoes, toast, toasts]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
