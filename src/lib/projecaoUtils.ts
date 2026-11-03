/**
 * Utilidades e regras de cálculo para o relatório RESULTADO (Fluxo de Caixa Real)
 *
 * Formato da planilha da usuária:
 * - Colunas: do primeiro mês com movimentação no Caixa até o mês presente (inclusive).
 *   Se não houver movimentação, inicia em janeiro do ano corrente até o mês presente.
 * - Cabeçalho:
 *   * Topo: ano (2025, 2026...)
 *   * Meio: nome do mês (jun, jul, ago...)
 *   * Base: número sequencial (1, 2, 3...)
 * - Linhas:
 *   1. Receita (verde) -> Entradas reais do Caixa
 *   2. Custos -> Saídas operacionais do Caixa que não são da dívida Honda
 *   3. Receita − Custos (verde)
 *   4. 15% HONDA (vermelho) -> Saídas reais de pagamentos da dívida Honda no Caixa
 *   5. LL (Lucro Líquido = Receita − Custos − Honda)
 *
 * SOMENTE DADOS REAIS — sem estimativas, sem projeções futuras, sem meses após o mês corrente.
 */

import { CaixaLancamento, ContaAPagarComProgresso, Moto } from '@/types/database'

export interface MesProjecao {
  ano: number
  mes: number // 1 a 12
  numeroSequencial: number // 1, 2, 3...
  nomeMes: string // jun, jul, ago...
  nomeMesCompleto: string // Junho, Julho...
  isPassadoOuPresente: boolean // sempre true no relatório Resultado
  isMesCorrente: boolean
  receita: number
  custos: number
  percentual33: number // Receita - Custos
  honda: number // Parcela / pagamento Honda realizado no caixa
  ll: number // (Receita - Custos) - Honda
}

export interface ProjecaoTotais {
  receita: number
  custos: number
  percentual33: number
  honda: number
  ll: number
}

export interface ProjecaoFluxoCaixaResultado {
  meses: MesProjecao[]
  totais: ProjecaoTotais
  anoInicio: number
  anoFim: number
  motosAtivasCount: number
  totalMeses: number
}

export const NOMES_MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

export const NOMES_MESES_COMPLETO = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Identifica se um lançamento do caixa é referente à dívida/conta Honda
 */
export function isLancamentoHonda(c: CaixaLancamento, contasHondaIds: Set<string>): boolean {
  if (c.tipo !== 'saida') return false

  // Se tiver vínculo direto com a conta Honda
  if (c.conta_a_pagar && contasHondaIds.has(c.conta_a_pagar)) {
    return true
  }

  // Se o expand indicar credor Honda
  const credorExpand = c.expand?.conta_a_pagar?.credor?.toUpperCase() || ''
  if (credorExpand.includes('HONDA')) {
    return true
  }

  // Se a observação ou descrição mencionar Honda com credor/entidade terceiros
  const texto = `${c.descricao || ''} ${c.observacoes || ''} ${c.categoria || ''}`.toUpperCase()
  if (
    texto.includes('HONDA') &&
    (c.entidade === 'terceiros' ||
      c.categoria?.toUpperCase().includes('TERCEIRO') ||
      texto.includes('CONTA A PAGAR') ||
      texto.includes('PARCELA'))
  ) {
    return true
  }

  return false
}

/**
 * Encontra as contas a pagar da Honda (credor contendo Honda)
 */
export function getContasHonda(contasAPagar: ContaAPagarComProgresso[]): ContaAPagarComProgresso[] {
  return contasAPagar.filter((cp) => {
    const credor = (cp.credor || '').toUpperCase()
    const desc = (cp.descricao || '').toUpperCase()
    return credor.includes('HONDA') || desc.includes('HONDA')
  })
}

export interface CalcularProjecaoParams {
  motos: Moto[]
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
  // Ponto de corte do presente (se omitido, usa a data atual do sistema)
  anoAtual?: number
  mesAtual?: number // 1 a 12
  // Mês de início (se omitido, busca o primeiro mês com movimentação no Caixa; se não houver, jan/anoAtual)
  anoInicio?: number
  mesInicio?: number // 1 a 12
}

/**
 * Calcula os meses reais do relatório Resultado (do primeiro mês com movimentação até o mês presente)
 */
