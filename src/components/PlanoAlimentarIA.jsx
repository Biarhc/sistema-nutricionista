import React, { useState } from 'react';
import {
  Sparkles, RefreshCw, CheckCircle, AlertCircle, Calendar,
  Coffee, Clock, Utensils, Zap, Activity, Save, Check, ShieldAlert
} from 'lucide-react';

const MEAL_TYPES = [
  { key: 'cafe_da_manha', title: 'Café da manhã', icon: '☀️', lucide: Coffee },
  { key: 'lanche_manha', title: 'Lanche da manhã', icon: '🍎', lucide: Clock },
  { key: 'almoco', title: 'Almoço', icon: '🍛', lucide: Utensils },
  { key: 'lanche_tarde', title: 'Lanche da tarde', icon: '🥪', lucide: Clock },
  { key: 'jantar', title: 'Jantar', icon: '🌙', lucide: Utensils }
];

const DAYS = [
  { full: 'Segunda-feira', short: 'Seg' },
  { full: 'Terça-feira', short: 'Ter' },
  { full: 'Quarta-feira', short: 'Qua' },
  { full: 'Quinta-feira', short: 'Qui' },
  { full: 'Sexta-feira', short: 'Sex' },
  { full: 'Sábado', short: 'Sáb' },
  { full: 'Domingo', short: 'Dom' }
];

