export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const prompt = `Com base nesta URL de produto de e-commerce brasileiro, identifique o produto e retorne suas especificações técnicas.
URL: ${url}
Retorne SOMENTE um objeto JSON válido, sem markdown, sem explicação.
{
  "nome": "nome completo do produto",
  "preco": null,
  "loja": "nome da loja extraído da URL",
  "categoria": "uma de: Cozinha, Lavanderia, Climatização, Limpeza, Eletrônicos, Outro",
  "marca": "marca",
  "modelo": "modelo/código",
  "cor": "cor se identificável",
  "voltagem": "voltagem típica do produto",
  "potencia": "potência em watts se aplicável",
  "dimensoes": "dimensões típicas se conhecidas",
  "capacidade": "capacidade se aplicável",
  "garantia": "garantia padrão do fabricante",
  "avaliacao": null,
  "specs_extras": "principais características, máx 150 chars"
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
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    
    // Se a API retornou erro, manda o erro completo
    if (data.error) {
      return res.status(500).json({ error: data.error.message, type: data.error.type, raw: data });
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    if (!text) return res.status(422).json({ error: 'Empty response', raw: data });

    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse', text });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
