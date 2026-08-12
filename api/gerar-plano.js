import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { dados_do_paciente } = req.body || {};

  if (!dados_do_paciente) {
    return res.status(400).json({ error: 'Dados do paciente ausentes ou inválidos.' });
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_API_KEY não encontrada no ambiente.");
    return res.status(500).json({ error: 'Chave de API do Gemini não configurada no servidor.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            plano_semanal: {
              type: "array",
              description: "Lista estruturada dos 7 dias da semana contendo as refeições diárias.",
              items: {
                type: "object",
                properties: {
                  dia: { 
                    type: "string", 
                    description: "Dia da semana (ex: Segunda-feira, Terça-feira, etc.)" 
                  },
                  refeicoes: {
                    type: "object",
                    properties: {
                      cafe_da_manha: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3 opções de alimentos saudáveis para o café da manhã." 
                      },
                      lanche_manha: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3 opções de alimentos saudáveis para o lanche da manhã." 
                      },
                      almoco: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3 opções de alimentos saudáveis para o almoço." 
                      },
                      lanche_tarde: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3 opções de alimentos saudáveis para o lanche da tarde." 
                      },
                      jantar: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3 opções de alimentos saudáveis para o jantar." 
                      }
                    },
                    required: ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"]
                  }
                },
                required: ["dia", "refeicoes"]
              }
            }
          },
          required: ["plano_semanal"]
        }
      }
    });

    const prompt = `Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira, adicione produtos nacionais e de fácil acesso.
Gere um plano alimentar semanal completo, saudável e diversificado com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${dados_do_paciente}

⚠️ Regras Críticas de Execução:
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como \`\`\`json ... \`\`\`), explicações, introduções ou textos complementares.
- Adapte o cardápio rigorosamente a quaisquer alergias ou restrições descritas nos dados.
- Utilize alimentos comuns, acessíveis e culturalmente aceitos no Brasil.
- Evite repetições monótonas de alimentos nos dias seguidos.

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": {
        "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3"],
        "lanche_manha": ["Opção 1", "Opção 2", "Opção 3"],
        "almoco": ["Opção 1", "Opção 2", "Opção 3"],
        "lanche_tarde": ["Opção 1", "Opção 2", "Opção 3"],
        "jantar": ["Opção 1", "Opção 2", "Opção 3"]
      }
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Validar se o retorno é JSON antes de responder
    const plano = JSON.parse(responseText);
    
    return res.status(200).json(plano);
  } catch (error) {
    console.error("Erro na geração do plano alimentar com IA:", error);
    return res.status(500).json({ error: "Erro interno ao processar a geração com IA. " + error.message });
  }
}
