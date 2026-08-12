import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
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

  const { dados_do_paciente, tipo_refeicao, opcao_atual } = req.body || {};

  if (!tipo_refeicao) {
    return res.status(400).json({ error: 'Tipo de refeição não informado.' });
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
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
            nome: { type: "string" },
            ingredientes: { type: "array", items: { type: "string" } },
            calorias: { type: "number" },
            proteinas: { type: "number" },
            carboidratos: { type: "number" },
            gorduras: { type: "number" }
          },
          required: ["nome", "ingredientes", "calorias", "proteinas", "carboidratos", "gorduras"]
        }
      }
    });

    const prompt = `Você é um nutricionista clínico especialista na culinária brasileira.
Crie UMA NOVA opção de refeição substituta para o tipo: "${tipo_refeicao}".

Dados do Paciente:
${dados_do_paciente || 'Perfil padrão brasileiro'}

Opção Anterior a ser substituída (Gere algo diferente):
${opcao_atual ? JSON.stringify(opcao_atual) : 'Nenhuma'}

⚠️ REGRAS:
1. Forneça uma opção saborosa, nutritiva e prática.
2. Não repita a refeição anterior.
3. Informe nome, ingredientes com quantidade, calorias (kcal), proteínas (g), carboidratos (g) e gorduras (g).

Responda apenas em JSON.`;

    const result = await model.generateContent(prompt);
    const novaOpcao = JSON.parse(result.response.text());

    return res.status(200).json(novaOpcao);
  } catch (error) {
    console.error("Erro ao gerar opção alternativa:", error);
    return res.status(500).json({ error: "Erro ao gerar opção alternativa: " + error.message });
  }
}
