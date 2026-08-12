export interface Refeicoes {
  cafe_da_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

export interface DiaPlano {
  dia: string; // 'Segunda-feira', 'Terça-feira', etc.
  refeicoes: Refeicoes;
}

export interface PlanoAlimentarJSON {
  plano_semanal: DiaPlano[];
}

export interface Paciente {
  id: string;
  nutricionista_id: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  peso_inicial: number | null;
  altura: number | null;
  medicamentos: string | null;
  suplementos: string | null;
  objetivos: string[];
  objetivo_texto: string | null;
  nivel_atividade: string | null;
  patologias: string[];
  patologia_texto: string | null;
  restricoes_alimentares: string[];
  restricao_texto: string | null;
  alergias: string[];
  alergia_texto: string | null;
  refeicoes_por_dia: number | null;
  horario_acorda: string | null;
  horario_dorme: string | null;
  litros_agua: number | null;
  atividade_fisica: boolean;
  atividade_fisica_descricao: string | null;
  observacoes: string | null;
  created_at?: string;
}

export interface PlanoAlimentarDB {
  id: string;
  paciente_id: string;
  conteudo: PlanoAlimentarJSON;
  created_at: string;
}