export function calcularProjecaoFluxoCaixa(
  params: CalcularProjecaoParams,
): ProjecaoFluxoCaixaResultado {
  const agora = new Date()
  const anoAtual = params.anoAtual ?? agora.getFullYear()
  const mesAtual = params.mesAtual ?? agora.getMonth() + 1

  // Identificar motos ativas da frota (exclui vendidas e cedidas)
  const motosAtivas = params.motos.filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
  const motosAtivasCount = motosAtivas.length

  // Contas Honda
  const contasHonda = getContasHonda(params.contasAPagar)
  const contasHondaIds = new Set(contasHonda.map((c) => c.id))

  // 1. Agrupar lançamentos de caixa por chave YYYY-MM
  const caixaPorMes = new Map<
    string,
    {
      receita: number
      custos: number
      honda: number
    }
  >()

  let menorAnoComMovimento: number | null = null
  let menorMesComMovimento: number | null = null

  for (const c of params.caixa) {
    if (!c.data) continue
    const match = c.data.match(/^(\d{4})-(\d{2})/)
    if (!match) continue
    const y = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    const chave = `${match[1]}-${match[2]}`

    // Guardar menor mês com lançamento
    if (
      menorAnoComMovimento === null ||
      y < menorAnoComMovimento ||
      (y === menorAnoComMovimento && (menorMesComMovimento === null || m < menorMesComMovimento))
    ) {
      menorAnoComMovimento = y
      menorMesComMovimento = m
    }

    if (!caixaPorMes.has(chave)) {
      caixaPorMes.set(chave, { receita: 0, custos: 0, honda: 0 })
    }
    const item = caixaPorMes.get(chave)!
    const valor = Number(c.valor) || 0

    if (c.tipo === 'entrada') {
      item.receita += valor
    } else if (c.tipo === 'saida') {
      if (isLancamentoHonda(c, contasHondaIds)) {
        item.honda += valor
      } else {
        item.custos += valor
      }
    }
  }

  // 2. Determinar o mês inicial:
  // Se explicitado nos params, usa ele.
  // Senão, usa o menor mês com movimento no Caixa.
  // Se não houver movimento nenhum, usa janeiro do ano corrente.
  // Se o menor mês for posterior ao mês corrente (ex: dados lançados no futuro por engano), limita ao mês corrente.
  let anoInicio = params.anoInicio
  let mesInicio = params.mesInicio

  if (anoInicio === undefined || mesInicio === undefined) {
    if (menorAnoComMovimento !== null && menorMesComMovimento !== null) {
      anoInicio = menorAnoComMovimento
      mesInicio = menorMesComMovimento
    } else {
      anoInicio = anoAtual
      mesInicio = 1
    }
  }

  // Garantir que anoInicio/mesInicio não seja superior ao anoAtual/mesAtual
  if (anoInicio > anoAtual || (anoInicio === anoAtual && mesInicio > mesAtual)) {
    anoInicio = anoAtual
    mesInicio = mesAtual
  }

  // 3. Montar os meses reais: do mês inicial até o mês corrente (inclusive)
  const meses: MesProjecao[] = []
  let totais: ProjecaoTotais = {
    receita: 0,
    custos: 0,
    percentual33: 0,
    honda: 0,
    ll: 0,
  }

  // Calcular quantidade total de meses entre (anoInicio, mesInicio) e (anoAtual, mesAtual)
  const totalMesesQtd = (anoAtual - anoInicio) * 12 + (mesAtual - mesInicio) + 1

  for (let i = 0; i < totalMesesQtd; i++) {
    const dt = new Date(anoInicio, mesInicio - 1 + i, 1)
    const ano = dt.getFullYear()
    const mes = dt.getMonth() + 1
    const chave = `${ano}-${String(mes).padStart(2, '0')}`

    const isMesCorrente = ano === anoAtual && mes === mesAtual

    let receita = 0
    let custos = 0
    let honda = 0

    // Dados reais do Caixa
    const dadosReais = caixaPorMes.get(chave)
    if (dadosReais) {
      receita = Math.round(dadosReais.receita)
      custos = Math.round(dadosReais.custos)
      honda = Math.round(dadosReais.honda)
    }

    // Fórmula da planilha:
    // Receita - Custos
    // LL = (Receita - Custos) - Honda
    const percentual33 = receita - custos
    const ll = percentual33 - honda

    meses.push({
      ano,
      mes,
      numeroSequencial: i + 1,
      nomeMes: NOMES_MESES_ABREV[mes - 1],
      nomeMesCompleto: NOMES_MESES_COMPLETO[mes - 1],
      isPassadoOuPresente: true,
      isMesCorrente,
      receita,
      custos,
      percentual33,
      honda,
      ll,
    })

    totais.receita += receita
    totais.custos += custos
    totais.percentual33 += percentual33
    totais.honda += honda
    totais.ll += ll
  }

  const anoFim = meses.length > 0 ? meses[meses.length - 1].ano : anoAtual

  return {
    meses,
    totais,
    anoInicio,
    anoFim,
    motosAtivasCount,
    totalMeses: meses.length,
  }
}

/**
 * Formata número no padrão pt-BR com exatamente 2 casas decimais (ex: 6.250,00)
 */
export function formatarNumeroPlanilha(valor: number): string {
  if (valor === undefined || valor === null || isNaN(valor)) return '-'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
