import React, { useState, useCallback, useRef, useMemo, useEffect, Fragment } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ebgimanyxvnnjexyante.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2ltYW55eHZubmpleHlhbnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTIyNTQsImV4cCI6MjA5NDk2ODI1NH0.qbC9RrBpwQaAPp7DhnEGtLmLxsdXqA2eYNZgadx2TTI";
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getSit = (q, m) => q === 0 ? "Zerado" : q <= m / 3 ? "Crítico" : q <= m ? "Atenção" : "Normal";
const getCtrl = f => {
  if (f.status === "EM ESTOQUE" || !f.dataDevolucao) return null;
  const d = Math.ceil((new Date(f.dataDevolucao) - new Date()) / 864e5);
  return d < 0 ? "Atrasado" : d <= 2 ? "Crítico" : "No Prazo";
};
const calcVal = (vi, dep, dc) => { if (!dc || !vi) return vi || 0; const m = Math.floor((Date.now() - new Date(dc)) / (864e5 * 30)); return Math.max(0, vi * Math.pow(1 - dep / 100, m)); };
const genCod = (p, list) => { const nums = list.map(x => { const m = x.codigo?.match(/\d+$/); return m ? parseInt(m[0]) : 0; }); return `${p}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`; };
const genCodGlobal = (prefix, materiais, ferramentas) => {
  const todos = [...materiais, ...ferramentas];
  const nums = todos.map(x => { const m = x.codigo?.match(/\d+$/); return m ? parseInt(m[0]) : 0; });
  const max = nums.length ? Math.max(...nums) : 0;
  let n = max + 1;
  while (todos.some(x => x.codigo === `${prefix}${String(n).padStart(3, "0")}`)) n++;
  return `${prefix}${String(n).padStart(3, "0")}`;
};
const codDuplicado = (codigo, materiais, ferramentas, ignorarId = null) => {
  const todos = [...materiais, ...ferramentas].filter(x => x.id !== ignorarId);
  return todos.find(x => x.codigo === codigo) || null;
};
const imgB64 = f => new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(f); });
const canDo = (u, mod, ac) => { if (u.perfil === "master") return true; const p = u.permissoes?.[mod]; return ac === "visualizar" ? p === "visualizar" || p === "editar" : p === "editar"; };
const ptDate = d => new Date(d).toLocaleDateString("pt-BR");

const getRevStatus = (m) => {
  if (!m.ultimaRevisaoPreco || !m.validadePrecoMeses) return { text: "—", color: "#aaa" };
  const rev = new Date(m.ultimaRevisaoPreco);
  rev.setMonth(rev.getMonth() + m.validadePrecoMeses);
  const dias = Math.ceil((rev - new Date()) / (864e5));
  if (dias < 0) return { text: `Atrasado (${Math.abs(dias)}d)`, color: "#a32d2d" };
  if (dias <= 30) return { text: `Atenção (${dias}d)`, color: "#ad6800" };
  return { text: `Em dia (${dias}d)`, color: "#3b6d11" };
};

// ─── MAPEAMENTO DE CAMPOS (snake_case ↔ camelCase) ─────────────────────────
const mapMaterialFromDB = (m) => ({
  ...m,
  estoqueMin: m.estoque_min,
  precoCusto: m.preco_custo,
  ultimaRevisaoPreco: m.ultima_revisao_preco,
  validadePrecoMeses: m.validade_preco_meses,
});
const mapMaterialToDB = (m) => {
  const { id, estoqueMin, precoCusto, ultimaRevisaoPreco, validadePrecoMeses, ...rest } = m;
  return {
    ...rest,
    estoque_min: estoqueMin,
    preco_custo: precoCusto,
    ultima_revisao_preco: ultimaRevisaoPreco,
    validade_preco_meses: validadePrecoMeses,
  };
};

const mapFerramentaFromDB = (f) => ({
  ...f,
  valorInicial: f.valor_inicial,
  dataCadastro: f.data_cadastro,
  precoCusto: f.preco_custo,
  kitId: f.kit_id,
  kitPecas: f.kit_pecas,
  dataCompra: f.data_compra,
  garantiaMeses: f.garantia_meses,
  dataRetirada: f.data_retirada,
  dataDevolucao: f.data_devolucao,
});
const mapFerramentaToDB = (f) => {
  const { id, valorInicial, dataCadastro, precoCusto, kitId, kitPecas, dataCompra, garantiaMeses, dataRetirada, dataDevolucao, ...rest } = f;
  return {
    ...rest,
    valor_inicial: valorInicial,
    data_cadastro: dataCadastro,
    preco_custo: precoCusto,
    kit_id: kitId,
    kit_pecas: kitPecas,
    data_compra: dataCompra,
    garantia_meses: garantiaMeses,
    data_retirada: dataRetirada || null,
    data_devolucao: dataDevolucao || null,
  };
};

