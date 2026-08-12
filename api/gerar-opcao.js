import { GoogleGenerativeAI } from "@google/generative-ai";

const opcoesFallback = {
  "Café da manhã": [
    { nome: "Tapicoa com Ovos Mexidos e Queijo", ingredientes: ["2 colheres de massa de tapioca", "2 ovos mexidos", "1 fatia de queijo mussarela"], calorias: 390, proteinas: 20, carboidratos: 40, gorduras: 14 },
    { nome: "Vitamina de Abacate com Proteína e Aveia", ingredientes: ["100g de abacate", "200ml de leite de amêndoas", "1 scoop de proteína em pó", "2 colheres de aveia"], calorias: 410, proteinas: 24, carboidratos: 35, gorduras: 18 }
  ],
  "Lanche da manhã": [
    { nome: "Iogurte com Mel e Nozes", ingredientes: ["170g de iogurte grego", "1 colher de sobremesa de mel", "4 nozes picadas"], calorias: 210, proteinas: 14, carboidratos: 22, gorduras: 8 }
  ],
  "Almoço": [
    { nome: "Carne Moída com Mandioquinha e Couve Refogada", ingredientes: ["130g de patinho moído", "150g de mandioquinha cozida", "1 xícara de couve refogada no alho"], calorias: 480, proteinas: 42, carboidratos: 44, gorduras: 12 },
    { nome: "Sobrecoxa Assada sem Pele com Arroz e Salada", ingredientes: ["140g de sobrecoxa assada", "4 colheres de arroz integral", "Salada verde com tomate"], calorias: 510, proteinas: 38, carboidratos: 46, gorduras: 16 }
  ],
  "Lanche da tarde": [
    { nome: "Pão de Queijo Fit de Frigideira", ingredientes: ["1 ovo", "1 colher de goma de tapioca", "1 colher de polvilho azedo", "1 colher de requeijão light"], calorias: 240, proteinas: 12, carboidratos: 26, gorduras: 9 }
  ],
  "Jantar": [
    { nome: "Sopa Crema de Abóbora com Frango", ingredientes: ["250ml de sopa de abóbora cabotiá", "120g de peito de frango desfiado"], calorias: 330, proteinas: 34, carboidratos: 28, gorduras: 6 }
  ]
};

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

  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

  if (!apiKey || !apiKey.startsWith("AIzaSy")) {
    const list = opcoesFallback[tipo_refeicao] || opcoesFallback["Almoço"];
    const randomOpcao = list[Math.floor(Math.random() * list.length)];
    return res.status(200).json(randomOpcao);
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

    const prompt = `Você é um nutricionista clínico. Crie UMA NOVA opção de refeição substituta para: "${tipo_refeicao}".

Dados do Paciente:
${dados_do_paciente || 'Perfil padrão'}

Opção Anterior (não repetir):
${opcao_atual ? JSON.stringify(opcao_atual) : 'Nenhuma'}

Informe nome, ingredientes com quantidade, calorias (kcal), proteínas (g), carboidratos (g) e gorduras (g) em JSON.`;

    const result = await model.generateContent(prompt);
    const novaOpcao = JSON.parse(result.response.text());

    return res.status(200).json(novaOpcao);
  } catch (error) {
    console.warn("Erro ao trocar opção com Gemini. Usando opção de contingência:", error.message);
    const list = opcoesFallback[tipo_refeicao] || opcoesFallback["Almoço"];
    const randomOpcao = list[Math.floor(Math.random() * list.length)];
    return res.status(200).json(randomOpcao);
  }
}
