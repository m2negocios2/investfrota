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

export type MotoStatus = 'disponivel' | 'locada' | 'manutencao' | 'em_loja_detran'
export type TipoLocacao = 'normal' | 'plano_conquista'

export interface Moto {
  id: string
  nome?: string
  placa: string
  modelo: string
  ano: number
  cor: string
  valor_diario?: number
  valor_semanal?: number
  data_compra?: string
  valor_compra?: number
  tipo_locacao_padrao: TipoLocacao
  status: MotoStatus
  observacoes?: string
  km_atual?: number
  km_atualizado_em?: string
  km_ultimo_oleo?: number
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
  percentual_comissao?: number
  comissao_percentual?: number
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

export type CaixaTipo = 'entrada' | 'saida'
export type EntidadeTipo = 'empresa' | 'socia' | 'terceiros'

export interface CaixaLancamento {
  id: string
  moto?: string
  entidade?: EntidadeTipo
  tipo: CaixaTipo
  descricao: string
  categoria?: string
  valor: number
  data: string
  forma_pagamento?: FormaPagamento
  observacoes?: string
  comissao_de?: string
  recebimento?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
  }
}

export type InfracaoStatusPagamento = 'pendente' | 'paga'

export interface Infracao {
  id: string
  moto: string
  numero?: number
  data?: string
  codigo_multa?: string
  valor?: number
  cliente?: string
  status_pagamento: InfracaoStatusPagamento
  data_pagamento?: string
  deu_entrada_detran?: boolean
  data_entrada_detran?: string
  prazo?: string
  observacao?: string
  created: string
  updated: string
  expand?: {
    moto?: Moto
  }
}

export interface Pendencia {
  id: string
  titulo: string
  data?: string
  feito?: boolean
  observacao?: string
  created: string
  updated: string
}

export type ContaAPagarTipo = 'parcelamento' | 'consorcio' | 'financiamento' | 'outro'

export interface ItemParcela {
  numero: number // 1, 2, ...
  valor: number
  data_vencimento?: string // YYYY-MM-DD
}

export interface ContaAPagar {
  id: string
  descricao: string
  credor: string
  tipo: ContaAPagarTipo
  valor_total: number
  quantidade_parcelas: number
  valor_parcela: number
  data_inicio: string
  dia_vencimento?: number
  observacao?: string
  concluida?: boolean
  parcelas_customizadas?: ItemParcela[] | string | null
  created: string
  updated: string
}

export interface ContaAPagarPagamento {
  id: string
  conta: string
  data: string
  valor: number
  numero_parcela?: number
  caixa_lancamento?: string
  observacao?: string
  created: string
  updated: string
  expand?: {
    conta?: ContaAPagar
    caixa_lancamento?: CaixaLancamento
  }
}

export interface ContaAPagarComProgresso extends ContaAPagar {
  totalPago: number
  saldoRestante: number
  quantidadePaga: number
  percentualPago: number
  pagamentos: ContaAPagarPagamento[]
  parcelasCalculadas: ItemParcela[]
  proximaParcelaNumero: number
  proximaParcelaValorSugerido: number
}

export interface EmpresaConfig {
  id: string
  nome_empresa: string
  documento?: string
  telefone?: string
  email?: string
  observacoes?: string
  created: string
  updated: string
}

export interface Socio {
  id: string
  nome: string
  funcao?: string
  participacao_percentual?: number
  telefone?: string
  email?: string
  observacao?: string
  created: string
  updated: string
}