const mapVendaFromDB = (v) => ({
  ...v,
  codigoNF: v.codigo_nf,
  totalCusto: v.total_custo,
  referenciaBaixa: v.referencia_baixa,
  consumoVendaId: v.consumo_venda_id,
  sobraItens: v.sobra_itens,
});
const mapVendaToDB = (v) => {
  const { id, codigoNF, totalCusto, referenciaBaixa, consumoVendaId, sobraItens, ...rest } = v;
  return {
    ...rest,
    codigo_nf: codigoNF,
    total_custo: totalCusto,
    referencia_baixa: referenciaBaixa,
    consumo_venda_id: consumoVendaId,
    sobra_itens: sobraItens,
  };
};

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const stickyStyle = { position: "sticky", top: 0, zIndex: 50, background: "#f5f5f3", paddingTop: 18, paddingBottom: 10, borderBottom: "1px solid #eee", marginBottom: 12 };
const BS = { Normal: { bg: "#eaf3de", c: "#3b6d11" }, Atenção: { bg: "#faeeda", c: "#854f0b" }, Crítico: { bg: "#fcebeb", c: "#a32d2d" }, Zerado: { bg: "#ede9e3", c: "#5f5e5a" }, "EM ESTOQUE": { bg: "#eaf3de", c: "#3b6d11" }, "EM USO": { bg: "#dbeafe", c: "#1d4ed8" }, Atrasado: { bg: "#fcebeb", c: "#a32d2d" }, "No Prazo": { bg: "#eaf3de", c: "#3b6d11" }, KIT: { bg: "#f3e8ff", c: "#7c3aed" } };
const Bdg = ({ s }) => { const b = BS[s] || { bg: "#ede9e3", c: "#5f5e5a" }; return <span style={{ background: b.bg, color: b.c, padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{s}</span>; };

function Modal({ open, onClose, title, children, width = 540 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.78)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(3px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "14px 14px 0 0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f5f5f3", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 17, color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

const Inp = ({ label, ...p }) => <div style={{ marginBottom: 10 }}>{label && <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>{label}</label>}<input {...p} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff", color: "#1a1a1a", ...p.style }} /></div>;
const Sel = ({ label, options, ...p }) => <div style={{ marginBottom: 10 }}>{label && <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>{label}</label>}<select {...p} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff", color: "#1a1a1a", ...p.style }}>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select></div>;
const CC = { def: { bg: "#f0f0ee", bo: "#ddd", cl: "#333" }, pri: { bg: "#185fa5", bo: "#185fa5", cl: "#fff" }, dan: { bg: "#fcebeb", bo: "#f09595", cl: "#a32d2d" }, suc: { bg: "#eaf3de", bo: "#97c459", cl: "#3b6d11" }, warn: { bg: "#faeeda", bo: "#f0c674", cl: "#854f0b" }, pur: { bg: "#f3e8ff", bo: "#c4b5fd", cl: "#7c3aed" } };
const Btn = ({ children, onClick, color = "def", sm, full, style: s, disabled }) => { const c = CC[color] || CC.def; return <button onClick={onClick} disabled={disabled} style={{ background: c.bg, border: `1px solid ${c.bo}`, color: c.cl, borderRadius: 7, padding: sm ? "4px 10px" : "7px 14px", fontSize: sm ? 12 : 13, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, width: full ? "100%" : undefined, opacity: disabled ? .5 : 1, whiteSpace: "nowrap", ...s }}>{children}</button>; };

function FotoMgr({ fotos, onChange }) {
  const ref = useRef();
  const add = async e => { const files = Array.from(e.target.files); const news = await Promise.all(files.map(async f => ({ id: Date.now() + Math.random(), url: await imgB64(f), descricao: f.name }))); onChange([...(fotos || []), ...news]); e.target.value = ""; };
  return (<div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
    {(fotos || []).map(f => (<div key={f.id} style={{ position: "relative", width: 80, borderRadius: 7, border: "1px solid #eee", overflow: "hidden" }}><img src={f.url} alt={f.descricao} style={{ width: "100%", height: 58, objectFit: "cover", display: "block" }} /><input value={f.descricao} onChange={e => onChange(fotos.map(x => x.id === f.id ? { ...x, descricao: e.target.value } : x))} style={{ width: "100%", fontSize: 10, border: "none", borderTop: "1px solid #eee", padding: "2px 4px", background: "#fafafa" }} placeholder="Desc." /><button onClick={() => onChange(fotos.filter(x => x.id !== f.id))} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 3, color: "#fff", cursor: "pointer", fontSize: 10, width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>))}
    <button onClick={() => ref.current.click()} style={{ width: 80, height: 58, borderRadius: 7, border: "2px dashed #ddd", background: "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "#bbb", fontSize: 10 }}>📷 Foto</button>
  </div><input ref={ref} type="file" accept="image/*" multiple onChange={add} style={{ display: "none" }} /></div>);
}
function FotoViewer({ fotos, nome, open, onClose }) {
  const [idx, setIdx] = useState(0);
  if (!open || !fotos?.length) return null;
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#111", borderRadius: 14, maxWidth: 520, width: "100%", padding: 18 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{nome}</span><button onClick={onClose} style={{ background: "#333", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "2px 9px", fontSize: 12 }}>✕</button></div>
      <img src={fotos[idx]?.url} alt={fotos[idx]?.descricao} style={{ width: "100%", borderRadius: 8, maxHeight: 320, objectFit: "contain", background: "#222" }} />
      {fotos[idx]?.descricao && <p style={{ color: "#aaa", fontSize: 11, marginTop: 5, textAlign: "center" }}>{fotos[idx].descricao}</p>}
      {fotos.length > 1 && <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 7 }}>{fotos.map((f, i) => <img key={f.id} src={f.url} onClick={() => setIdx(i)} style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: i === idx ? "2px solid #185fa5" : "2px solid transparent" }} />)}</div>}
    </div>
  </div>);
}

function LogoUploader({ logo, onLogoChange }) {
  const ref = useRef();
  const handleChange = async e => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await imgB64(file);
      onLogoChange(base64);
    }
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4, fontWeight: 600 }}>Logomarca</label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {logo ? (
          <div style={{ position: "relative", width: 100, height: 60, borderRadius: 8, border: "1px solid #eee", overflow: "hidden" }}>
            <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button onClick={() => onLogoChange(null)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 3, color: "#fff", cursor: "pointer", fontSize: 10, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ) : (
          <button onClick={() => ref.current.click()} style={{ width: 100, height: 60, borderRadius: 8, border: "2px dashed #ddd", background: "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>
            📷 Selecionar
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
        {!logo && <span style={{ fontSize: 11, color: "#aaa" }}>Nenhuma logo (opcional)</span>}
      </div>
    </div>
  );
}

function AutocompleteSearch({ label, placeholder, items, filterFn, renderItem, onSelect, value, onChange }) {
  const [q, setQ] = useState(value || "");
  const [show, setShow] = useState(false);
  const res = q.length > 1 ? items.filter(x => filterFn(x, q)).slice(0, 8) : [];
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      {label && <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>{label}</label>}
      <input value={q} onChange={e => { setQ(e.target.value); onChange && onChange(e.target.value); setShow(true); }} onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 180)} placeholder={placeholder} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
      {show && res.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, zIndex: 400, boxShadow: "0 6px 20px rgba(0,0,0,0.13)", overflow: "hidden", marginTop: 2, maxHeight: 260, overflowY: "auto" }}>
          {res.map((item, i) => (
            <button key={i} onMouseDown={() => { onSelect(item); setQ(typeof value === "string" ? value : ""); setShow(false); }} style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderTop: i > 0 ? "1px solid #f0f0ee" : "none", fontSize: 12 }}>
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function printTabela(titulo, colunas, linhas, empresa = {}) {
  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(`<!DOCTYPE html><html><head><title>${titulo}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#f5f5f3;padding:7px 9px;text-align:left;font-weight:700;border:1px solid #ddd;font-size:11px}td{padding:7px 9px;border:1px solid #ddd;font-size:11px}.footer{margin-top:16px;color:#aaa;font-size:10px;text-align:center}@media print{.np{display:none}}</style></head><body>`);
  w.document.write(`<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #eee">
    <div style="display:flex;align-items:center;gap:12px">
      ${empresa.logo ? `<img src="${empresa.logo}" style="height:45px;max-width:120px;object-fit:contain;" />` : ""}
      <div>
        <strong>${empresa.nome || empresa.nomeFantasia || "MATSSA"}</strong><br>
        <span style="font-size:11px;color:#666">CNPJ: ${empresa.cnpj} · ${empresa.endereco}${empresa.cep ? ` - CEP ${empresa.cep}` : ""} · ${empresa.cidade}/${empresa.estado}</span>
      </div>
    </div>
    <div style="text-align:right"><strong>${titulo}</strong><br><span style="font-size:11px;color:#888">Emitido em ${new Date().toLocaleDateString("pt-BR")}</span></div>
  </div>`);
  w.document.write(`<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table>`);
  w.document.write(`<div class="footer">${empresa.nome || empresa.nomeFantasia} · ${empresa.endereco}</div><br><button class="np" onclick="window.print()" style="background:#185fa5;color:#fff;border:none;padding:9px 22px;border-radius:7px;font-size:13px;cursor:pointer;font-weight:700">🖨️ Imprimir / Salvar PDF</button></body></html>`);
  w.document.close();
}
function printNF(v, destinos, empresa = {}) {
  const comp = destinos.find(d => d.nome === v.comprador) || { nome: v.comprador || "—", cnpj: "", endereco: "", email: "" };
  const w = window.open("", "_blank", "width=720,height=900");
  w.document.write(`<!DOCTYPE html><html><head><title>Nota Fiscal</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:30px;font-size:13px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f5f5f3;padding:8px 10px;text-align:left;font-weight:700;border:1px solid #ddd;font-size:12px}td{padding:8px 10px;border:1px solid #ddd;font-size:12px}.r{text-align:right}.footer{margin-top:20px;color:#aaa;font-size:11px;text-align:center;border-top:1px solid #eee;padding-top:12px}.sig{margin-top:40px;border-top:1px solid #333;width:260px;padding-top:6px;font-size:11px;color:#555}@media print{.np{display:none}}</style></head><body>`);
  w.document.write(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #eee">
    <div style="display:flex;align-items:center;gap:12px">
      ${empresa.logo ? `<img src="${empresa.logo}" style="height:50px;max-width:130px;object-fit:contain;" />` : ""}
      <div>
        <strong style="font-size:17px">${empresa.nome || empresa.nomeFantasia || "MATSSA"}</strong><br>
        <span style="font-size:12px;color:#666">CNPJ: ${empresa.cnpj}</span><br>
        <span style="font-size:11px;color:#888">${empresa.endereco}${empresa.cep ? ` - CEP ${empresa.cep}` : ""} · ${empresa.cidade}/${empresa.estado}</span>
      </div>
    </div>
    <div style="text-align:right"><strong style="font-size:15px">NOTA FISCAL</strong><br><span style="font-size:12px;color:#666">${v.codigoNF || v.id} · ${v.data}</span><br><span style="font-size:11px;color:#888">Emitida por: ${v.usuario}</span></div>
  </div>`);
  w.document.write(`<div style="background:#f9f9f7;border-radius:8px;padding:12px 14px;margin-bottom:14px;border:1px solid #eee"><strong style="font-size:12px;color:#555;display:block;margin-bottom:6px">DADOS DO COMPRADOR</strong><strong>${comp.nome}</strong><br>${comp.cnpj ? `CNPJ/CPF: ${comp.cnpj}<br>` : ""}${comp.endereco ? `Endereço: ${comp.endereco}<br>` : ""}${comp.email ? `Email: ${comp.email}` : ""}</div>`);
  w.document.write(`<table><thead><tr><th>Código</th><th>Descrição</th><th>Qtd</th><th>Un.</th><th class="r">Unitário</th><th class="r">Impostos%</th><th class="r">Total</th></tr></thead><tbody>`);
  v.itens.forEach(it => w.document.write(`<tr><td><code>${it.codigo || ""}</code></td><td>${it.descricao}</td><td>${it.qtd}</td><td>${it.unidade}</td><td class="r">R$ ${Number(it.preco).toFixed(2)}</td><td class="r">${it.impostos || 0}%</td><td class="r"><strong>R$ ${(it.qtd * it.preco).toFixed(2)}</strong></td></tr>`));
  w.document.write(`</tbody></table><div style="text-align:right;margin-top:8px"><strong style="font-size:15px">Total: R$ ${v.total.toFixed(2)}</strong></div>`);
  if (v.obs) w.document.write(`<p style="margin-top:10px;color:#666;font-size:11px">Obs: ${v.obs}</p>`);
  w.document.write(`<div style="margin-top:40px;display:flex;justify-content:space-between"><div class="sig">Assinatura do Comprador<br><small>${comp.nome}</small></div><div class="sig">Assinatura do Vendedor<br><small>${empresa.nome || empresa.nomeFantasia}</small></div></div>`);
  w.document.write(`<div class="footer">${empresa.nome || empresa.nomeFantasia} · ${empresa.cnpj}</div><br><button class="np" onclick="window.print()" style="background:#185fa5;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700">🖨️ Imprimir / Salvar PDF</button></body></html>`);
  w.document.close();
}

// ─── LOGIN (busca no Supabase) ─────────────────────────────────────────────
function Login({ onLogin, empresa }) {
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [err, setErr] = useState("");
  const go = async () => {
    const { data, error } = await supabase.from("usuarios").select("*").eq("email", email).eq("senha", senha).eq("ativo", true).single();
    if (error || !data) setErr("Email ou senha incorretos.");
    else onLogin(data);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0ee" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 38px", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.09)" }}>
        {empresa.logo && <img src={empresa.logo} alt="Logo" style={{ height: 50, marginBottom: 10 }} />}
        <div style={{ fontSize: 36, marginBottom: 5 }}>⚡</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>{empresa.nome || empresa.nomeFantasia || "MATSSA"}</h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 22 }}>Sistema de Controle de Estoque</p>
        <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        <Inp label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
        {err && <p style={{ color: "#a32d2d", fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <Btn onClick={go} color="pri" full>Entrar</Btn>
        <div style={{ marginTop: 14, padding: "9px 12px", background: "#f9f9f7", borderRadius: 8, fontSize: 11, color: "#888", textAlign: "left" }}>
          <b>Acessos:</b><br />👑 admin@matssa.com / admin123<br />👤 henrique@matssa.com / henrique123
        </div>
      </div>
    </div>
  );
}

// ─── HOOK PARA CARREGAR DADOS DO SUPABASE ──────────────────────────────────
function useSupabaseData() {
  const [usuarios, setUsuarios] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [ferramentas, setFerramentas] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: usersData }, { data: matData }, { data: ferData },
      { data: destData }, { data: vendData }, { data: configData }
    ] = await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("materiais").select("*"),
      supabase.from("ferramentas").select("*"),
      supabase.from("destinos").select("*"),
      supabase.from("vendas").select("*"),
      supabase.from("configuracoes").select("*"),
    ]);
    if (usersData) setUsuarios(usersData);
    if (matData) setMateriais(matData.map(mapMaterialFromDB));
    if (ferData) setFerramentas(ferData.map(mapFerramentaFromDB));
    if (destData) setDestinos(destData);
    if (vendData) setVendas(vendData.map(mapVendaFromDB));
    if (configData) {
      const cats = configData.find(c => c.chave === "categorias")?.valor || [];
      const unis = configData.find(c => c.chave === "unidades")?.valor || [];
      const locs = configData.find(c => c.chave === "localizacoes")?.valor || [];
      const emp = configData.find(c => c.chave === "empresa")?.valor || {};
      setCategorias(cats);
      setUnidades(unis);
      setLocalizacoes(locs);
      setEmpresa(emp);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const insertMaterial = async (mat) => {
    const { data, error } = await supabase.from("materiais").insert(mapMaterialToDB(mat)).select().single();
    if (error) { console.error("Erro ao inserir material:", error); alert(error.message); return null; }
    setMateriais(prev => [...prev, mapMaterialFromDB(data)]);
    return data;
  };
  const updateMaterial = async (id, mat) => {
    const { data, error } = await supabase.from("materiais").update(mapMaterialToDB(mat)).eq("id", id).select().single();
    if (error) { console.error("Erro ao atualizar material:", error); alert(error.message); return null; }
    setMateriais(prev => prev.map(m => m.id === id ? mapMaterialFromDB(data) : m));
    return data;
  };
  const deleteMaterial = async (id) => {
    const { error } = await supabase.from("materiais").delete().eq("id", id);
    if (error) { console.error("Erro ao deletar material:", error); alert(error.message); return false; }
    setMateriais(prev => prev.filter(m => m.id !== id));
    return true;
  };

  const insertFerramenta = async (fer) => {
    const { data, error } = await supabase.from("ferramentas").insert(mapFerramentaToDB(fer)).select().single();
    if (error) {
      console.error("Erro ao inserir ferramenta:", error);
      alert(error.message);
      return null;
    }
    setFerramentas(prev => [...prev, mapFerramentaFromDB(data)]);
    return data;
  };
  const updateFerramenta = async (id, fer) => {
    const { data, error } = await supabase.from("ferramentas").update(mapFerramentaToDB(fer)).eq("id", id).select().single();
    if (error) { console.error("Erro ao atualizar ferramenta:", error); alert(error.message); return null; }
    setFerramentas(prev => prev.map(f => f.id === id ? mapFerramentaFromDB(data) : f));
    return data;
  };
  const deleteFerramenta = async (id) => {
    const { error } = await supabase.from("ferramentas").delete().eq("id", id);
    if (error) { console.error("Erro ao deletar ferramenta:", error); alert(error.message); return false; }
    setFerramentas(prev => prev.filter(f => f.id !== id));
    return true;
  };

  const insertVenda = async (v) => {
    const { data, error } = await supabase.from("vendas").insert(mapVendaToDB(v)).select().single();
    if (error) { console.error("Erro ao inserir venda:", error); alert(error.message); return null; }
    setVendas(prev => [...prev, mapVendaFromDB(data)]);
    return data;
  };
  const updateVenda = async (id, v) => {
    const { data, error } = await supabase.from("vendas").update(mapVendaToDB(v)).eq("id", id).select().single();
    if (error) { console.error("Erro ao atualizar venda:", error); alert(error.message); return null; }
    setVendas(prev => prev.map(v => v.id === id ? mapVendaFromDB(data) : v));
    return data;
  };
  const deleteVenda = async (id) => {
    const { error } = await supabase.from("vendas").delete().eq("id", id);
    if (error) { console.error("Erro ao deletar venda:", error); alert(error.message); return false; }
    setVendas(prev => prev.filter(v => v.id !== id));
    return true;
  };

  const insertDestino = async (d) => {
    const { data, error } = await supabase.from("destinos").insert(d).select().single();
    if (error) { console.error("Erro ao inserir destino:", error); alert(error.message); return null; }
    setDestinos(prev => [...prev, data]);
    return data;
  };
  const updateDestino = async (id, d) => {
    const { id: _id, ...rest } = d; // remove o id se vier
    const { data, error } = await supabase.from("destinos").update(rest).eq("id", id).select().single();
    if (error) { console.error("Erro ao atualizar destino:", error); alert(error.message); return null; }
    setDestinos(prev => prev.map(d => d.id === id ? data : d));
    return data;
  };
  const deleteDestino = async (id) => {
    const { error } = await supabase.from("destinos").delete().eq("id", id);
    if (error) { console.error("Erro ao deletar destino:", error); alert(error.message); return false; }
    setDestinos(prev => prev.filter(d => d.id !== id));
    return true;
  };

  const insertUsuario = async (u) => {
    const { data, error } = await supabase.from("usuarios").insert(u).select().single();
    if (error) { console.error("Erro ao inserir usuário:", error); alert(error.message); return null; }
    setUsuarios(prev => [...prev, data]);
    return data;
  };
  const updateUsuario = async (id, u) => {
    const { id: _id, ...rest } = u; // remove o id se vier
    const { data, error } = await supabase.from("usuarios").update(rest).eq("id", id).select().single();
    if (error) { console.error("Erro ao atualizar usuário:", error); alert(error.message); return null; }
    setUsuarios(prev => prev.map(u => u.id === id ? data : u));
    return data;
  };
  const deleteUsuario = async (id) => {
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (error) { console.error("Erro ao deletar usuário:", error); alert(error.message); return false; }
    setUsuarios(prev => prev.filter(u => u.id !== id));
    return true;
  };

  const updateConfig = async (chave, valor) => {
    const { error } = await supabase.from("configuracoes").upsert({ chave, valor });
    if (error) { console.error("Erro ao atualizar config:", error); alert(error.message); }
    else {
      if (chave === "categorias") setCategorias(valor);
      else if (chave === "unidades") setUnidades(valor);
      else if (chave === "localizacoes") setLocalizacoes(valor);
      else if (chave === "empresa") setEmpresa(valor);
    }
  };

  return {
    usuarios, setUsuarios,
    materiais, setMateriais,
    ferramentas, setFerramentas,
    destinos, setDestinos,
    vendas, setVendas,
    categorias, setCategorias,
    unidades, setUnidades,
    localizacoes, setLocalizacoes,
    empresa, setEmpresa,
    loading,
    insertMaterial, updateMaterial, deleteMaterial,
    insertFerramenta, updateFerramenta, deleteFerramenta,
    insertVenda, updateVenda, deleteVenda,
    insertDestino, updateDestino, deleteDestino,
    insertUsuario, updateUsuario, deleteUsuario,
    updateConfig,
  };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ materiais, ferramentas }) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const sit = { Normal: 0, Atenção: 0, Crítico: 0, Zerado: 0 };
  materiais.forEach(m => { sit[getSit(m.quantidade, m.estoqueMin)]++; });
  const fs = { "EM ESTOQUE": 0, "EM USO": 0, Atrasado: 0, Crítico: 0 };
  ferramentas.forEach(f => { const s = getCtrl(f); if (s === "Atrasado") fs.Atrasado++; else if (s === "Crítico") fs.Crítico++; else if (f.status) fs[f.status]++; });
  const tot = materiais.length;
  const cards = [{ l: "Normal", v: sit.Normal, bg: "#eaf3de", c: "#3b6d11" }, { l: "Atenção", v: sit.Atenção, bg: "#faeeda", c: "#854f0b" }, { l: "Crítico", v: sit.Crítico, bg: "#fcebeb", c: "#a32d2d" }, { l: "Zerado", v: sit.Zerado, bg: "#ede9e3", c: "#5f5e5a" }];
  const criticos = materiais.filter(m => ["Crítico", "Zerado", "Atenção"].includes(getSit(m.quantidade, m.estoqueMin))).slice(0, 8);

  const hoje = new Date();
  const revisaoPendente = materiais.filter(m => {
    if (!m.ultimaRevisaoPreco || !m.validadePrecoMeses) return false;
    const dataRevisao = new Date(m.ultimaRevisaoPreco);
    dataRevisao.setMonth(dataRevisao.getMonth() + m.validadePrecoMeses);
    return dataRevisao <= new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  });

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlide(s => (s + 1) % 4), 15000);
    return () => clearInterval(t);
  }, [paused]);

  const slides = [
    <div key="sit">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#444" }}>📦 Situação do Estoque</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {cards.map(c => <div key={c.l} style={{ background: c.bg, borderRadius: 10, padding: "16px 12px", textAlign: "center" }}><div style={{ fontSize: 32, fontWeight: 700, color: c.c }}>{c.v}</div><div style={{ fontSize: 12, color: c.c, marginTop: 3 }}>{c.l}</div></div>)}
      </div>
      {cards.map(c => <div key={c.l} style={{ marginBottom: 9 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span style={{ color: "#666" }}>{c.l}</span><span style={{ fontWeight: 700, color: c.c }}>{c.v}/{tot}</span></div><div style={{ height: 6, background: "#f0f0ee", borderRadius: 3 }}><div style={{ height: 6, background: c.c, borderRadius: 3, width: `${tot > 0 ? (c.v / tot) * 100 : 0}%`, transition: "width .6s" }} /></div></div>)}
      <div style={{ marginTop: 16, background: "#fff7e6", borderRadius: 10, padding: "12px 16px", border: "1px solid #ffd591" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 600, color: "#ad6800" }}>📅 Revisão de preços necessária</span>
            <div style={{ fontSize: 12, color: "#ad6800", marginTop: 2 }}>Materiais com validade de preço vencida ou a vencer em 30 dias</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ad6800" }}>{revisaoPendente.length}</div>
        </div>
        {revisaoPendente.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#8b6914" }}>
            {revisaoPendente.slice(0, 3).map(m => <span key={m.id} style={{ marginRight: 12 }}>{m.codigo} {m.descricao}</span>)}
            {revisaoPendente.length > 3 && <span>...</span>}
          </div>
        )}
      </div>
    </div>,
    <div key="aten">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#444" }}>⚠️ Requer Atenção</h3>
      {criticos.length === 0 ? <p style={{ color: "#3b6d11", fontWeight: 600, textAlign: "center", padding: 24 }}>✅ Nenhum material crítico ou zerado!</p> : (
        <div style={{ overflowX: "auto" }}><table style={{ fontSize: 12 }}>
          <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Qtd", "Mín", "Situação"].map(h => <th key={h} style={{ padding: "7px 9px", textAlign: "left", fontWeight: 700, color: "#666" }}>{h}</th>)}</tr></thead>
          <tbody>{criticos.map(m => <tr key={m.id} style={{ borderTop: "1px solid #f0f0ee" }}>
            <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{m.codigo}</code></td>
            <td style={{ padding: "7px 9px", fontWeight: 600 }}>{m.descricao}</td>
            <td style={{ padding: "7px 9px", fontWeight: 700 }}>{m.quantidade}</td>
            <td style={{ padding: "7px 9px", color: "#888" }}>{m.estoqueMin}</td>
            <td style={{ padding: "7px 9px" }}><Bdg s={getSit(m.quantidade, m.estoqueMin)} /></td>
          </tr>)}</tbody>
        </table></div>
      )}
    </div>,
    <div key="ferr">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#444" }}>🔧 Ferramentas</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[["EM ESTOQUE", "Em Estoque", "#eaf3de", "#3b6d11"], ["EM USO", "Em Uso", "#dbeafe", "#1d4ed8"], ["Atrasado", "Atrasadas", "#fcebeb", "#a32d2d"], ["Crítico", "Críticas", "#faeeda", "#854f0b"]].map(([k, l, bg, c]) => (
          <div key={k} style={{ background: bg, borderRadius: 10, padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: c }}>{fs[k]}</div>
            <div style={{ fontSize: 12, color: c, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #eee", padding: "14px 16px" }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#555" }}>Ferramentas atrasadas ou críticas</h4>
        {ferramentas.filter(f => ["Atrasado", "Crítico"].includes(getCtrl(f))).length === 0
          ? <p style={{ color: "#3b6d11", fontSize: 13 }}>✅ Nenhuma ferramenta atrasada!</p>
          : ferramentas.filter(f => ["Atrasado", "Crítico"].includes(getCtrl(f))).map(f => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0ee", fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{f.descricao}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#888" }}>{f.destino}</span>
                <Bdg s={getCtrl(f)} />
              </div>
            </div>
          ))}
      </div>
    </div>,
    <div key="revpreco">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#444" }}>📅 Revisão de Preços Pendentes</h3>
      {revisaoPendente.length === 0 ? (
        <p style={{ color: "#3b6d11", fontWeight: 600, textAlign: "center", padding: 24 }}>✅ Todos os preços estão em dia!</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ fontSize: 12 }}>
            <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Última revisão", "Validade (meses)", "Vencimento", "Preço atual"].map(h => <th key={h} style={{ padding: "7px 9px", textAlign: "left", fontWeight: 700, color: "#666" }}>{h}</th>)}</tr></thead>
            <tbody>
              {revisaoPendente.map(m => {
                const dataRev = new Date(m.ultimaRevisaoPreco);
                const venc = new Date(dataRev);
                venc.setMonth(venc.getMonth() + m.validadePrecoMeses);
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid #f0f0ee" }}>
                    <td style={{ padding: "7px 9px" }}><code>{m.codigo}</code></td>
                    <td style={{ padding: "7px 9px", fontWeight: 600 }}>{m.descricao}</td>
                    <td style={{ padding: "7px 9px" }}>{ptDate(m.ultimaRevisaoPreco)}</td>
                    <td style={{ padding: "7px 9px" }}>{m.validadePrecoMeses}</td>
                    <td style={{ padding: "7px 9px", color: venc < new Date() ? "#a32d2d" : "#ad6800", fontWeight: 600 }}>{ptDate(venc.toISOString().slice(0,10))}</td>
                    <td style={{ padding: "7px 9px" }}>R$ {Number(m.preco).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ];

  const slideNames = ["Situação do Estoque", "Requer Atenção", "Ferramentas", "Revisão de Preços"];

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setPaused(p => !p)} style={{ background: paused ? "#eaf3de" : "#f0f0ee", border: "1px solid #ddd", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: paused ? "#3b6d11" : "#555" }}>
            {paused ? "▶ Retomar" : "⏸ Pausar"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {slideNames.map((name, i) => (
          <button key={i} onClick={() => setSlide(i)} style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid", borderColor: slide === i ? "#185fa5" : "#ddd", background: slide === i ? "#185fa5" : "#fff", color: slide === i ? "#fff" : "#666", fontSize: 12, cursor: "pointer", fontWeight: slide === i ? 700 : 400 }}>{name}</button>
        ))}
        {!paused && <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>auto • 15s</span>}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: "20px 22px", minHeight: 320, transition: "all .3s" }}>
        {slides[slide]}
      </div>
    </div>
  );
}

// ─── MATERIAIS ────────────────────────────────────────────────────────────────
function MateriaisTab({ materiais, setMateriais, ferramentas, categorias, unidades, localizacoes, usuario, empresa, insertMaterial, updateMaterial, deleteMaterial }) {
  const [busca, setBusca] = useState(""); const [fSit, setFSit] = useState("Todos"); const [fCat, setFCat] = useState("Todas");
  const [fRevPreco, setFRevPreco] = useState("Todos");
  const [mAdd, setMAdd] = useState(false); const [mEdit, setMEdit] = useState(null);
  const [form, setForm] = useState({}); const [fv, setFv] = useState(null);
  const [somando, setSomando] = useState(null);
  const [clonar, setClonar] = useState(false);
  const [descShow, setDescShow] = useState(false);
  const canEdit = canDo(usuario, "materiais", "editar");
  const sf = v => setForm(p => ({ ...p, ...v }));

  const precisaRevisaoPreco = (m) => {
    if (!m.ultimaRevisaoPreco || !m.validadePrecoMeses) return false;
    const dataRev = new Date(m.ultimaRevisaoPreco);
    dataRev.setMonth(dataRev.getMonth() + m.validadePrecoMeses);
    return dataRev <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  };

  const filtrados = materiais.filter(m => {
    const s = getSit(m.quantidade, m.estoqueMin);
    const matchSit = fSit === "Todos" || s === fSit;
    const matchCat = fCat === "Todas" || m.categoria === fCat;
    const matchBusca = !busca || m.descricao.toLowerCase().includes(busca.toLowerCase()) || m.codigo?.toLowerCase().includes(busca.toLowerCase());
    const matchRev = fRevPreco === "Todos" || (fRevPreco === "Sim" ? precisaRevisaoPreco(m) : !precisaRevisaoPreco(m));
    return matchSit && matchCat && matchBusca && matchRev;
  });

  const BF = { codigo: genCodGlobal("MAT", materiais, ferramentas), categoria: categorias[0], unidade: unidades[0], quantidade: 0, estoqueMin: 0, localizacao: localizacoes[0] || "", descricao: "", preco: 0, precoCusto: 0, impostos: 0, fotos: [], ultimaRevisaoPreco: new Date().toISOString().slice(0,10), validadePrecoMeses: 12 };

  const codDup = useMemo(() => { if (!form.codigo) return null; return codDuplicado(form.codigo, materiais, ferramentas, mEdit); }, [form.codigo, materiais, ferramentas, mEdit]);
  const descExistente = useMemo(() => { if (!form.descricao || form.descricao.length < 2) return null; return materiais.find(m => m.descricao.toLowerCase() === form.descricao.toLowerCase() && m.id !== mEdit); }, [form.descricao, materiais, mEdit]);
  const descSugestoes = useMemo(() => { if (!form.descricao || form.descricao.length < 2) return []; return materiais.filter(m => m.descricao.toLowerCase().includes(form.descricao.toLowerCase()) && m.id !== mEdit).slice(0, 6); }, [form.descricao, materiais, mEdit]);

  const salvar = async () => {
    if (codDup) { alert(`Código ${form.codigo} já está em uso por "${codDup.descricao}" (${codDup.tipo === "individual" || codDup.tipo === "kit" ? "Ferramentas" : "Materiais"}). Use outro código.`); return; }
    const now = new Date().toISOString().slice(0,10);
    const oldMaterial = mEdit ? materiais.find(m => m.id === mEdit) : null;
    const precoChanged = oldMaterial ? (Number(form.preco) !== Number(oldMaterial.preco)) : true;
    const parsed = {
      ...form,
      quantidade: Number(form.quantidade), estoqueMin: Number(form.estoqueMin),
      preco: Number(form.preco), precoCusto: Number(form.precoCusto),
      impostos: Number(form.impostos || 0), fotos: form.fotos || [],
      ultimaRevisaoPreco: precoChanged ? now : (oldMaterial ? oldMaterial.ultimaRevisaoPreco : now),
      validadePrecoMeses: Number(form.validadePrecoMeses) || 12,
    };
    if (mEdit) {
      await updateMaterial(mEdit, parsed);
      setMEdit(null);
    } else {
      await insertMaterial(parsed);
      setMAdd(false);
    }
    setSomando(null); setClonar(false);
  };

  const somarAoExistente = async () => {
    if (!somando) return;
    const updated = {
      ...somando,
      quantidade: somando.quantidade + Number(form.quantidade || 0),
      estoqueMin: Number(form.estoqueMin) || somando.estoqueMin,
      localizacao: form.localizacao || somando.localizacao,
      preco: Number(form.preco) || somando.preco,
      precoCusto: Number(form.precoCusto) || somando.precoCusto,
      impostos: Number(form.impostos || 0) || somando.impostos,
      ultimaRevisaoPreco: (Number(form.preco) !== Number(somando.preco)) ? new Date().toISOString().slice(0,10) : somando.ultimaRevisaoPreco,
    };
    await updateMaterial(somando.id, updated);
    setMAdd(false); setSomando(null); setClonar(false);
  };

  const adj = async (id, d) => {
    const mat = materiais.find(m => m.id === id);
    if (!mat) return;
    await updateMaterial(id, { ...mat, quantidade: Math.max(0, mat.quantidade + d) });
  };

  const exportPDF = () => {
    const cols = ["Código", "Categoria", "Descrição", "Un.", "Local", "Qtd", "Mín", "Custo R$", "Venda R$", "Imp.%", "Rev.Preço", "Val.(m)", "Status Rev.", "Situação"];
    const rows = filtrados.map(m => {
      const revStatus = getRevStatus(m);
      return `<tr><td><code>${m.codigo}</code></td><td>${m.categoria}</td><td>${m.descricao}</td><td>${m.unidade}</td><td>${m.localizacao}</td><td style="font-weight:700">${m.quantidade}</td><td>${m.estoqueMin}</td><td>R$${Number(m.precoCusto || 0).toFixed(2)}</td><td>R$${Number(m.preco || 0).toFixed(2)}</td><td>${m.impostos || 0}%</td><td>${m.ultimaRevisaoPreco ? ptDate(m.ultimaRevisaoPreco) : "—"}</td><td>${m.validadePrecoMeses || "—"}</td><td>${revStatus.text}</td><td>${getSit(m.quantidade, m.estoqueMin)}</td></tr>`;
    }).join("");
    printTabela("Relatório de Materiais", cols, rows, empresa);
  };

  const formUI = (isNew) => (
    <>
      {isNew && descExistente && !clonar && !somando && (
        <div style={{ background: "#faeeda", borderRadius: 8, padding: "10px 13px", marginBottom: 12, border: "1px solid #f0c674" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#854f0b", marginBottom: 6 }}>⚠️ Material com esta descrição já cadastrado:</p>
          <p style={{ fontSize: 12, color: "#854f0b", marginBottom: 8 }}><b>{descExistente.codigo}</b> — {descExistente.descricao} (Qtd: {descExistente.quantidade} {descExistente.unidade})</p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Btn sm color="warn" onClick={() => { setSomando(descExistente); sf({ codigo: descExistente.codigo }); }}>✚ Somar ao existente (mesmo código)</Btn>
            <Btn sm color="pur" onClick={() => { setClonar(true); sf({ codigo: genCodGlobal("MAT", materiais, ferramentas) }); }}>🔀 Clonar — novo código, produto separado</Btn>
          </div>
        </div>
      )}
      {somando && !clonar && (
        <div style={{ background: "#eaf3de", borderRadius: 8, padding: "9px 13px", marginBottom: 10, border: "1px solid #97c459", fontSize: 12, color: "#3b6d11" }}>
          <b>Modo: Somar ao existente</b> — {somando.descricao} [{somando.codigo}] · Qtd atual: {somando.quantidade}
          <button onClick={() => { setSomando(null); setClonar(false); sf({ codigo: genCodGlobal("MAT", materiais, ferramentas) }); }} style={{ marginLeft: 10, background: "none", border: "none", color: "#3b6d11", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✕ cancelar</button>
        </div>
      )}
      {clonar && (
        <div style={{ background: "#f3e8ff", borderRadius: 8, padding: "9px 13px", marginBottom: 10, border: "1px solid #c4b5fd", fontSize: 12, color: "#7c3aed" }}>
          <b>Modo: Clonar — produto separado com novo código.</b>
          <button onClick={() => { setClonar(false); setSomando(null); }} style={{ marginLeft: 10, background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✕ cancelar</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <Inp label="Código" value={form.codigo || ""} onChange={e => sf({ codigo: e.target.value })} style={codDup ? { borderColor: "#a32d2d", background: "#fff9f9" } : {}} />
          {codDup && <p style={{ fontSize: 11, color: "#a32d2d", marginTop: -8, marginBottom: 8 }}>⚠️ Código já em uso por "{codDup.descricao}"</p>}
        </div>
        <Sel label="Categoria" value={form.categoria || ""} onChange={e => sf({ categoria: e.target.value })} options={categorias} />
      </div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>Descrição</label>
        <input value={form.descricao || ""} onChange={e => { sf({ descricao: e.target.value }); setDescShow(true); }} onFocus={() => setDescShow(true)} onBlur={() => setTimeout(() => setDescShow(false), 180)}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} placeholder="Digite ou escolha descrição existente..." />
        {descShow && descSugestoes.length > 0 && !descExistente && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", overflow: "hidden", marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
            <div style={{ padding: "5px 10px", fontSize: 11, color: "#aaa", background: "#f9f9f7", borderBottom: "1px solid #eee" }}>Descrições similares cadastradas:</div>
            {descSugestoes.map(m => (
              <button key={m.id} onMouseDown={() => { sf({ descricao: m.descricao }); setDescShow(false); setSomando(m); sf({ codigo: m.codigo }); }} style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderTop: "1px solid #f0f0ee", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ background: "#f0f0ee", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#555", flexShrink: 0 }}>{m.codigo}</code>
                <span style={{ fontWeight: 600 }}>{m.descricao}</span>
                <span style={{ color: "#aaa", fontSize: 11, marginLeft: "auto" }}>Qtd: {m.quantidade}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Sel label="Unidade" value={form.unidade || ""} onChange={e => sf({ unidade: e.target.value })} options={unidades} />
        <Inp label="Quantidade" type="number" value={form.quantidade || 0} onChange={e => sf({ quantidade: e.target.value })} />
        <Inp label="Estoque mínimo" type="number" value={form.estoqueMin || 0} onChange={e => sf({ estoqueMin: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>Localização</label>
          <select value={form.localizacao || ""} onChange={e => sf({ localizacao: e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            <option value="">— Selecione —</option>
            {localizacoes.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <Inp label="Custo R$" type="number" value={form.precoCusto || 0} onChange={e => sf({ precoCusto: e.target.value })} />
        <Inp label="Venda R$" type="number" value={form.preco || 0} onChange={e => sf({ preco: e.target.value })} />
        <Inp label="Impostos %" type="number" value={form.impostos || 0} onChange={e => sf({ impostos: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, position: "relative" }}>
        <div>
          <Inp label="Última revisão do preço" type="date" value={form.ultimaRevisaoPreco || ""} onChange={e => sf({ ultimaRevisaoPreco: e.target.value })} disabled />
          <button
            type="button"
            onClick={() => sf({ ultimaRevisaoPreco: new Date().toISOString().slice(0,10) })}
            style={{ position: "absolute", right: 8, top: 29, background: "#e6f1fb", border: "1px solid #185fa5", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#185fa5", cursor: "pointer" }}
          >
            Hoje
          </button>
        </div>
        <Inp label="Validade do preço (meses)" type="number" value={form.validadePrecoMeses || 12} onChange={e => sf({ validadePrecoMeses: Number(e.target.value) })} />
      </div>
      <div style={{ marginBottom: 8 }}><label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4, fontWeight: 600 }}>Fotos do material</label><FotoMgr fotos={form.fotos || []} onChange={f => sf({ fotos: f })} /></div>
    </>
  );

  return (
    <div>
      <div style={stickyStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Materiais — {empresa.nome || empresa.nomeFantasia || "MATSSA"}</h2>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Btn onClick={exportPDF} color="def">🖨️ PDF</Btn>
            {canEdit && <Btn onClick={() => { setForm(BF); setSomando(null); setClonar(false); setMAdd(true); }} color="pri">+ Adicionar material</Btn>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Nome ou código..." style={{ flex: 1, minWidth: 150, padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
          <select value={fSit} onChange={e => setFSit(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            {["Todos", "Normal", "Atenção", "Crítico", "Zerado"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            <option>Todas</option>{categorias.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={fRevPreco} onChange={e => setFRevPreco(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            <option value="Todos">Rever preço: Todos</option>
            <option value="Sim">Sim (vencida ou em 30 dias)</option>
            <option value="Não">Não (em dia)</option>
          </select>
        </div>
      </div>
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #eee" }}>
        <table style={{ fontSize: 12 }}>
          <thead><tr style={{ background: "#f9f9f7", borderBottom: "1px solid #eee" }}>
            {["Cód.", "📷", "Categoria", "Descrição", "Un.", "Local", "Qtd", "Mín", "Custo R$", "Venda R$", "Imp.%", "Rev.Preço", "Val.(m)", "Status Rev.", "Situação", ...(canEdit ? ["Ações"] : [])].map(h => <th key={h} style={{ padding: "8px 9px", textAlign: "left", fontWeight: 700, color: "#555", whiteSpace: "nowrap" }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtrados.map(m => {
            const s = getSit(m.quantidade, m.estoqueMin);
            const rb = s === "Zerado" ? "#fafaf8" : s === "Crítico" ? "#fff9f9" : s === "Atenção" ? "#fffdf6" : "#fff";
            const revDate = m.ultimaRevisaoPreco ? ptDate(m.ultimaRevisaoPreco) : "—";
            const revStatus = getRevStatus(m);
            return (
              <tr key={m.id} style={{ borderTop: "1px solid #f0f0ee", background: rb }}>
                <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{m.codigo}</code></td>
                <td style={{ padding: "7px 9px" }}>{m.fotos?.length > 0 ? <button onClick={() => setFv(m)} style={{ background: "#e6f1fb", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 11, color: "#185fa5", fontWeight: 700 }}>📷{m.fotos.length}</button> : <span style={{ color: "#ddd", fontSize: 10 }}>—</span>}</td>
                <td style={{ padding: "7px 9px", color: "#777" }}>{m.categoria}</td>
                <td style={{ padding: "7px 9px", fontWeight: 600 }}>{m.descricao}</td>
                <td style={{ padding: "7px 9px", color: "#888" }}>{m.unidade}</td>
                <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{m.localizacao}</code></td>
                <td style={{ padding: "7px 9px" }}>
                  {canEdit ? <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <button onClick={() => adj(m.id, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #ddd", background: "#f9f9f7", cursor: "pointer", fontSize: 13, color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ minWidth: 26, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{m.quantidade}</span>
                    <button onClick={() => adj(m.id, 1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #ddd", background: "#f9f9f7", cursor: "pointer", fontSize: 13, color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div> : <span style={{ fontWeight: 700 }}>{m.quantidade}</span>}
                </td>
                <td style={{ padding: "7px 9px", color: "#888" }}>{m.estoqueMin}</td>
                <td style={{ padding: "7px 9px", color: "#a32d2d", fontWeight: 600 }}>R${Number(m.precoCusto || 0).toFixed(2)}</td>
                <td style={{ padding: "7px 9px", color: "#3b6d11", fontWeight: 600 }}>R${Number(m.preco || 0).toFixed(2)}</td>
                <td style={{ padding: "7px 9px", color: "#854f0b" }}>{m.impostos || 0}%</td>
                <td style={{ padding: "7px 9px", fontSize: 11, color: "#555" }}>{revDate}</td>
                <td style={{ padding: "7px 9px", fontSize: 11, color: "#555" }}>{m.validadePrecoMeses || "—"}</td>
                <td style={{ padding: "7px 9px" }}>
                  <span style={{ background: revStatus.color === "#a32d2d" ? "#fcebeb" : revStatus.color === "#ad6800" ? "#fff7e6" : "#eaf3de", color: revStatus.color, padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    {revStatus.text}
                  </span>
                </td>
                <td style={{ padding: "7px 9px" }}><Bdg s={s} /></td>
                {canEdit && <td style={{ padding: "7px 9px" }}><div style={{ display: "flex", gap: 4 }}>
                  <Btn sm onClick={() => { setForm({ ...m, fotos: m.fotos || [] }); setMEdit(m.id); }}>Editar</Btn>
                  <Btn sm color="dan" onClick={async () => { if (window.confirm("Remover?")) await deleteMaterial(m.id); }}>✕</Btn>
                </div></td>}
              </tr>
            );
          })}</tbody>
        </table>
        {filtrados.length === 0 && <p style={{ textAlign: "center", color: "#aaa", padding: 22, fontSize: 13 }}>Nenhum material encontrado.</p>}
      </div>
      <Modal open={mAdd} onClose={() => { setMAdd(false); setSomando(null); setClonar(false); }} title="Adicionar Material" width={620}>
        {formUI(true)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 10 }}>
          <Btn onClick={() => { setMAdd(false); setSomando(null); setClonar(false); }}>Cancelar</Btn>
          {somando && !clonar
            ? <Btn color="suc" onClick={somarAoExistente}>✚ Somar ao existente</Btn>
            : <Btn color="pri" onClick={salvar} disabled={!!codDup}>Salvar material</Btn>}
        </div>
      </Modal>
      <Modal open={!!mEdit} onClose={() => setMEdit(null)} title="Editar Material" width={620}>
        {formUI(false)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 10 }}>
          <Btn onClick={() => setMEdit(null)}>Cancelar</Btn>
          <Btn color="pri" onClick={salvar} disabled={!!codDup}>Salvar alterações</Btn>
        </div>
      </Modal>
      {fv && <FotoViewer fotos={fv.fotos} nome={fv.descricao} open={!!fv} onClose={() => setFv(null)} />}
    </div>
  );
}

// ─── FERRAMENTAS ──────────────────────────────────────────────────────────────
function FerramentasTab({ ferramentas, setFerramentas, materiais, destinos, usuarios, usuario, empresa, insertFerramenta, updateFerramenta, deleteFerramenta }) {
  const [busca, setBusca] = useState(""); const [fSt, setFSt] = useState("Todos"); const [fDest, setFDest] = useState("Todos");
  const [mAdd, setMAdd] = useState(false); const [mEdit, setMEdit] = useState(null);
  const [mKit, setMKit] = useState(false); const [kitForm, setKitForm] = useState({ nome: "", kitBusca: "", pecas: [] });
  const [form, setForm] = useState({}); const [fv, setFv] = useState(null);
  const [somando, setSomando] = useState(null); const [clonar, setClonar] = useState(false);
  const [descShow, setDescShow] = useState(false);
  const [vKit, setVKit] = useState(null);
  const canEdit = canDo(usuario, "ferramentas", "editar");
  const sf = v => setForm(p => ({ ...p, ...v }));

  const filtradas = ferramentas.filter(f => {
    const st = getCtrl(f); const sl = st === "Atrasado" ? "Atrasado" : f.status;
    return (fSt === "Todos" || sl === fSt) && (fDest === "Todos" || f.destino === fDest) && (!busca || f.descricao.toLowerCase().includes(busca.toLowerCase()) || f.codigo?.toLowerCase().includes(busca.toLowerCase()));
  });

  const BF = { 
    codigo: genCodGlobal("FER", materiais, ferramentas), descricao: "", modelo: "", status: "EM ESTOQUE", localizacao: "", responsavel: "", destino: destinos[0]?.nome || "", 
    dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: 0, depreciacao: 10, dataCadastro: new Date().toISOString().slice(0, 10), precoCusto: 0, impostos: 0, tipo: "individual", kitId: null, dataCompra: new Date().toISOString().slice(0,10), garantiaMeses: 12 
  };

  const codDup = useMemo(() => { if (!form.codigo) return null; return codDuplicado(form.codigo, materiais, ferramentas, mEdit); }, [form.codigo, materiais, ferramentas, mEdit]);
  const descExistente = useMemo(() => { if (!form.descricao || form.descricao.length < 2) return null; return ferramentas.find(f => f.descricao.toLowerCase() === form.descricao.toLowerCase() && f.id !== mEdit && f.tipo !== "kit"); }, [form.descricao, ferramentas, mEdit]);
  const descSugestoes = useMemo(() => { if (!form.descricao || form.descricao.length < 2) return []; return ferramentas.filter(f => f.descricao.toLowerCase().includes(form.descricao.toLowerCase()) && f.id !== mEdit && f.tipo !== "kit").slice(0, 6); }, [form.descricao, ferramentas, mEdit]);

  const ferrIndividuaisLivres = ferramentas.filter(f => f.tipo === "individual" && !f.kitId);
  const kitFiltradas = kitForm.kitBusca
    ? ferrIndividuaisLivres.filter(f => f.descricao.toLowerCase().includes(kitForm.kitBusca.toLowerCase()) || f.codigo?.toLowerCase().includes(kitForm.kitBusca.toLowerCase()))
    : ferrIndividuaisLivres;

  const garantiaStatus = (f) => {
    if (!f.dataCompra || !f.garantiaMeses) return null;
    const fim = new Date(f.dataCompra);
    fim.setMonth(fim.getMonth() + f.garantiaMeses);
    return new Date() <= fim ? "Na garantia" : "Fora da garantia";
  };

  const salvar = async () => {
    if (codDup) { alert(`Código ${form.codigo} já em uso por "${codDup.descricao}". Materiais e ferramentas compartilham o mesmo espaço de códigos.`); return; }
    const originalKitId = mEdit ? (ferramentas.find(f => f.id === mEdit)?.kitId || null) : null;
    const parsed = { ...form, fotos: form.fotos || [], tipo: "individual", kitId: originalKitId, dataCompra: form.dataCompra || "", garantiaMeses: Number(form.garantiaMeses) || 12 };
    if (mEdit) {
      await updateFerramenta(mEdit, parsed);
      setMEdit(null);
    } else {
      await insertFerramenta(parsed);
      setMAdd(false);
    }
    setSomando(null); setClonar(false);
  };

  const criarKit = async () => {
    if (!kitForm.nome.trim()) { alert("Informe o nome do kit."); return; }
    if (kitForm.pecas.length < 2) { alert("Selecione pelo menos 2 ferramentas para o kit."); return; }
    const kitCodigo = genCodGlobal("KIT", materiais, ferramentas);
    const valorKit = kitForm.pecas.reduce((a, pid) => { const f = ferramentas.find(x => x.id === pid); return a + (f ? calcVal(f.valorInicial, f.depreciacao, f.dataCadastro) : 0); }, 0);
    const novoKit = { 
      codigo: kitCodigo, descricao: kitForm.nome, modelo: "Kit", status: "EM ESTOQUE", localizacao: "", responsavel: "", destino: destinos[0]?.nome || "", 
      dataRetirada: null, dataDevolucao: null, fotos: [], valorInicial: valorKit, depreciacao: 0, dataCadastro: new Date().toISOString().slice(0, 10), precoCusto: valorKit, impostos: 0, tipo: "kit", kitPecas: kitForm.pecas, kitId: null, dataCompra: null, garantiaMeses: 0 
    };
    
    const result = await insertFerramenta(novoKit);
    if (!result) {
      alert("Falha ao criar o kit. Verifique o console para mais detalhes.");
      return;
    }
    const kitId = result.id;
    
    for (const pid of kitForm.pecas) {
      const peca = ferramentas.find(f => f.id === pid);
      if (peca) {
        const updateResult = await updateFerramenta(pid, { ...peca, kitId });
        if (!updateResult) console.error(`Falha ao atualizar peça ${pid}`);
      }
    }
    setMKit(false); setKitForm({ nome: "", kitBusca: "", pecas: [] });
  };

  const soltarPecaDoKit = async (pecaId, kitId) => {
    const peca = ferramentas.find(f => f.id === pecaId);
    if (!peca) return;
    await updateFerramenta(pecaId, { ...peca, kitId: null });
    const pecasRestantes = ferramentas.filter(f => f.kitId === kitId && f.id !== pecaId);
    if (pecasRestantes.length < 2) {
      if (window.confirm("Kit ficou com menos de 2 peças. Desfazer o kit completamente?")) {
        for (const p of pecasRestantes) await updateFerramenta(p.id, { ...p, kitId: null });
        await deleteFerramenta(kitId);
      }
    }
  };

  const desfazerKitCompleto = async (kitId) => {
    if (window.confirm("Desfazer o kit completamente? Todas as peças voltam a ser individuais.")) {
      const pecas = ferramentas.filter(f => f.kitId === kitId);
      for (const p of pecas) await updateFerramenta(p.id, { ...p, kitId: null });
      await deleteFerramenta(kitId);
    }
  };

  const exportPDF = () => {
    const cols = ["Código", "Descrição", "Modelo", "Tipo", "Local", "Responsável", "Destino", "Status", "Custo R$", "Valor Atual", "Garantia"];
    const rows = filtradas.map(f => {
      const gs = garantiaStatus(f);
      return `<tr><td><code>${f.codigo}</code></td><td>${f.descricao}</td><td>${f.modelo}</td><td>${f.tipo || "individual"}</td><td>${f.localizacao}</td><td>${f.responsavel}</td><td>${f.destino}</td><td>${f.status}</td><td>R$${Number(f.precoCusto || 0).toFixed(2)}</td><td>R$${calcVal(f.valorInicial, f.depreciacao, f.dataCadastro).toFixed(0)}</td><td>${gs || "—"}</td></tr>`;
    }).join("");
    printTabela("Relatório de Ferramentas", cols, rows, empresa);
  };

  const formUI = (isNew) => (
    <>
      {isNew && descExistente && !clonar && !somando && (
        <div style={{ background: "#faeeda", borderRadius: 8, padding: "9px 13px", marginBottom: 10, border: "1px solid #f0c674" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#854f0b", marginBottom: 5 }}>⚠️ Ferramenta similar já cadastrada: <b>{descExistente.codigo}</b> — {descExistente.descricao}</p>
          <div style={{ display: "flex", gap: 7 }}>
            <Btn sm color="warn" onClick={() => { setSomando(descExistente); sf({ codigo: descExistente.codigo }); }}>Usar mesmo código</Btn>
            <Btn sm color="pur" onClick={() => { setClonar(true); sf({ codigo: genCodGlobal("FER", materiais, ferramentas) }); }}>🔀 Código diferente — produto separado</Btn>
          </div>
        </div>
      )}
      {somando && !clonar && <div style={{ background: "#eaf3de", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #97c459", fontSize: 12, color: "#3b6d11" }}><b>Código vinculado:</b> {somando.codigo} — {somando.descricao}<button onClick={() => { setSomando(null); setClonar(false); sf({ codigo: genCodGlobal("FER", materiais, ferramentas) }); }} style={{ marginLeft: 8, background: "none", border: "none", color: "#3b6d11", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✕</button></div>}
      {clonar && <div style={{ background: "#f3e8ff", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #c4b5fd", fontSize: 12, color: "#7c3aed" }}><b>Código diferente — produto separado</b><button onClick={() => { setClonar(false); setSomando(null); }} style={{ marginLeft: 10, background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✕</button></div>}
      <div style={{ background: "#f9f9f7", borderRadius: 8, padding: "9px 11px", marginBottom: 8, border: "1px solid #eee" }}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 700 }}>IDENTIFICAÇÃO</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <Inp label="Código" value={form.codigo || ""} onChange={e => sf({ codigo: e.target.value })} style={codDup ? { borderColor: "#a32d2d", background: "#fff9f9" } : {}} />
            {codDup && <p style={{ fontSize: 11, color: "#a32d2d", marginTop: -8, marginBottom: 8 }}>⚠️ Código já em uso: "{codDup.descricao}"</p>}
          </div>
          <Inp label="Modelo/Marca" value={form.modelo || ""} onChange={e => sf({ modelo: e.target.value })} />
        </div>
        <div style={{ position: "relative" }}>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>Descrição</label>
          <input value={form.descricao || ""} onChange={e => { sf({ descricao: e.target.value }); setDescShow(true); }} onFocus={() => setDescShow(true)} onBlur={() => setTimeout(() => setDescShow(false), 180)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, marginBottom: 10 }} placeholder="Digite ou escolha descrição existente..." />
          {descShow && descSugestoes.length > 0 && !descExistente && (
            <div style={{ position: "absolute", top: "calc(100% - 10px)", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", overflow: "hidden", marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
              <div style={{ padding: "5px 10px", fontSize: 11, color: "#aaa", background: "#f9f9f7", borderBottom: "1px solid #eee" }}>Descrições similares cadastradas:</div>
              {descSugestoes.map(f => (
                <button key={f.id} onMouseDown={() => { sf({ descricao: f.descricao }); setDescShow(false); setSomando(f); sf({ codigo: f.codigo }); }} style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderTop: "1px solid #f0f0ee", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <code style={{ background: "#f0f0ee", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#555", flexShrink: 0 }}>{f.codigo}</code>
                  <span style={{ fontWeight: 600 }}>{f.descricao}</span>
                  <span style={{ color: "#aaa", fontSize: 11, marginLeft: "auto" }}>{f.modelo}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ background: "#f9f9f7", borderRadius: 8, padding: "9px 11px", marginBottom: 8, border: "1px solid #eee" }}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 700 }}>LOCALIZAÇÃO & CONTROLE</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Sel label="Status" value={form.status || "EM ESTOQUE"} onChange={e => sf({ status: e.target.value })} options={["EM ESTOQUE", "EM USO"]} />
          <Inp label="Localização" value={form.localizacao || ""} onChange={e => sf({ localizacao: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Sel label="Responsável" value={form.responsavel || ""} onChange={e => sf({ responsavel: e.target.value })} options={["—", ...usuarios.filter(u => u.ativo).map(u => u.nome)]} />
          <Sel label="Destino" value={form.destino || ""} onChange={e => sf({ destino: e.target.value })} options={["—", ...destinos.map(d => d.nome)]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Inp label="Data retirada" type="date" value={form.dataRetirada || ""} onChange={e => sf({ dataRetirada: e.target.value })} />
          <Inp label="Prazo devolução" type="date" value={form.dataDevolucao || ""} onChange={e => sf({ dataDevolucao: e.target.value })} />
        </div>
      </div>
      <div style={{ background: "#f9f9f7", borderRadius: 8, padding: "9px 11px", marginBottom: 8, border: "1px solid #eee" }}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 700 }}>VALOR & DEPRECIAÇÃO</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          <Inp label="Custo R$" type="number" value={form.precoCusto || 0} onChange={e => sf({ precoCusto: Number(e.target.value) })} />
          <Inp label="Valor inicial R$" type="number" value={form.valorInicial || 0} onChange={e => sf({ valorInicial: Number(e.target.value) })} />
          <Inp label="Dep. %/mês" type="number" value={form.depreciacao || 0} onChange={e => sf({ depreciacao: Number(e.target.value) })} />
          <Inp label="Impostos %" type="number" value={form.impostos || 0} onChange={e => sf({ impostos: Number(e.target.value) })} />
        </div>
        <Inp label="Data de cadastro" type="date" value={form.dataCadastro || ""} onChange={e => sf({ dataCadastro: e.target.value })} />
        {form.valorInicial > 0 && <p style={{ fontSize: 12, color: "#3b6d11" }}>Valor atual estimado: <b>R$ {calcVal(form.valorInicial, form.depreciacao, form.dataCadastro).toFixed(2)}</b></p>}
      </div>
      <div style={{ background: "#f9f9f7", borderRadius: 8, padding: "9px 11px", marginBottom: 8, border: "1px solid #eee" }}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 700 }}>GARANTIA</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Inp label="Data da compra" type="date" value={form.dataCompra || ""} onChange={e => sf({ dataCompra: e.target.value })} />
          <Inp label="Garantia (meses)" type="number" value={form.garantiaMeses || 12} onChange={e => sf({ garantiaMeses: Number(e.target.value) })} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}><label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4, fontWeight: 600 }}>Fotos da ferramenta</label><FotoMgr fotos={form.fotos || []} onChange={f => sf({ fotos: f })} /></div>
    </>
  );

  return (
    <div>
      <div style={stickyStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Ferramentas — {empresa.nome || empresa.nomeFantasia || "MATSSA"}</h2>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Btn onClick={exportPDF} color="def">🖨️ PDF</Btn>
            {canEdit && <Btn onClick={() => setMKit(true)} color="pur">🧰 Criar Kit</Btn>}
            {canEdit && <Btn onClick={() => { setForm(BF); setSomando(null); setClonar(false); setMAdd(true); }} color="pri">+ Adicionar ferramenta</Btn>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Nome ou código..." style={{ flex: 1, minWidth: 150, padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
          <select value={fSt} onChange={e => setFSt(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            {["Todos", "EM ESTOQUE", "EM USO", "Atrasado"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={fDest} onChange={e => setFDest(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
            <option>Todos</option>{destinos.map(d => <option key={d.id}>{d.nome}</option>)}
          </select>
        </div>
      </div>
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #eee" }}>
        <table style={{ fontSize: 12 }}>
          <thead><tr style={{ background: "#f9f9f7", borderBottom: "1px solid #eee" }}>
            {["Cód.", "📷", "Tipo", "Descrição", "Modelo", "Local", "Responsável", "Destino", "Devolução", "Status", "Ctrl", "Garantia", "Custo R$", "Valor Atual", ...(canEdit ? ["Ações"] : [])].map(h => <th key={h} style={{ padding: "8px 9px", textAlign: "left", fontWeight: 700, color: "#555", whiteSpace: "nowrap" }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtradas.map(f => {
            const st = getCtrl(f); const va = calcVal(f.valorInicial, f.depreciacao, f.dataCadastro);
            const emKit = f.kitId;
            const pecasDoKit = f.tipo === "kit" ? ferramentas.filter(x => x.kitId === f.id) : [];
            const gs = garantiaStatus(f);
            return (
              <Fragment key={f.id}>
                <tr style={{ borderTop: "1px solid #f0f0ee", background: f.tipo === "kit" ? "#faf5ff" : emKit ? "#f5f5ff" : "#fff" }}>
                  <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: f.tipo === "kit" ? "#f3e8ff" : "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{f.codigo}</code></td>
                  <td style={{ padding: "7px 9px" }}>{f.fotos?.length > 0 ? <button onClick={() => setFv(f)} style={{ background: "#e6f1fb", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 11, color: "#185fa5", fontWeight: 700 }}>📷{f.fotos.length}</button> : <span style={{ color: "#ddd", fontSize: 10 }}>—</span>}</td>
                  <td style={{ padding: "7px 9px" }}><Bdg s={f.tipo === "kit" ? "KIT" : emKit ? "kit" : "individual"} /></td>
                  <td style={{ padding: "7px 9px", fontWeight: 600 }}>
                    {f.descricao}
                    {f.tipo === "kit" && <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: 5 }}>({pecasDoKit.length} peças)</span>}
                    {emKit && <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: 5 }}>em kit</span>}
                  </td>
                  <td style={{ padding: "7px 9px", color: "#888" }}>{f.modelo}</td>
                  <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{f.localizacao}</code></td>
                  <td style={{ padding: "7px 9px" }}>{f.responsavel || "—"}</td>
                  <td style={{ padding: "7px 9px", fontWeight: 500 }}>{f.destino || "—"}</td>
                  <td style={{ padding: "7px 9px", color: "#888", whiteSpace: "nowrap" }}>{f.dataDevolucao || "—"}</td>
                  <td style={{ padding: "7px 9px" }}><Bdg s={f.status} /></td>
                  <td style={{ padding: "7px 9px" }}>{st && st !== "No Prazo" ? <Bdg s={st} /> : <span style={{ color: "#ccc", fontSize: 10 }}>—</span>}</td>
                  <td style={{ padding: "7px 9px" }}>
                    {gs ? (
                      <span style={{ background: gs === "Na garantia" ? "#eaf3de" : "#fcebeb", color: gs === "Na garantia" ? "#3b6d11" : "#a32d2d", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {gs}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "7px 9px", color: "#a32d2d", fontWeight: 600 }}>R${Number(f.precoCusto || 0).toFixed(0)}</td>
                  <td style={{ padding: "7px 9px", fontWeight: 700, color: va < f.valorInicial * 0.3 ? "#a32d2d" : "#185fa5", whiteSpace: "nowrap" }}>R${va.toFixed(0)}</td>
                  {canEdit && <td style={{ padding: "7px 9px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {f.tipo === "kit" && <Btn sm onClick={() => setVKit(f)}>Ver kit</Btn>}
                      {f.tipo === "kit" && <Btn sm color="warn" onClick={() => desfazerKitCompleto(f.id)}>Desfazer kit</Btn>}
                      {emKit && <Btn sm color="pur" onClick={() => soltarPecaDoKit(f.id, f.kitId)}>Soltar do kit</Btn>}
                      {!emKit && f.tipo !== "kit" && <Btn sm onClick={() => { setForm({ ...f, fotos: f.fotos || [] }); setMEdit(f.id); }}>Editar</Btn>}
                      {!emKit && <Btn sm color="dan" onClick={async () => { if (window.confirm("Remover?")) await deleteFerramenta(f.id); }}>✕</Btn>}
                    </div>
                  </td>}
                </tr>
                {f.tipo === "kit" && pecasDoKit.map(peca => (
                  <tr key={`peca-${peca.id}`} style={{ background: "#f8f4ff", borderTop: "1px solid #e9d5ff" }}>
                    <td style={{ padding: "5px 9px 5px 20px" }}><code style={{ fontSize: 10, background: "#e9d5ff", borderRadius: 3, padding: "1px 5px" }}>{peca.codigo}</code></td>
                    <td colSpan={2} style={{ padding: "5px 9px", fontSize: 11, color: "#7c3aed" }}>↳</td>
                    <td style={{ padding: "5px 9px", fontSize: 12, color: "#555" }}>{peca.descricao}</td>
                    <td style={{ padding: "5px 9px", fontSize: 11, color: "#aaa" }}>{peca.modelo}</td>
                    <td colSpan={9} style={{ padding: "5px 9px", fontSize: 11, color: "#aaa" }}>{peca.localizacao}</td>
                    {canEdit && <td style={{ padding: "5px 9px" }}><Btn sm color="pur" onClick={() => soltarPecaDoKit(peca.id, f.id)}>Soltar</Btn></td>}
                  </tr>
                ))}
              </Fragment>
            );
          })}</tbody>
        </table>
        {filtradas.length === 0 && <p style={{ textAlign: "center", color: "#aaa", padding: 22, fontSize: 13 }}>Nenhuma ferramenta encontrada.</p>}
      </div>

      <Modal open={mKit} onClose={() => { setMKit(false); setKitForm({ nome: "", kitBusca: "", pecas: [] }); }} title="🧰 Criar Kit de Ferramentas" width={580}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 5, fontWeight: 600 }}>🔍 Buscar ferramentas para o kit</label>
          <input value={kitForm.kitBusca} onChange={e => setKitForm({ ...kitForm, kitBusca: e.target.value })} placeholder="Digite nome ou código da ferramenta..." style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, marginBottom: 8 }} />
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
            {kitFiltradas.length === 0
              ? <p style={{ padding: 14, color: "#aaa", fontSize: 13, textAlign: "center" }}>Nenhuma ferramenta individual disponível.</p>
              : kitFiltradas.map(f => (
                <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f5f5f3", background: kitForm.pecas.includes(f.id) ? "#f3e8ff" : "#fff" }}>
                  <input type="checkbox" checked={kitForm.pecas.includes(f.id)} onChange={e => setKitForm({ ...kitForm, pecas: e.target.checked ? [...kitForm.pecas, f.id] : kitForm.pecas.filter(x => x !== f.id) })} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.descricao}</div>
                    <div style={{ fontSize: 11, color: "#888" }}><code style={{ background: "#f0f0ee", borderRadius: 3, padding: "0 4px" }}>{f.codigo}</code> · {f.modelo} · R${calcVal(f.valorInicial, f.depreciacao, f.dataCadastro).toFixed(0)}</div>
                  </div>
                  {kitForm.pecas.includes(f.id) && <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>✓ Selecionada</span>}
                </label>
              ))}
          </div>
          <p style={{ fontSize: 11, color: kitForm.pecas.length >= 2 ? "#3b6d11" : "#888", marginTop: 5, fontWeight: kitForm.pecas.length >= 2 ? 600 : 400 }}>
            {kitForm.pecas.length} ferramenta(s) selecionada(s) {kitForm.pecas.length >= 2 ? "✓" : "(mínimo 2)"}
          </p>
          {kitForm.pecas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {kitForm.pecas.map(pid => { const f = ferramentas.find(x => x.id === pid); return f ? <span key={pid} style={{ background: "#f3e8ff", color: "#7c3aed", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>{f.descricao}<button onClick={() => setKitForm({ ...kitForm, pecas: kitForm.pecas.filter(x => x !== pid) })} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button></span> : null; })}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
          <Inp label="Nome do Kit" value={kitForm.nome} onChange={e => setKitForm({ ...kitForm, nome: e.target.value })} placeholder="Ex: Kit Elétrico Completo, Kit Medição..." />
          {kitForm.pecas.length >= 2 && kitForm.nome && (
            <div style={{ background: "#f3e8ff", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#7c3aed" }}>
              Código do kit: <b>{genCodGlobal("KIT", materiais, ferramentas)}</b> · Valor total estimado: <b>R${kitForm.pecas.reduce((a, pid) => { const f = ferramentas.find(x => x.id === pid); return a + (f ? calcVal(f.valorInicial, f.depreciacao, f.dataCadastro) : 0); }, 0).toFixed(0)}</b>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 12 }}>
          <Btn onClick={() => { setMKit(false); setKitForm({ nome: "", kitBusca: "", pecas: [] }); }}>Cancelar</Btn>
          <Btn color="pur" onClick={criarKit} disabled={kitForm.pecas.length < 2 || !kitForm.nome.trim()}>🧰 Criar Kit</Btn>
        </div>
      </Modal>
      <Modal open={mAdd} onClose={() => { setMAdd(false); setSomando(null); setClonar(false); }} title="Adicionar Ferramenta" width={620}>
        {formUI(true)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 10 }}>
          <Btn onClick={() => { setMAdd(false); setSomando(null); setClonar(false); }}>Cancelar</Btn>
          <Btn color="pri" onClick={salvar} disabled={!!codDup}>Salvar ferramenta</Btn>
        </div>
      </Modal>
      <Modal open={!!mEdit} onClose={() => setMEdit(null)} title="Editar Ferramenta" width={620}>
        {formUI(false)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 10 }}>
          <Btn onClick={() => setMEdit(null)}>Cancelar</Btn>
          <Btn color="pri" onClick={salvar} disabled={!!codDup}>Salvar alterações</Btn>
        </div>
      </Modal>
      <Modal open={!!vKit} onClose={() => setVKit(null)} title={`Kit: ${vKit?.descricao}`} width={500}>
        {vKit && (
          <div>
            <p style={{ marginBottom: 8 }}>Código: <b>{vKit.codigo}</b></p>
            <table style={{ fontSize: 12 }}>
              <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Modelo", "Local", "Valor atual"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {ferramentas.filter(f => f.kitId === vKit.id).map(p => (
                  <tr key={p.id}>
                    <td><code>{p.codigo}</code></td>
                    <td>{p.descricao}</td>
                    <td>{p.modelo}</td>
                    <td>{p.localizacao}</td>
                    <td>R$ {calcVal(p.valorInicial, p.depreciacao, p.dataCadastro).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
      {fv && <FotoViewer fotos={fv.fotos} nome={fv.descricao} open={!!fv} onClose={() => setFv(null)} />}
    </div>
  );
}

// ─── PREÇOS & VENDAS ──────────────────────────────────────────────────────────
function Precos({ materiais, setMateriais, vendas, setVendas, destinos, usuario, empresa, insertVenda, updateVenda, deleteVenda }) {
  const [aba, setAba] = useState("nova");
  const [itens, setItens] = useState([]);
  const [matBusca, setMatBusca] = useState(""); const [matShow, setMatShow] = useState(false);
  const [qtdSel, setQtdSel] = useState(1);
  const [tipo, setTipo] = useState("Venda"); const [comprador, setComprador] = useState(""); const [obs, setObs] = useState("");
  const [nf, setNf] = useState(null); const [busca, setBusca] = useState(""); const [filtComp, setFiltComp] = useState("Todos");
  const [filtroTipoHistorico, setFiltroTipoHistorico] = useState("Todos");
  const [baixarConsumo, setBaixarConsumo] = useState(null);
  const [sobraItens, setSobraItens] = useState([]);
  const canEdit = canDo(usuario, "precos", "editar");
  const total = itens.reduce((a, i) => a + i.qtd * i.preco, 0);
  const totalCusto = itens.reduce((a, i) => a + i.qtd * (i.precoCusto || 0), 0);

  const matFiltrados = materiais.filter(m => m.quantidade > 0 && (!matBusca || m.descricao.toLowerCase().includes(matBusca.toLowerCase()) || m.codigo?.toLowerCase().includes(matBusca.toLowerCase())));

  const addItem = (mat) => {
    if (!mat || qtdSel <= 0) return;
    if (qtdSel > mat.quantidade) { alert(`Disponível: ${mat.quantidade} ${mat.unidade}`); return; }
    const ex = itens.find(i => i.matId === mat.id);
    if (ex) setItens(itens.map(i => i.matId === mat.id ? { ...i, qtd: i.qtd + qtdSel } : i));
    else setItens([...itens, { matId: mat.id, codigo: mat.codigo, descricao: mat.descricao, unidade: mat.unidade, qtd: qtdSel, preco: mat.preco, precoCusto: mat.precoCusto || 0, impostos: mat.impostos || 0 }]);
    setQtdSel(1); setMatBusca(""); setMatShow(false);
  };

  const finalizar = async () => {
    if (!comprador.trim()) { alert("⚠️ Informe o comprador antes de gerar a nota fiscal."); return; }
    if (!itens.length) { alert("Adicione pelo menos um item."); return; }
    const ano = new Date().getFullYear();
    const seq = vendas.filter(v => v.codigoNF?.startsWith(`NF-${ano}`)).length + 1;
    const codigoNF = `NF-${ano}-${String(seq).padStart(3, '0')}`;
    const v = { codigoNF, data: new Date().toISOString().slice(0, 10), tipo, comprador, obs, itens: [...itens], total, totalCusto, usuario: usuario.nome, status: "ativo" };
    await insertVenda(v);
    for (const it of itens) {
      const mat = materiais.find(m => m.id === it.matId);
      if (mat) {
        const updatedMat = { ...mat, quantidade: mat.quantidade - it.qtd };
        const { error } = await supabase.from("materiais").update(mapMaterialToDB(updatedMat)).eq("id", mat.id);
        if (!error) setMateriais(prev => prev.map(m => m.id === mat.id ? updatedMat : m));
      }
    }
    setNf(v); setItens([]); setComprador(""); setObs("");
  };

  const removerVenda = async (vid) => {
    const v = vendas.find(x => x.id === vid); if (!v) return;
    if (!window.confirm("Remover esta venda e devolver os itens ao estoque?")) return;
    for (const it of v.itens) {
      const mat = materiais.find(m => m.id === it.matId);
      if (mat) {
        const updatedMat = { ...mat, quantidade: mat.quantidade + it.qtd };
        const { error } = await supabase.from("materiais").update(mapMaterialToDB(updatedMat)).eq("id", mat.id);
        if (!error) setMateriais(prev => prev.map(m => m.id === mat.id ? updatedMat : m));
      }
    }
    await deleteVenda(vid);
  };

  const abrirBaixarConsumo = (v) => {
    setBaixarConsumo(v);
    setSobraItens(v.itens.map(i => ({ ...i, sobra: 0 })));
  };
  const confirmarBaixaConsumo = async () => {
    if (!baixarConsumo) return;
    const original = baixarConsumo;
    const consumidos = sobraItens.map((it) => ({ ...it, qtdConsumida: it.qtd - it.sobra })).filter(it => it.qtdConsumida > 0);
    if (consumidos.length === 0) {
      alert("Nenhum item foi consumido. A baixa não será registrada.");
      return;
    }
    const codigoConsumo = original.codigoNF + "-B";
    const novaVenda = {
      codigoNF: codigoConsumo,
      data: new Date().toISOString().slice(0,10),
      tipo: "Consumo (baixado)",
      comprador: original.comprador,
      obs: `Consumo referente à retirada ${original.codigoNF}`,
      itens: consumidos.map(it => ({ matId: it.matId, codigo: it.codigo, descricao: it.descricao, unidade: it.unidade, qtd: it.qtdConsumida, preco: it.preco, precoCusto: it.precoCusto || 0, impostos: it.impostos || 0 })),
      total: consumidos.reduce((a, it) => a + it.qtdConsumida * it.preco, 0),
      totalCusto: consumidos.reduce((a, it) => a + it.qtdConsumida * (it.precoCusto || 0), 0),
      usuario: usuario.nome,
      status: "ativo",
      referenciaBaixa: original.id,
    };
    const updatedOriginal = { ...original, status: "baixado", consumoVendaId: novaVenda.id, sobraItens };
    await updateVenda(original.id, updatedOriginal);
    await insertVenda(novaVenda);
    for (const it of sobraItens) {
      if (it.sobra > 0) {
        const mat = materiais.find(m => m.id === it.matId);
        if (mat) {
          const updatedMat = { ...mat, quantidade: mat.quantidade + Number(it.sobra) };
          const { error } = await supabase.from("materiais").update(mapMaterialToDB(updatedMat)).eq("id", mat.id);
          if (!error) setMateriais(prev => prev.map(m => m.id === mat.id ? updatedMat : m));
        }
      }
    }
    setBaixarConsumo(null);
  };

  const compradores = [...new Set(vendas.map(v => v.comprador).filter(Boolean))];
  const vendasConsumo = vendas.filter(v => v.tipo === "Retirada consumo próprio" && v.status !== "baixado");

  const vendasAtivas = [...vendas].reverse().filter(v => {
    if (busca && !v.comprador?.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtComp !== "Todos" && v.comprador !== filtComp) return false;
    if (filtroTipoHistorico !== "Todos") {
      if (filtroTipoHistorico === "Retirada consumo próprio (pendente)") {
        if (v.tipo !== "Retirada consumo próprio" || v.status === "baixado") return false;
      } else if (filtroTipoHistorico === "Retirada consumo próprio (baixada)") {
        if (v.tipo !== "Retirada consumo próprio" || v.status !== "baixado") return false;
      } else if (v.tipo !== filtroTipoHistorico) {
        return false;
      }
    }
    return true;
  });

  const tiposVenda = [
    "Todos",
    "Venda",
    "Retirada consumo próprio (pendente)",
    "Retirada consumo próprio (baixada)",
    "Transferência",
    "Consumo (baixado)"
  ];

  const renderNfModal = () => {
    if (!nf) return null;
    const vendaConsumo = nf.consumoVendaId ? vendas.find(v => v.id === nf.consumoVendaId) : null;
    return (
      <Modal open={!!nf} onClose={() => setNf(null)} title={`Nota Fiscal ${nf.codigoNF || nf.id}`} width={600}>
        <div>
          <div style={{ textAlign: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
            {empresa.logo && <img src={empresa.logo} alt="Logo" style={{ height: 40, marginBottom: 8 }} />}
            <div style={{ fontSize: 18, fontWeight: 700 }}>{empresa.nome || empresa.nomeFantasia || "MATSSA"}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Nota de {nf.tipo} · {nf.data}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{nf.codigoNF} · por {nf.usuario}</div>
            {nf.status === "baixado" && <Bdg s="Baixada" />}
          </div>
          {nf.comprador && <p style={{ fontSize: 13, marginBottom: 10 }}>Para: <b>{nf.comprador}</b></p>}
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6 }}>Itens originais retirados</h4>
          <table style={{ fontSize: 12, marginBottom: 10 }}>
            <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Qtd", "Un.", "Unit.", "Total"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #eee" }}>{h}</th>)}</tr></thead>
            <tbody>{nf.itens.map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0ee" }}>
                <td style={{ padding: "6px 8px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{it.codigo}</code></td>
                <td style={{ padding: "6px 8px" }}>{it.descricao}</td>
                <td style={{ padding: "6px 8px" }}>{it.qtd}</td>
                <td style={{ padding: "6px 8px", color: "#888" }}>{it.unidade}</td>
                <td style={{ padding: "6px 8px" }}>R${Number(it.preco).toFixed(2)}</td>
                <td style={{ padding: "6px 8px", fontWeight: 700 }}>R${(it.qtd * it.preco).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ textAlign: "right", marginBottom: 3 }}><b style={{ fontSize: 14 }}>Total original: R${nf.total.toFixed(2)}</b></div>
          {nf.status === "baixado" && nf.sobraItens && (
            <>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6, marginTop: 16 }}>Devolvido ao estoque (sobras)</h4>
              <table style={{ fontSize: 12, marginBottom: 10 }}>
                <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Qtd devolvida"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #eee" }}>{h}</th>)}</tr></thead>
                <tbody>{nf.sobraItens.filter(it => it.sobra > 0).map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0ee" }}>
                    <td style={{ padding: "6px 8px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{it.codigo}</code></td>
                    <td style={{ padding: "6px 8px" }}>{it.descricao}</td>
                    <td style={{ padding: "6px 8px" }}>{it.sobra} {it.unidade}</td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
          {vendaConsumo && (
            <>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6, marginTop: 16 }}>Consumo efetivo (Nota {vendaConsumo.codigoNF})</h4>
              <table style={{ fontSize: 12, marginBottom: 10 }}>
                <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Qtd consumida", "Un.", "Unit.", "Total"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #eee" }}>{h}</th>)}</tr></thead>
                <tbody>{vendaConsumo.itens.map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0ee" }}>
                    <td style={{ padding: "6px 8px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{it.codigo}</code></td>
                    <td style={{ padding: "6px 8px" }}>{it.descricao}</td>
                    <td style={{ padding: "6px 8px" }}>{it.qtd}</td>
                    <td style={{ padding: "6px 8px", color: "#888" }}>{it.unidade}</td>
                    <td style={{ padding: "6px 8px" }}>R${Number(it.preco).toFixed(2)}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 700 }}>R${(it.qtd * it.preco).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{ textAlign: "right" }}><b style={{ fontSize: 14 }}>Total consumido: R${vendaConsumo.total.toFixed(2)}</b></div>
            </>
          )}
          {nf.obs && <p style={{ fontSize: 11, color: "#888", marginTop: 7 }}>Obs: {nf.obs}</p>}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 7 }}>
            <Btn onClick={() => setNf(null)}>Fechar</Btn>
            <Btn color="pri" onClick={() => printNF(nf, destinos, empresa)}>🖨️ Imprimir / PDF</Btn>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div>
      <div style={stickyStyle}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Preços & Vendas</h2>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #eee" }}>
          {[["nova", "Nova Venda"], ["historico", "Histórico"], ["baixar", "Baixar Consumo"]].map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ padding: "8px 14px", background: "none", border: "none", borderBottom: aba === k ? "2px solid #185fa5" : "2px solid transparent", color: aba === k ? "#185fa5" : "#888", cursor: "pointer", fontSize: 13, fontWeight: aba === k ? 700 : 400, marginBottom: -2, position: "relative" }}>
              {l}
              {k === "baixar" && vendasConsumo.length > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: "#a32d2d", color: "#fff", borderRadius: 10, fontSize: 10, padding: "0 5px", fontWeight: 700 }}>{vendasConsumo.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {aba === "nova" && canEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 16, marginTop: 4 }}>
          <div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 3, fontWeight: 600 }}>Buscar material por nome ou código</label>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={matBusca} onChange={e => { setMatBusca(e.target.value); setMatShow(true); }} onFocus={() => setMatShow(true)} onBlur={() => setTimeout(() => setMatShow(false), 180)} placeholder="🔍 Digite nome ou código do material..." style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
                <input type="number" min={1} value={qtdSel} onChange={e => setQtdSel(Number(e.target.value))} style={{ width: 65, padding: "7px 9px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} placeholder="Qtd" />
              </div>
              {matShow && matBusca.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 80, background: "#fff", border: "1px solid #ddd", borderRadius: 8, zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.13)", overflow: "hidden", marginTop: 2, maxHeight: 280, overflowY: "auto" }}>
                  {matFiltrados.length === 0
                    ? <p style={{ padding: "10px 12px", color: "#aaa", fontSize: 12 }}>Nenhum material encontrado.</p>
                    : matFiltrados.map(m => (
                      <button key={m.id} onMouseDown={() => addItem(m)} style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderTop: "1px solid #f0f0ee", fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
                        <code style={{ background: "#f0f0ee", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#555", flexShrink: 0 }}>{m.codigo}</code>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{m.descricao}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>{m.categoria} · {m.unidade} · Disp: {m.quantidade} · R${Number(m.preco).toFixed(2)}</div>
                        </div>
                        <Bdg s={getSit(m.quantidade, m.estoqueMin)} />
                      </button>
                    ))}
                </div>
              )}
            </div>
            {itens.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #eee", overflow: "hidden" }}>
                <table style={{ fontSize: 12 }}>
                  <thead><tr style={{ background: "#f9f9f7" }}>{["Código", "Descrição", "Un.", "Qtd", "Unit.", "Imp.%", "Total", ""].map(h => <th key={h} style={{ padding: "7px 9px", textAlign: "left", fontWeight: 700, color: "#666" }}>{h}</th>)}</tr></thead>
                  <tbody>{itens.map((it, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f0f0ee" }}>
                      <td style={{ padding: "7px 9px" }}><code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 3, padding: "1px 5px" }}>{it.codigo}</code></td>
                      <td style={{ padding: "7px 9px" }}>{it.descricao}</td>
                      <td style={{ padding: "7px 9px", color: "#888" }}>{it.unidade}</td>
                      <td style={{ padding: "7px 9px", fontWeight: 700 }}>{it.qtd}</td>
                      <td style={{ padding: "7px 9px" }}>R${Number(it.preco).toFixed(2)}</td>
                      <td style={{ padding: "7px 9px", color: "#854f0b" }}>{it.impostos || 0}%</td>
                      <td style={{ padding: "7px 9px", fontWeight: 700 }}>R${(it.qtd * it.preco).toFixed(2)}</td>
                      <td style={{ padding: "7px 9px" }}><button onClick={() => setItens(itens.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#a32d2d", cursor: "pointer", fontSize: 15 }}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "13px 15px", alignSelf: "start" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 11, color: "#444" }}>Resumo</h3>
            <Sel label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} options={["Venda", "Retirada consumo próprio", "Transferência"]} />
            <AutocompleteSearch
              label="Comprador / Destino *"
              placeholder="Digite nome, código ou CNPJ..."
              items={destinos}
              filterFn={(d, q) => d.nome.toLowerCase().includes(q.toLowerCase()) || d.codigo?.toLowerCase().includes(q.toLowerCase()) || d.cnpj?.includes(q)}
              renderItem={d => <div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><code style={{ background: "#f0f0ee", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: "#555" }}>{d.codigo}</code><span style={{ fontWeight: 600 }}>{d.nome}</span></div><div style={{ fontSize: 10, color: "#aaa" }}>{d.cnpj}</div></div>}
              onSelect={d => setComprador(d.nome)}
              value={comprador}
              onChange={setComprador}
            />
            {!comprador.trim() && <p style={{ fontSize: 11, color: "#a32d2d", marginTop: -8, marginBottom: 8 }}>⚠️ Comprador obrigatório para gerar nota</p>}
            <Inp label="Observações" value={obs} onChange={e => setObs(e.target.value)} />
            <div style={{ borderTop: "1px solid #eee", paddingTop: 9, marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 3 }}><span>Itens</span><span>{itens.length}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 3 }}><span>Custo est.</span><span>R${totalCusto.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginTop: 4 }}><span>Total</span><span>R${total.toFixed(2)}</span></div>
              {total > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3b6d11", marginTop: 2 }}><span>Lucro est.</span><span>R${(total - totalCusto).toFixed(2)}</span></div>}
            </div>
            <Btn color="pri" onClick={finalizar} full disabled={!comprador.trim() || itens.length === 0}>📄 Gerar Nota Fiscal</Btn>
          </div>
        </div>
      )}
      {aba === "nova" && !canEdit && <p style={{ color: "#888", padding: 30, textAlign: "center", fontSize: 13 }}>Você não tem permissão para gerar vendas.</p>}

      {aba === "historico" && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar comprador..." style={{ flex: 1, minWidth: 140, padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
            <select value={filtComp} onChange={e => setFiltComp(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
              <option>Todos</option>{compradores.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filtroTipoHistorico} onChange={e => setFiltroTipoHistorico(e.target.value)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, background: "#fff" }}>
              {tiposVenda.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {vendasAtivas.length === 0 ? <p style={{ textAlign: "center", color: "#aaa", padding: 32, fontSize: 13 }}>Nenhuma venda encontrada.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {vendasAtivas.map(v => (
                <div key={v.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "10px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {v.tipo === "Retirada consumo próprio" && v.status === "baixado" && <span style={{ background: "#fcebeb", color: "#a32d2d", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginRight: 6, fontWeight: 700 }}>BAIXADA</span>}
                        {v.tipo === "Retirada consumo próprio" && v.status !== "baixado" && <span style={{ background: "#faeeda", color: "#854f0b", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginRight: 6, fontWeight: 700 }}>CONSUMO</span>}
                        {v.tipo === "Consumo (baixado)" && <span style={{ background: "#fcebeb", color: "#a32d2d", fontSize: 10, padding: "1px 7px", borderRadius: 8, marginRight: 6, fontWeight: 700 }}>BAIXADO</span>}
                        {v.tipo} — <span style={{ color: "#185fa5" }}>{v.comprador || "—"}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{v.data} · {v.codigoNF} · por {v.usuario} · {v.itens.length} item(ns)</div>
                      {v.obs && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>Obs: {v.obs}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>R${v.total.toFixed(2)}</div>
                        {v.totalCusto && <div style={{ fontSize: 11, color: "#3b6d11" }}>Lucro: R${(v.total - v.totalCusto).toFixed(2)}</div>}
                      </div>
                      <Btn sm onClick={() => setNf(v)}>Ver nota</Btn>
                      <Btn sm color="pri" onClick={() => printNF(v, destinos, empresa)}>🖨️</Btn>
                      {canEdit && v.tipo === "Retirada consumo próprio" && v.status !== "baixado" && <Btn sm color="warn" onClick={() => abrirBaixarConsumo(v)}>↓ Baixar</Btn>}
                      {canEdit && v.status !== "baixado" && <Btn sm color="dan" onClick={() => removerVenda(v.id)}>Remover</Btn>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === "baixar" && (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>Retiradas para consumo próprio aguardando baixa.</p>
          {vendasConsumo.length === 0 ? (
            <p style={{ textAlign: "center", color: "#aaa", padding: 40, fontSize: 13 }}>Nenhuma retirada pendente de baixa.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vendasConsumo.map(v => (
                <div key={v.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{v.comprador} — {v.data}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{v.codigoNF} · Total: R${v.total.toFixed(2)} · {v.itens.length} item(ns)</div>
                    </div>
                    <Btn sm color="warn" onClick={() => abrirBaixarConsumo(v)}>↓ Registrar baixa</Btn>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {v.itens.map(it => <span key={it.matId} style={{ background: "#f0f0ee", borderRadius: 6, padding: "2px 9px", fontSize: 11 }}>{it.descricao} ({it.qtd}{it.unidade})</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {renderNfModal()}

      <Modal open={!!baixarConsumo} onClose={() => setBaixarConsumo(null)} title="↓ Registrar Baixa de Consumo" width={520}>
        {baixarConsumo && (<div>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>Informe quanto sobrou de cada item para devolver ao estoque.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sobraItens.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9f9f7", borderRadius: 8, gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.descricao}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>Retirado: {it.qtd} {it.unidade}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#555" }}>Sobrou:</label>
                  <input type="number" min={0} max={it.qtd} value={it.sobra} onChange={e => setSobraItens(sobraItens.map((x, j) => j === i ? { ...x, sobra: Math.min(it.qtd, Number(e.target.value)) } : x))} style={{ width: 60, padding: "5px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
                  <span style={{ fontSize: 11, color: "#888" }}>{it.unidade}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "#eaf3de", borderRadius: 8, padding: "10px 12px", marginTop: 12, fontSize: 12, color: "#3b6d11" }}>
            As sobras serão devolvidas ao estoque. O consumo será registrado em uma nova nota ({baixarConsumo.codigoNF + "-B"}).
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 12 }}>
            <Btn onClick={() => setBaixarConsumo(null)}>Cancelar</Btn>
            <Btn color="suc" onClick={confirmarBaixaConsumo}>✓ Confirmar baixa</Btn>
          </div>
        </div>)}
      </Modal>
    </div>
  );
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function Relatorios({ vendas, empresa }) {
  const hoje = new Date().toISOString().slice(0,10);
  const [periodo, setPeriodo] = useState("mes");
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [dataIni, setDataIni] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  const anos = [...new Set(vendas.map(v => Number(v.data.slice(0,4))))].sort((a,b)=>b-a);

  const grupos = useMemo(() => {
    if (periodo === "mes") {
      const f = vendas.filter(v => { const d=new Date(v.data); return d.getFullYear()===filtroAno && d.getMonth()===filtroMes; });
      const g = { k:`${MESES_PT[filtroMes]} ${filtroAno}`, n:f.length, tot:f.reduce((a,v)=>a+v.total,0), custo:f.reduce((a,v)=>a+(v.totalCusto||0),0), vendas:f };
      return g.n>0?[g]:[];
    }
    if (periodo === "intervalo") {
      const ini = new Date(dataIni+"T00:00:00"), fim = new Date(dataFim+"T23:59:59");
      const f = vendas.filter(v => { const d=new Date(v.data+"T00:00:00"); return d>=ini && d<=fim; });
      const label = dataIni===dataFim ? new Date(dataIni).toLocaleDateString("pt-BR") : `${new Date(dataIni).toLocaleDateString("pt-BR")} → ${new Date(dataFim).toLocaleDateString("pt-BR")}`;
      const g = { k:label, n:f.length, tot:f.reduce((a,v)=>a+v.total,0), custo:f.reduce((a,v)=>a+(v.totalCusto||0),0), vendas:f };
      return g.n>0?[g]:[];
    }
    const map = {};
    vendas.forEach(v => {
      const k=v.data.slice(0,7);
      if (!map[k]) map[k]={k,n:0,tot:0,custo:0,vendas:[]};
      map[k].n++; map[k].tot+=v.total; map[k].custo+=v.totalCusto||0; map[k].vendas.push(v);
    });
    return Object.values(map).sort((a,b)=>b.k.localeCompare(a.k));
  }, [vendas, periodo, filtroMes, filtroAno, dataIni, dataFim]);

  const lucro = g => g.tot-g.custo;
  const atual = grupos[0]||{tot:0,custo:0,n:0,vendas:[]};

  const exportPDF = () => {
    const cols=["Período","Nº Vendas","Receita","Custo","Lucro","Margem%"];
    const rows=grupos.map(g=>{const lq=lucro(g);const mg=g.tot>0?(lq/g.tot*100):0;return`<tr><td>${g.k}</td><td>${g.n}</td><td>R$${g.tot.toFixed(2)}</td><td>R$${g.custo.toFixed(2)}</td><td>R$${lq.toFixed(2)}</td><td>${mg.toFixed(1)}%</td></tr>`;}).join("");
    printTabela("Relatório Financeiro", cols, rows, empresa);
  };

  return (
    <div>
      <div style={stickyStyle}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <h2 style={{fontSize:17,fontWeight:700,margin:0}}>Relatórios Financeiros</h2>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <Btn onClick={exportPDF} color="def">🖨️ PDF</Btn>
            <div style={{display:"flex",background:"#f0f0ee",borderRadius:7,padding:3,gap:2}}>
              {[["mes","Por Mês"],["intervalo","Intervalo de Datas"],["todos","Todos os Meses"]].map(([k,l])=>(
                <button key={k} onClick={()=>setPeriodo(k)} style={{padding:"5px 11px",background:periodo===k?"#fff":"none",border:periodo===k?"1px solid #ddd":"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:periodo===k?700:400,whiteSpace:"nowrap"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {periodo==="mes" && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <select value={filtroAno} onChange={e=>setFiltroAno(Number(e.target.value))} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #ddd",fontSize:13,background:"#fff"}}>
              {(anos.length>0?anos:[new Date().getFullYear()]).map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroMes} onChange={e=>setFiltroMes(Number(e.target.value))} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #ddd",fontSize:13,background:"#fff"}}>
              {MESES_PT.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        )}
        {periodo==="intervalo" && (
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <label style={{fontSize:12,color:"#555",fontWeight:600}}>De:</label>
              <input type="date" value={dataIni} onChange={e=>{setDataIni(e.target.value);if(e.target.value>dataFim)setDataFim(e.target.value);}} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #ddd",fontSize:13}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <label style={{fontSize:12,color:"#555",fontWeight:600}}>Até:</label>
              <input type="date" value={dataFim} min={dataIni} onChange={e=>setDataFim(e.target.value)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #ddd",fontSize:13}}/>
            </div>
            <span style={{fontSize:12,color:"#666",background:"#f0f0ee",padding:"4px 10px",borderRadius:6}}>
              {dataIni===dataFim ? `📅 ${new Date(dataIni).toLocaleDateString("pt-BR")}` : `📅 ${Math.ceil((new Date(dataFim)-new Date(dataIni))/864e5)+1} dias`}
            </span>
          </div>
        )}
      </div>

      {grupos.length===0
        ? <p style={{textAlign:"center",color:"#aaa",padding:44,background:"#fff",borderRadius:10,border:"1px solid #eee",fontSize:13}}>Nenhuma venda no período selecionado.</p>
        : <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[["Receita","R$"+atual.tot.toFixed(2),"#dbeafe","#1d4ed8"],["Custo","R$"+atual.custo.toFixed(2),"#fcebeb","#a32d2d"],["Lucro","R$"+lucro(atual).toFixed(2),lucro(atual)>=0?"#eaf3de":"#fcebeb",lucro(atual)>=0?"#3b6d11":"#a32d2d"],["Vendas",atual.n,"#f0f0ee","#333"]].map(([l,v,bg,c])=>(
              <div key={l} style={{background:bg,borderRadius:10,padding:"13px 11px"}}><div style={{fontSize:11,color:c,fontWeight:700,marginBottom:2}}>{l}</div><div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <div style={{background:"#fff",borderRadius:10,border:"1px solid #eee",overflow:"hidden",marginBottom:16}}>
            <table style={{fontSize:12}}>
              <thead><tr style={{background:"#f9f9f7",borderBottom:"1px solid #eee"}}>{["Período","Nº Vendas","Receita","Custo","Lucro","Margem"].map(h=><th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:700,color:"#555",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{grupos.map(g=>{const lq=lucro(g);const mg=g.tot>0?lq/g.tot*100:0;return(
                <tr key={g.k} style={{borderTop:"1px solid #f0f0ee"}}>
                  <td style={{padding:"8px 11px",fontWeight:700}}>{g.k}</td>
                  <td style={{padding:"8px 11px",color:"#888"}}>{g.n}</td>
                  <td style={{padding:"8px 11px",fontWeight:700}}>R${g.tot.toFixed(2)}</td>
                  <td style={{padding:"8px 11px",color:"#a32d2d"}}>R${g.custo.toFixed(2)}</td>
                  <td style={{padding:"8px 11px",fontWeight:700,color:lq>=0?"#3b6d11":"#a32d2d"}}>R${lq.toFixed(2)}</td>
                  <td style={{padding:"8px 11px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{flex:1,height:5,background:"#f0f0ee",borderRadius:3,minWidth:46}}><div style={{height:5,background:mg>=0?"#3b6d11":"#a32d2d",borderRadius:3,width:`${Math.min(100,Math.abs(mg))}%`}}/></div>
                      <span style={{fontSize:11,fontWeight:700,color:mg>=0?"#3b6d11":"#a32d2d",whiteSpace:"nowrap"}}>{mg.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );})}
              </tbody>
            </table>
          </div>
          {(periodo==="mes"||periodo==="intervalo") && atual.vendas?.length>0 && (
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #eee",overflow:"hidden"}}>
              <div style={{padding:"10px 14px",background:"#f9f9f7",borderBottom:"1px solid #eee",fontSize:13,fontWeight:700,color:"#444"}}>Vendas do período</div>
              {atual.vendas.map(v=>(
                <div key={v.id} style={{padding:"9px 14px",borderBottom:"1px solid #f0f0ee",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,fontSize:13}}>
                  <div>
                    <span style={{fontWeight:600}}>{v.comprador||"—"}</span>
                    <span style={{color:"#888",fontSize:11,marginLeft:8}}>{new Date(v.data).toLocaleDateString("pt-BR")} · {v.tipo} · {v.itens.length} item(ns)</span>
                  </div>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <span style={{fontWeight:700}}>R${v.total.toFixed(2)}</span>
                    <span style={{fontSize:11,color:"#3b6d11"}}>Lucro: R${(v.total-(v.totalCusto||0)).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      }
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function Config({ usuarios, setUsuarios, destinos, setDestinos, categorias, setCategorias, unidades, setUnidades, localizacoes, setLocalizacoes, empresa, setEmpresa, insertUsuario, updateUsuario, deleteUsuario, insertDestino, updateDestino, deleteDestino, updateConfig }) {
  const [aba, setAba] = useState("usuarios");
  const [mu, setMu] = useState(false); const [eu, setEu] = useState(null); const [fu, setFu] = useState({});
  const [nc, setNc] = useState(""); const [nun, setNun] = useState(""); const [nloc, setNloc] = useState("");
  const [mDest, setMDest] = useState(false); const [editDest, setEditDest] = useState(null);
  const [fd, setFd] = useState({ nome: "", cnpj: "", endereco: "", email: "", contato1: { nome: "", tel: "" }, contato2: { nome: "", tel: "" }, tipo: "obra" });
  const [buscaDest, setBuscaDest] = useState("");
  const [formEmp, setFormEmp] = useState({ ...empresa });
  const sfd = v => setFd(p => ({ ...p, ...v }));
  const sfe = v => setFormEmp(p => ({ ...p, ...v }));

  const salvarU = async () => {
    if (eu) {
      const { id, ...userSemId } = fu;
      await updateUsuario(eu, userSemId);
    } else {
      await insertUsuario(fu);
    }
    setMu(false);
  };

  const salvarDest = async () => {
    if (!fd.nome.trim() || !fd.cnpj.trim() || !fd.endereco.trim() || !fd.email.trim() || !fd.contato1.tel.trim()) { alert("Preencha os campos obrigatórios: Nome, CNPJ/CPF, Endereço, Email e Telefone 1."); return; }
    if (!editDest) {
      const dup = destinos.find(d => d.cnpj === fd.cnpj.trim());
      if (dup) { alert(`CNPJ/CPF já cadastrado para "${dup.nome}" (${dup.codigo}). Não é possível cadastrar novamente.`); return; }
    }
    if (editDest) {
      const { id, ...destSemId } = fd;
      await updateDestino(editDest, destSemId);
    } else {
      await insertDestino({ ...fd, codigo: genCod("CLI", destinos) });
    }
    setMDest(false); setFd({ nome: "", cnpj: "", endereco: "", email: "", contato1: { nome: "", tel: "" }, contato2: { nome: "", tel: "" }, tipo: "obra" });
  };

  const salvarEmpresa = async () => {
    await updateConfig("empresa", formEmp);
    setEmpresa(formEmp);
    alert("Dados da empresa salvos com sucesso!");
  };

  const destFiltrados = destinos.filter(d => !buscaDest || d.nome.toLowerCase().includes(buscaDest.toLowerCase()) || d.cnpj?.includes(buscaDest) || d.codigo?.toLowerCase().includes(buscaDest.toLowerCase()));

  const ABAS = [
    ["usuarios", "👥 Usuários"],
    ["destinos", "📍 Clientes/Destinos"],
    ["empresa", "🏢 Empresa"],
    ["categorias", "🏷️ Categorias"],
    ["unidades", "📐 Unidades"],
    ["localizacoes", "📦 Localizações"],
  ];
  const MODS = ["materiais", "ferramentas", "precos", "relatorios"];
  const MOD_LABELS = { materiais: "Materiais", ferramentas: "Ferramentas", precos: "Preços & Vendas", relatorios: "Relatórios" };

  return (
    <div>
      <div style={stickyStyle}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Configurações</h2>
        <div style={{ display: "flex", gap: 3, background: "#f0f0ee", borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
          {ABAS.map(([k, l]) => <button key={k} onClick={() => setAba(k)} style={{ padding: "6px 12px", background: aba === k ? "#fff" : "none", border: aba === k ? "1px solid #ddd" : "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: aba === k ? 700 : 400, color: "#333" }}>{l}</button>)}
        </div>
      </div>

      {aba === "usuarios" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Usuários</h3>
            <Btn color="pri" onClick={() => { setFu({ nome: "", email: "", senha: "", perfil: "operador", ativo: true, permissoes: { materiais: "visualizar", ferramentas: "visualizar", precos: "visualizar", relatorios: "visualizar" } }); setEu(null); setMu(true); }}>+ Novo usuário</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {usuarios.map(u => (
              <div key={u.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 9, padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.nome}
                    <span style={{ marginLeft: 6, fontSize: 11, background: u.perfil === "master" ? "#dbeafe" : "#eaf3de", color: u.perfil === "master" ? "#1d4ed8" : "#3b6d11", padding: "2px 7px", borderRadius: 8 }}>{u.perfil}</span>
                    {!u.ativo && <span style={{ marginLeft: 5, fontSize: 11, background: "#ede9e3", color: "#888", padding: "2px 7px", borderRadius: 8 }}>inativo</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{u.email}</div>
                  {u.perfil !== "master" && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {MODS.map(m => <span key={m} style={{ background: u.permissoes?.[m] === "editar" ? "#eaf3de" : u.permissoes?.[m] === "visualizar" ? "#f0f0ee" : "#fcebeb", color: u.permissoes?.[m] === "editar" ? "#3b6d11" : u.permissoes?.[m] === "visualizar" ? "#555" : "#a32d2d", padding: "1px 7px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>{MOD_LABELS[m]}: {u.permissoes?.[m] || "sem acesso"}</span>)}
                  </div>}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <Btn sm onClick={() => { setFu({ ...u, permissoes: u.permissoes || {} }); setEu(u.id); setMu(true); }}>Editar</Btn>
                  <Btn sm onClick={async () => { await updateUsuario(u.id, { ativo: !u.ativo }); }}>{u.ativo ? "Desativar" : "Ativar"}</Btn>
                  {u.perfil !== "master" && <Btn sm color="dan" onClick={async () => { if (window.confirm("Remover?")) await deleteUsuario(u.id); }}>✕</Btn>}
                </div>
              </div>
            ))}
          </div>
          <Modal open={mu} onClose={() => setMu(false)} title={eu ? "Editar Usuário" : "Novo Usuário"} width={500}>
            <Inp label="Nome completo" value={fu.nome || ""} onChange={e => setFu({ ...fu, nome: e.target.value })} />
            <Inp label="Email" type="email" value={fu.email || ""} onChange={e => setFu({ ...fu, email: e.target.value })} />
            <Inp label="Senha" type="password" value={fu.senha || ""} onChange={e => setFu({ ...fu, senha: e.target.value })} />
            <Sel label="Perfil" value={fu.perfil || "operador"} onChange={e => setFu({ ...fu, perfil: e.target.value })} options={[{ value: "master", label: "Master (acesso total)" }, { value: "operador", label: "Operador" }]} />
            {fu.perfil === "operador" && (
              <div style={{ background: "#f9f9f7", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#444" }}>Permissões por módulo</p>
                {MODS.map(m => (
                  <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{MOD_LABELS[m]}</span>
                    <div style={{ display: "flex", gap: 5 }}>
                      {["sem acesso", "visualizar", "editar"].map(op => (
                        <button key={op} onClick={() => setFu({ ...fu, permissoes: { ...fu.permissoes, [m]: op === "sem acesso" ? undefined : op } })} style={{ padding: "3px 9px", borderRadius: 6, border: "1px solid", borderColor: (fu.permissoes?.[m] || "sem acesso") === op ? "#185fa5" : "#ddd", background: (fu.permissoes?.[m] || "sem acesso") === op ? "#185fa5" : "#fff", color: (fu.permissoes?.[m] || "sem acesso") === op ? "#fff" : "#555", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{op}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 8 }}><Btn onClick={() => setMu(false)}>Cancelar</Btn><Btn color="pri" onClick={salvarU}>Salvar</Btn></div>
          </Modal>
        </div>
      )}

      {aba === "destinos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Clientes & Destinos</h3>
            <Btn color="pri" onClick={() => { setFd({ nome: "", cnpj: "", endereco: "", email: "", contato1: { nome: "", tel: "" }, contato2: { nome: "", tel: "" }, tipo: "obra" }); setEditDest(null); setMDest(true); }}>+ Novo cadastro</Btn>
          </div>
          <input value={buscaDest} onChange={e => setBuscaDest(e.target.value)} placeholder="🔍 Buscar por nome, código ou CNPJ..." style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13, marginBottom: 10 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {destFiltrados.map(d => (
              <div key={d.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 9, padding: "10px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{d.nome} <code style={{ fontSize: 10, background: "#f0f0ee", borderRadius: 4, padding: "1px 6px", marginLeft: 6 }}>{d.codigo}</code> <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>({d.tipo})</span></div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>CNPJ/CPF: {d.cnpj}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{d.endereco}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{d.email} · {d.contato1?.nome}: {d.contato1?.tel}{d.contato2?.tel ? ` · ${d.contato2.nome}: ${d.contato2.tel}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn sm onClick={() => { setFd({ ...d, contato1: d.contato1 || { nome: "", tel: "" }, contato2: d.contato2 || { nome: "", tel: "" } }); setEditDest(d.id); setMDest(true); }}>Editar</Btn>
                    <Btn sm color="dan" onClick={async () => { if (window.confirm("Remover?")) await deleteDestino(d.id); }}>✕</Btn>
                  </div>
                </div>
              </div>
            ))}
            {destFiltrados.length === 0 && <p style={{ textAlign: "center", color: "#aaa", padding: 20, fontSize: 13 }}>Nenhum cliente encontrado.</p>}
          </div>
          <Modal open={mDest} onClose={() => setMDest(false)} title={editDest ? "Editar Cadastro" : "Novo Cliente/Destino"} width={560}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Inp label="Nome *" value={fd.nome} onChange={e => sfd({ nome: e.target.value })} />
              <Sel label="Tipo" value={fd.tipo} onChange={e => sfd({ tipo: e.target.value })} options={["obra", "base", "parceiro", "cliente", "fornecedor"]} />
            </div>
            <div>
              <Inp label="CNPJ ou CPF *" value={fd.cnpj} onChange={e => sfd({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
              {!editDest && fd.cnpj && destinos.find(d => d.cnpj === fd.cnpj.trim()) && (
                <p style={{ fontSize: 11, color: "#a32d2d", marginTop: -8, marginBottom: 8 }}>⚠️ CNPJ/CPF já cadastrado para "{destinos.find(d => d.cnpj === fd.cnpj.trim())?.nome}"</p>
              )}
            </div>
            <Inp label="Endereço *" value={fd.endereco} onChange={e => sfd({ endereco: e.target.value })} placeholder="Rua, número, bairro, CEP, cidade" />
            <Inp label="Email *" type="email" value={fd.email} onChange={e => sfd({ email: e.target.value })} />
            <p style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6 }}>Contato 1 *</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Inp label="Nome do contato 1" value={fd.contato1?.nome || ""} onChange={e => sfd({ contato1: { ...fd.contato1, nome: e.target.value } })} />
              <Inp label="Telefone 1 *" value={fd.contato1?.tel || ""} onChange={e => sfd({ contato1: { ...fd.contato1, tel: e.target.value } })} placeholder="(00) 00000-0000" />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 6 }}>Contato 2 (opcional)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Inp label="Nome do contato 2" value={fd.contato2?.nome || ""} onChange={e => sfd({ contato2: { ...fd.contato2, nome: e.target.value } })} />
              <Inp label="Telefone 2" value={fd.contato2?.tel || ""} onChange={e => sfd({ contato2: { ...fd.contato2, tel: e.target.value } })} placeholder="(00) 00000-0000" />
            </div>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>* Campos obrigatórios</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 10 }}><Btn onClick={() => setMDest(false)}>Cancelar</Btn><Btn color="pri" onClick={salvarDest}>Salvar</Btn></div>
          </Modal>
        </div>
      )}

      {aba === "empresa" && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Dados da Empresa</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Inp label="Nome / Razão Social" value={formEmp.nome} onChange={e => sfe({ nome: e.target.value })} />
            <Inp label="Nome Fantasia" value={formEmp.nomeFantasia || ""} onChange={e => sfe({ nomeFantasia: e.target.value })} />
          </div>
          <Inp label="CNPJ" value={formEmp.cnpj} onChange={e => sfe({ cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          <Inp label="Endereço" value={formEmp.endereco} onChange={e => sfe({ endereco: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Inp label="CEP" value={formEmp.cep || ""} onChange={e => sfe({ cep: e.target.value })} />
            <Inp label="Cidade" value={formEmp.cidade || ""} onChange={e => sfe({ cidade: e.target.value })} />
            <Inp label="Estado (UF)" value={formEmp.estado || ""} onChange={e => sfe({ estado: e.target.value })} maxLength={2} />
          </div>
          <LogoUploader logo={formEmp.logo} onLogoChange={logo => sfe({ logo })} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <Btn color="pri" onClick={salvarEmpresa}>Salvar dados da empresa</Btn>
          </div>
        </div>
      )}

      {aba === "categorias" && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Categorias de materiais</h3>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            <input value={nc} onChange={e => setNc(e.target.value)} placeholder="Nova categoria..." style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
            <Btn color="pri" onClick={async () => { if (nc.trim()) { const novo = [...categorias, nc.trim()]; await updateConfig("categorias", novo); setCategorias(novo); setNc(""); } }}>Add</Btn>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {categorias.map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dbeafe", borderRadius: 16, padding: "4px 10px" }}><span style={{ fontSize: 13, color: "#1d4ed8" }}>{c}</span><button onClick={async () => { const novo = categorias.filter(x => x !== c); await updateConfig("categorias", novo); setCategorias(novo); }} style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button></span>)}
          </div>
        </div>
      )}

      {aba === "unidades" && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Unidades de medida</h3>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            <input value={nun} onChange={e => setNun(e.target.value)} placeholder="Nova unidade..." style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
            <Btn color="pri" onClick={async () => { if (nun.trim()) { const novo = [...unidades, nun.trim()]; await updateConfig("unidades", novo); setUnidades(novo); setNun(""); } }}>Add</Btn>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {unidades.map(u => <span key={u} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf3de", borderRadius: 16, padding: "4px 10px" }}><span style={{ fontSize: 13, color: "#3b6d11" }}>{u}</span><button onClick={async () => { const novo = unidades.filter(x => x !== u); await updateConfig("unidades", novo); setUnidades(novo); }} style={{ background: "none", border: "none", color: "#3b6d11", cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button></span>)}
          </div>
        </div>
      )}

      {aba === "localizacoes" && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>Localizações de Estoque</h3>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Cadastre as posições físicas do estoque (ex: A1, B2, Prateleira 3...). Disponíveis para seleção ao cadastrar materiais.</p>
          <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
            <input value={nloc} onChange={e => setNloc(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nloc.trim()) { if (localizacoes.includes(nloc.trim())) { alert("Esta localização já existe."); return; } const novo = [...localizacoes, nloc.trim()].sort(); updateConfig("localizacoes", novo); setLocalizacoes(novo); setNloc(""); } }} placeholder="Ex: A1, B2, Prateleira 3..." style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }} />
            <Btn color="pri" onClick={async () => {
              if (!nloc.trim()) return;
              if (localizacoes.includes(nloc.trim())) { alert("Esta localização já existe."); return; }
              const novo = [...localizacoes, nloc.trim()].sort();
              await updateConfig("localizacoes", novo);
              setLocalizacoes(novo);
              setNloc("");
            }}>Add</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px,1fr))", gap: 7 }}>
            {localizacoes.map(l => (
              <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f4fa", borderRadius: 8, padding: "7px 10px", border: "1px solid #dbeafe" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#185fa5", fontFamily: "monospace" }}>{l}</span>
                <button onClick={async () => { if (window.confirm(`Remover localização "${l}"?`)) { const novo = localizacoes.filter(x => x !== l); await updateConfig("localizacoes", novo); setLocalizacoes(novo); } }} style={{ background: "none", border: "none", color: "#a32d2d", cursor: "pointer", fontSize: 14, padding: 0, marginLeft: 6 }}>✕</button>
              </div>
            ))}
          </div>
          {localizacoes.length === 0 && <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhuma localização cadastrada.</p>}
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ──────────────────────────────────────────────────────────
export default function App() {
  const {
    usuarios, setUsuarios,
    materiais, setMateriais,
    ferramentas, setFerramentas,
    destinos, setDestinos,
    vendas, setVendas,
    categorias, setCategorias,
    unidades, setUnidades,
    localizacoes, setLocalizacoes,
    empresa, setEmpresa,
    loading,
    insertMaterial, updateMaterial, deleteMaterial,
    insertFerramenta, updateFerramenta, deleteFerramenta,
    insertVenda, updateVenda, deleteVenda,
    insertDestino, updateDestino, deleteDestino,
    insertUsuario, updateUsuario, deleteUsuario,
    updateConfig,
  } = useSupabaseData();

  const [usuario, setUsuario] = useState(null);
  const [aba, setAba] = useState("dashboard");
  const [mini, setMini] = useState(false);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Carregando...</div>;
  if (!usuario) return <Login onLogin={setUsuario} empresa={empresa} />;

  const isMaster = usuario.perfil === "master";
  const NAV = [
    { k: "dashboard", l: "Dashboard", ic: "📊", show: true },
    { k: "materiais", l: "Materiais", ic: "📦", show: canDo(usuario, "materiais", "visualizar") },
    { k: "ferramentas", l: "Ferramentas", ic: "🔧", show: canDo(usuario, "ferramentas", "visualizar") },
    { k: "precos", l: "Preços & Vendas", ic: "🧾", show: canDo(usuario, "precos", "visualizar") },
    { k: "relatorios", l: "Relatórios", ic: "📈", show: canDo(usuario, "relatorios", "visualizar") },
    { k: "config", l: "Configurações", ic: "⚙️", show: isMaster },
  ].filter(n => n.show);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f3" }}>
      <div style={{ width: mini ? 56 : 202, background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .18s", overflow: "hidden", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: mini ? "12px 9px" : "12px 13px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: mini ? "center" : "space-between" }}>
          {!mini && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {empresa.logo && <img src={empresa.logo} alt="Logo" style={{ height: 28, maxWidth: 40, objectFit: "contain" }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{empresa.nome || empresa.nomeFantasia || "MATSSA"}</div>
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>Controle de Estoque</div>
              </div>
            </div>
          )}
          <button onClick={() => setMini(!mini)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 18, display: "flex", padding: 2 }}>☰</button>
        </div>
        <nav style={{ flex: 1, padding: "7px 5px", overflowY: "auto" }}>
          {NAV.map(n => <button key={n.k} onClick={() => setAba(n.k)} title={mini ? n.l : undefined} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: mini ? "9px" : "8px 10px", background: aba === n.k ? "#f0f4fa" : "none", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, color: aba === n.k ? "#185fa5" : "#666", fontWeight: aba === n.k ? 700 : 400, marginBottom: 2, justifyContent: mini ? "center" : "flex-start", whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{n.ic}</span>{!mini && n.l}
          </button>)}
        </nav>
        <div style={{ padding: "7px 5px", borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px", overflow: "hidden", justifyContent: mini ? "center" : "flex-start" }}>
            <div style={{ width: 27, height: 27, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>{usuario.nome.charAt(0).toUpperCase()}</div>
            {!mini && <div style={{ overflow: "hidden" }}><div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{usuario.nome}</div><div style={{ fontSize: 10, color: "#bbb" }}>{usuario.perfil}</div></div>}
          </div>
          <button onClick={() => setUsuario(null)} title="Sair" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#bbb", borderRadius: 7, justifyContent: mini ? "center" : "flex-start" }}>
            <span style={{ fontSize: 15 }}>🚪</span>{!mini && "Sair"}
          </button>
        </div>
      </div>
      <main style={{ flex: 1, padding: "0 22px 40px", minWidth: 0, maxWidth: "100%", overflowY: "auto", height: "100vh" }}>
        {aba === "dashboard" && <Dashboard materiais={materiais} ferramentas={ferramentas} />}
        {aba === "materiais" && <MateriaisTab
          materiais={materiais} setMateriais={setMateriais}
          ferramentas={ferramentas}
          categorias={categorias} unidades={unidades} localizacoes={localizacoes}
          usuario={usuario} empresa={empresa}
          insertMaterial={insertMaterial} updateMaterial={updateMaterial} deleteMaterial={deleteMaterial}
        />}
        {aba === "ferramentas" && <FerramentasTab
          ferramentas={ferramentas} setFerramentas={setFerramentas}
          materiais={materiais} destinos={destinos} usuarios={usuarios}
          usuario={usuario} empresa={empresa}
          insertFerramenta={insertFerramenta} updateFerramenta={updateFerramenta} deleteFerramenta={deleteFerramenta}
        />}
        {aba === "precos" && <Precos
          materiais={materiais} setMateriais={setMateriais}
          vendas={vendas} setVendas={setVendas}
          destinos={destinos} usuario={usuario} empresa={empresa}
          insertVenda={insertVenda} updateVenda={updateVenda} deleteVenda={deleteVenda}
        />}
        {aba === "relatorios" && <Relatorios vendas={vendas} empresa={empresa} />}
        {aba === "config" && isMaster && <Config
          usuarios={usuarios} setUsuarios={setUsuarios}
          destinos={destinos} setDestinos={setDestinos}
          categorias={categorias} setCategorias={setCategorias}
          unidades={unidades} setUnidades={setUnidades}
          localizacoes={localizacoes} setLocalizacoes={setLocalizacoes}
          empresa={empresa} setEmpresa={setEmpresa}
          insertUsuario={insertUsuario} updateUsuario={updateUsuario} deleteUsuario={deleteUsuario}
          insertDestino={insertDestino} updateDestino={updateDestino} deleteDestino={deleteDestino}
          updateConfig={updateConfig}
        />}
      </main>
    </div>
  );
}