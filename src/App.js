import { useState, useEffect, useCallback } from "react";

// ─── INITIAL DATA ───────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: 1, nome: "Master Admin", email: "admin@matssa.com", senha: "admin123", perfil: "master", ativo: true },
  { id: 2, nome: "Henrique", email: "henrique@matssa.com", senha: "henrique123", perfil: "operador", ativo: true, permissoes: { materiais: true, ferramentas: true, precos: false, cadastros: false } },
  { id: 3, nome: "Carlos", email: "carlos@matssa.com", senha: "carlos123", perfil: "operador", ativo: true, permissoes: { materiais: true, ferramentas: true, precos: false, cadastros: false } },
];

const INITIAL_DESTINOS = [
  { id: 1, nome: "Matssa", tipo: "base" },
  { id: 2, nome: "Sr Danilo", tipo: "obra" },
  { id: 3, nome: "UP Brasil", tipo: "obra" },
  { id: 4, nome: "Sr Pedro Motel", tipo: "obra" },
  { id: 5, nome: "Hotsat", tipo: "parceiro" },
];

const INITIAL_MATERIAIS = [
  { id: 1, categoria: "Elétrico", descricao: "Cabo CA 10mm² preto", unidade: "m", quantidade: 50, estoqueMin: 40, localizacao: "A1", preco: 12.5 },
  { id: 2, categoria: "Elétrico", descricao: "Interruptor DR 2P 63A", unidade: "cx", quantidade: 6, estoqueMin: 5, localizacao: "B2", preco: 85.0 },
  { id: 3, categoria: "Elétrico", descricao: "Interruptor DR 3P 25A", unidade: "cx", quantidade: 6, estoqueMin: 5, localizacao: "B2", preco: 95.0 },
  { id: 4, categoria: "Infraestrutura", descricao: "Tampa cega 3/4'' cinza", unidade: "pç", quantidade: 26, estoqueMin: 20, localizacao: "B3", preco: 2.5 },
  { id: 5, categoria: "Fixação", descricao: "Abraçadeira de Nylon branca 3,6x150mm", unidade: "pct", quantidade: 1, estoqueMin: 4, localizacao: "A2", preco: 8.0 },
  { id: 6, categoria: "Fixação", descricao: "Abraçadeira de Nylon branca 3,6x300mm", unidade: "pct", quantidade: 1, estoqueMin: 4, localizacao: "A2", preco: 9.5 },
  { id: 7, categoria: "Fixação", descricao: "Abraçadeira PVC 3/4'' Branca", unidade: "pç", quantidade: 3, estoqueMin: 40, localizacao: "B4", preco: 1.2 },
  { id: 8, categoria: "Fixação", descricao: "Abraçadeira PVC 3/4'' Cinza", unidade: "pç", quantidade: 27, estoqueMin: 40, localizacao: "B4", preco: 1.2 },
  { id: 9, categoria: "Infraestrutura", descricao: "Adaptador/uniduts cinza 3/4\"", unidade: "pç", quantidade: 15, estoqueMin: 40, localizacao: "B3", preco: 3.5 },
  { id: 10, categoria: "Aterramento", descricao: "Caixa de Inspeção", unidade: "pç", quantidade: 4, estoqueMin: 7, localizacao: "C1", preco: 45.0 },
  { id: 11, categoria: "Solar", descricao: "Conector MC4 Y fêmea", unidade: "pç", quantidade: 1, estoqueMin: 7, localizacao: "A3", preco: 18.0 },
  { id: 12, categoria: "Elétrico", descricao: "Disjuntor Monopolar 25A", unidade: "cx", quantidade: 1, estoqueMin: 5, localizacao: "D1", preco: 42.0 },
  { id: 13, categoria: "Elétrico", descricao: "Disjuntor Monopolar 10A", unidade: "cx", quantidade: 13, estoqueMin: 5, localizacao: "D1", preco: 38.0 },
  { id: 14, categoria: "Elétrico", descricao: "Disjuntor Monopolar 16A", unidade: "cx", quantidade: 13, estoqueMin: 5, localizacao: "D1", preco: 40.0 },
  { id: 15, categoria: "Elétrico", descricao: "Disjuntor Tripolar 10A", unidade: "cx", quantidade: 29, estoqueMin: 5, localizacao: "D2", preco: 95.0 },
  { id: 16, categoria: "Elétrico", descricao: "Disjuntor Tripolar 32A", unidade: "cx", quantidade: 30, estoqueMin: 5, localizacao: "D2", preco: 105.0 },
  { id: 17, categoria: "Fixação", descricao: "Bucha S8", unidade: "cx", quantidade: 2, estoqueMin: 1, localizacao: "C2", preco: 12.0 },
  { id: 18, categoria: "Elétrico", descricao: "Cabo CA 16mm² Vermelho", unidade: "m", quantidade: 55, estoqueMin: 40, localizacao: "D3", preco: 16.5 },
  { id: 19, categoria: "Solar", descricao: "Cabo Solar CC 6mm² Vermelho", unidade: "m", quantidade: 70, estoqueMin: 50, localizacao: "D3", preco: 9.8 },
  { id: 20, categoria: "Elétrico", descricao: "Terminal tubular/ilhós", unidade: "pç", quantidade: 100, estoqueMin: 50, localizacao: "A4", preco: 0.8 },
  { id: 21, categoria: "Solar", descricao: "Conector MC4 Y macho", unidade: "pç", quantidade: 0, estoqueMin: 7, localizacao: "A3", preco: 18.0 },
  { id: 22, categoria: "Elétrico", descricao: "Disjuntor Monopolar 20A", unidade: "cx", quantidade: 0, estoqueMin: 5, localizacao: "D1", preco: 41.0 },
  { id: 23, categoria: "Isolação/Proteção", descricao: "Fita isolante antichama 10m preta", unidade: "pç", quantidade: 0, estoqueMin: 4, localizacao: "A5", preco: 6.5 },
  { id: 24, categoria: "Fixação", descricao: "Parafuso S8", unidade: "cx", quantidade: 0, estoqueMin: 1, localizacao: "C2", preco: 10.0 },
  { id: 25, categoria: "Elétrico", descricao: "Terminal de garfo", unidade: "pç", quantidade: 0, estoqueMin: 10, localizacao: "A4", preco: 1.0 },
  { id: 26, categoria: "Elétrico", descricao: "Interruptor DR 2P 25A", unidade: "cx", quantidade: 20, estoqueMin: 5, localizacao: "B2", preco: 78.0 },
  { id: 27, categoria: "Iluminação/Energia", descricao: "Lâmpada á vapor metálico 1000W", unidade: "pç", quantidade: 9, estoqueMin: 5, localizacao: "E1", preco: 125.0 },
  { id: 28, categoria: "Iluminação/Energia", descricao: "Reator 1000W demape", unidade: "pç", quantidade: 13, estoqueMin: 5, localizacao: "E1", preco: 180.0 },
];

