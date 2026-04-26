export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const prompt = `Pesquise informações sobre o produto neste link: ${url}

Use a ferramenta de busca para encontrar os dados deste produto específico.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem explicação.

Formato exato (use null para campos não encontrados):
{
  "nome": "nome completo do produto",
  "preco": "preço como número string, ex: 1299.90",
  "loja": "nome da loja",
  "categoria": "uma de: Cozinha, Lavanderia, Climatização, Limpeza, Eletrônicos, Outro",
  "marca": "marca do produto",
  "modelo": "modelo ou código",
  "cor": "cor se disponível",
  "voltagem": "voltagem (ex: 220V, Bivolt)",
  "potencia": "potência em watts",
  "dimensoes": "dimensões em cm",
  "capacidade": "capacidade (ex: 10kg, 400L)",
  "garantia": "prazo de garantia",
  "avaliacao": "nota média (ex: 4.5)",
  "specs_extras": "outras specs relevantes, máx 150 chars"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse product data' });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
