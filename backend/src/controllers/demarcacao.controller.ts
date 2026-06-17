import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { successResponse } from '../utils/response'

export class DemarcacaoController {
  async analisarMapa(req: AuthRequest, res: Response) {
    const { imagemBase64 } = req.body as { imagemBase64: string }

    if (!imagemBase64) {
      return res.status(400).json({ success: false, message: 'Imagem não fornecida' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'OPENAI_API_KEY não configurada no servidor' })
    }

    const prompt = `Você é um especialista em análise de plantas e mapas de loteamento imobiliário brasileiro.

Analise esta imagem de um mapa de loteamento e extraia os dados estruturados.

IMPORTANTE: Os números individuais dos lotes podem ser muito pequenos para ler. Nesse caso:
- Identifique as QUADRAS (blocos/seções maiores separadas por ruas) pelo layout visual
- Use cores diferentes para distinguir as quadras se não houver nomes legíveis
- Para lotes, use o padrão "Lote 01", "Lote 02"... para cada quadra identificada
- Leia a LEGENDA do mapa para entender as dimensões dos lotes (ex: 10x25, 15x30)
- Identifique ruas, áreas verdes, reservas visíveis no mapa

Retorne APENAS um JSON válido com esta estrutura:
{
  "quadras": [
    { "nome": "string" }
  ],
  "lotes": [
    { "numero": "string", "quadra": "string", "area": number_ou_null }
  ],
  "outros": [
    { "tipo": "string", "nome": "string" }
  ]
}

Regras:
- Se não conseguir ler os nomes das quadras, use "Quadra A", "Quadra B", "Quadra C"...
- Se não conseguir contar lotes individuais, estime baseado no grid visual e crie "Lote 01" a "Lote XX"
- área: calcule em m² a partir da legenda (ex: 10x25 = 250, 15x30 = 450)
- tipos válidos para outros: "Rua / Via", "Área Verde", "Área de Lazer", "Reserva", "Outro"
- Retorne APENAS o JSON, sem explicações, sem markdown
- NUNCA retorne arrays vazios — sempre extraia algo do mapa`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imagemBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      return res.status(502).json({ success: false, message: 'Erro ao comunicar com a API da OpenAI' })
    }

    const openaiData = await openaiResponse.json() as any
    const content = openaiData.choices?.[0]?.message?.content || '{}'

    let resultado
    try {
      resultado = JSON.parse(content)
    } catch {
      return res.status(502).json({ success: false, message: 'A IA não retornou um JSON válido', raw: content })
    }

    return successResponse(res, resultado, 'Mapa analisado com sucesso')
  }
}