const INITIAL_FERRAMENTAS = [
  { id: 1, descricao: "Maleta verde pequena", modelo: "Max Ferragens", status: "EM ESTOQUE", localizacao: "B1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 350, depreciacao: 10, dataCadastro: "2025-01-01" },
  { id: 2, descricao: "Alicate Rebitador", modelo: "Nove54", status: "EM ESTOQUE", localizacao: "B1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 120, depreciacao: 8, dataCadastro: "2025-01-01" },
  { id: 3, descricao: "Alicate de Crimpagem", modelo: "HSC8 6-4A", status: "EM ESTOQUE", localizacao: "B1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 95, depreciacao: 8, dataCadastro: "2025-01-01" },
  { id: 4, descricao: "Multimetro amarelo grande", modelo: "Bomvink", status: "EM ESTOQUE", localizacao: "B1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 280, depreciacao: 5, dataCadastro: "2025-01-01" },
  { id: 5, descricao: "Multimetro amarelo pequeno", modelo: "Hikari", status: "EM ESTOQUE", localizacao: "B1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 150, depreciacao: 5, dataCadastro: "2025-02-01" },
  { id: 6, descricao: "Martelete amarelo", modelo: "Bomvink", status: "EM ESTOQUE", localizacao: "C1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 680, depreciacao: 12, dataCadastro: "2025-01-15" },
  { id: 7, descricao: "Alicate Multiuso", modelo: "Rayco", status: "EM ESTOQUE", localizacao: "C1", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 85, depreciacao: 8, dataCadastro: "2025-01-15" },
  { id: 8, descricao: "Maleta verde grande", modelo: "Max Ferragens", status: "EM USO", localizacao: "D1", responsavel: "Carlos", destino: "Sr Danilo", dataRetirada: "2026-03-16", dataDevolucao: "2026-03-17", fotos: [], valorInicial: 480, depreciacao: 10, dataCadastro: "2025-01-01" },
  { id: 9, descricao: "Furadeira Amarela", modelo: "Tramontina", status: "EM USO", localizacao: "C1", responsavel: "Carlos", destino: "Sr Pedro Motel", dataRetirada: "2026-03-01", dataDevolucao: "2026-03-09", fotos: [], valorInicial: 520, depreciacao: 15, dataCadastro: "2025-02-01" },
  { id: 10, descricao: "Escada Vermelha 2 niveis", modelo: "-", status: "EM USO", localizacao: "D2", responsavel: "Carlos", destino: "UP Brasil", dataRetirada: "2026-04-01", dataDevolucao: "2026-05-01", fotos: [], valorInicial: 380, depreciacao: 8, dataCadastro: "2025-03-01" },
  { id: 11, descricao: "Alicate hidráulico", modelo: "-", status: "EM USO", localizacao: "D2", responsavel: "Carlos", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 450, depreciacao: 10, dataCadastro: "2025-01-01" },
  { id: 12, descricao: "Cinto de segurança EPI", modelo: "-", status: "EM ESTOQUE", localizacao: "B2", responsavel: "Henrique", destino: "Matssa", dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 220, depreciacao: 5, dataCadastro: "2025-01-01" },
];

const INITIAL_VENDAS = [];
const INITIAL_CATEGORIAS = ["Elétrico", "Infraestrutura", "Fixação", "Solar", "Aterramento", "Isolação/Proteção", "Iluminação/Energia"];
const INITIAL_UNIDADES = ["m", "cx", "pç", "pct", "rolo", "kg", "L", "un"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getSituacao(qtd, min) {
  if (qtd === 0) return "Zerado";
  if (qtd <= min / 3) return "Crítico";
  if (qtd <= min) return "Atenção";
  return "Normal";
}

function getStatusFerramenta(ferramenta) {
  if (ferramenta.status === "EM ESTOQUE") return null;
  if (!ferramenta.dataDevolucao) return null;
  const prazo = new Date(ferramenta.dataDevolucao);
  const hoje = new Date();
  const diffMs = prazo - hoje;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return "Atrasado";
  if (diffDias <= 2) return "Crítico";
  return "No Prazo";
}

function calcValorAtual(valorInicial, depreciacao, dataCadastro) {
  if (!dataCadastro) return valorInicial;
  const meses = Math.floor((new Date() - new Date(dataCadastro)) / (1000 * 60 * 60 * 24 * 30));
  const fator = Math.pow(1 - depreciacao / 100, meses);
  return Math.max(0, valorInicial * fator);
}

function statusBadge(s) {
  const map = {
    Normal: { bg: "#eaf3de", color: "#3b6d11", label: "Normal" },
    Atenção: { bg: "#faeeda", color: "#854f0b", label: "Atenção" },
    Crítico: { bg: "#fcebeb", color: "#a32d2d", label: "Crítico" },
    Zerado: { bg: "#f1efe8", color: "#5f5e5a", label: "Zerado" },
    "EM ESTOQUE": { bg: "#eaf3de", color: "#3b6d11", label: "Em Estoque" },
    "EM USO": { bg: "#e6f1fb", color: "#185fa5", label: "Em Uso" },
    Atrasado: { bg: "#fcebeb", color: "#a32d2d", label: "Atrasado" },
    "No Prazo": { bg: "#eaf3de", color: "#3b6d11", label: "No Prazo" },
  };
  const s2 = map[s] || { bg: "#f1efe8", color: "#5f5e5a", label: s };
  return (
    <span style={{ background: s2.bg, color: s2.color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {s2.label}
    </span>
  );
}

function useLocalData(key, initial) {
  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const save = useCallback((v) => { setData(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key]);
  return [data, save];
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 14, border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", padding: "24px 28px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", padding: "0 4px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>}
      <input {...props} style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)", ...props.style }} />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>}
      <select {...props} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, color = "default", small, style: s }) {
  const colors = {
    default: { bg: "var(--color-background-secondary)", border: "var(--color-border-secondary)", color: "var(--color-text-primary)" },
    primary: { bg: "#185fa5", border: "#185fa5", color: "#fff" },
    danger: { bg: "#fcebeb", border: "#f09595", color: "#a32d2d" },
    success: { bg: "#eaf3de", border: "#97c459", color: "#3b6d11" },
  };
  const c = colors[color] || colors.default;
  return (
    <button onClick={onClick} style={{ background: c.bg, border: `0.5px solid ${c.border}`, color: c.color, borderRadius: 8, padding: small ? "5px 12px" : "8px 18px", fontSize: small ? 13 : 14, cursor: "pointer", fontWeight: 500, ...s }}>
      {children}
    </button>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = () => {
    const u = users.find(u => u.email === email && u.senha === senha && u.ativo);
    if (u) { onLogin(u); setErro(""); }
    else setErro("Email ou senha incorretos.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, border: "0.5px solid var(--color-border-tertiary)", padding: "40px 48px", width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>MATSSA</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 32 }}>Sistema de Controle de Estoque</p>
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        <Input label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        {erro && <p style={{ color: "#a32d2d", fontSize: 13, marginBottom: 12 }}>{erro}</p>}
        <Btn onClick={handleLogin} color="primary" style={{ width: "100%" }}>Entrar</Btn>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 20 }}>Admin: admin@matssa.com / admin123</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ materiais, ferramentas }) {
  const situacoes = { Normal: 0, Atenção: 0, Crítico: 0, Zerado: 0 };
  materiais.forEach(m => { const s = getSituacao(m.quantidade, m.estoqueMin); situacoes[s]++; });

  const fStatus = { "EM ESTOQUE": 0, "EM USO": 0, Atrasado: 0 };
  ferramentas.forEach(f => {
    const st = getStatusFerramenta(f);
    if (st === "Atrasado") fStatus.Atrasado++;
    else fStatus[f.status]++;
  });

  const cards = [
    { label: "Normal", val: situacoes.Normal, bg: "#eaf3de", color: "#3b6d11" },
    { label: "Atenção", val: situacoes.Atenção, bg: "#faeeda", color: "#854f0b" },
    { label: "Crítico", val: situacoes.Crítico, bg: "#fcebeb", color: "#a32d2d" },
    { label: "Zerado", val: situacoes.Zerado, bg: "#f1efe8", color: "#5f5e5a" },
  ];

  const barMax = Math.max(...Object.values(situacoes), 1);

  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>Visão Geral</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 500, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 13, color: c.color, marginTop: 4 }}>Materiais {c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Situação do Estoque</h3>
          {cards.map(c => (
            <div key={c.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{c.label}</span><span style={{ color: c.color, fontWeight: 500 }}>{c.val}</span>
              </div>
              <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                <div style={{ height: 6, background: c.color, borderRadius: 3, width: `${(c.val / barMax) * 100}%`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Ferramentas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#eaf3de", borderRadius: 8 }}>
              <span style={{ fontSize: 14, color: "#3b6d11" }}>Em Estoque</span>
              <span style={{ fontWeight: 500, color: "#3b6d11" }}>{fStatus["EM ESTOQUE"]}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#e6f1fb", borderRadius: 8 }}>
              <span style={{ fontSize: 14, color: "#185fa5" }}>Em Uso</span>
              <span style={{ fontWeight: 500, color: "#185fa5" }}>{fStatus["EM USO"]}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#fcebeb", borderRadius: 8 }}>
              <span style={{ fontSize: 14, color: "#a32d2d" }}>Atrasadas</span>
              <span style={{ fontWeight: 500, color: "#a32d2d" }}>{fStatus.Atrasado}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Materiais críticos e zerados</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {["Descrição", "Categoria", "Qtd", "Mín", "Situação"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materiais.filter(m => ["Crítico", "Zerado"].includes(getSituacao(m.quantidade, m.estoqueMin))).slice(0, 10).map(m => (
                <tr key={m.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "8px 12px" }}>{m.descricao}</td>
                  <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>{m.categoria}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{m.quantidade}</td>
                  <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>{m.estoqueMin}</td>
                  <td style={{ padding: "8px 12px" }}>{statusBadge(getSituacao(m.quantidade, m.estoqueMin))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MATERIAIS ────────────────────────────────────────────────────────────────
function MateriaisTab({ materiais, setMateriais, categorias, unidades, usuario }) {
  const [busca, setBusca] = useState("");
  const [filtroSit, setFiltroSit] = useState("Todos");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [form, setForm] = useState({});

  const canEdit = usuario.perfil === "master" || usuario.permissoes?.materiais;

  const filtrados = materiais.filter(m => {
    const s = getSituacao(m.quantidade, m.estoqueMin);
    const matchSit = filtroSit === "Todos" || s === filtroSit;
    const matchCat = filtroCat === "Todas" || m.categoria === filtroCat;
    const matchBusca = !busca || m.descricao.toLowerCase().includes(busca.toLowerCase());
    return matchSit && matchCat && matchBusca;
  });

  const openAdd = () => { setForm({ categoria: categorias[0], unidade: unidades[0], quantidade: 0, estoqueMin: 0, localizacao: "", descricao: "", preco: 0 }); setModalAdd(true); };
  const openEdit = m => { setForm({ ...m }); setModalEdit(m.id); };

  const salvar = () => {
    if (modalEdit) {
      setMateriais(materiais.map(m => m.id === modalEdit ? { ...m, ...form } : m));
      setModalEdit(null);
    } else {
      setMateriais([...materiais, { ...form, id: Date.now(), quantidade: Number(form.quantidade), estoqueMin: Number(form.estoqueMin), preco: Number(form.preco) }]);
      setModalAdd(false);
    }
  };

  const remover = id => { if (window.confirm("Remover este material?")) setMateriais(materiais.filter(m => m.id !== id)); };

  const ajustarQtd = (id, delta) => {
    setMateriais(materiais.map(m => m.id === id ? { ...m, quantidade: Math.max(0, m.quantidade + delta) } : m));
  };

  const formFields = (
    <>
      <Select label="Categoria" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} options={categorias} />
      <Input label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
      <Select label="Unidade" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} options={unidades} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Quantidade" type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
        <Input label="Estoque Mínimo" type="number" value={form.estoqueMin} onChange={e => setForm({ ...form, estoqueMin: Number(e.target.value) })} />
      </div>
      <Input label="Localização" value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: A1, B2, C1..." />
      <Input label="Preço (R$)" type="number" value={form.preco} onChange={e => setForm({ ...form, preco: Number(e.target.value) })} />
    </>
  );

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Materiais — MATSSA</h2>
        {canEdit && <Btn onClick={openAdd} color="primary">+ Adicionar material</Btn>}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar descrição..." style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          {["Todos", "Normal", "Atenção", "Crítico", "Zerado"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          <option>Todas</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Categoria", "Descrição", "Un.", "Localização", "Qtd", "Mín", "Situação", ...(canEdit ? ["Ações"] : [])].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(m => {
              const sit = getSituacao(m.quantidade, m.estoqueMin);
              return (
                <tr key={m.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{m.categoria}</td>
                  <td style={{ padding: "9px 12px", fontWeight: 500 }}>{m.descricao}</td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{m.unidade}</td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{m.localizacao}</td>
                  <td style={{ padding: "9px 12px" }}>
                    {canEdit ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => ajustarQtd(m.id, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--color-text-primary)" }}>−</button>
                        <span style={{ minWidth: 28, textAlign: "center", fontWeight: 500 }}>{m.quantidade}</span>
                        <button onClick={() => ajustarQtd(m.id, 1)} style={{ width: 22, height: 22, borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--color-text-primary)" }}>+</button>
                      </div>
                    ) : <span style={{ fontWeight: 500 }}>{m.quantidade}</span>}
                  </td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{m.estoqueMin}</td>
                  <td style={{ padding: "9px 12px" }}>{statusBadge(sit)}</td>
                  {canEdit && (
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn small onClick={() => openEdit(m)}>Editar</Btn>
                        <Btn small color="danger" onClick={() => remover(m.id)}>Remover</Btn>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 32 }}>Nenhum material encontrado.</p>}
      </div>

      <Modal open={modalAdd} onClose={() => setModalAdd(false)} title="Adicionar Material">
        {formFields}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn onClick={() => setModalAdd(false)}>Cancelar</Btn>
          <Btn color="primary" onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>

      <Modal open={!!modalEdit} onClose={() => setModalEdit(null)} title="Editar Material">
        {formFields}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn onClick={() => setModalEdit(null)}>Cancelar</Btn>
          <Btn color="primary" onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── FERRAMENTAS ──────────────────────────────────────────────────────────────
function FerramentasTab({ ferramentas, setFerramentas, destinos, usuarios, usuario }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroDestino, setFiltroDestino] = useState("Todos");
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalFoto, setModalFoto] = useState(null);
  const [form, setForm] = useState({});

  const canEdit = usuario.perfil === "master" || usuario.permissoes?.ferramentas;

  const filtradas = ferramentas.filter(f => {
    const st = getStatusFerramenta(f);
    const statusLabel = st === "Atrasado" ? "Atrasado" : f.status;
    const matchStatus = filtroStatus === "Todos" || statusLabel === filtroStatus;
    const matchDestino = filtroDestino === "Todos" || f.destino === filtroDestino;
    const matchBusca = !busca || f.descricao.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchDestino && matchBusca;
  });

  const baseForm = { descricao: "", modelo: "", status: "EM ESTOQUE", localizacao: "", responsavel: "", destino: destinos[0]?.nome || "", dataRetirada: "", dataDevolucao: "", fotos: [], valorInicial: 0, depreciacao: 10, dataCadastro: new Date().toISOString().slice(0, 10) };
  const openAdd = () => { setForm(baseForm); setModalAdd(true); };
  const openEdit = f => { setForm({ ...f }); setModalEdit(f.id); };

  const salvar = () => {
    if (modalEdit) {
      setFerramentas(ferramentas.map(f => f.id === modalEdit ? { ...f, ...form } : f));
      setModalEdit(null);
    } else {
      setFerramentas([...ferramentas, { ...form, id: Date.now() }]);
      setModalAdd(false);
    }
  };

  const remover = id => { if (window.confirm("Remover esta ferramenta?")) setFerramentas(ferramentas.filter(f => f.id !== id)); };

  const formFields = (
    <>
      <Input label="Descrição" value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} />
      <Input label="Modelo" value={form.modelo || ""} onChange={e => setForm({ ...form, modelo: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Status" value={form.status || "EM ESTOQUE"} onChange={e => setForm({ ...form, status: e.target.value })} options={["EM ESTOQUE", "EM USO"]} />
        <Input label="Localização" value={form.localizacao || ""} onChange={e => setForm({ ...form, localizacao: e.target.value })} />
      </div>
      <Select label="Responsável" value={form.responsavel || ""} onChange={e => setForm({ ...form, responsavel: e.target.value })} options={["", ...usuarios.filter(u => u.ativo).map(u => u.nome)]} />
      <Select label="Destino" value={form.destino || ""} onChange={e => setForm({ ...form, destino: e.target.value })} options={["", ...destinos.map(d => d.nome)]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Data de retirada" type="date" value={form.dataRetirada || ""} onChange={e => setForm({ ...form, dataRetirada: e.target.value })} />
        <Input label="Data de devolução (prazo)" type="date" value={form.dataDevolucao || ""} onChange={e => setForm({ ...form, dataDevolucao: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Input label="Valor inicial (R$)" type="number" value={form.valorInicial || 0} onChange={e => setForm({ ...form, valorInicial: Number(e.target.value) })} />
        <Input label="Depreciação (%/mês)" type="number" value={form.depreciacao || 0} onChange={e => setForm({ ...form, depreciacao: Number(e.target.value) })} />
        <Input label="Data de cadastro" type="date" value={form.dataCadastro || ""} onChange={e => setForm({ ...form, dataCadastro: e.target.value })} />
      </div>
    </>
  );

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Ferramentas — MATSSA</h2>
        {canEdit && <Btn onClick={openAdd} color="primary">+ Adicionar ferramenta</Btn>}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ferramenta..." style={{ flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          {["Todos", "EM ESTOQUE", "EM USO", "Atrasado"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          <option>Todos</option>
          {destinos.map(d => <option key={d.id}>{d.nome}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Descrição", "Modelo", "Local", "Responsável", "Destino", "Devolução", "Controle", "Valor Atual", ...(canEdit ? ["Ações"] : [])].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map(f => {
              const st = getStatusFerramenta(f);
              const valorAtual = calcValorAtual(f.valorInicial, f.depreciacao, f.dataCadastro);
              return (
                <tr key={f.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 500 }}>
                    <div>{f.descricao}</div>
                    {f.fotos?.length > 0 && (
                      <button onClick={() => setModalFoto(f)} style={{ fontSize: 11, color: "#185fa5", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
                        📷 {f.fotos.length} foto(s)
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{f.modelo}</td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{f.localizacao}</td>
                  <td style={{ padding: "9px 12px" }}>{f.responsavel}</td>
                  <td style={{ padding: "9px 12px" }}>{f.destino}</td>
                  <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{f.dataDevolucao || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {statusBadge(f.status)}
                      {st && st !== "No Prazo" && statusBadge(st)}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 500, color: valorAtual < f.valorInicial * 0.3 ? "#a32d2d" : "var(--color-text-primary)" }}>
                    R$ {valorAtual.toFixed(2)}
                  </td>
                  {canEdit && (
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn small onClick={() => openEdit(f)}>Editar</Btn>
                        <Btn small color="danger" onClick={() => remover(f.id)}>Remover</Btn>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtradas.length === 0 && <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 32 }}>Nenhuma ferramenta encontrada.</p>}
      </div>

      <Modal open={modalAdd} onClose={() => setModalAdd(false)} title="Adicionar Ferramenta" width={600}>
        {formFields}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn onClick={() => setModalAdd(false)}>Cancelar</Btn>
          <Btn color="primary" onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>

      <Modal open={!!modalEdit} onClose={() => setModalEdit(null)} title="Editar Ferramenta" width={600}>
        {formFields}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn onClick={() => setModalEdit(null)}>Cancelar</Btn>
          <Btn color="primary" onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>

      <Modal open={!!modalFoto} onClose={() => setModalFoto(null)} title={`Fotos — ${modalFoto?.descricao}`}>
        {modalFoto?.fotos?.map((f, i) => (
          <div key={i} style={{ marginBottom: 12, borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", padding: 12 }}>
            <img src={f.url} alt={f.descricao} style={{ width: "100%", borderRadius: 6, marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{f.descricao}</p>
          </div>
        ))}
      </Modal>
    </div>
  );
}

// ─── POR DESTINO ──────────────────────────────────────────────────────────────
function PorDestinoTab({ ferramentas, destinos }) {
  const [destSel, setDestSel] = useState(destinos[0]?.nome || "");

  const ferrsDest = ferramentas.filter(f => f.destino === destSel);

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Ferramentas por Destino</h2>
        <select value={destSel} onChange={e => setDestSel(e.target.value)} style={{ padding: "8px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          {destinos.map(d => <option key={d.id}>{d.nome}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{ferrsDest.length}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Total de ferramentas</div>
        </div>
        <div style={{ background: "#eaf3de", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#3b6d11" }}>{ferrsDest.filter(f => f.status === "EM ESTOQUE").length}</div>
          <div style={{ fontSize: 13, color: "#3b6d11", marginTop: 2 }}>Em estoque</div>
        </div>
        <div style={{ background: "#e6f1fb", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#185fa5" }}>{ferrsDest.filter(f => f.status === "EM USO").length}</div>
          <div style={{ fontSize: 13, color: "#185fa5", marginTop: 2 }}>Em uso</div>
        </div>
        <div style={{ background: "#fcebeb", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#a32d2d" }}>{ferrsDest.filter(f => getStatusFerramenta(f) === "Atrasado").length}</div>
          <div style={{ fontSize: 13, color: "#a32d2d", marginTop: 2 }}>Atrasadas</div>
        </div>
      </div>

      {ferrsDest.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: 32 }}>Nenhuma ferramenta neste destino.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
          {ferrsDest.map(f => {
            const st = getStatusFerramenta(f);
            return (
              <div key={f.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>{f.descricao}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>{f.modelo} · {f.localizacao}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {statusBadge(f.status)}
                  {st && st !== "No Prazo" && statusBadge(st)}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Responsável: {f.responsavel || "—"}<br />
                  Devolução: {f.dataDevolucao || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PREÇOS / VENDA ───────────────────────────────────────────────────────────
function PrecosTab({ materiais, setMateriais, vendas, setVendas, usuario }) {
  const [aba, setAba] = useState("nova");
  const [itens, setItens] = useState([]);
  const [matSel, setMatSel] = useState("");
  const [qtdSel, setQtdSel] = useState(1);
  const [tipoVenda, setTipoVenda] = useState("Venda");
  const [comprador, setComprador] = useState("");
  const [obs, setObs] = useState("");
  const [modalNF, setModalNF] = useState(null);

  const canEdit = usuario.perfil === "master" || usuario.permissoes?.precos || true;

  const addItem = () => {
    const mat = materiais.find(m => m.id === Number(matSel));
    if (!mat || qtdSel <= 0) return;
    if (qtdSel > mat.quantidade) { alert(`Quantidade insuficiente! Disponível: ${mat.quantidade} ${mat.unidade}`); return; }
    const existe = itens.find(i => i.matId === mat.id);
    if (existe) {
      setItens(itens.map(i => i.matId === mat.id ? { ...i, qtd: i.qtd + qtdSel } : i));
    } else {
      setItens([...itens, { matId: mat.id, descricao: mat.descricao, unidade: mat.unidade, qtd: qtdSel, preco: mat.preco }]);
    }
    setQtdSel(1);
  };

  const removeItem = idx => setItens(itens.filter((_, i) => i !== idx));

  const total = itens.reduce((acc, i) => acc + i.qtd * i.preco, 0);

  const finalizar = () => {
    if (itens.length === 0) { alert("Adicione pelo menos um item."); return; }
    const venda = {
      id: Date.now(),
      data: new Date().toISOString().slice(0, 10),
      tipo: tipoVenda,
      comprador,
      obs,
      itens: [...itens],
      total,
      usuario: usuario.nome,
    };
    setVendas([...vendas, venda]);
    setMateriais(materiais.map(m => {
      const item = itens.find(i => i.matId === m.id);
      if (item) return { ...m, quantidade: m.quantidade - item.qtd };
      return m;
    }));
    setModalNF(venda);
    setItens([]);
    setComprador("");
    setObs("");
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>Preços & Vendas</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {[["nova", "Nova Venda/Retirada"], ["historico", "Histórico"]].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: aba === k ? "2px solid #185fa5" : "2px solid transparent", color: aba === k ? "#185fa5" : "var(--color-text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: aba === k ? 500 : 400, marginBottom: -1 }}>
            {l}
          </button>
        ))}
      </div>

      {aba === "nova" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Adicionar itens</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select value={matSel} onChange={e => setMatSel(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
                <option value="">Selecionar material...</option>
                {materiais.filter(m => m.quantidade > 0).map(m => (
                  <option key={m.id} value={m.id}>{m.descricao} (Disponível: {m.quantidade} {m.unidade}) — R$ {m.preco.toFixed(2)}</option>
                ))}
              </select>
              <input type="number" min={1} value={qtdSel} onChange={e => setQtdSel(Number(e.target.value))} style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
              <Btn onClick={addItem} color="primary">Adicionar</Btn>
            </div>

            {itens.length > 0 && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      {["Descrição", "Un.", "Qtd", "Preço", "Total", ""].map(h => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                        <td style={{ padding: "9px 12px" }}>{item.descricao}</td>
                        <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{item.unidade}</td>
                        <td style={{ padding: "9px 12px" }}>{item.qtd}</td>
                        <td style={{ padding: "9px 12px" }}>R$ {item.preco.toFixed(2)}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 500 }}>R$ {(item.qtd * item.preco).toFixed(2)}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#a32d2d", cursor: "pointer", fontSize: 16 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", alignSelf: "start" }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Resumo</h3>
            <Select label="Tipo" value={tipoVenda} onChange={e => setTipoVenda(e.target.value)} options={["Venda", "Retirada para consumo próprio", "Transferência"]} />
            <Input label="Comprador / Destino" value={comprador} onChange={e => setComprador(e.target.value)} />
            <Input label="Observações" value={obs} onChange={e => setObs(e.target.value)} />
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                <span>Itens</span><span>{itens.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 500 }}>
                <span>Total</span><span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
            <Btn color="primary" onClick={finalizar} style={{ width: "100%" }}>Gerar Nota Fiscal</Btn>
          </div>
        </div>
      )}

      {aba === "historico" && (
        <div>
          {vendas.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: 32 }}>Nenhuma venda registrada ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...vendas].reverse().map(v => (
                <div key={v.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{v.tipo} — {v.comprador || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{v.data} · por {v.usuario}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>R$ {v.total.toFixed(2)}</div>
                      <button onClick={() => setModalNF(v)} style={{ fontSize: 12, color: "#185fa5", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Ver nota</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{v.itens.length} item(ns)</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!modalNF} onClose={() => setModalNF(null)} title="Nota Fiscal" width={500}>
        {modalNF && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 22, fontWeight: 500 }}>MATSSA</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Nota de {modalNF.tipo}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{modalNF.data} · por {modalNF.usuario}</div>
            </div>
            {modalNF.comprador && <p style={{ fontSize: 13, marginBottom: 16 }}>Comprador/Destino: <strong>{modalNF.comprador}</strong></p>}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Descrição", "Qtd", "Un.", "Unitário", "Total"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modalNF.itens.map((item, i) => (
                  <tr key={i} style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                    <td style={{ padding: "8px 10px" }}>{item.descricao}</td>
                    <td style={{ padding: "8px 10px" }}>{item.qtd}</td>
                    <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)" }}>{item.unidade}</td>
                    <td style={{ padding: "8px 10px" }}>R$ {item.preco.toFixed(2)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>R$ {(item.qtd * item.preco).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 16, fontWeight: 500, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12 }}>
              Total: R$ {modalNF.total.toFixed(2)}
            </div>
            {modalNF.obs && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 12 }}>Obs: {modalNF.obs}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function ConfigTab({ usuarios, setUsuarios, destinos, setDestinos, categorias, setCategorias, unidades, setUnidades }) {
  const [aba, setAba] = useState("usuarios");
  const [modalUser, setModalUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formUser, setFormUser] = useState({});
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("");
  const [novoDestino, setNovoDestino] = useState({ nome: "", tipo: "obra" });

  const abrirAddUser = () => {
    setFormUser({ nome: "", email: "", senha: "", perfil: "operador", ativo: true, permissoes: { materiais: true, ferramentas: true, precos: false, cadastros: false } });
    setEditUser(null);
    setModalUser(true);
  };

  const abrirEditUser = u => {
    setFormUser({ ...u, permissoes: u.permissoes || {} });
    setEditUser(u.id);
    setModalUser(true);
  };

  const salvarUser = () => {
    if (editUser) {
      setUsuarios(usuarios.map(u => u.id === editUser ? { ...u, ...formUser } : u));
    } else {
      setUsuarios([...usuarios, { ...formUser, id: Date.now() }]);
    }
    setModalUser(false);
  };

  const toggleUser = id => setUsuarios(usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  const removeUser = id => { if (window.confirm("Remover usuário?")) setUsuarios(usuarios.filter(u => u.id !== id)); };

  const addDestino = () => {
    if (!novoDestino.nome.trim()) return;
    setDestinos([...destinos, { id: Date.now(), ...novoDestino }]);
    setNovoDestino({ nome: "", tipo: "obra" });
  };

  const abas = [["usuarios", "Usuários"], ["destinos", "Destinos"], ["categorias", "Categorias"], ["unidades", "Unidades"]];

  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>Configurações</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--color-background-secondary)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {abas.map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ padding: "8px 18px", background: aba === k ? "var(--color-background-primary)" : "none", border: aba === k ? "0.5px solid var(--color-border-tertiary)" : "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: aba === k ? 500 : 400, color: "var(--color-text-primary)" }}>
            {l}
          </button>
        ))}
      </div>

      {aba === "usuarios" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Usuários Cadastrados</h3>
            <Btn color="primary" onClick={abrirAddUser}>+ Novo usuário</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {usuarios.map(u => (
              <div key={u.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{u.nome} <span style={{ fontSize: 12, background: u.perfil === "master" ? "#e6f1fb" : "#eaf3de", color: u.perfil === "master" ? "#185fa5" : "#3b6d11", padding: "2px 8px", borderRadius: 10, marginLeft: 6 }}>{u.perfil}</span></div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{u.email}</div>
                  {u.perfil !== "master" && (
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                      Permissões: {["materiais", "ferramentas", "precos", "cadastros"].filter(p => u.permissoes?.[p]).join(", ") || "nenhuma"}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {statusBadge(u.ativo ? "Normal" : "Zerado")}
                  <Btn small onClick={() => abrirEditUser(u)}>Editar</Btn>
                  <Btn small onClick={() => toggleUser(u.id)}>{u.ativo ? "Desativar" : "Ativar"}</Btn>
                  {u.perfil !== "master" && <Btn small color="danger" onClick={() => removeUser(u.id)}>Remover</Btn>}
                </div>
              </div>
            ))}
          </div>

          <Modal open={modalUser} onClose={() => setModalUser(false)} title={editUser ? "Editar Usuário" : "Novo Usuário"}>
            <Input label="Nome completo" value={formUser.nome || ""} onChange={e => setFormUser({ ...formUser, nome: e.target.value })} />
            <Input label="Email" type="email" value={formUser.email || ""} onChange={e => setFormUser({ ...formUser, email: e.target.value })} />
            <Input label="Senha" type="password" value={formUser.senha || ""} onChange={e => setFormUser({ ...formUser, senha: e.target.value })} />
            <Select label="Perfil" value={formUser.perfil || "operador"} onChange={e => setFormUser({ ...formUser, perfil: e.target.value })} options={[{ value: "master", label: "Master (acesso total)" }, { value: "operador", label: "Operador (permissões customizadas)" }]} />
            {formUser.perfil === "operador" && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Permissões</p>
                {["materiais", "ferramentas", "precos", "cadastros"].map(p => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={!!formUser.permissoes?.[p]} onChange={e => setFormUser({ ...formUser, permissoes: { ...formUser.permissoes, [p]: e.target.checked } })} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Btn onClick={() => setModalUser(false)}>Cancelar</Btn>
              <Btn color="primary" onClick={salvarUser}>Salvar</Btn>
            </div>
          </Modal>
        </div>
      )}

      {aba === "destinos" && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Destinos cadastrados</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={novoDestino.nome} onChange={e => setNovoDestino({ ...novoDestino, nome: e.target.value })} placeholder="Nome do destino..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            <select value={novoDestino.tipo} onChange={e => setNovoDestino({ ...novoDestino, tipo: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
              {["obra", "base", "parceiro", "cliente"].map(t => <option key={t}>{t}</option>)}
            </select>
            <Btn color="primary" onClick={addDestino}>Adicionar</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {destinos.map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8 }}>
                <span style={{ fontWeight: 500 }}>{d.nome} <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 400 }}>({d.tipo})</span></span>
                <Btn small color="danger" onClick={() => setDestinos(destinos.filter(x => x.id !== d.id))}>Remover</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === "categorias" && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Categorias de materiais</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Nova categoria..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            <Btn color="primary" onClick={() => { if (novaCategoria.trim()) { setCategorias([...categorias, novaCategoria.trim()]); setNovaCategoria(""); } }}>Adicionar</Btn>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categorias.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#e6f1fb", borderRadius: 20 }}>
                <span style={{ fontSize: 13, color: "#185fa5" }}>{c}</span>
                <button onClick={() => setCategorias(categorias.filter(x => x !== c))} style={{ background: "none", border: "none", color: "#185fa5", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === "unidades" && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Unidades de medida</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={novaUnidade} onChange={e => setNovaUnidade(e.target.value)} placeholder="Nova unidade..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            <Btn color="primary" onClick={() => { if (novaUnidade.trim()) { setUnidades([...unidades, novaUnidade.trim()]); setNovaUnidade(""); } }}>Adicionar</Btn>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unidades.map(u => (
              <div key={u} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#eaf3de", borderRadius: 20 }}>
                <span style={{ fontSize: 13, color: "#3b6d11" }}>{u}</span>
                <button onClick={() => setUnidades(unidades.filter(x => x !== u))} style={{ background: "none", border: "none", color: "#3b6d11", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [usuarios, setUsuarios] = useLocalData("matssa_usuarios", INITIAL_USERS);
  const [materiais, setMateriais] = useLocalData("matssa_materiais", INITIAL_MATERIAIS);
  const [ferramentas, setFerramentas] = useLocalData("matssa_ferramentas", INITIAL_FERRAMENTAS);
  const [destinos, setDestinos] = useLocalData("matssa_destinos", INITIAL_DESTINOS);
  const [categorias, setCategorias] = useLocalData("matssa_categorias", INITIAL_CATEGORIAS);
  const [unidades, setUnidades] = useLocalData("matssa_unidades", INITIAL_UNIDADES);
  const [vendas, setVendas] = useLocalData("matssa_vendas", INITIAL_VENDAS);
  const [usuario, setUsuario] = useState(null);
  const [aba, setAba] = useState("dashboard");
  const [menuAberto, setMenuAberto] = useState(true);

  const isMaster = usuario?.perfil === "master";

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard", sempre: true },
    { key: "materiais", label: "Materiais", icon: "ti-package", sempre: true },
    { key: "ferramentas", label: "Ferramentas", icon: "ti-tool", sempre: true },
    { key: "destinos_view", label: "Por Destino", icon: "ti-map-pin", sempre: true },
    { key: "precos", label: "Preços & Vendas", icon: "ti-receipt", sempre: true },
    { key: "config", label: "Configurações", icon: "ti-settings", master: true },
  ];

  if (!usuario) return <LoginScreen users={usuarios} onLogin={setUsuario} />;

  const renderContent = () => {
    switch (aba) {
      case "dashboard": return <Dashboard materiais={materiais} ferramentas={ferramentas} />;
      case "materiais": return <MateriaisTab materiais={materiais} setMateriais={setMateriais} categorias={categorias} unidades={unidades} usuario={usuario} />;
      case "ferramentas": return <FerramentasTab ferramentas={ferramentas} setFerramentas={setFerramentas} destinos={destinos} usuarios={usuarios} usuario={usuario} />;
      case "destinos_view": return <PorDestinoTab ferramentas={ferramentas} destinos={destinos} />;
      case "precos": return <PrecosTab materiais={materiais} setMateriais={setMateriais} vendas={vendas} setVendas={setVendas} usuario={usuario} />;
      case "config": return isMaster ? <ConfigTab usuarios={usuarios} setUsuarios={setUsuarios} destinos={destinos} setDestinos={setDestinos} categorias={categorias} setCategorias={setCategorias} unidades={unidades} setUnidades={setUnidades} /> : null;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      <div style={{ width: menuAberto ? 220 : 60, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", transition: "width .2s", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <div style={{ padding: menuAberto ? "20px 20px 16px" : "20px 12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {menuAberto && <div><div style={{ fontWeight: 500, fontSize: 16 }}>MATSSA</div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Estoque</div></div>}
          <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, padding: 4 }}>
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.filter(n => n.sempre || (n.master && isMaster)).map(n => (
            <button key={n.key} onClick={() => setAba(n.key)} title={!menuAberto ? n.label : undefined} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: aba === n.key ? "var(--color-background-secondary)" : "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: 14, color: aba === n.key ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: aba === n.key ? 500 : 400, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden" }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
              {menuAberto && n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", overflow: "hidden" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#185fa5", flexShrink: 0 }}>
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
            {menuAberto && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{usuario.nome}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{usuario.perfil}</div>
              </div>
            )}
          </div>
          <button onClick={() => setUsuario(null)} title="Sair" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)", borderRadius: 8, marginTop: 4 }}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} aria-hidden="true" />
            {menuAberto && "Sair"}
          </button>
        </div>
      </div>

      <main style={{ flex: 1, padding: "0 32px 40px", minWidth: 0 }}>
        {renderContent()}
      </main>
    </div>
  );
}