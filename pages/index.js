import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoxv6cP1KAVLBN4UUWMpQdJK7vWQI3JrM",
  authDomain: "nossa-casa-1885a.firebaseapp.com",
  projectId: "nossa-casa-1885a",
  storageBucket: "nossa-casa-1885a.firebasestorage.app",
  messagingSenderId: "336550460504",
  appId: "1:336550460504:web:7be87225c5c9535715de2d",
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

const STATUS_COLORS = {
  Pesquisando: { bg: "#FFF3CD", text: "#856404", dot: "#FFC107" },
  Decidido:    { bg: "#D1ECF1", text: "#0C5460", dot: "#17A2B8" },
  Comprado:    { bg: "#D4EDDA", text: "#155724", dot: "#28A745" },
};

const CAT_ICONS = {
  Cozinha: "🍳", Lavanderia: "👕", Climatização: "❄️",
  Limpeza: "🧹", Eletrônicos: "📺", Outro: "📦",
};

const fmt = (v) =>
  isNaN(v) || v === 0 ? "—" :
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const parsePreco = (s) =>
  parseFloat((s || "").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

const newItem = () => ({
  id: `item_${Date.now()}`,
  nome: "", categoria: "Outro", status: "Pesquisando", prioridade: "Média",
  marca: "", modelo: "", cor: "", voltagem: "", potencia: "",
  dimensoes: "", capacidade: "", garantia: "", avaliacao: "",
  specs_extras: "", pros: "", contras: "", notas: "",
  lojas: [],
  adicionado: new Date().toLocaleDateString("pt-BR"),
});

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("lista");
  const [activeId, setActiveId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "eletrodomesticos"), (snap) => {
      const data = snap.docs.map((d) => d.data());
      data.sort((a, b) => (a.adicionado < b.adicionado ? 1 : -1));
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  function melhorLoja(item) {
    if (!item?.lojas?.length) return null;
    const chosen = item.lojas.find((l) => l.escolhida);
    if (chosen) return chosen;
    return item.lojas.reduce((b, l) => {
      const v = parsePreco(l.preco);
      return !b || (v > 0 && v < parsePreco(b?.preco)) ? l : b;
    }, null);
  }

  const totalInvestido = items.filter((i) => i.status === "Comprado").reduce((a, i) => a + parsePreco(melhorLoja(i)?.preco), 0);
  const totalRestante = items.filter((i) => i.status !== "Comprado").reduce((a, i) => a + parsePreco(melhorLoja(i)?.preco), 0);
  const filtered = items.filter((i) => {
    if (filterStatus !== "Todos" && i.status !== filterStatus) return false;
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setEditData(newItem()); setActiveId(null); setEditMode(true); setView("detalhe"); };
  const openItem = (id) => {
    const item = items.find((i) => i.id === id);
    setEditData({ ...item, lojas: item.lojas.map((l) => ({ ...l })) });
    setActiveId(id); setEditMode(false); setView("detalhe");
  };
  const saveEdit = async () => {
    if (!editData.nome?.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "eletrodomesticos", editData.id), editData);
      setActiveId(editData.id); setEditMode(false);
    } catch { alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };
  const deleteItem = async (id) => {
    await deleteDoc(doc(db, "eletrodomesticos", id));
    setView("lista"); setActiveId(null);
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F5F0E8", fontFamily:"sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🏡</div>
        <div style={{ fontSize:20, color:"#8B6F47" }}>Carregando Nossa Casa…</div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#F5F0E8}
        input,textarea,select{font-family:'DM Sans',sans-serif}
        .chover{transition:all .2s;cursor:pointer}
        .chover:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(44,24,16,.13)!important}
        input:focus,textarea:focus,select:focus{outline:2px solid #8B6F47;outline-offset:1px}
        button:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
      <header style={S.header}>
        <div style={S.hInner}>
          <div onClick={() => setView("lista")} style={{ cursor:"pointer" }}>
            <div style={S.logo}>🏡 Nossa Casa</div>
            <div style={S.logoSub}>Lista de Eletrodomésticos</div>
          </div>
          <div style={S.hRight}>
            <div style={S.pill}><span style={S.pillLabel}>INVESTIDO</span><span style={S.pillVal}>{fmt(totalInvestido)}</span></div>
            <div style={S.pill}><span style={S.pillLabel}>A COMPRAR</span><span style={S.pillVal}>{fmt(totalRestante)}</span></div>
            {view === "lista" && <button style={S.btnPrimary} onClick={openNew}>+ Adicionar</button>}
          </div>
        </div>
      </header>
      <div style={S.body}>
        {view === "lista" && <ListView items={filtered} allItems={items} filterStatus={filterStatus} setFilterStatus={setFilterStatus} search={search} setSearch={setSearch} onOpen={openItem} onNew={openNew} melhorLoja={melhorLoja} />}
        {view === "detalhe" && editData && <DetailView item={editData} setItem={setEditData} editMode={editMode} setEditMode={setEditMode} onSave={saveEdit} onDelete={deleteItem} onBack={() => setView("lista")} isNew={!activeId} melhorLoja={melhorLoja} saving={saving} />}
      </div>
    </div>
  );
}

function ListView({ items, allItems, filterStatus, setFilterStatus, search, setSearch, onOpen, onNew, melhorLoja }) {
  const counts = ["Pesquisando","Decidido","Comprado"].map(s => ({ s, n: allItems.filter(i => i.status===s).length, c: STATUS_COLORS[s] }));
  return (
    <>
      <div style={S.filters}>
        <input style={S.searchInput} placeholder="🔍 Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["Todos","Pesquisando","Decidido","Comprado"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ ...S.fBtn, ...(filterStatus===s ? S.fBtnOn : {}) }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={S.summRow}>
        {counts.map(({ s, n, c }) => (
          <div key={s} style={{ ...S.summCard, background: c.bg }}>
            <span style={{ ...S.dot, background: c.dot, width:10, height:10 }} />
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond'", fontSize:26, fontWeight:700, color:c.text, lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:11, color:c.text, fontWeight:500, marginTop:2 }}>{s.toUpperCase()}</div>
            </div>
          </div>
        ))}
        <div style={{ ...S.summCard, background:"#EDE8E0", flex:1 }}>
          <span style={{ fontSize:22 }}>📋</span>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond'", fontSize:26, fontWeight:700, color:"#5C4A32", lineHeight:1 }}>{allItems.length}</div>
            <div style={{ fontSize:11, color:"#8B6F47", fontWeight:500, marginTop:2 }}>TOTAL</div>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:56 }}>🏠</div>
          <div style={{ fontFamily:"'Cormorant Garamond'", fontSize:24, color:"#8B6F47" }}>{allItems.length===0 ? "Comece sua lista!" : "Nada encontrado"}</div>
          {allItems.length===0 && <button style={S.btnPrimary} onClick={onNew}>+ Adicionar primeiro item</button>}
        </div>
      ) : (
        <div style={S.grid}>
          {items.map(item => {
            const loja = melhorLoja(item);
            const c = STATUS_COLORS[item.status];
            return (
              <div key={item.id} className="chover" style={S.card} onClick={() => onOpen(item.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:30 }}>{CAT_ICONS[item.categoria]||"📦"}</span>
                  <span style={{ ...S.badge, background:c.bg, color:c.text }}><span style={{ ...S.dot, background:c.dot }} />{item.status}</span>
                </div>
                <div style={S.cardName}>{item.nome||"Sem nome"}</div>
                {item.marca && <div style={S.cardMeta}>{item.marca}{item.modelo ? ` · ${item.modelo}` : ""}</div>}
                {item.voltagem && <div style={S.cardMeta}>⚡ {item.voltagem}</div>}
                {loja?.preco && <div style={S.cardPreco}>{fmt(parsePreco(loja.preco))}{loja.nome && <span style={{ fontSize:11, color:"#A09080", marginLeft:5 }}>· {loja.nome}</span>}</div>}
                {item.lojas.length > 1 && <div style={{ fontSize:11, color:"#A09080", marginTop:4 }}>🔍 {item.lojas.length} lojas comparadas</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function DetailView({ item, setItem, editMode, setEditMode, onSave, onDelete, onBack, isNew, melhorLoja, saving }) {
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState({ text:"", type:"" });

  const upd = (f, v) => setItem(p => ({ ...p, [f]: v }));
  const updLoja = (idx, f, v) => setItem(p => ({ ...p, lojas: p.lojas.map((l,i) => i===idx ? { ...l, [f]:v } : l) }));
  const addLoja = (data={}) => setItem(p => ({ ...p, lojas: [...p.lojas, { nome:"", preco:"", url:"", escolhida:false, ...data }] }));
  const removeLoja = (idx) => setItem(p => ({ ...p, lojas: p.lojas.filter((_,i) => i!==idx) }));
  const escolher = (idx) => setItem(p => ({ ...p, lojas: p.lojas.map((l,i) => ({ ...l, escolhida: i===idx })) }));

  const handleScrape = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setScraping(true);
    setScrapeMsg({ text:"🔍 Buscando dados do produto…", type:"info" });
    try {
      const res = await fetch("/api/scrape", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok || data.error) { setScrapeMsg({ text:"❌ Não consegui extrair os dados. Tente preencher manualmente.", type:"error" }); return; }
      setItem(p => ({
        ...p,
        nome: data.nome||p.nome, categoria: data.categoria||p.categoria,
        marca: data.marca||p.marca, modelo: data.modelo||p.modelo,
        cor: data.cor||p.cor, voltagem: data.voltagem||p.voltagem,
        potencia: data.potencia||p.potencia, dimensoes: data.dimensoes||p.dimensoes,
        capacidade: data.capacidade||p.capacidade, garantia: data.garantia||p.garantia,
        avaliacao: data.avaliacao||p.avaliacao, specs_extras: data.specs_extras||p.specs_extras,
        lojas: [...p.lojas, { nome: data.loja||"Loja", preco: data.preco||"", url, escolhida:false }],
      }));
      setScrapeMsg({ text:"✅ Dados importados! Confira e ajuste se necessário.", type:"success" });
      setUrlInput("");
    } catch { setScrapeMsg({ text:"❌ Erro inesperado.", type:"error" }); }
    finally { setScraping(false); }
  };

  const precos = item.lojas.map(l => parsePreco(l.preco)).filter(v => v > 0);
  const minP = precos.length ? Math.min(...precos) : 0;
  const maxP = precos.length ? Math.max(...precos) : 0;
  const msgBg = { success:"#D4EDDA", error:"#F8D7DA", info:"#FFF3CD" };
  const msgColor = { success:"#155724", error:"#721C24", info:"#856404" };

  return (
    <div style={S.detail}>
      <div style={S.detailBar}>
        <button style={S.backBtn} onClick={onBack}>← Voltar</button>
        <div style={{ display:"flex", gap:8 }}>
          {!isNew && !editMode && <><button style={S.btnSec} onClick={() => setEditMode(true)}>✏️ Editar</button><button style={{ ...S.btnSec, color:"#C0392B" }} onClick={() => onDelete(item.id)}>🗑️</button></>}
          {(editMode||isNew) && <><button style={S.btnSec} onClick={onBack}>Cancelar</button><button style={S.btnPrimary} onClick={onSave} disabled={!item.nome?.trim()||saving}>{saving?"⏳ Salvando…":"💾 Salvar"}</button></>}
        </div>
      </div>
      <div style={S.dBody}>

        {(editMode||isNew) && (
          <div style={{ ...S.dCard, borderLeft:"4px solid #8B6F47", background:"#FDF8F0" }}>
            <div style={S.secTitle}>🔗 Importar por link</div>
            <div style={{ fontSize:13, color:"#7A5C35", marginBottom:10, lineHeight:1.6 }}>Cole o link do produto (Casas Bahia, Magazine Luiza, Amazon…) e preenchemos tudo automaticamente.</div>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...S.input, flex:1 }} placeholder="https://www.magazineluiza.com.br/..." value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key==="Enter" && !scraping && handleScrape()} disabled={scraping} />
              <button style={{ ...S.btnPrimary, minWidth:110 }} onClick={handleScrape} disabled={scraping||!urlInput.trim()}>{scraping?"⏳ Buscando…":"Importar"}</button>
            </div>
            {scrapeMsg.text && <div style={{ marginTop:10, fontSize:13, padding:"9px 12px", borderRadius:8, background:msgBg[scrapeMsg.type], color:msgColor[scrapeMsg.type] }}>{scrapeMsg.text}</div>}
          </div>
        )}

        <div style={S.dCard}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
            <div style={{ fontSize:52 }}>{CAT_ICONS[item.categoria]||"📦"}</div>
            <div style={{ flex:1, minWidth:200 }}>
              {editMode||isNew ? <input style={{ ...S.input, fontSize:20, fontFamily:"'Cormorant Garamond'", fontWeight:700 }} placeholder="Nome do produto" value={item.nome} onChange={e => upd("nome", e.target.value)} /> : <div style={{ fontFamily:"'Cormorant Garamond'", fontSize:26, fontWeight:700, color:"#2C1810" }}>{item.nome}</div>}
              <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                {editMode||isNew ? (
                  <><select style={S.sel} value={item.categoria} onChange={e => upd("categoria", e.target.value)}>{Object.keys(CAT_ICONS).map(c => <option key={c}>{c}</option>)}</select>
                  <select style={S.sel} value={item.status} onChange={e => upd("status", e.target.value)}>{["Pesquisando","Decidido","Comprado"].map(s => <option key={s}>{s}</option>)}</select>
                  <select style={S.sel} value={item.prioridade} onChange={e => upd("prioridade", e.target.value)}>{["Alta","Média","Baixa"].map(p => <option key={p}>{p}</option>)}</select></>
                ) : (
                  <><span style={S.tagN}>{item.categoria}</span>
                  <span style={{ ...S.badge, background:STATUS_COLORS[item.status].bg, color:STATUS_COLORS[item.status].text }}><span style={{ ...S.dot, background:STATUS_COLORS[item.status].dot }} />{item.status}</span>
                  <span style={{ ...S.tagN, background: item.prioridade==="Alta"?"#FDECEA":item.prioridade==="Baixa"?"#E8F5E9":"#FFF8E1" }}>{item.prioridade==="Alta"?"🔴":item.prioridade==="Baixa"?"🟢":"🟡"} {item.prioridade}</span></>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={S.dCard}>
          <div style={S.secTitle}>📐 Especificações Técnicas</div>
          <div style={S.specsGrid}>
            {[["Marca","marca"],["Modelo","modelo"],["Cor","cor"],["Voltagem","voltagem"],["Potência","potencia"],["Capacidade","capacidade"],["Dimensões","dimensoes"],["Garantia","garantia"],["Avaliação ⭐","avaliacao"]].map(([label,field]) => (
              <div key={field} style={S.specItem}>
                <div style={S.specLabel}>{label}</div>
                {editMode||isNew ? <input style={{ ...S.input, padding:"6px 10px", fontSize:13 }} value={item[field]||""} onChange={e => upd(field, e.target.value)} placeholder="—" /> : <div style={{ fontSize:14, color:item[field]?"#2C1810":"#C4B49A", fontWeight:item[field]?500:400 }}>{item[field]||"—"}</div>}
              </div>
            ))}
          </div>
          {(editMode||isNew||item.specs_extras) && (
            <div style={{ marginTop:12 }}>
              <div style={S.specLabel}>Outros detalhes</div>
              {editMode||isNew ? <textarea style={S.textarea} rows={2} value={item.specs_extras||""} onChange={e => upd("specs_extras", e.target.value)} placeholder="Outros detalhes..." /> : <div style={{ fontSize:13, color:"#5C4A32", marginTop:4, lineHeight:1.5 }}>{item.specs_extras}</div>}
            </div>
          )}
        </div>

        <div style={S.dCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={S.secTitle}>💰 Comparação de Preços</div>
            {maxP-minP > 0 && !editMode && !isNew && <div style={{ fontSize:12, background:"#D4EDDA", color:"#155724", borderRadius:8, padding:"4px 10px", fontWeight:600 }}>💡 Economia de até {fmt(maxP-minP)}</div>}
          </div>
          {item.lojas.length===0 && !editMode && !isNew && <div style={{ color:"#A09080", fontSize:13 }}>Nenhuma loja. Edite e use "Importar por link".</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {item.lojas.map((loja,idx) => {
              const p = parsePreco(loja.preco);
              const isBest = p > 0 && p === minP && precos.length > 1;
              return (
                <div key={idx} style={{ ...S.lojaRow, ...(loja.escolhida?S.lojaChosen:{}), ...(isBest?{ borderColor:"#28A745" }:{}) }}>
                  {editMode||isNew ? (
                    <><input style={{ ...S.input, flex:1, minWidth:100 }} placeholder="Loja" value={loja.nome} onChange={e => updLoja(idx,"nome",e.target.value)} />
                    <input style={{ ...S.input, width:120 }} placeholder="Preço" value={loja.preco} onChange={e => updLoja(idx,"preco",e.target.value)} />
                    <input style={{ ...S.input, flex:2 }} placeholder="URL" value={loja.url} onChange={e => updLoja(idx,"url",e.target.value)} />
                    <button style={S.iconBtn} onClick={() => escolher(idx)}>{loja.escolhida?"✅":"⭕"}</button>
                    <button style={{ ...S.iconBtn, color:"#DC3545" }} onClick={() => removeLoja(idx)}>✕</button></>
                  ) : (
                    <><span style={{ fontWeight:600, minWidth:110, color:"#2C1810", fontSize:14 }}>{loja.nome||"Loja"}</span>
                    <span style={{ fontFamily:"'Cormorant Garamond'", fontSize:20, fontWeight:700, color:isBest?"#155724":"#2C1810" }}>{p?fmt(p):"—"}</span>
                    {loja.url && <a href={loja.url} target="_blank" rel="noreferrer" style={{ fontSize:12, padding:"3px 10px", background:"#EDE8E0", borderRadius:6, textDecoration:"none", color:"#5C4A32", fontWeight:500 }} onClick={e => e.stopPropagation()}>🔗 Ver</a>}
                    {loja.escolhida && <span style={S.chosenTag}>✅ Escolhida</span>}
                    {isBest && !loja.escolhida && <span style={{ ...S.chosenTag, background:"#D4EDDA", color:"#155724" }}>🏆 Melhor preço</span>}</>
                  )}
                </div>
              );
            })}
          </div>
          {(editMode||isNew) && <button style={S.btnDashed} onClick={() => addLoja()}>+ Adicionar loja manualmente</button>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[{ label:"✅ Prós", field:"pros", border:"#28A745", color:"#155724" },{ label:"❌ Contras", field:"contras", border:"#DC3545", color:"#721C24" }].map(({ label,field,border,color }) => (
            <div key={field} style={{ ...S.dCard, borderLeft:`4px solid ${border}` }}>
              <div style={S.secTitle}>{label}</div>
              {editMode||isNew ? <textarea style={S.textarea} rows={4} placeholder="Um por linha..." value={item[field]||""} onChange={e => upd(field, e.target.value)} /> : (
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {item[field] ? item[field].split("\n").filter(Boolean).map((t,i) => <div key={i} style={{ fontSize:13, lineHeight:1.5, color }}>• {t}</div>) : <span style={{ color:"#C4B49A", fontSize:13 }}>Nada adicionado</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={S.dCard}>
          <div style={S.secTitle}>📝 Notas</div>
          {editMode||isNew ? <textarea style={S.textarea} rows={3} placeholder="Observações, promoção, prazo de entrega..." value={item.notas||""} onChange={e => upd("notas", e.target.value)} /> : <div style={{ fontSize:14, color:item.notas?"#2C1810":"#C4B49A", lineHeight:1.6 }}>{item.notas||"Sem notas."}</div>}
        </div>
      </div>
    </div>
  );
}

const S = {
  root:{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#F5F0E8", color:"#2C1810" },
  header:{ background:"#2C1810", padding:"14px 24px", position:"sticky", top:0, zIndex:100 },
  hInner:{ maxWidth:920, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" },
  logo:{ fontFamily:"'Cormorant Garamond'", fontSize:22, fontWeight:700, color:"#F5E6C8" },
  logoSub:{ fontSize:11, color:"#8B6F47", marginTop:1 },
  hRight:{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  pill:{ background:"rgba(255,255,255,.07)", borderRadius:10, padding:"5px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:1 },
  pillLabel:{ color:"#8B6F47", fontSize:10, fontWeight:600, letterSpacing:"0.5px" },
  pillVal:{ fontFamily:"'Cormorant Garamond'", fontWeight:700, fontSize:15, color:"#F5E6C8" },
  btnPrimary:{ background:"#8B6F47", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontFamily:"'DM Sans'", fontWeight:600, fontSize:13 },
  btnSec:{ background:"rgba(0,0,0,.07)", color:"#2C1810", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontFamily:"'DM Sans'", fontWeight:500, fontSize:13 },
  body:{ maxWidth:920, margin:"0 auto", padding:"24px 16px" },
  filters:{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 },
  searchInput:{ width:"100%", padding:"10px 14px", borderRadius:10, border:"2px solid #E8E0D4", background:"#fff", fontSize:14, color:"#2C1810" },
  fBtn:{ background:"#EDE8E0", border:"none", borderRadius:20, padding:"5px 14px", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans'", fontWeight:500, color:"#6B5744" },
  fBtnOn:{ background:"#2C1810", color:"#F5E6C8" },
  summRow:{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" },
  summCard:{ borderRadius:12, padding:"12px 18px", display:"flex", alignItems:"center", gap:10, flex:"1 1 100px" },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px, 1fr))", gap:14 },
  card:{ background:"#fff", borderRadius:14, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)", border:"1px solid #EDE8E0" },
  cardName:{ fontFamily:"'Cormorant Garamond'", fontWeight:700, fontSize:16, color:"#2C1810", marginBottom:3 },
  cardMeta:{ fontSize:12, color:"#A09080", marginTop:2 },
  cardPreco:{ fontFamily:"'Cormorant Garamond'", fontWeight:700, fontSize:18, color:"#5C4A32", marginTop:6 },
  badge:{ display:"inline-flex", alignItems:"center", gap:5, borderRadius:20, padding:"3px 9px", fontSize:11, fontWeight:500 },
  dot:{ width:7, height:7, borderRadius:"50%", display:"inline-block", flexShrink:0 },
  tagN:{ background:"#EDE8E0", color:"#6B5744", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:500 },
  empty:{ textAlign:"center", padding:"60px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 },
  detail:{ maxWidth:720, margin:"0 auto" },
  detailBar:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  backBtn:{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#8B6F47", fontFamily:"'DM Sans'", fontWeight:600 },
  dBody:{ display:"flex", flexDirection:"column", gap:14 },
  dCard:{ background:"#fff", borderRadius:14, padding:"18px 20px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", border:"1px solid #EDE8E0" },
  secTitle:{ fontWeight:600, fontSize:12, color:"#8B6F47", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.6px" },
  input:{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1.5px solid #DDD5C8", background:"#FAFAF7", fontSize:14, color:"#2C1810" },
  sel:{ padding:"8px 10px", borderRadius:8, border:"1.5px solid #DDD5C8", background:"#FAFAF7", fontSize:13, color:"#2C1810" },
  textarea:{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #DDD5C8", background:"#FAFAF7", fontSize:14, color:"#2C1810", resize:"vertical", lineHeight:1.5, fontFamily:"'DM Sans'" },
  specsGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:12 },
  specItem:{ display:"flex", flexDirection:"column", gap:4 },
  specLabel:{ fontSize:11, color:"#A09080", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" },
  lojaRow:{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", padding:"10px 12px", borderRadius:10, border:"1.5px solid #EDE8E0", background:"#FAFAF7" },
  lojaChosen:{ borderColor:"#8B6F47", background:"#FDF8F0" },
  iconBtn:{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:"2px 4px" },
  btnDashed:{ border:"1.5px dashed #DDD5C8", background:"none", borderRadius:8, padding:"9px", cursor:"pointer", color:"#8B6F47", fontSize:13, fontFamily:"'DM Sans'", width:"100%", marginTop:8 },
  chosenTag:{ background:"#FDF8F0", color:"#8B6F47", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:600 },
};
