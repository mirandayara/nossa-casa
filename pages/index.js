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
  Pesquisando: { bg: "#FDF6E3", text: "#8B6914", dot: "#D4A843", border: "#E8D5A3" },
  Decidido:    { bg: "#E8F4F0", text: "#2D6B55", dot: "#4CAF89", border: "#A8D5C5" },
  Comprado:    { bg: "#F0EBE3", text: "#6B4423", dot: "#C17F4F", border: "#D4B896" },
};

const CAT_ICONS = {
  Cozinha: "🍳", Lavanderia: "👕", Climatização: "❄️",
  Limpeza: "🧹", Eletrônicos: "📺", Outro: "📦",
};

const CAT_COLORS = {
  Cozinha: "#C17F4F", Lavanderia: "#4CAF89", Climatização: "#5B8DB8",
  Limpeza: "#8B6F47", Eletrônicos: "#7B5EA7", Outro: "#9E9E9E",
};

const fmt = (v) =>
  isNaN(v) || v === 0 ? "—" :
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const parsePreco = (s) => {
  if (!s) return 0;
  const str = String(s).replace(/[R$\s]/g, "").trim();
  if (str.includes(",")) return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(str) || 0;
};

const calcParcelas = (precoParcelado, nParcelas, juros = 0.0099) => {
  if (!precoParcelado || nParcelas <= 0) return null;
  const p = parsePreco(precoParcelado);
  if (p <= 0) return null;
  if (nParcelas <= 10) return { valor: p / nParcelas, total: p, comJuros: false };
  const parcela = p * (juros * Math.pow(1 + juros, nParcelas)) / (Math.pow(1 + juros, nParcelas) - 1);
  return { valor: parcela, total: parcela * nParcelas, comJuros: true };
};

