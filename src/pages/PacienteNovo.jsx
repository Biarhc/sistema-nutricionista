import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ChevronLeft, ChevronRight, Check, AlertTriangle,
  User, Heart, Coffee
} from 'lucide-react';

const OBJETIVOS = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance', 'Reeducação alimentar'];
const NIVEIS_ATIVIDADE = ['Sedentário', 'Leve', 'Moderado', 'Muito ativo', 'Extremamente ativo'];
const PATOLOGIAS = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome metabólica', 'Dislipidemia', 'SIBO', 'Anemia', 'Nenhuma'];
const RESTRICOES = ['Lactose', 'Glúten', 'Açúcar refinado', 'Frutose', 'Soja', 'Ovo', 'Nenhuma'];
const ALERGIAS = ['Amendoim', 'Nozes', 'Frutos do mar', 'Peixe', 'Trigo', 'Leite', 'Ovo', 'Soja', 'Nenhuma'];

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

export default function PacienteNovo({ session }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Aba 1 – Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailPaciente, setEmailPaciente] = useState('');

  // Aba 2 – Clínico
  const [pesoInicial, setPesoInicial] = useState('');
  const [altura, setAltura] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplemento] = useState('');
  const [objetivos, setObjetivos] = useState([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState([]);
  const [patologiaTexto, setPatologiaTexto] = useState('');
  const [restricoes, setRestricoes] = useState([]);
  const [restricaoTexto, setRestricaoTexto] = useState('');
  const [alergias, setAlergias] = useState([]);
  const [alergiaTexto, setAlergiaTexto] = useState('');

  // Aba 3 – Hábitos
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState(false);
  const [atividadeFisicaDesc, setAtividadeFisicaDesc] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const idade = calcIdade(dataNascimento);
  const imc = calcIMC(pesoInicial, altura);

  const mergeTextIntoArray = (arr, text) => {
    if (!text.trim()) return arr.length > 0 ? arr : null;
    const extras = text.split(',').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...arr, ...extras])];
    return merged.length > 0 ? merged : null;
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setErrorMsg('O nome do paciente é obrigatório.');
      setActiveTab(0);
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const payload = {
        nutricionista_id: session.user.id,
        nome: nome.trim(),
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: emailPaciente || null,
        peso_inicial: pesoInicial ? parseFloat(pesoInicial) : null,
        altura: altura ? parseFloat(altura) : null,
        medicamentos: medicamentos || null,
        suplementos: suplementos || null,
        objetivos: mergeTextIntoArray(objetivos, objetivoTexto),
        objetivo_texto: objetivoTexto || null,
        nivel_atividade: nivelAtividade || null,
        patologias: mergeTextIntoArray(patologias, patologiaTexto),
        restricoes_alimentares: mergeTextIntoArray(restricoes, restricaoTexto),
        alergias: mergeTextIntoArray(alergias, alergiaTexto),
        refeicoes_por_dia: refeicoesPorDia ? parseInt(refeicoesPorDia) : null,
        horario_acorda: horarioAcorda || null,
        horario_dorme: horarioDorme || null,
        litros_agua: litrosAgua ? parseFloat(litrosAgua) : null,
        atividade_fisica: atividadeFisica,
        atividade_fisica_descricao: atividadeFisica ? atividadeFisicaDesc : null,
        observacoes: observacoes || null,
      };

      const { data, error } = await supabase
        .from('pacientes')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;
      navigate(`/pacientes/${data.id}`);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar paciente.');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { label: 'Pessoal', icon: <User size={16} /> },
    { label: 'Clínico', icon: <Heart size={16} /> },
    { label: 'Hábitos', icon: <Coffee size={16} /> },
  ];

  return (
    <div className="page-view animate-fade-in">
      <header className="content-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn-back" onClick={() => navigate('/pacientes')}>
            <ChevronLeft size={16} /> Voltar
          </button>
          <h1 style={{ marginTop: '8px' }}>Novo Paciente</h1>
          <p className="subtitle">Preencha os dados para cadastrar um novo paciente.</p>
        </div>
      </header>

      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <div className="form-card">
        {/* Tabs Header */}
        <div className="form-tabs">
          {TABS.map((tab, idx) => (
            <button
              key={idx}
              className={`tab-btn ${activeTab === idx ? 'active' : ''} ${idx < activeTab ? 'done' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              <span className="tab-icon">
                {idx < activeTab ? <Check size={15} /> : tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── ABA 1: PESSOAL ── */}
        {activeTab === 0 && (
          <div className="tab-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">
                  Nome Completo <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Ex: Maria Silva"
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
                {idade !== null && (
                  <span className="field-hint">{idade} anos</span>
                )}
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
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="tel"
                  className="form-input no-icon"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input no-icon"
                  placeholder="paciente@email.com"
                  value={emailPaciente}
                  onChange={e => setEmailPaciente(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 2: CLÍNICO ── */}
        {activeTab === 1 && (
          <div className="tab-content">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Peso Inicial (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input no-icon"
                  placeholder="Ex: 70.5"
                  value={pesoInicial}
                  onChange={e => setPesoInicial(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Altura (cm)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input no-icon"
                  placeholder="Ex: 165"
                  value={altura}
                  onChange={e => setAltura(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">IMC (calculado automaticamente)</label>
                <input
                  type="text"
                  className="form-input no-icon readonly-input"
                  value={imc ? `${imc} kg/m²` : ''}
                  readOnly
                  placeholder="Preencha peso e altura"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Objetivos</label>
                <div className="chips-group">
                  {OBJETIVOS.map(o => (
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
                  placeholder="Objetivo personalizado (opcional)"
                  value={objetivoTexto}
                  onChange={e => setObjetivoTexto(e.target.value)}
                  style={{ marginTop: '12px' }}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Nível de Atividade Física</label>
                <div className="chips-group">
                  {NIVEIS_ATIVIDADE.map(n => (
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
                <div className="chips-group">
                  {PATOLOGIAS.map(p => (
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
                  placeholder="Outras patologias (separar por vírgula)"
                  value={patologiaTexto}
                  onChange={e => setPatologiaTexto(e.target.value)}
                  style={{ marginTop: '12px' }}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Restrições Alimentares</label>
                <div className="chips-group">
                  {RESTRICOES.map(r => (
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
                  style={{ marginTop: '12px' }}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Alergias</label>
                <div className="chips-group">
                  {ALERGIAS.map(a => (
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
                  style={{ marginTop: '12px' }}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Medicamentos em uso</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Ex: Metformina 500mg, Losartana 50mg..."
                  value={medicamentos}
                  onChange={e => setMedicamentos(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Suplementos em uso</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Ex: Whey protein, Creatina, Vitamina D..."
                  value={suplementos}
                  onChange={e => setSuplemento(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 3: HÁBITOS ── */}
        {activeTab === 2 && (
          <div className="tab-content">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Refeições por dia</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="form-input no-icon"
                  placeholder="Ex: 5"
                  value={refeicoesPorDia}
                  onChange={e => setRefeicoesPorDia(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Litros de água/dia</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input no-icon"
                  placeholder="Ex: 2.5"
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
                    onClick={() => setAtividadeFisica(v => !v)}
                  >
                    <span className="toggle-knob" />
                  </button>
                  <span className="toggle-label">{atividadeFisica ? 'Sim' : 'Não'}</span>
                </div>
              </div>

              {atividadeFisica && (
                <div className="form-group full-width">
                  <label className="form-label">Descreva a atividade física</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Ex: Musculação 3x/semana, caminhada 30min/dia"
                    value={atividadeFisicaDesc}
                    onChange={e => setAtividadeFisicaDesc(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group full-width">
                <label className="form-label">Observações gerais</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Informações adicionais relevantes sobre o paciente..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Botões de navegação */}
        <div className="form-nav-btns">
          {activeTab > 0 && (
            <button
              type="button"
              className="btn-tab-prev"
              onClick={() => setActiveTab(t => t - 1)}
            >
              <ChevronLeft size={18} /> Anterior
            </button>
          )}
          <div style={{ flex: 1 }} />
          {activeTab < 2 ? (
            <button
              type="button"
              className="btn-tab-next"
              onClick={() => setActiveTab(t => t + 1)}
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : <><Check size={18} /> Salvar Paciente</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
