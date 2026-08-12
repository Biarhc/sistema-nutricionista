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

    const opcaoSchema = {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome atrativo e descritivo da opção de refeição (ex: Omelete com Pão Integral e Banana)" },
        ingredientes: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Lista de ingredientes com quantidades aproximadas (ex: ['2 ovos grandes', '2 fatias de pão integral', '1 banana prata'])" 
        },
        calorias: { type: "number", description: "Quantidade aproximada de calorias em kcal (ex: 420)" },
        proteinas: { type: "number", description: "Quantidade aproximada de proteínas em gramas (ex: 22)" },
        carboidratos: { type: "number", description: "Quantidade aproximada de carboidratos em gramas (ex: 48)" },
        gorduras: { type: "number", description: "Quantidade aproximada de gorduras em gramas (ex: 16)" }
      },
      required: ["nome", "ingredientes", "calorias", "proteinas", "carboidratos", "gorduras"]
    };

    const refeicoesSchema = {
      type: "object",
      properties: {
        cafe_da_manha: { 
          type: "array", 
          items: opcaoSchema, 
          description: "Exatamente 3 opções distintas para o café da manhã." 
        },
        lanche_manha: { 
          type: "array", 
          items: opcaoSchema, 
          description: "Exatamente 3 opções distintas para o lanche da manhã." 
        },
        almoco: { 
          type: "array", 
          items: opcaoSchema, 
          description: "Exatamente 3 opções distintas para o almoço." 
        },
        lanche_tarde: { 
          type: "array", 
          items: opcaoSchema, 
          description: "Exatamente 3 opções distintas para o lanche da tarde." 
        },
        jantar: { 
          type: "array", 
          items: opcaoSchema, 
          description: "Exatamente 3 opções distintas para o jantar." 
        }
      },
      required: ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            plano_semanal: {
              type: "array",
              description: "Estrutura dos 7 dias da semana (Segunda-feira a Domingo).",
              items: {
                type: "object",
                properties: {
                  dia: { type: "string", description: "Nome do dia (ex: Segunda-feira, Terça-feira, etc.)" },
                  refeicoes: refeicoesSchema
                },
                required: ["dia", "refeicoes"]
              }
            }
          },
          required: ["plano_semanal"]
        }
      }
    });

    const prompt = `Você é um nutricionista clínico especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, diversificado e altamente personalizado com base nos dados do paciente fornecidos.

Dados do Paciente (Objetivos, Perfil Antropométrico, Alergias e Restrições):
${dados_do_paciente}

⚠️ REGRAS CRÍTICAS DE EXECUÇÃO:
1. Gere o plano estritamente para os 7 DIAS DA SEMANA (Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado, Domingo).
2. Para CADA DIA, crie as 5 REFEIÇÕES OBRIGATÓRIAS (cafe_da_manha, lanche_manha, almoco, lanche_tarde, jantar).
3. Para CADA REFEIÇÃO, forneça EXATAMENTE 3 OPÇÕES DIFERENTES e equilibradas.
4. Para CADA OPÇÃO, informe obrigatoriamente:
   - Nome prático da refeição
   - Lista de alimentos/ingredientes com suas quantidades estimadas
   - Valor energético aproximado em calorias (kcal)
   - Gramas de Proteínas, Carboidratos e Gorduras
5. Respeite rigorosamente qualquer restrição alimentar ou alergia informada.
6. Utilize ingredientes comuns, acessíveis e saborosos da culinária brasileira.
7. Varie os cardápios ao longo da semana para evitar monotonia.

Responda exclusivamente no formato JSON solicitado.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const plano = JSON.parse(responseText);
    
    return res.status(200).json(plano);
  } catch (error) {
    console.error("Erro na geração do plano alimentar com IA:", error);
    return res.status(500).json({ error: "Erro interno ao processar a geração com IA: " + error.message });
  }
}