const newItem = () => ({
  id: `item_${Date.now()}`,
  nome: "", categoria: "Outro", status: "Pesquisando", prioridade: "Média",
  adicionadoPor: "Mo14", imagem: "", marca: "", modelo: "", cor: "", voltagem: "",
  potencia: "", dimensoes: "", capacidade: "", garantia: "", avaliacao: "",
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
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
      const v = parsePreco(l.preco_pix);
      return !b || (v > 0 && v < parsePreco(b?.preco_pix)) ? l : b;
    }, null);
  }

  const totalInvestido = items.filter((i) => i.status === "Comprado")
    .reduce((a, i) => { const l = melhorLoja(i); return a + parsePreco(l?.preco_pix); }, 0);
  const totalRestante = items.filter((i) => i.status !== "Comprado")
    .reduce((a, i) => { const l = melhorLoja(i); return a + parsePreco(l?.preco_pix); }, 0);

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
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F7F3EE" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500&display=swap');`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16, animation:"pulse 2s infinite" }}>🏡</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"#8B6F47", letterSpacing:"0.02em" }}>preparando o ninho…</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Jost',sans-serif", minHeight:"100vh", background:"#F7F3EE", color:"#2C1F14" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#F7F3EE}
        input,textarea,select{font-family:'Jost',sans-serif}
        .card-item{transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s ease;cursor:pointer}
        .card-item:hover{transform:translateY(-6px) rotate(.3deg);box-shadow:0 20px 48px rgba(44,31,20,.14)!important}
        .btn-hover{transition:all .2s}
        .btn-hover:hover{transform:translateY(-1px);filter:brightness(1.05)}
        input:focus,textarea:focus,select:focus{outline:2px solid #C17F4F;outline-offset:2px;border-color:#C17F4F!important}
        button:disabled{opacity:.45;cursor:not-allowed}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#D4B896;border-radius:3px}
        .fade-in{animation:fadeUp .4s ease forwards}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .grain::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;opacity:.4}
      `}</style>

      <div className="grain" />

      {/* HEADER */}
      <header style={{ background:"linear-gradient(135deg, #2C1F14 0%, #4A2E1A 60%, #6B3F20 100%)", padding:"0", position:"sticky", top:0, zIndex:100, boxShadow:"0 4px 24px rgba(44,31,20,.3)" }}>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div onClick={() => setView("lista")} style={{ cursor:"pointer" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:"#F5E6C8", letterSpacing:"-.01em", lineHeight:1 }}>
              🏡 Nossa Casa
            </div>
            <div style={{ fontSize:11, color:"#C17F4F", marginTop:3, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:500 }}>
              Lista de Eletrodomésticos
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ background:"rgba(255,255,255,.06)", backdropFilter:"blur(8px)", borderRadius:12, padding:"8px 16px", border:"1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize:10, color:"#C17F4F", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" }}>Investido</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:17, color:"#F5E6C8", marginTop:1 }}>{fmt(totalInvestido)}</div>
            </div>
            <div style={{ background:"rgba(255,255,255,.06)", backdropFilter:"blur(8px)", borderRadius:12, padding:"8px 16px", border:"1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize:10, color:"#C17F4F", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" }}>A comprar</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:17, color:"#F5E6C8", marginTop:1 }}>{fmt(totalRestante)}</div>
            </div>
            {view === "lista" && (
              <button className="btn-hover" onClick={openNew} style={{ background:"linear-gradient(135deg, #C17F4F, #A86535)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:600, fontSize:13, letterSpacing:"0.05em", boxShadow:"0 4px 16px rgba(193,127,79,.4)" }}>
                + Adicionar
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px" }}>
        {view === "lista" && (
          <ListView items={filtered} allItems={items} filterStatus={filterStatus} setFilterStatus={setFilterStatus} search={search} setSearch={setSearch} onOpen={openItem} onNew={openNew} melhorLoja={melhorLoja} mounted={mounted} />
        )}
        {view === "detalhe" && editData && (
          <DetailView item={editData} setItem={setEditData} editMode={editMode} setEditMode={setEditMode} onSave={saveEdit} onDelete={deleteItem} onBack={() => setView("lista")} isNew={!activeId} melhorLoja={melhorLoja} saving={saving} />
        )}
      </div>
    </div>
  );
}

function ListView({ items, allItems, filterStatus, setFilterStatus, search, setSearch, onOpen, onNew, melhorLoja, mounted }) {
  const counts = ["Pesquisando","Decidido","Comprado"].map(s => ({ s, n: allItems.filter(i => i.status===s).length, c: STATUS_COLORS[s] }));

  return (
    <>
      {/* SEARCH + FILTERS */}
      <div style={{ marginBottom:24 }}>
        <div style={{ position:"relative", marginBottom:14 }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>🔍</span>
          <input
            style={{ width:"100%", padding:"12px 14px 12px 42px", borderRadius:14, border:"2px solid #E8D5C0", background:"#fff", fontSize:14, color:"#2C1F14", boxShadow:"0 2px 12px rgba(44,31,20,.06)" }}
            placeholder="Buscar produto…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["Todos","Pesquisando","Decidido","Comprado"].map(s => {
            const active = filterStatus === s;
            const c = STATUS_COLORS[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                background: active ? (s === "Todos" ? "#2C1F14" : c.bg) : "rgba(255,255,255,.7)",
                color: active ? (s === "Todos" ? "#F5E6C8" : c.text) : "#8B7355",
                border: `1.5px solid ${active ? (s === "Todos" ? "#2C1F14" : c.border) : "#E8D5C0"}`,
                borderRadius:20, padding:"6px 16px", cursor:"pointer", fontSize:12,
                fontFamily:"'Jost'", fontWeight:500, letterSpacing:"0.04em", transition:"all .2s"
              }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:12, marginBottom:28 }}>
        {counts.map(({ s, n, c }, i) => (
          <div key={s} className="fade-in" style={{ animationDelay:`${i*0.08}s`, background:"#fff", borderRadius:16, padding:"16px 18px", border:`1.5px solid ${c.border}`, boxShadow:"0 2px 12px rgba(44,31,20,.05)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:c.dot, marginBottom:10 }} />
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:c.text, lineHeight:1 }}>{n}</div>
            <div style={{ fontSize:11, color:c.text, fontWeight:500, marginTop:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>{s}</div>
          </div>
        ))}
        <div className="fade-in" style={{ animationDelay:"0.24s", background:"linear-gradient(135deg, #2C1F14, #4A2E1A)", borderRadius:16, padding:"16px 18px", boxShadow:"0 2px 12px rgba(44,31,20,.15)" }}>
          <div style={{ fontSize:18, marginBottom:8 }}>📋</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:"#F5E6C8", lineHeight:1 }}>{allItems.length}</div>
          <div style={{ fontSize:11, color:"#C17F4F", fontWeight:500, marginTop:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>Total</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 20px" }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🏠</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:"#8B6F47", fontStyle:"italic", marginBottom:8 }}>
            {allItems.length === 0 ? "O ninho está vazio…" : "Nada encontrado"}
          </div>
          {allItems.length === 0 && (
            <button className="btn-hover" onClick={onNew} style={{ background:"linear-gradient(135deg, #C17F4F, #A86535)", color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:600, fontSize:14, marginTop:12, boxShadow:"0 4px 16px rgba(193,127,79,.3)" }}>
              + Adicionar primeiro item
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:16 }}>
          {items.map((item, i) => {
            const loja = melhorLoja(item);
            const c = STATUS_COLORS[item.status];
            const preco = parsePreco(loja?.preco_pix);
            const catColor = CAT_COLORS[item.categoria] || "#9E9E9E";
            return (
              <div key={item.id} className="card-item fade-in" style={{ animationDelay:`${i*0.05}s`, background:"#fff", borderRadius:18, overflow:"hidden", boxShadow:"0 4px 16px rgba(44,31,20,.07)", border:"1.5px solid #EDE5DA", display:"flex", flexDirection:"column" }} onClick={() => onOpen(item.id)}>
                {/* Image area */}
                <div style={{ width:"100%", height:160, background:`linear-gradient(135deg, ${catColor}18, ${catColor}08)`, position:"relative", overflow:"hidden" }}>
                  {item.imagem ? (
                    <img src={item.imagem} alt={item.nome} style={{ width:"100%", height:"100%", objectFit:"contain", padding:12 }} onError={e => { e.target.style.display="none"; }} />
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:52, opacity:.4 }}>
                      {CAT_ICONS[item.categoria]||"📦"}
                    </div>
                  )}
                  {/* status badge */}
                  <div style={{ position:"absolute", top:10, right:10, background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:500, display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, display:"inline-block" }} />
                    {item.status}
                  </div>
                  {/* category accent */}
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${catColor}, ${catColor}80)` }} />
                </div>

                <div style={{ padding:"14px 16px", flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:15, color:"#2C1F14", lineHeight:1.3 }}>{item.nome||"Sem nome"}</div>
                  {item.marca && <div style={{ fontSize:12, color:"#9E8A75" }}>{item.marca}{item.modelo ? ` · ${item.modelo}` : ""}</div>}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:2 }}>
                    {item.voltagem && <span style={{ fontSize:10, background:"#F5F0E8", color:"#8B6F47", borderRadius:6, padding:"2px 8px", fontWeight:500 }}>⚡ {item.voltagem}</span>}
                    {item.adicionadoPor && <span style={{ fontSize:10, background:"#F5F0E8", color:"#8B6F47", borderRadius:6, padding:"2px 8px", fontWeight:500 }}>👤 {item.adicionadoPor}</span>}
                  </div>
                  {preco > 0 && (
                    <div style={{ marginTop:"auto", paddingTop:8, borderTop:"1px dashed #EDE5DA" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:19, color:"#C17F4F" }}>{fmt(preco)}</div>
                      {loja?.nome && <div style={{ fontSize:11, color:"#9E8A75", marginTop:1 }}>{loja.nome}</div>}
                    </div>
                  )}
                  {item.lojas.length > 1 && <div style={{ fontSize:11, color:"#9E8A75" }}>🔍 {item.lojas.length} lojas comparadas</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CalculadoraParcelas({ precoPix, precoParcelado }) {
  const [parcelas, setParcelas] = useState(10);
  const p = parsePreco(precoParcelado) || parsePreco(precoPix);
  if (!p) return null;
  const calc = calcParcelas(String(p), parcelas);
  if (!calc) return null;
  const economiaVista = precoPix ? p - parsePreco(precoPix) : 0;

  return (
    <div style={{ marginTop:14, background:"linear-gradient(135deg, #F7F3EE, #F0EBE3)", borderRadius:12, padding:"16px 18px", border:"1px solid #E8D5C0" }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#8B6F47", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.1em" }}>🧮 Calculadora de Parcelas</div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <span style={{ fontSize:12, color:"#6B4423", fontWeight:500 }}>Parcelar em:</span>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
            <button key={n} onClick={() => setParcelas(n)} style={{
              background: parcelas===n ? "#2C1F14" : "#fff",
              color: parcelas===n ? "#F5E6C8" : "#8B6F47",
              border: `1.5px solid ${parcelas===n ? "#2C1F14" : "#D4B896"}`,
              borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:12,
              fontFamily:"'Jost'", fontWeight:500, transition:"all .15s"
            }}>{n}x</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px,1fr))", gap:10 }}>
        <div style={{ background:"#fff", borderRadius:10, padding:"12px 14px", border:"1px solid #E8D5C0" }}>
          <div style={{ fontSize:10, color:"#8B6F47", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Por parcela</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color: calc.comJuros ? "#B33A2A" : "#2D6B55" }}>{fmt(calc.valor)}</div>
          <div style={{ fontSize:10, color: calc.comJuros ? "#B33A2A" : "#2D6B55", marginTop:2 }}>{calc.comJuros ? "⚠️ com juros" : "✅ sem juros"}</div>
        </div>
        <div style={{ background:"#fff", borderRadius:10, padding:"12px 14px", border:"1px solid #E8D5C0" }}>
          <div style={{ fontSize:10, color:"#8B6F47", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Total</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#2C1F14" }}>{fmt(calc.total)}</div>
          {calc.comJuros && <div style={{ fontSize:10, color:"#B33A2A", marginTop:2 }}>+{fmt(calc.total - p)} juros</div>}
        </div>
        {economiaVista > 0 && (
          <div style={{ background:"linear-gradient(135deg, #E8F4F0, #D4EDE6)", borderRadius:10, padding:"12px 14px", border:"1px solid #A8D5C5" }}>
            <div style={{ fontSize:10, color:"#2D6B55", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Economia Pix</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#2D6B55" }}>{fmt(economiaVista)}</div>
            <div style={{ fontSize:10, color:"#2D6B55", marginTop:2 }}>vs parcelado</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ item, setItem, editMode, setEditMode, onSave, onDelete, onBack, isNew, melhorLoja, saving }) {
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState({ text:"", type:"" });

  const upd = (f, v) => setItem(p => ({ ...p, [f]: v }));
  const updLoja = (idx, f, v) => setItem(p => ({ ...p, lojas: p.lojas.map((l,i) => i===idx ? { ...l, [f]:v } : l) }));
  const addLoja = (data={}) => setItem(p => ({ ...p, lojas: [...p.lojas, { nome:"", preco_pix:"", preco_parcelado:"", url:"", escolhida:false, ...data }] }));
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
      if (!res.ok || data.error) { setScrapeMsg({ text:"❌ Não consegui extrair. Tente preencher manualmente.", type:"error" }); return; }
      setItem(p => ({
        ...p,
        nome: data.nome||p.nome, categoria: data.categoria||p.categoria, imagem: data.imagem||p.imagem,
        marca: data.marca||p.marca, modelo: data.modelo||p.modelo, cor: data.cor||p.cor,
        voltagem: data.voltagem||p.voltagem, potencia: data.potencia||p.potencia,
        dimensoes: data.dimensoes||p.dimensoes, capacidade: data.capacidade||p.capacidade,
        garantia: data.garantia||p.garantia, avaliacao: data.avaliacao||p.avaliacao,
        specs_extras: data.specs_extras||p.specs_extras,
        lojas: [...p.lojas, { nome: data.loja||"Loja", preco_pix: data.preco_pix||"", preco_parcelado: data.preco_parcelado||"", url, escolhida:false }],
      }));
      setScrapeMsg({ text:"✅ Dados importados! Confira os preços.", type:"success" });
      setUrlInput("");
    } catch { setScrapeMsg({ text:"❌ Erro inesperado.", type:"error" }); }
    finally { setScraping(false); }
  };

  const precos = item.lojas.map(l => parsePreco(l.preco_pix)).filter(v => v > 0);
  const minP = precos.length ? Math.min(...precos) : 0;
  const maxP = precos.length ? Math.max(...precos) : 0;
  const catColor = CAT_COLORS[item.categoria] || "#9E9E9E";

  const msgStyle = {
    success: { background:"#E8F4F0", color:"#2D6B55", border:"1px solid #A8D5C5" },
    error:   { background:"#FDECEA", color:"#B33A2A", border:"1px solid #F5C2BC" },
    info:    { background:"#FDF6E3", color:"#8B6914", border:"1px solid #E8D5A3" },
  };

  const cardStyle = { background:"#fff", borderRadius:16, padding:"20px 22px", boxShadow:"0 2px 16px rgba(44,31,20,.06)", border:"1.5px solid #EDE5DA", marginBottom:0 };
  const secTitleStyle = { fontWeight:600, fontSize:11, color:"#C17F4F", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.12em" };
  const inputStyle = { width:"100%", padding:"9px 13px", borderRadius:10, border:"1.5px solid #DDD0C0", background:"#FDFAF7", fontSize:14, color:"#2C1F14" };
  const selStyle = { padding:"9px 11px", borderRadius:10, border:"1.5px solid #DDD0C0", background:"#FDFAF7", fontSize:13, color:"#2C1F14" };

  return (
    <div style={{ maxWidth:740, margin:"0 auto" }} className="fade-in">
      {/* TOP BAR */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#C17F4F", fontFamily:"'Jost'", fontWeight:600, letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:4 }}>
          ← Voltar
        </button>
        <div style={{ display:"flex", gap:8 }}>
          {!isNew && !editMode && (
            <>
              <button className="btn-hover" onClick={() => setEditMode(true)} style={{ background:"#F5F0E8", color:"#2C1F14", border:"1.5px solid #DDD0C0", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:500, fontSize:13 }}>✏️ Editar</button>
              <button className="btn-hover" onClick={() => onDelete(item.id)} style={{ background:"#FDECEA", color:"#B33A2A", border:"1.5px solid #F5C2BC", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:500, fontSize:13 }}>🗑️</button>
            </>
          )}
          {(editMode||isNew) && (
            <>
              <button className="btn-hover" onClick={onBack} style={{ background:"#F5F0E8", color:"#2C1F14", border:"1.5px solid #DDD0C0", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:500, fontSize:13 }}>Cancelar</button>
              <button className="btn-hover" onClick={onSave} disabled={!item.nome?.trim()||saving} style={{ background:"linear-gradient(135deg, #C17F4F, #A86535)", color:"#fff", border:"none", borderRadius:10, padding:"8px 20px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:600, fontSize:13, boxShadow:"0 4px 14px rgba(193,127,79,.35)" }}>
                {saving ? "⏳ Salvando…" : "💾 Salvar"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* IMPORT */}
        {(editMode||isNew) && (
          <div style={{ ...cardStyle, borderLeft:`4px solid #C17F4F`, background:"linear-gradient(135deg, #FDF8F2, #F9F2E8)" }}>
            <div style={secTitleStyle}>🔗 Importar por link</div>
            <div style={{ fontSize:13, color:"#8B6F47", marginBottom:12, lineHeight:1.6 }}>Cole o link do produto e preenchemos tudo automaticamente — incluindo imagem, specs e preços.</div>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...inputStyle, flex:1 }} placeholder="https://www.magazineluiza.com.br/..." value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key==="Enter" && !scraping && handleScrape()} disabled={scraping} />
              <button className="btn-hover" onClick={handleScrape} disabled={scraping||!urlInput.trim()} style={{ background:"linear-gradient(135deg, #C17F4F, #A86535)", color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", cursor:"pointer", fontFamily:"'Jost'", fontWeight:600, fontSize:13, minWidth:110, boxShadow:"0 4px 12px rgba(193,127,79,.3)" }}>
                {scraping ? "⏳ Buscando…" : "Importar"}
              </button>
            </div>
            {scrapeMsg.text && <div style={{ marginTop:10, fontSize:13, padding:"10px 14px", borderRadius:10, ...msgStyle[scrapeMsg.type] }}>{scrapeMsg.text}</div>}
          </div>
        )}

        {/* NOME + IMAGEM */}
        <div style={cardStyle}>
          <div style={{ display:"flex", gap:18, alignItems:"flex-start", flexWrap:"wrap" }}>
            <div style={{ width:100, height:100, borderRadius:14, overflow:"hidden", background:`linear-gradient(135deg, ${catColor}20, ${catColor}08)`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${catColor}30` }}>
              {item.imagem ? (
                <img src={item.imagem} alt={item.nome} style={{ width:"100%", height:"100%", objectFit:"contain", padding:8 }} onError={e => { e.target.style.display="none"; }} />
              ) : (
                <span style={{ fontSize:38, opacity:.5 }}>{CAT_ICONS[item.categoria]||"📦"}</span>
              )}
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              {editMode||isNew ? (
                <>
                  <input style={{ ...inputStyle, fontSize:19, fontFamily:"'Playfair Display',serif", fontWeight:700, marginBottom:8 }} placeholder="Nome do produto" value={item.nome} onChange={e => upd("nome", e.target.value)} />
                  <input style={{ ...inputStyle, fontSize:13, marginBottom:8 }} placeholder="URL da imagem (preenchida automaticamente)" value={item.imagem||""} onChange={e => upd("imagem", e.target.value)} />
                </>
              ) : (
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#2C1F14", lineHeight:1.3, marginBottom:10 }}>{item.nome}</div>
              )}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {editMode||isNew ? (
                  <>
                    <select style={selStyle} value={item.categoria} onChange={e => upd("categoria", e.target.value)}>{Object.keys(CAT_ICONS).map(c => <option key={c}>{c}</option>)}</select>
                    <select style={selStyle} value={item.status} onChange={e => upd("status", e.target.value)}>{["Pesquisando","Decidido","Comprado"].map(s => <option key={s}>{s}</option>)}</select>
                    <select style={selStyle} value={item.prioridade} onChange={e => upd("prioridade", e.target.value)}>{["Alta","Média","Baixa"].map(p => <option key={p}>{p}</option>)}</select>
                    <select style={selStyle} value={item.adicionadoPor||"Mo14"} onChange={e => upd("adicionadoPor", e.target.value)}>{["Mo14","Mo21"].map(p => <option key={p}>{p}</option>)}</select>
                  </>
                ) : (
                  <>
                    <span style={{ background:`${catColor}18`, color:catColor, borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:500 }}>{item.categoria}</span>
                    <span style={{ background:STATUS_COLORS[item.status].bg, color:STATUS_COLORS[item.status].text, border:`1px solid ${STATUS_COLORS[item.status].border}`, borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:500, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:STATUS_COLORS[item.status].dot, display:"inline-block" }} />
                      {item.status}
                    </span>
                    <span style={{ background: item.prioridade==="Alta"?"#FDECEA":item.prioridade==="Baixa"?"#E8F4F0":"#FDF6E3", color: item.prioridade==="Alta"?"#B33A2A":item.prioridade==="Baixa"?"#2D6B55":"#8B6914", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:500 }}>
                      {item.prioridade==="Alta"?"🔴":item.prioridade==="Baixa"?"🟢":"🟡"} {item.prioridade}
                    </span>
                    {item.adicionadoPor && <span style={{ background:"#F5F0E8", color:"#8B6F47", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:500 }}>👤 {item.adicionadoPor}</span>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SPECS */}
        <div style={cardStyle}>
          <div style={secTitleStyle}>📐 Especificações Técnicas</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px,1fr))", gap:12 }}>
            {[["Marca","marca"],["Modelo","modelo"],["Cor","cor"],["Voltagem","voltagem"],["Potência","potencia"],["Capacidade","capacidade"],["Dimensões","dimensoes"],["Garantia","garantia"],["Avaliação ⭐","avaliacao"]].map(([label,field]) => (
              <div key={field}>
                <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>{label}</div>
                {editMode||isNew ? (
                  <input style={{ ...inputStyle, padding:"7px 11px", fontSize:13 }} value={item[field]||""} onChange={e => upd(field, e.target.value)} placeholder="—" />
                ) : (
                  <div style={{ fontSize:14, color:item[field]?"#2C1F14":"#C4B09A", fontWeight:item[field]?500:400 }}>{item[field]||"—"}</div>
                )}
              </div>
            ))}
          </div>
          {(editMode||isNew||item.specs_extras) && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Outros detalhes</div>
              {editMode||isNew ? <textarea style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} rows={2} value={item.specs_extras||""} onChange={e => upd("specs_extras", e.target.value)} placeholder="Outros detalhes relevantes..." /> : <div style={{ fontSize:13, color:"#6B4423", lineHeight:1.6 }}>{item.specs_extras}</div>}
            </div>
          )}
        </div>

        {/* PREÇOS */}
        <div style={cardStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={secTitleStyle}>💰 Comparação de Preços</div>
            {maxP-minP > 0 && !editMode && !isNew && (
              <div style={{ fontSize:12, background:"#E8F4F0", color:"#2D6B55", border:"1px solid #A8D5C5", borderRadius:8, padding:"4px 12px", fontWeight:600 }}>
                💡 Economia de até {fmt(maxP-minP)}
              </div>
            )}
          </div>
          {item.lojas.length===0 && !editMode && !isNew && <div style={{ color:"#9E8A75", fontSize:13 }}>Nenhuma loja ainda. Edite e use "Importar por link".</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {item.lojas.map((loja,idx) => {
              const pPix = parsePreco(loja.preco_pix);
              const pParc = parsePreco(loja.preco_parcelado);
              const isBest = pPix > 0 && pPix === minP && precos.length > 1;
              return (
                <div key={idx} style={{ padding:"16px 18px", borderRadius:12, border:`1.5px solid ${isBest ? "#A8D5C5" : loja.escolhida ? "#D4B896" : "#EDE5DA"}`, background: isBest ? "#F0FAF6" : loja.escolhida ? "#FDF8F2" : "#FDFAF7" }}>
                  {editMode||isNew ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input style={{ ...inputStyle, flex:1 }} placeholder="Nome da loja" value={loja.nome} onChange={e => updLoja(idx,"nome",e.target.value)} />
                        <button onClick={() => escolher(idx)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20 }}>{loja.escolhida?"✅":"⭕"}</button>
                        <button onClick={() => removeLoja(idx)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#B33A2A" }}>✕</button>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <div>
                          <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Preço Pix / À vista</div>
                          <input style={inputStyle} placeholder="ex: 2801.55" value={loja.preco_pix||""} onChange={e => updLoja(idx,"preco_pix",e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Preço parcelado (total)</div>
                          <input style={inputStyle} placeholder="ex: 2949.00" value={loja.preco_parcelado||""} onChange={e => updLoja(idx,"preco_parcelado",e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>URL do produto</div>
                        <input style={inputStyle} placeholder="https://..." value={loja.url||""} onChange={e => updLoja(idx,"url",e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:"#2C1F14" }}>{loja.nome||"Loja"}</span>
                        {loja.escolhida && <span style={{ background:"#FDF8F2", color:"#C17F4F", border:"1px solid #D4B896", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>✅ Escolhida</span>}
                        {isBest && !loja.escolhida && <span style={{ background:"#E8F4F0", color:"#2D6B55", border:"1px solid #A8D5C5", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>🏆 Melhor preço</span>}
                        {loja.url && <a href={loja.url} target="_blank" rel="noreferrer" style={{ fontSize:11, padding:"3px 10px", background:"#F5F0E8", borderRadius:6, textDecoration:"none", color:"#8B6F47", fontWeight:500, border:"1px solid #DDD0C0" }} onClick={e => e.stopPropagation()}>🔗 Ver</a>}
                      </div>
                      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                        {pPix > 0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Pix / À vista</div>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color: isBest ? "#2D6B55" : "#C17F4F" }}>{fmt(pPix)}</div>
                          </div>
                        )}
                        {pParc > 0 && (
                          <div>
                            <div style={{ fontSize:10, color:"#9E8A75", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Parcelado</div>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#6B4423" }}>{fmt(pParc)}</div>
                          </div>
                        )}
                        {pPix > 0 && pParc > 0 && pParc > pPix && (
                          <div style={{ display:"flex", alignItems:"flex-end" }}>
                            <div style={{ background:"#FDF6E3", border:"1px solid #E8D5A3", borderRadius:8, padding:"4px 12px", fontSize:12, color:"#8B6914", fontWeight:600 }}>
                              💸 Pix economiza {fmt(pParc-pPix)}
                            </div>
                          </div>
                        )}
                      </div>
                      {(pPix > 0 || pParc > 0) && <CalculadoraParcelas precoPix={loja.preco_pix} precoParcelado={loja.preco_parcelado||loja.preco_pix} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(editMode||isNew) && (
            <button className="btn-hover" onClick={() => addLoja()} style={{ border:"1.5px dashed #DDD0C0", background:"none", borderRadius:10, padding:"10px", cursor:"pointer", color:"#C17F4F", fontSize:13, fontFamily:"'Jost'", width:"100%", marginTop:10, fontWeight:500 }}>
              + Adicionar loja manualmente
            </button>
          )}
        </div>

        {/* PROS / CONTRAS */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[{ label:"✅ Prós", field:"pros", accent:"#2D6B55", bg:"#E8F4F0", border:"#A8D5C5", color:"#1A4A35" },
            { label:"❌ Contras", field:"contras", accent:"#B33A2A", bg:"#FDECEA", border:"#F5C2BC", color:"#6B1A14" }].map(({ label,field,accent,bg,border,color }) => (
            <div key={field} style={{ ...cardStyle, borderLeft:`4px solid ${accent}` }}>
              <div style={{ ...secTitleStyle, color:accent }}>{label}</div>
              {editMode||isNew ? (
                <textarea style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} rows={4} placeholder="Um por linha..." value={item[field]||""} onChange={e => upd(field, e.target.value)} />
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {item[field] ? item[field].split("\n").filter(Boolean).map((t,i) => (
                    <div key={i} style={{ fontSize:13, lineHeight:1.5, color, display:"flex", gap:6, alignItems:"flex-start" }}>
                      <span style={{ marginTop:3, flexShrink:0 }}>•</span><span>{t}</span>
                    </div>
                  )) : <span style={{ color:"#C4B09A", fontSize:13, fontStyle:"italic" }}>Nada adicionado ainda</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* NOTAS */}
        <div style={cardStyle}>
          <div style={secTitleStyle}>📝 Notas & Observações</div>
          {editMode||isNew ? (
            <textarea style={{ ...inputStyle, resize:"vertical", lineHeight:1.6 }} rows={3} placeholder="Observações gerais, promoções, prazo de entrega, onde encontrou..." value={item.notas||""} onChange={e => upd("notas", e.target.value)} />
          ) : (
            <div style={{ fontSize:14, color:item.notas?"#2C1F14":"#C4B09A", lineHeight:1.7, fontStyle:item.notas?"normal":"italic" }}>
              {item.notas||"Sem notas ainda."}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
