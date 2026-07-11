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
  const { avancarEtapa, atualizarObra, gerarNotificacao, anexarArquivo } = useObrasContext();
  const { usuario } = useAuth();
  const operacional = usuarioPorRole('operacional')?.nome || 'Operacional';

  function confirmar() {
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
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="success" onClick={confirmar}>Liberar para Compras</Button></>}
    >
      <p className="fs-13 mb-16">O projeto sera enviado para <strong>{operacional}</strong> iniciar as compras.</p>
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
