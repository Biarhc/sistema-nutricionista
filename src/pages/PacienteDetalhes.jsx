import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ChevronLeft, Plus, Calendar, Scale, Activity, Apple, Save,
  Clock, Heart, AlertTriangle, Phone, Mail, Check, MessageSquare,
  User, Coffee, BookOpen, ExternalLink, ChevronRight, Sparkles
} from 'lucide-react';

const OBJETIVOS_LIST = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance', 'Reeducação alimentar'];
const NIVEIS_ATIVIDADE_LIST = ['Sedentário', 'Leve', 'Moderado', 'Muito ativo', 'Extremamente ativo'];
const PATOLOGIAS_LIST = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome metabólica', 'Dislipidemia', 'SIBO', 'Anemia', 'Nenhuma'];
const RESTRICOES_LIST = ['Lactose', 'Glúten', 'Açúcar refinado', 'Frutose', 'Soja', 'Ovo', 'Nenhuma'];
const ALERGIAS_LIST = ['Amendoim', 'Nozes', 'Frutos do mar', 'Peixe', 'Trigo', 'Leite', 'Ovo', 'Soja', 'Nenhuma'];

function calcIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const birth = new Date(dataNascimento);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function calcIMC(peso, altura) {
  if (!peso || !altura) return '';
  const h = parseFloat(altura) / 100;
  if (!h) return '';
  return (parseFloat(peso) / (h * h)).toFixed(1);
}

function toggleChip(value, list, setList, noneKeys = ['Nenhuma', 'Nenhum']) {
  const isNone = noneKeys.includes(value);
  if (isNone) {
    setList(list.includes(value) ? [] : [value]);
    return;
  }
  const withoutNone = list.filter(v => !noneKeys.includes(v));
  if (withoutNone.includes(value)) {
    setList(withoutNone.filter(v => v !== value));
  } else {
    setList([...withoutNone, value]);
  }
}

