import { useNavigate } from 'react-router-dom';
import { carregarUsuarios } from '@/config/usuarios.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const usuarios = carregarUsuarios().filter((u) => u.ativo);

  function entrar(usuario) {
    login(usuario.id, usuario);
    navigate('/');
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="login-logo">MAXIBELL</div>
          <div className="login-slogan">O máximo da beleza em esquadrias</div>
          <div className="login-subtitulo">Central Operacional de Obras</div>
        </div>
        <div className="login-body">
          <div className="login-instrucao">Selecione seu perfil de acesso</div>
          <div className="perfis-grid">
            {usuarios.map((perfil) => (
              <button className="perfil-btn" key={perfil.id} onClick={() => entrar(perfil)}>
                <span className="perfil-avatar" style={{ background: perfil.cor }}>{perfil.avatar}</span>
                <span>
                  <div className="perfil-nome">{perfil.nome}</div>
                  <div className="perfil-cargo">{perfil.cargo}</div>
                </span>
              </button>
            ))}
          </div>
          <div className="login-aviso">MVP local com sessão em localStorage. Firebase entra na próxima fase.</div>
        </div>
      </section>
    </main>
  );
}