export default function PlanoAlimentarIA({
  pacienteData,
  onSavePlan,
  saving,
  planosHistorico,
  onSelectHistoricoPlan
}) {
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Plano em edição/gerado
  const [currentPlan, setCurrentPlan] = useState(null);
  const [activeDay, setActiveDay] = useState('Segunda-feira');
  
  // Seleção de opções (diaIndex -> mealKey -> optionIndex 0|1|2)
  const [selections, setSelections] = useState({});
  // Refeições concluídas (diaIndex -> mealKey -> boolean)
  const [completedMeals, setCompletedMeals] = useState({});

  // Regerar uma opção específica
  const [reloadingOption, setReloadingOption] = useState(null); // `${dayName}-${mealKey}-${optionIdx}`

  // Inicializar seleções padrões (Opção 0 para todas)
  const initializeSelections = (planoSemanal) => {
    const initSel = {};
    planoSemanal.forEach((d) => {
      initSel[d.dia] = {
        cafe_da_manha: 0,
        lanche_manha: 0,
        almoco: 0,
        lanche_tarde: 0,
        jantar: 0
      };
    });
    setSelections(initSel);
  };

  // Gerar Plano Completo via IA
  const handleGenerateFullPlan = async () => {
    setLoadingIA(true);
    setErrorMsg('');
    setSuccessMsg('');

    const messages = [
      "Consultando perfil do paciente e objetivos...",
      "Calculando metas de macronutrientes...",
      "Gerando 105 opções de refeições brasileiras...",
      "Calculando calorias, proteínas, carboidratos e gorduras...",
      "Finalizando plano semanal completo..."
    ];
    let msgIdx = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMsg(messages[msgIdx]);
    }, 2200);

    try {
      const summary = `
- Nome: ${pacienteData.nome || 'Paciente'}
- Idade: ${pacienteData.idade ? `${pacienteData.idade} anos` : 'Não informada'}
- Sexo: ${pacienteData.sexo || 'Não informado'}
- Peso: ${pacienteData.peso ? `${pacienteData.peso} kg` : 'Não informado'}
- Altura: ${pacienteData.altura ? `${pacienteData.altura} cm` : 'Não informada'}
- Objetivos: ${Array.isArray(pacienteData.objetivos) ? pacienteData.objetivos.join(', ') : ''} ${pacienteData.objetivo_texto || ''}
- Nível de Atividade: ${pacienteData.nivel_atividade || 'Moderado'}
- Patologias: ${Array.isArray(pacienteData.patologias) ? pacienteData.patologias.join(', ') : ''} ${pacienteData.patologia_texto || ''}
- Restrições Alimentares: ${Array.isArray(pacienteData.restricoes_alimentares) ? pacienteData.restricoes_alimentares.join(', ') : ''} ${pacienteData.restricao_texto || ''}
- Alergias: ${Array.isArray(pacienteData.alergias) ? pacienteData.alergias.join(', ') : ''} ${pacienteData.alergia_texto || ''}
- Observações: ${pacienteData.observacoes || 'Nenhuma'}
      `.trim();

      const response = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_do_paciente: summary })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.plano_semanal || !Array.isArray(data.plano_semanal)) {
        throw new Error("Formato retornado pela IA é inválido.");
      }

      setCurrentPlan(data);
      initializeSelections(data.plano_semanal);
      setActiveDay('Segunda-feira');
      setSuccessMsg("Plano alimentar de 7 dias com 105 opções gerado com sucesso!");
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error("Erro na geração:", err);
      setErrorMsg("Não foi possível gerar o plano via IA no momento. Tente novamente ou use o plano manual.");
    } finally {
      clearInterval(interval);
      setLoadingIA(false);
    }
  };

  // Trocar uma única opção via IA
  const handleRegenerateOption = async (dayName, mealKey, optionIdx) => {
    const key = `${dayName}-${mealKey}-${optionIdx}`;
    setReloadingOption(key);
    setErrorMsg('');

    try {
      const dayData = currentPlan.plano_semanal.find(d => d.dia === dayName);
      const currentOpt = dayData?.refeicoes?.[mealKey]?.[optionIdx];

      const response = await fetch('/api/gerar-opcao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_refeicao: MEAL_TYPES.find(m => m.key === mealKey)?.title || mealKey,
          opcao_atual: currentOpt,
          dados_do_paciente: `Objetivos: ${pacienteData.objetivos?.join(', ')}. Restrições: ${pacienteData.restricoes_alimentares?.join(', ')}`
        })
      });

      if (!response.ok) throw new Error("Falha ao gerar nova opção.");

      const newOpcao = await response.json();

      // Atualizar estado local do plano
      setCurrentPlan(prev => {
        if (!prev) return prev;
        const newWeekly = prev.plano_semanal.map(d => {
          if (d.dia === dayName) {
            const newMealOpts = [...(d.refeicoes[mealKey] || [])];
            newMealOpts[optionIdx] = newOpcao;
            return {
              ...d,
              refeicoes: {
                ...d.refeicoes,
                [mealKey]: newMealOpts
              }
            };
          }
          return d;
        });
        return { ...prev, plano_semanal: newWeekly };
      });

      setSuccessMsg(`Opção ${optionIdx + 1} de ${MEAL_TYPES.find(m => m.key === mealKey)?.title} atualizada!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao trocar a opção. Tente novamente.");
    } finally {
      setReloadingOption(null);
    }
  };

  // Selecionar Opção
  const handleSelectOption = (dayName, mealKey, optionIdx) => {
    setSelections(prev => ({
      ...prev,
      [dayName]: {
        ...(prev[dayName] || {}),
        [mealKey]: optionIdx
      }
    }));
  };

  // Alternar Conclusão da Refeição
  const handleToggleComplete = (dayName, mealKey) => {
    setCompletedMeals(prev => ({
      ...prev,
      [dayName]: {
        ...(prev[dayName] || {}),
        [mealKey]: !prev?.[dayName]?.[mealKey]
      }
    }));
  };

  // Obter o dia ativo atual
  const activeDayObj = currentPlan?.plano_semanal?.find(d => d.dia === activeDay);

  // Calcular totais do dia ativo com base nas opções selecionadas
  const calcDayTotals = (dayName) => {
    const day = currentPlan?.plano_semanal?.find(d => d.dia === dayName);
    if (!day) return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };

    const daySel = selections[dayName] || {};
    let c = 0, p = 0, carb = 0, g = 0;

    MEAL_TYPES.forEach(meal => {
      const selectedIdx = daySel[meal.key] ?? 0;
      const option = day.refeicoes?.[meal.key]?.[selectedIdx];
      if (option) {
        c += Number(option.calorias || 0);
        p += Number(option.proteinas || 0);
        carb += Number(option.carboidratos || 0);
        g += Number(option.gorduras || 0);
      }
    });

    return { calorias: Math.round(c), proteinas: Math.round(p), carboidratos: Math.round(carb), gorduras: Math.round(g) };
  };

  // Calcular médias da semana
  const calcWeeklyAverages = () => {
    if (!currentPlan?.plano_semanal?.length) return null;
    let totalC = 0, totalP = 0, totalCarb = 0, totalG = 0;
    const daysCount = currentPlan.plano_semanal.length;

    currentPlan.plano_semanal.forEach(d => {
      const totals = calcDayTotals(d.dia);
      totalC += totals.calorias;
      totalP += totals.proteinas;
      totalCarb += totals.carboidratos;
      totalG += totals.gorduras;
    });

    return {
      calorias: Math.round(totalC / daysCount),
      proteinas: Math.round(totalP / daysCount),
      carboidratos: Math.round(totalCarb / daysCount),
      gorduras: Math.round(totalG / daysCount)
    };
  };

  const dayTotals = calcDayTotals(activeDay);
  const weeklyAverages = calcWeeklyAverages();

  const handleSaveCurrentPlan = () => {
    if (!currentPlan) return;
    const payload = {
      ...currentPlan,
      selections,
      completedMeals
    };
    onSavePlan(payload);
  };

  return (
    <div className="plano-ia-container animate-fade-in">
      {/* ── ALERTA LEGAL DE SAÚDE (DISCLAIMER) ── */}
      <div className="health-disclaimer-banner">
        <ShieldAlert size={20} className="disclaimer-icon" />
        <div>
          <strong>Aviso de Saúde e Nutrição:</strong> As calorias, porções e macronutrientes apresentados são 
          <em> estimativas calculadas por inteligência artificial</em>. Este plano não substitui uma consulta formal nem a prescrição de um nutricionista certificado.
        </div>
      </div>

      {/* ── CABEÇALHO DA SEÇÃO COM BOTÃO PRINCIPAL ── */}
      <div className="plano-header-bar">
        <div>
          <h2 className="plano-main-title">Seu Plano Alimentar Personalizado</h2>
          <p className="plano-subtitle">
            Geração dinâmica com IA: 7 dias da semana × 5 refeições × 3 opções cada (105 opções com tabela nutricional).
          </p>
        </div>

        <div className="plano-header-actions">
          {currentPlan && (
            <button
              className="btn-save"
              onClick={handleSaveCurrentPlan}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Plano'}
            </button>
          )}

          <button
            className="btn-save btn-ai-sparkle"
            onClick={handleGenerateFullPlan}
            disabled={loadingIA}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={16} /> {currentPlan ? 'Gerar novo plano' : 'Gerar meu plano alimentar'}
          </button>
        </div>
      </div>

      {/* Feedback msgs */}
      {successMsg && (
        <div className="alert alert-success animate-fade-in" style={{ margin: '16px 0' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-error animate-fade-in" style={{ margin: '16px 0' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* ── LOADING ANIMADO DA IA ── */}
      {loadingIA && (
        <div className="ai-loading-container animate-fade-in">
          <div className="ai-loading-spinner">
            <Sparkles size={36} className="sparkle-spinning" />
          </div>
          <h3 className="ai-loading-text">{loadingMsg}</h3>
          <p className="ai-loading-subtext">Aguarde alguns instantes enquanto desenhamos as 105 opções nutricionais...</p>
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL DO PLANO ── */}
      {!loadingIA && currentPlan && (
        <div className="plano-content-area">
          {/* NAVEGAÇÃO DOS DIAS (ABAS) */}
          <div className="dias-navigation-bar">
            {DAYS.map(d => {
              const isActive = activeDay === d.full;
              const dTotals = calcDayTotals(d.full);
              return (
                <button
                  key={d.full}
                  type="button"
                  className={`dia-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveDay(d.full)}
                >
                  <span className="dia-short-name">{d.short}</span>
                  <span className="dia-full-name">{d.full}</span>
                  <span className="dia-kcal-badge">{dTotals.calorias} kcal</span>
                </button>
              );
            })}
          </div>

          {/* PAINEL DO DIA ATIVO */}
          <div className="dia-active-panel animate-fade-in">
            <div className="dia-title-row">
              <h3>{activeDay}</h3>
              <span className="info-tag">Selecione 1 opção para cada uma das 5 refeições</span>
            </div>

            {/* LISTA DE 5 REFEIÇÕES DO DIA */}
            <div className="meals-cards-stack">
              {MEAL_TYPES.map(meal => {
                const optionsList = activeDayObj?.refeicoes?.[meal.key] || [];
                const selectedOptionIdx = selections[activeDay]?.[meal.key] ?? 0;
                const isCompleted = !!completedMeals[activeDay]?.[meal.key];

                return (
                  <div key={meal.key} className={`meal-block-card ${isCompleted ? 'completed' : ''}`}>
                    {/* Cabeçalho da Refeição */}
                    <div className="meal-block-header">
                      <div className="meal-header-title">
                        <span className="meal-emoji">{meal.icon}</span>
                        <h4>{meal.title}</h4>
                      </div>

                      <div className="meal-header-actions">
                        <button
                          type="button"
                          className={`btn-check-complete ${isCompleted ? 'active' : ''}`}
                          onClick={() => handleToggleComplete(activeDay, meal.key)}
                          title="Marcar como concluída"
                        >
                          <CheckCircle size={16} />
                          <span>{isCompleted ? 'Concluída' : 'Marcar concluída'}</span>
                        </button>
                      </div>
                    </div>

                    {/* OPÇÕES DA REFEIÇÃO (3 OPÇÕES) */}
                    <div className="options-grid">
                      {optionsList.map((opt, idx) => {
                        const isSelected = selectedOptionIdx === idx;
                        const isReloading = reloadingOption === `${activeDay}-${meal.key}-${idx}`;

                        return (
                          <div
                            key={idx}
                            className={`option-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectOption(activeDay, meal.key, idx)}
                          >
                            <div className="option-card-top">
                              <label className="radio-option-label" onClick={e => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name={`meal-${activeDay}-${meal.key}`}
                                  checked={isSelected}
                                  onChange={() => handleSelectOption(activeDay, meal.key, idx)}
                                />
                                <strong>Opção {idx + 1}</strong>
                              </label>

                              <button
                                type="button"
                                className="btn-icon-reload"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegenerateOption(activeDay, meal.key, idx);
                                }}
                                disabled={isReloading}
                                title="Trocar essa opção por outra via IA"
                              >
                                <RefreshCw size={14} className={isReloading ? 'spin-anim' : ''} />
                                <span>{isReloading ? 'Trocando...' : 'Trocar opção'}</span>
                              </button>
                            </div>

                            <h5 className="option-name">{opt.nome || `Opção ${idx + 1}`}</h5>

                            {/* Alimentos e Quantidades */}
                            <ul className="option-ingredients-list">
                              {Array.isArray(opt.ingredientes) && opt.ingredientes.map((ing, iIdx) => (
                                <li key={iIdx}>{ing}</li>
                              ))}
                            </ul>

                            {/* Tabela de Macronutrientes e Calorias */}
                            <div className="option-macros-grid">
                              <div className="macro-badge kcal">
                                <span className="macro-lbl">Calorias</span>
                                <strong>{opt.calorias} kcal</strong>
                              </div>
                              <div className="macro-badge p">
                                <span className="macro-lbl">Proteínas</span>
                                <strong>{opt.proteinas}g</strong>
                              </div>
                              <div className="macro-badge c">
                                <span className="macro-lbl">Carbos</span>
                                <strong>{opt.carboidratos}g</strong>
                              </div>
                              <div className="macro-badge g">
                                <span className="macro-lbl">Gorduras</span>
                                <strong>{opt.gorduras}g</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RESUMO DO DIA (DINÂMICO) ── */}
            <div className="day-summary-card">
              <div className="summary-title">
                <Zap size={20} />
                <div>
                  <h4>Resumo do Dia ({activeDay})</h4>
                  <p>Valores somados automaticamente com base na opção escolhida em cada uma das 5 refeições.</p>
                </div>
              </div>

              <div className="summary-metrics-grid">
                <div className="summary-box">
                  <span className="lbl">Calorias Totais</span>
                  <strong className="val-c">{dayTotals.calorias} kcal</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Proteínas</span>
                  <strong className="val-p">{dayTotals.proteinas} g</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Carboidratos</span>
                  <strong className="val-carb">{dayTotals.carboidratos} g</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Gorduras</span>
                  <strong className="val-g">{dayTotals.gorduras} g</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── RESUMO DA SEMANA ── */}
          {weeklyAverages && (
            <div className="weekly-summary-card" style={{ marginTop: '24px' }}>
              <div className="summary-title">
                <Activity size={20} />
                <div>
                  <h4>Resumo Médio da Semana</h4>
                  <p>Média diária estimada com base nas opções selecionadas ao longo dos 7 dias.</p>
                </div>
              </div>

              <div className="summary-metrics-grid">
                <div className="summary-box">
                  <span className="lbl">Média Calorias/Dia</span>
                  <strong>{weeklyAverages.calorias} kcal</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Média Proteínas</span>
                  <strong>{weeklyAverages.proteinas} g</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Média Carboidratos</span>
                  <strong>{weeklyAverages.carboidratos} g</strong>
                </div>
                <div className="summary-box">
                  <span className="lbl">Média Gorduras</span>
                  <strong>{weeklyAverages.gorduras} g</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Se ainda não gerou nada */}
      {!loadingIA && !currentPlan && (
        <div className="empty-state-placeholder" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Sparkles size={48} style={{ color: 'var(--green)', opacity: 0.8, marginBottom: '12px' }} />
          <h3>Nenhum plano alimentar gerado ainda</h3>
          <p style={{ maxWidth: '500px', margin: '8px auto 20px', color: 'var(--muted)' }}>
            Clique no botão abaixo para gerar uma programação alimentar de 7 dias com 105 opções com informações nutricionais calculadas via inteligência artificial.
          </p>
          <button
            className="btn-save btn-ai-sparkle"
            onClick={handleGenerateFullPlan}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px' }}
          >
            <Sparkles size={18} /> Gerar meu plano alimentar com IA
          </button>
        </div>
      )}
    </div>
  );
}
