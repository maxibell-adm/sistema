import { useState } from 'react';
import { usuarioPorRole } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';
import { useObrasContext } from '@/modules/obras/ObrasContext.jsx';
import Button from '@/modules/ui/Button.jsx';
import Modal from '@/modules/ui/Modal.jsx';

export default function ModalLiberarProjeto({ obra, onClose }) {
  const [obs, setObs] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [condicaoCiente, setCondicaoCiente] = useState(false);
  const { avancarEtapa, atualizarObra, gerarNotificacao, anexarArquivo } = useObrasContext();
  const { usuario } = useAuth();
  const operacional = usuarioPorRole('operacional')?.nome || 'Operacional';
  const temCondicaoEspecial = obra.condicaoEspecial?.ativa === true;

  function confirmar() {
    if (temCondicaoEspecial && !condicaoCiente) {
      return setErro('Confirme que a condição especial foi verificada antes de liberar.');
    }
    if (nomeArquivo.trim()) {
      anexarArquivo(obra.id, nomeArquivo.trim(), usuario);
    }
    const res = avancarEtapa(obra.id, 'compras', obs || 'Projeto liberado.', usuario);
    if (!res.ok) return setErro(res.erro);
    atualizarObra(obra.id, { responsavel: operacional });
    gerarNotificacao({
      para: operacional,
      texto: `${usuario.nome} liberou o projeto de ${obra.pp} para compras.`,
      tipo: 'sucesso',
      obraId: obra.id,
    });
    onClose();
  }

  return (
    <Modal
      titulo="Liberar Projeto para Compras"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" disabled={temCondicaoEspecial && !condicaoCiente} onClick={confirmar}>Liberar para Compras</Button></>}
    >
      <p className="fs-13 mb-16">O projeto sera enviado para <strong>{operacional}</strong> iniciar as compras.</p>
      {temCondicaoEspecial && (
        <div style={{
          background: '#FFF7ED',
          border: '1px solid #F59E0B',
          borderLeft: '4px solid #F59E0B',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
        }}>
          <div style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 6 }}>
            ⚠ Condição especial ativa
          </div>
          <div style={{ fontSize: 13, color: 'var(--cinza-escuro)', marginBottom: 6 }}>
            {obra.condicaoEspecial.texto}
          </div>
          <div className="fs-11 text-muted mb-10">
            Registrada em {obra.condicaoEspecial.registradaEm || '-'} por {obra.condicaoEspecial.registradaPor || '-'}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--cinza-escuro)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={condicaoCiente}
              onChange={(e) => { setCondicaoCiente(e.target.checked); setErro(''); }}
            />
            <span>Confirmo que verifiquei e contemplei esta condição especial no projeto.</span>
          </label>
        </div>
      )}
      <div className="form-field full mb-16">
        <label>Anexar arquivo do projeto (recomendado)</label>
        <div className="upload-simulado">
          <input
            placeholder="Nome do arquivo (ex: Projeto_Final_PP-9082.pdf)"
            value={nomeArquivo}
            onChange={(e) => setNomeArquivo(e.target.value)}
          />
          <small className="text-muted">Apos liberar, novos anexos dependem do retorno da obra.</small>
        </div>
      </div>
      <div className="form-field full">
        <label>Observacao para compras (opcional)</label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Alguma observacao importante sobre este projeto?"
        />
      </div>
      {erro && <div className="badge badge-vencido mt-8">{erro}</div>}
    </Modal>
  );
}
