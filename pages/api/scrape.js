export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let html = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      }
    });
    html = await response.text();
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .slice(0, 15000);
  } catch (e) {
    html = '';
  }

  const prompt = `Analise esta URL${html ? ' e o conteúdo da página' : ''} de produto de e-commerce brasileiro e extraia as informações.

URL: ${url}
${html ? `\nCONTEÚDO DA PÁGINA:\n${html}` : ''}

Retorne SOMENTE um objeto JSON válido, sem markdown, sem explicação.
{
  "nome": "nome completo do produto",
  "preco_avista": "preço à vista/pix como número string ex: 2719.32",
  "preco_parcelado": "preço parcelado como número string ex: 2999.00",
  "parcelas": "descrição do parcelamento ex: 10x de R$ 299,90",
  "loja": "nome da loja",
  "categoria": "uma de: Cozinha, Lavanderia, Climatização, Limpeza, Eletrônicos, Outro",
  "marca": "marca",
  "modelo": "modelo/código",
  "cor": "cor",
  "voltagem": "voltagem ex: Bivolt",
  "potencia": "potência em watts",
  "dimensoes": "AxLxP em cm",
  "capacidade": "ex: 399L",
  "garantia": "garantia",
  "avaliacao": "nota ex: 4.5",
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
        model: 'claude-opus-4-7',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message, type: data.error.type });

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse', text });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