export default function PacienteDetalhes({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dadosSuccessMsg, setDadosSuccessMsg] = useState('');

  // 1. Dados do Paciente (Internal Tab)
  const [dadosTab, setDadosTab] = useState(0);

  // Patient states for editing
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [pesoInicial, setPesoInicial] = useState('');
  const [altura, setAltura] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');
  const [objetivos, setObjetivos] = useState([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState([]);
  const [patologiaTexto, setPatologiaTexto] = useState('');
  const [restricoes, setRestricoes] = useState([]);
  const [restricaoTexto, setRestricaoTexto] = useState('');
  const [alergias, setAlergias] = useState([]);
  const [alergiaTexto, setAlergiaTexto] = useState('');
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState(false);
  const [atividadeFisicaDesc, setAtividadeFisicaDesc] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // 2. Consultas States
  const [consultas, setConsultas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Modal Fields
  const [dataConsulta, setDataConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [pesoConsulta, setPesoConsulta] = useState('');
  const [cinturaConsulta, setCinturaConsulta] = useState('');
  const [quadrilConsulta, setQuadrilConsulta] = useState('');
  const [percentualGorduraConsulta, setPercentualGorduraConsulta] = useState('');
  const [observacoesConsulta, setObservacoesConsulta] = useState('');
  const [proximoRetorno, setProximoRetorno] = useState('');

  // 3. Planos Alimentares States
  const [planosAlimentares, setPlanosAlimentares] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // States for AI Meal Plan Generation
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [tempPlan, setTempPlan] = useState(null);
  const [activeDayTab, setActiveDayTab] = useState('Segunda-feira');
  const [selectedPlanTab, setSelectedPlanTab] = useState('Segunda-feira');

  const handleOptionChange = (dayName, mealKey, optionIdx, value) => {
    setTempPlan(prev => {
      if (!prev) return prev;
      const updatedPlan = { ...prev };
      updatedPlan.plano_semanal = updatedPlan.plano_semanal.map(d => {
        if (d.dia === dayName) {
          const newOptions = [...(d.refeicoes[mealKey] || [])];
          while (newOptions.length < 5) {
            newOptions.push("");
          }
          newOptions[optionIdx] = value;
          return {
            ...d,
            refeicoes: {
              ...d.refeicoes,
              [mealKey]: newOptions
            }
          };
        }
        return d;
      });
      return updatedPlan;
    });
  };

  const handleCreateManualPlan = () => {
    const emptyPlan = {
      plano_semanal: [
        "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
      ].map(dia => ({
        dia,
        refeicoes: {
          cafe_da_manha: ["", "", "", "", ""],
          lanche_manha: ["", "", "", "", ""],
          almoco: ["", "", "", "", ""],
          lanche_tarde: ["", "", "", "", ""],
          jantar: ["", "", "", "", ""]
        }
      }))
    };
    setTempPlan(emptyPlan);
    setActiveDayTab('Segunda-feira');
    setErrorMsg('');
  };

  const handleGeneratePlanWithIA = async () => {
    setLoadingIA(true);
    setTempPlan(null);
    setErrorMsg('');
    
    const messages = [
      "Buscando dados do paciente...",
      "Analisando restrições e alergias...",
      "Consultando histórico clínico...",
      "IA calculando cardápio...",
      "Estruturando refeições brasileiras...",
      "Finalizando plano alimentar..."
    ];
    let msgIdx = 0;
    setLoadingMsg(messages[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMsg(messages[msgIdx]);
    }, 2000);

    try {
      const patientSummary = `
- Nome: ${nome}
- Idade: ${idade !== null ? `${idade} anos` : 'Não informada'}
- Sexo: ${sexo || 'Não informado'}
- Peso Atual: ${currentPeso ? `${currentPeso} kg` : 'Não informado'}
- Altura: ${altura ? `${altura} cm` : 'Não informada'}
- Nível de Atividade: ${nivelAtividade || 'Não informado'}
- Pratica Atividade Física: ${atividadeFisica ? `Sim (${atividadeFisicaDesc})` : 'Não'}
- Consumo de Água: ${litrosAgua ? `${litrosAgua} L/dia` : 'Não informado'}
- Horário Acorda/Dorme: ${horarioAcorda || 'Não informado'} / ${horarioDorme || 'Não informado'}
- Objetivos: ${objetivos.join(', ')} ${objetivoTexto ? `(${objetivoTexto})` : ''}
- Patologias: ${patologias.join(', ')} ${patologiaTexto ? `(${patologiaTexto})` : ''}
- Restrições Alimentares: ${restricoes.join(', ')} ${restricaoTexto ? `(${restricaoTexto})` : ''}
- Alergias: ${alergias.join(', ')} ${alergiaTexto ? `(${alergiaTexto})` : ''}
- Medicamentos: ${medicamentos || 'Nenhum'}
- Suplementos: ${suplementos || 'Nenhum'}
- Observações Gerais: ${observacoes || 'Nenhuma'}
      `.trim();

      const response = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dados_do_paciente: patientSummary }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.plano_semanal) {
        throw new Error("Formato de retorno inválido da IA.");
      }

      const sanitizedWeekly = data.plano_semanal.map(d => {
        const cleanedRefeicoes = {};
        const mealKeys = ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"];
        
        mealKeys.forEach(key => {
          const items = Array.isArray(d.refeicoes[key]) ? d.refeicoes[key] : [];
          const padded = [...items];
          while (padded.length < 5) padded.push("");
          cleanedRefeicoes[key] = padded;
        });

        return {
          dia: d.dia,
          refeicoes: cleanedRefeicoes
        };
      });

      setTempPlan({ plano_semanal: sanitizedWeekly });
      setActiveDayTab('Segunda-feira');
      setSuccessMsg("Plano alimentar gerado com sucesso pela IA!");
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Erro ao gerar plano:", err);
      setErrorMsg("Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?");
    } finally {
      clearInterval(msgInterval);
      setLoadingIA(false);
    }
  };

  const handleEditSelectedPlan = () => {
    if (!selectedPlan || !selectedPlan.conteudo) return;
    
    if (selectedPlan.conteudo.plano_semanal) {
      const sanitizedWeekly = selectedPlan.conteudo.plano_semanal.map(d => {
        const cleanedRefeicoes = {};
        const mealKeys = ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"];
        
        mealKeys.forEach(key => {
          const items = Array.isArray(d.refeicoes[key]) ? d.refeicoes[key] : [];
          const padded = [...items];
          while (padded.length < 5) padded.push("");
          cleanedRefeicoes[key] = padded;
        });

        return {
          dia: d.dia,
          refeicoes: cleanedRefeicoes
        };
      });
      setTempPlan({ plano_semanal: sanitizedWeekly });
      setActiveDayTab('Segunda-feira');
    } else {
      const legacyMeals = selectedPlan.conteudo.refeicoes || [];
      const cafe = legacyMeals.find(m => m.nome?.toLowerCase()?.includes("café"))?.itens?.split('\n') || [];
      const lancheM = legacyMeals.find(m => m.nome?.toLowerCase()?.includes("lanche da manhã") || m.nome?.toLowerCase()?.includes("lanche de manhã"))?.itens?.split('\n') || [];
      const almoco = legacyMeals.find(m => m.nome?.toLowerCase()?.includes("almoço"))?.itens?.split('\n') || [];
      const lancheT = legacyMeals.find(m => m.nome?.toLowerCase()?.includes("lanche da tarde") || m.nome?.toLowerCase()?.includes("lanche de tarde"))?.itens?.split('\n') || [];
      const jantar = legacyMeals.find(m => m.nome?.toLowerCase()?.includes("jantar"))?.itens?.split('\n') || [];

      const pad = arr => {
        const res = [...arr];
        while (res.length < 5) res.push("");
        return res;
      };

      const convertedPlan = {
        plano_semanal: [
          "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
        ].map(dia => ({
          dia,
          refeicoes: {
            cafe_da_manha: pad(cafe),
            lanche_manha: pad(lancheM),
            almoco: pad(almoco),
            lanche_tarde: pad(lancheT),
            jantar: pad(jantar)
          }
        }))
      };
      setTempPlan(convertedPlan);
      setActiveDayTab('Segunda-feira');
    }
  };

  const handleSavePlan = async () => {
    if (!tempPlan) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const cleanedWeekly = tempPlan.plano_semanal.map(d => {
        const cleanedRefeicoes = {};
        Object.keys(d.refeicoes).forEach(mealKey => {
          cleanedRefeicoes[mealKey] = d.refeicoes[mealKey]
            .map(opt => opt.trim())
            .filter(Boolean);
        });
        return {
          dia: d.dia,
          refeicoes: cleanedRefeicoes
        };
      });

      const payload = {
        paciente_id: id,
        conteudo: { plano_semanal: cleanedWeekly }
      };

      const { error } = await supabase
        .from('planos_alimentares')
        .insert([payload]);

      if (error) throw error;

      setSuccessMsg("Plano alimentar salvo com sucesso!");
      setTimeout(() => setSuccessMsg(''), 4000);
      setTempPlan(null);
      await fetchPatientProfile();
    } catch (err) {
      console.error("Erro ao salvar plano:", err);
      setErrorMsg(err.message || "Falha ao salvar plano alimentar.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && id) {
      fetchPatientProfile();
    }
  }, [session, id]);

  const fetchPatientProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Paciente Profile
      const { data: pat, error: patErr } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .eq('nutricionista_id', session.user.id)
        .single();
      
      if (patErr) throw patErr;

      // Map to individual states for inline editing
      setNome(pat.nome || '');
      setDataNascimento(pat.data_nascimento || '');
      setSexo(pat.sexo || '');
      setTelefone(pat.telefone || '');
      setWhatsapp(pat.whatsapp || '');
      setEmail(pat.email || '');
      setPesoInicial(pat.peso_inicial ? pat.peso_inicial.toString() : '');
      setAltura(pat.altura ? pat.altura.toString() : '');
      setMedicamentos(pat.medicamentos || '');
      setSuplementos(pat.suplementos || '');
      setObjetivos(pat.objetivos || []);
      setObjetivoTexto(pat.objetivo_texto || '');
      setNivelAtividade(pat.nivel_atividade || '');
      setPatologias(pat.patologias || []);
      setPatologiaTexto(pat.patologia_texto || '');
      setRestricoes(pat.restricoes_alimentares || []);
      setRestricaoTexto(pat.restricao_texto || '');
      setAlergias(pat.alergias || []);
      setAlergiaTexto(pat.alergia_texto || '');
      setRefeicoesPorDia(pat.refeicoes_por_dia ? pat.refeicoes_por_dia.toString() : '');
      setHorarioAcorda(pat.horario_acorda || '');
      setHorarioDorme(pat.horario_dorme || '');
      setLitrosAgua(pat.litros_agua ? pat.litros_agua.toString() : '');
      setAtividadeFisica(!!pat.atividade_fisica);
      setAtividadeFisicaDesc(pat.atividade_fisica_descricao || '');
      setObservacoes(pat.observacoes || '');

      // 2. Fetch Consultations (Desc)
      const { data: cons, error: consErr } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });
      
      if (consErr) throw consErr;
      setConsultas(cons || []);

      // 3. Fetch Plans (Desc)
      const { data: plans, error: plansErr } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });
      
      if (plansErr) throw plansErr;
      setPlanosAlimentares(plans || []);
      
      // Auto-select latest plan
      if (plans && plans.length > 0) {
        setSelectedPlan(plans[0]);
      } else {
        setSelectedPlan(null);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao carregar dados do prontuário.');
    } finally {
      setLoading(false);
    }
  };

  const mergeTextIntoArray = (arr, text) => {
    if (!text.trim()) return arr.length > 0 ? arr : null;
    const extras = text.split(',').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...arr, ...extras])];
    return merged.length > 0 ? merged : null;
  };

  // Seção 1 — Salvar Alterações Cadastrais
  const handleUpdatePatientData = async () => {
    if (!nome.trim()) {
      setErrorMsg('O nome do paciente é obrigatório.');
      return;
    }
    setErrorMsg('');
    setDadosSuccessMsg('');
    setSavingDados(true);
    try {
      const payload = {
        nome: nome.trim(),
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        peso_inicial: pesoInicial ? parseFloat(pesoInicial) : null,
        altura: altura ? parseFloat(altura) : null,
        medicamentos: medicamentos || null,
        suplementos: suplementos || null,
        objetivos: objetivos,
        objetivo_texto: objetivoTexto || null,
        nivel_atividade: nivelAtividade || null,
        patologias: patologias,
        patologia_texto: patologiaTexto || null,
        restricoes_alimentares: restricoes,
        restricao_texto: restricaoTexto || null,
        alergias: alergias,
        alergia_texto: alergiaTexto || null,
        refeicoes_por_dia: refeicoesPorDia ? parseInt(refeicoesPorDia) : null,
        horario_acorda: horarioAcorda || null,
        horario_dorme: horarioDorme || null,
        litros_agua: litrosAgua ? parseFloat(litrosAgua) : null,
        atividade_fisica: atividadeFisica,
        atividade_fisica_descricao: atividadeFisica ? atividadeFisicaDesc : null,
        observacoes: observacoes || null
      };

      const { error } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', id)
        .eq('nutricionista_id', session.user.id);

      if (error) throw error;
      
      setDadosSuccessMsg('Dados cadastrais atualizados com sucesso!');
      setTimeout(() => setDadosSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Falha ao salvar dados do paciente.');
    } finally {
      setSavingDados(false);
    }
  };

  // Seção 2 — Salvar Nova Consulta
  const handleSaveConsulta = async (e) => {
    e.preventDefault();
    if (!pesoConsulta) {
      setErrorMsg('Peso corporal é obrigatório para registrar a consulta.');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const payload = {
        paciente_id: id,
        data_consulta: dataConsulta,
        peso: parseFloat(pesoConsulta),
        cintura: cinturaConsulta ? parseFloat(cinturaConsulta) : null,
        quadril: quadrilConsulta ? parseFloat(quadrilConsulta) : null,
        percentual_gordura: percentualGorduraConsulta ? parseFloat(percentualGorduraConsulta) : null,
        observacoes: observacoesConsulta || null,
        proximo_retorno: proximoRetorno || null,
      };

      const { error } = await supabase
        .from('consultas')
        .insert([payload]);

      if (error) throw error;

      setShowModal(false);
      
      // Reset Modal Form
      setPesoConsulta('');
      setCinturaConsulta('');
      setQuadrilConsulta('');
      setPercentualGorduraConsulta('');
      setObservacoesConsulta('');
      setProximoRetorno('');
      setDataConsulta(new Date().toISOString().split('T')[0]);

      setSuccessMsg('Consulta registrada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);

      // Re-fetch all to sync graphs and metrics
      await fetchPatientProfile();

    } catch (err) {
      setErrorMsg(err.message || 'Erro ao registrar consulta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Carregando perfil do paciente...</p>
      </div>
    );
  }

  const idade = calcIdade(dataNascimento);
  const imcInicial = calcIMC(pesoInicial, altura);

  // Latest Physical Stats
  const latestConsultation = consultas && consultas.length > 0 ? consultas[0] : null;
  const currentPeso = latestConsultation ? latestConsultation.peso : pesoInicial;
  const currentIMC = calcIMC(currentPeso, altura);

  const cleanPhone = (num) => num ? num.replace(/\D/g, '') : '';
  const waLink = whatsapp
    ? `https://wa.me/55${cleanPhone(whatsapp)}`
    : `https://wa.me/55${cleanPhone(telefone)}`;

  // Dynamic SVG Weight evolution line chart logic
  const renderWeightChart = () => {
    // We want chronological order (oldest to newest) to draw from left to right
    const weightData = [...consultas]
      .reverse()
      .map(c => ({
        peso: parseFloat(c.peso),
        data: new Date(c.data_consulta).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }));

    // If there is also a starting weight and no consultations, or we want to show start weight as point 0
    if (pesoInicial) {
      weightData.unshift({
        peso: parseFloat(pesoInicial),
        data: 'Início'
      });
    }

    if (weightData.length < 2) {
      return (
        <div className="empty-chart">
          <Activity size={32} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          <p>Adicione consultas para visualizar o gráfico de evolução de peso.</p>
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 35;

    const weights = weightData.map(d => d.peso);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const rangeW = maxW - minW || 1;

    const points = weightData.map((d, index) => {
      const x = padding + (index * (width - 2 * padding)) / (weightData.length - 1);
      const y = height - padding - ((d.peso - minW) * (height - 2 * padding)) / rangeW;
      return { x, y, peso: d.peso, label: d.data };
    });

    const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + ratio * (height - 2 * padding);
            const val = (maxW - ratio * rangeW).toFixed(0);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(16,86,102,0.06)" strokeDasharray="3 3" />
                <text x={padding - 8} y={y + 4} fill="var(--muted)" fontSize="10" textAnchor="end" fontWeight="600">{val} kg</text>
              </g>
            );
          })}

          {/* Area under the curve */}
          <path d={areaD} fill="url(#chart-area-grad)" />

          {/* Line itself */}
          <path d={pathD} fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="chart-dot-group">
              <circle cx={p.x} cy={p.y} r="5.5" fill="var(--green)" stroke="var(--white)" strokeWidth="2.5" />
              
              {/* Tooltip Weight Label */}
              <rect x={p.x - 22} y={p.y - 25} width="44" height="18" rx="4" fill="var(--dark)" opacity="0.95" />
              <text x={p.x} y={p.y - 13} fill="var(--white)" fontSize="9" fontWeight="700" textAnchor="middle">{p.peso}k</text>
              
              {/* X Axis labels */}
              <text x={p.x} y={height - 12} fill="var(--muted)" fontSize="9.5" fontWeight="600" textAnchor="middle">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const DADOS_TABS = [
    { label: 'Pessoal', icon: <User size={15} /> },
    { label: 'Clínico', icon: <Heart size={15} /> },
    { label: 'Hábitos', icon: <Coffee size={15} /> },
  ];

  return (
    <div className="page-view animate-fade-in">
      {/* ── HEADER SUPERIOR DO PRONTUÁRIO ── */}
      <header className="patient-detail-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/pacientes')} style={{ marginBottom: '12px' }}>
            <ChevronLeft size={16} /> Voltar para lista
          </button>
          
          <div className="patient-profile-card">
            <div className="large-avatar">
              {nome.charAt(0).toUpperCase()}
            </div>
            <div className="patient-name-info">
              <h1>{nome}</h1>
              <div className="meta-row">
                {idade !== null && <span className="meta-badge">{idade} anos</span>}
                {sexo && <span className="meta-badge">{sexo}</span>}
                <span className="meta-badge highlight">IMC Atual: {currentIMC || 'N/A'} kg/m²</span>
              </div>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {(whatsapp || telefone) && (
            <a href={waLink} target="_blank" rel="noreferrer" className="btn-action-contact whatsapp-color">
              <MessageSquare size={16} /> WhatsApp
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="btn-action-contact email-color">
              <Mail size={16} /> E-mail
            </a>
          )}
        </div>
      </header>

      {successMsg && (
        <div className="alert alert-success animate-fade-in" style={{ marginBottom: '24px' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error animate-fade-in" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      {/* ── SEÇÃO 1: DADOS DO PACIENTE (EDITÁVEIS) ── */}
      <section className="profile-section-card">
        <div className="section-header">
          <div className="title-area">
            <h2>Seção 1 — Dados do Paciente</h2>
            <p className="subtitle">Atualize as informações cadastrais do paciente diretamente nos campos abaixo.</p>
          </div>
          {dadosSuccessMsg && (
            <span className="save-success-badge animate-fade-in">
              <Check size={14} /> {dadosSuccessMsg}
            </span>
          )}
        </div>

        {/* Abas Internas Cadastrais */}
        <div className="dados-subtabs">
          {DADOS_TABS.map((tab, idx) => (
            <button
              key={idx}
              className={`subtab-btn ${dadosTab === idx ? 'active' : ''}`}
              onClick={() => setDadosTab(idx)}
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="dados-tab-content">
          {/* ABA DADOS CADASTRAIS: PESSOAL */}
          {dadosTab === 0 && (
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="form-input no-icon"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input
                  type="date"
                  className="form-input no-icon"
                  value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sexo</label>
                <div className="radio-group">
                  {['Feminino', 'Masculino', 'Outro'].map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`radio-chip ${sexo === s ? 'active' : ''}`}
                      onClick={() => setSexo(sexo === s ? '' : s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  className="form-input no-icon"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="tel"
                  className="form-input no-icon"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input no-icon"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ABA DADOS CADASTRAIS: CLÍNICO */}
          {dadosTab === 1 && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Peso Inicial (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input no-icon"
                  value={pesoInicial}
                  onChange={e => setPesoInicial(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Altura (cm)</label>
                <input
                  type="number"
                  className="form-input no-icon"
                  value={altura}
                  onChange={e => setAltura(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">IMC Inicial (Calculado)</label>
                <input
                  type="text"
                  className="form-input no-icon readonly-input"
                  value={imcInicial ? `${imcInicial} kg/m²` : ''}
                  readOnly
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Objetivos</label>
                <div className="chips-group" style={{ marginBottom: '10px' }}>
                  {OBJETIVOS_LIST.map(o => (
                    <button
                      key={o}
                      type="button"
                      className={`chip ${objetivos.includes(o) ? 'active' : ''}`}
                      onClick={() => toggleChip(o, objetivos, setObjetivos)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Objetivos complementares"
                  value={objetivoTexto}
                  onChange={e => setObjetivoTexto(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Nível de Atividade Física</label>
                <div className="chips-group">
                  {NIVEIS_ATIVIDADE_LIST.map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`chip single ${nivelAtividade === n ? 'active' : ''}`}
                      onClick={() => setNivelAtividade(nivelAtividade === n ? '' : n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Patologias</label>
                <div className="chips-group" style={{ marginBottom: '10px' }}>
                  {PATOLOGIAS_LIST.map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`chip ${patologias.includes(p) ? 'active' : ''}`}
                      onClick={() => toggleChip(p, patologias, setPatologias)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Outras patologias (separadas por vírgula)"
                  value={patologiaTexto}
                  onChange={e => setPatologiaTexto(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Restrições Alimentares</label>
                <div className="chips-group" style={{ marginBottom: '10px' }}>
                  {RESTRICOES_LIST.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`chip ${restricoes.includes(r) ? 'active' : ''}`}
                      onClick={() => toggleChip(r, restricoes, setRestricoes)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Outras restrições"
                  value={restricaoTexto}
                  onChange={e => setRestricaoTexto(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Alergias</label>
                <div className="chips-group" style={{ marginBottom: '10px' }}>
                  {ALERGIAS_LIST.map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`chip ${alergias.includes(a) ? 'active' : ''}`}
                      onClick={() => toggleChip(a, alergias, setAlergias)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Outras alergias"
                  value={alergiaTexto}
                  onChange={e => setAlergiaTexto(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Medicamentos em Uso</label>
                <textarea
                  className="form-textarea"
                  value={medicamentos}
                  onChange={e => setMedicamentos(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Suplementação</label>
                <textarea
                  className="form-textarea"
                  value={suplementos}
                  onChange={e => setSuplementos(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ABA DADOS CADASTRAIS: HÁBITOS */}
          {dadosTab === 2 && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Refeições por dia</label>
                <input
                  type="number"
                  className="form-input no-icon"
                  value={refeicoesPorDia}
                  onChange={e => setRefeicoesPorDia(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consumo de Água (Litros/dia)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input no-icon"
                  value={litrosAgua}
                  onChange={e => setLitrosAgua(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário que acorda</label>
                <input
                  type="time"
                  className="form-input no-icon"
                  value={horarioAcorda}
                  onChange={e => setHorarioAcorda(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário que dorme</label>
                <input
                  type="time"
                  className="form-input no-icon"
                  value={horarioDorme}
                  onChange={e => setHorarioDorme(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Pratica atividade física?</label>
                <div className="toggle-wrapper">
                  <button
                    type="button"
                    className={`toggle-btn ${atividadeFisica ? 'active' : ''}`}
                    onClick={() => setAtividadeFisica(!atividadeFisica)}
                  >
                    <span className="toggle-knob" />
                  </button>
                  <span className="toggle-label">{atividadeFisica ? 'Sim' : 'Não'}</span>
                </div>
              </div>

              {atividadeFisica && (
                <div className="form-group full-width">
                  <label className="form-label">Descreva a Atividade Física</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    value={atividadeFisicaDesc}
                    onChange={e => setAtividadeFisicaDesc(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group full-width">
                <label className="form-label">Observações Gerais</label>
                <textarea
                  className="form-textarea"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé da seção de dados com o botão salvar */}
        <div className="section-footer">
          <button
            type="button"
            className="btn-save"
            onClick={handleUpdatePatientData}
            disabled={savingDados}
          >
            {savingDados ? 'Salvando...' : <><Save size={16} /> Salvar Alterações</>}
          </button>
        </div>
      </section>

      {/* ── SEÇÃO 2: CONSULTAS & EVOLUÇÃO ── */}
      <section className="profile-section-card" style={{ marginTop: '32px' }}>
        <div className="section-header">
          <div className="title-area">
            <h2>Seção 2 — Consultas & Evolução Física</h2>
            <p className="subtitle">Histórico clínico de avaliações antropométricas e bioimpedância.</p>
          </div>
          <button
            className="btn-new-consultation"
            onClick={() => {
              setErrorMsg('');
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Nova Consulta
          </button>
        </div>

        {/* Gráfico de Evolução de Peso */}
        <div className="chart-wrapper-card">
          <h3 className="card-title-sm"><Activity size={16} /> Evolução do Peso Corporal</h3>
          {renderWeightChart()}
        </div>

        {/* Listagem das Consultas */}
        <div className="consultations-list-area" style={{ marginTop: '24px' }}>
          <h3 className="card-title-sm" style={{ marginBottom: '16px' }}><Calendar size={16} /> Histórico de Consultas</h3>
          
          {consultas.length === 0 ? (
            <div className="empty-state-placeholder">
              <Activity size={36} />
              <p>Nenhuma consulta registrada ainda.</p>
            </div>
          ) : (
            <div className="consultations-timeline">
              {consultas.map((c, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={c.id} className={`timeline-card ${isLatest ? 'latest-card' : ''}`}>
                    <div className="timeline-badge">
                      {isLatest && <span className="latest-tag">ÚLTIMA</span>}
                      <Calendar size={14} />
                      <span>{new Date(c.data_consulta).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="timeline-metrics">
                      <div className="metric-box">
                        <span className="metric-lbl">Peso</span>
                        <strong className="metric-val">{c.peso} kg</strong>
                      </div>
                      
                      {c.cintura && (
                        <div className="metric-box">
                          <span className="metric-lbl">Cintura</span>
                          <strong className="metric-val">{c.cintura} cm</strong>
                        </div>
                      )}

                      {c.quadril && (
                        <div className="metric-box">
                          <span className="metric-lbl">Quadril</span>
                          <strong className="metric-val">{c.quadril} cm</strong>
                        </div>
                      )}

                      {c.percentual_gordura && (
                        <div className="metric-box">
                          <span className="metric-lbl">% Gordura</span>
                          <strong className="metric-val">{c.percentual_gordura}%</strong>
                        </div>
                      )}
                    </div>

                    {c.observacoes && (
                      <div className="timeline-desc" style={{ marginTop: '12px' }}>
                        <strong>Conduta clínica / Observações:</strong>
                        <p>{c.observacoes}</p>
                      </div>
                    )}

                    {c.proximo_retorno && (
                      <div className="timeline-footer" style={{ marginTop: '12px' }}>
                        <Clock size={13} />
                        <span>Próximo Retorno: {new Date(c.proximo_retorno).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── SEÇÃO 3: PLANOS ALIMENTARES ── */}
      <section className="profile-section-card" style={{ marginTop: '32px' }}>
        <div className="section-header">
          <div className="title-area">
            <h2>Seção 3 — Planos Alimentares</h2>
            <p className="subtitle">Consulte o histórico de planos alimentares salvos ou gere uma nova prescrição.</p>
          </div>
          <div className="action-buttons-group">
            {tempPlan ? (
              <>
                <button 
                  className="btn-save" 
                  onClick={handleSavePlan} 
                  disabled={saving}
                >
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Plano Alimentar'}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setTempPlan(null)}
                >
                  Cancelar Edição
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn-save btn-ai-sparkle" 
                  onClick={handleGeneratePlanWithIA} 
                  disabled={loadingIA}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Sparkles size={16} /> Gerar Plano com IA
                </button>
                <button 
                  className="btn-save" 
                  onClick={handleCreateManualPlan}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Plano Manual
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading Visual do Gemini */}
        {loadingIA && (
          <div className="ai-loading-container animate-fade-in">
            <div className="ai-loading-spinner">
              <Sparkles size={32} className="sparkle-spinning" />
            </div>
            <p className="ai-loading-text">{loadingMsg}</p>
            <p className="ai-loading-subtext">Isso pode levar alguns segundos enquanto a IA desenha o cardápio ideal...</p>
          </div>
        )}

        {!loadingIA && (
          <div className="planos-split-container">
            {tempPlan ? (
              /* INTERFACE DE EDIÇÃO/CONSTRUÇÃO DO PLANO */
              <div className="plano-editor-wrapper full-width animate-fade-in">
                <div className="editor-banner">
                  <Sparkles size={16} />
                  <span>Você está no <strong>Modo de Edição</strong>. Modifique qualquer uma das refeições abaixo antes de salvar.</span>
                </div>

                {/* Abas dos Dias da Semana */}
                <div className="dias-tabs-bar">
                  {tempPlan.plano_semanal.map(d => (
                    <button
                      key={d.dia}
                      type="button"
                      className={`dia-tab-btn ${activeDayTab === d.dia ? 'active' : ''}`}
                      onClick={() => setActiveDayTab(d.dia)}
                    >
                      {d.dia}
                    </button>
                  ))}
                </div>

                {/* Refeições do Dia Ativo no Editor */}
                {tempPlan.plano_semanal.map(d => {
                  if (d.dia !== activeDayTab) return null;
                  
                  const meals = [
                    { label: "Café da Manhã", key: "cafe_da_manha", icon: <Coffee size={16} /> },
                    { label: "Lanche da Manhã", key: "lanche_manha", icon: <Clock size={16} /> },
                    { label: "Almoço", key: "almoco", icon: <Apple size={16} /> },
                    { label: "Lanche da Tarde", key: "lanche_tarde", icon: <Clock size={16} /> },
                    { label: "Jantar", key: "jantar", icon: <Coffee size={16} /> }
                  ];

                  return (
                    <div key={d.dia} className="meals-editor-grid animate-fade-in">
                      {meals.map(meal => {
                        const options = d.refeicoes[meal.key] || ["", "", "", "", ""];
                        return (
                          <div key={meal.key} className="meal-editor-card">
                            <div className="meal-card-header">
                              {meal.icon}
                              <span>{meal.label}</span>
                            </div>
                            <div className="meal-inputs-list">
                              {options.map((optionValue, idx) => (
                                <div key={idx} className="meal-input-row">
                                  <span className="input-index-label">{idx + 1}</span>
                                  <input
                                    type="text"
                                    className="meal-text-input"
                                    placeholder={`Alimento / Opção ${idx + 1}...`}
                                    value={optionValue}
                                    onChange={e => handleOptionChange(d.dia, meal.key, idx, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* HISTÓRICO E PRÉ-VISUALIZAÇÃO DE PLANOS ANTERIORES */
              planosAlimentares.length === 0 ? (
                <div className="empty-state-placeholder full-width">
                  <BookOpen size={36} />
                  <p>Nenhum plano alimentar gerado ainda para este paciente.</p>
                  <button 
                    className="btn-save" 
                    onClick={handleCreateManualPlan} 
                    style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Criar Plano Manual
                  </button>
                </div>
              ) : (
                <div className="planos-history-layout">
                  {/* Barra Lateral Esquerda: Lista de Planos Anteriores */}
                  <div className="planos-history-list">
                    <h4 className="list-title">Histórico de Planos</h4>
                    {planosAlimentares.map((p, idx) => {
                      const isSelected = selectedPlan?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          className={`plano-history-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPlan(p);
                            setSelectedPlanTab('Segunda-feira');
                          }}
                        >
                          <div className="plano-date-row">
                            <Apple size={15} />
                            <span>Plano #{planosAlimentares.length - idx}</span>
                          </div>
                          <span className="plano-timestamp">
                            Gerado em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <ChevronRight size={16} className="arrow-icon" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Lado Direito: Visualização Completa do Plano Selecionado */}
                  <div className="plano-content-preview">
                    {selectedPlan ? (
                      <div className="plano-display-card">
                        <div className="preview-header">
                          <div>
                            <h3>Plano Alimentar Prescrito</h3>
                            <span className="date-tag">
                              Criado em {new Date(selectedPlan.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <button 
                            className="btn-secondary btn-sm-edit"
                            onClick={handleEditSelectedPlan}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Editar como Novo
                          </button>
                        </div>

                        {selectedPlan.conteudo && selectedPlan.conteudo.plano_semanal ? (
                          /* LAYOUT SEMANAL POR ABAS */
                          <div className="history-weekly-viewer">
                            <div className="dias-tabs-bar preview-tabs-bar" style={{ marginTop: '16px' }}>
                              {selectedPlan.conteudo.plano_semanal.map(d => (
                                <button
                                  key={d.dia}
                                  type="button"
                                  className={`dia-tab-btn ${selectedPlanTab === d.dia ? 'active' : ''}`}
                                  onClick={() => setSelectedPlanTab(d.dia)}
                                >
                                  {d.dia}
                                </button>
                              ))}
                            </div>

                            {selectedPlan.conteudo.plano_semanal.map(d => {
                              if (d.dia !== selectedPlanTab) return null;

                              const meals = [
                                { label: "Café da Manhã", key: "cafe_da_manha", icon: <Coffee size={15} /> },
                                { label: "Lanche da Manhã", key: "lanche_manha", icon: <Clock size={15} /> },
                                { label: "Almoço", key: "almoco", icon: <Apple size={15} /> },
                                { label: "Lanche da Tarde", key: "lanche_tarde", icon: <Clock size={15} /> },
                                { label: "Jantar", key: "jantar", icon: <Coffee size={15} /> }
                              ];

                              return (
                                <div key={d.dia} className="meals-view-list animate-fade-in" style={{ marginTop: '16px' }}>
                                  {meals.map(meal => {
                                    const options = d.refeicoes[meal.key] || [];
                                    return (
                                      <div key={meal.key} className="meal-view-card">
                                        <div className="meal-header-row">
                                          <span className="meal-name-title">{meal.icon} {meal.label}</span>
                                        </div>
                                        <div className="meal-content-box">
                                          {options.length > 0 && options.some(o => o.trim()) ? (
                                            <ul className="meal-options-bullets">
                                              {options.map((opt, oIdx) => opt.trim() && (
                                                <li key={oIdx}>{opt}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <span className="no-items-text">Nenhuma recomendação cadastrada para esta refeição.</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* LAYOUT LEGADO (BACKWARD COMPATIBILITY) */
                          <div className="meals-view-list" style={{ marginTop: '20px' }}>
                            {selectedPlan.conteudo && selectedPlan.conteudo.refeicoes && selectedPlan.conteudo.refeicoes.length > 0 ? (
                              selectedPlan.conteudo.refeicoes.map((meal, index) => (
                                <div key={index} className="meal-view-card">
                                  <div className="meal-header-row">
                                    <span className="meal-name-title"><Coffee size={15} /> {meal.nome}</span>
                                    <span className="meal-time-badge"><Clock size={13} /> {meal.horario}</span>
                                  </div>
                                  <div className="meal-content-box">
                                    {meal.itens ? (
                                      <p style={{ whiteSpace: 'pre-wrap' }}>{meal.itens}</p>
                                    ) : (
                                      <span className="no-items-text">Nenhum alimento cadastrado.</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="empty-state-placeholder">
                                <p>O plano selecionado não contém refeições cadastradas.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state-placeholder">
                        <p>Selecione um plano alimentar à esquerda para pré-visualizar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* ── MODAL NOVA CONSULTA ── */}
      {showModal && (
        <div className="modal-overlay glass-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Nova Consulta</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveConsulta}>
              <div className="form-grid" style={{ padding: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Data da Consulta <span className="required">*</span></label>
                  <input
                    type="date"
                    className="form-input no-icon"
                    value={dataConsulta}
                    onChange={e => setDataConsulta(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Peso Corporal (kg) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 72.3"
                    className="form-input no-icon"
                    value={pesoConsulta}
                    onChange={e => setPesoConsulta(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Medida Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 80.5"
                    className="form-input no-icon"
                    value={cinturaConsulta}
                    onChange={e => setCinturaConsulta(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Medida Quadril (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 98"
                    className="form-input no-icon"
                    value={quadrilConsulta}
                    onChange={e => setQuadrilConsulta(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Percentual de Gordura (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 18.5"
                    className="form-input no-icon"
                    value={percentualGorduraConsulta}
                    onChange={e => setPercentualGorduraConsulta(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Próximo Retorno (opcional)</label>
                  <input
                    type="date"
                    className="form-input no-icon"
                    value={proximoRetorno}
                    onChange={e => setProximoRetorno(e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Observações / Evolução Clínica</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Anotações de evolução física, ajustes calóricos, sintomas ou feedback geral..."
                    value={observacoesConsulta}
                    onChange={e => setObservacoesConsulta(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Registrando...' : 'Salvar consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
