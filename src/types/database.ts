export type UserRole = 'proprietario' | 'administrador'

export interface User {
  id: string
  email: string
  name?: string
  role?: UserRole
  avatar?: string
  created: string
  updated: string
}

export type MotoStatus = 'disponivel' | 'locada' | 'manutencao'
export type TipoLocacao = 'normal' | 'plano_conquista'

export interface Moto {
  id: string
  nome?: string
  placa: string
  modelo: string
  ano: number
  cor: string
  valor_diario: number
  tipo_locacao_padrao: TipoLocacao
  status: MotoStatus
  observacoes?: string
  created: string
  updated: string
}

export interface CategoriaGasto {
  id: string
  nome: string
  descricao?: string
  cor?: string
  created: string
  updated: string
}

export type ContratoStatus = 'ativo' | 'finalizado' | 'cancelado'
export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'

export interface Contrato {
  id: string
  moto: string
  locatario_nome: string
  locatario_documento?: string
  locatario_telefone?: string
  tipo: TipoLocacao
  data_inicio: string
  prazo_meses?: number
  data_entrega?: string
  valor_diario: number
  valor_semanal?: number
  dia_pagamento_semana?: DiaSemana
  status: ContratoStatus
  observacoes?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
  }
}

export type RecebimentoStatus = 'em_dia' | 'em_atraso' | 'pago'
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'

export interface Recebimento {
  id: string
  moto: string
  contrato?: string
  locatario_nome: string
  data_vencimento: string
  data_pagamento?: string
  valor: number
  status: RecebimentoStatus
  forma_pagamento?: FormaPagamento
  semana_ano?: string // ex: "2026-W43"
  observacoes?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
    contrato?: Contrato
  }
}

export type CaucaoPosse = 'proprietario' | 'adm'
export type CaucaoStatus = 'retida' | 'devolvida'

export interface Caucao {
  id: string
  moto: string
  valor: number
  data: string
  posse: CaucaoPosse
  status?: CaucaoStatus
  data_devolucao?: string
  observacao?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
  }
}

export type PagamentoCategoria =
  | 'manutencao'
  | 'ipva_seguro'
  | 'combustivel'
  | 'rastreador'
  | 'outros'
  | string

export type PagamentoStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'pago'

export interface Pagamento {
  id: string
  moto: string
  descricao: string
  categoria: string
  categoria_nome?: string
  data_vencimento: string
  data_pagamento?: string
  valor: number
  status: PagamentoStatus
  lancado_por?: string
  lancado_por_nome?: string
  aprovado_por?: string
  data_aprovacao?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
    lancado_por?: User
    aprovado_por?: User
  }
}

export type CaixaTipo = 'entrada' | 'saida'

export interface CaixaLancamento {
  id: string
  moto: string
  tipo: CaixaTipo
  descricao: string
  categoria?: string
  valor: number
  data: string
  forma_pagamento?: FormaPagamento
  observacoes?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
  }
}
