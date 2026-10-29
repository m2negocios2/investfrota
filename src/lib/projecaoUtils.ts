/**
 * Utilidades e regras de cálculo para a PROJEÇÃO DE FLUXO DE CAIXA MENSAL
 *
 * Réplica da planilha da usuária:
 * - 12 meses a partir do mês inicial (ano em cima, mês embaixo, número sequencial 1 a 12)
 * - Linhas:
 *   1. Receita (verde, negrito)
 *   2. Custos (neutro)
 *   3. 33% (Receita - Custos) (verde)
 *   4. 15% HONDA (pagamentos Honda / dívida de terceiros) (vermelho)
 *   5. LL (Lucro Líquido = (Receita - Custos) - Honda) (verde)
 *
 * Regras:
 * - Meses realizados (passado até mês presente): Caixa real
 *   * Receita = entradas
 *   * Custos = saídas que não são Honda
 *   * Honda = pagamentos vinculados à conta Honda ou entidade 'terceiros' com menção a Honda
 * - Meses futuros (após mês presente): Estimativas (exibidas em azul)
 *   * Base: média histórica por moto ativa dos meses realizados
 *   * Frota projetada = motos ativas atuais + 3 motos novas (sendo 1 ainda por cadastrar)
 *   * Linha Honda: parcelas restantes cadastradas no Contas a Pagar (conta Honda), enquanto houver saldo
 *   * LL = (Receita - Custos) - Honda
 */

import { CaixaLancamento, ContaAPagarComProgresso, Moto } from '@/types/database'
import { resolverParcelasConta } from './parcelasUtils'

export interface MesProjecao {
  ano: number
  mes: number // 1 a 12
  numeroSequencial: number // 1 a 12
  nomeMes: string // jun, jul, ago...
  nomeMesCompleto: string // Junho, Julho...
  isPassadoOuPresente: boolean // true = realizado (caixa real), false = futuro (estimativa azul)
  isMesCorrente: boolean
  receita: number
  custos: number
  percentual33: number // Receita - Custos
  honda: number // Parcela / pagamento Honda
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
  motosNovasCount: number // 3
  frotaTotalProjetada: number // motosAtivasCount + 3
  mediaReceitaPorMoto: number
  mediaCustosPorMoto: number
  receitaEstimadaMensal: number
  custosEstimadosMensais: number
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

/**
 * Extrai o mapa de parcelas restantes da Honda por (ano-mes) a partir das Contas a Pagar
 */
export function getHondaParcelasFuturas(
  contasHonda: ContaAPagarComProgresso[],
  anoCorte: number,
  mesCorte: number,
): Map<string, number> {
  const mapa = new Map<string, number>()

  for (const conta of contasHonda) {
    const parcelas = resolverParcelasConta(conta)
    const qtdPaga = conta.quantidadePaga || (conta.pagamentos ? conta.pagamentos.length : 0)

    // Parcelas não pagas (índice a partir de qtdPaga)
    const parcelasPendentes = parcelas.slice(qtdPaga)

    for (let i = 0; i < parcelasPendentes.length; i++) {
      const p = parcelasPendentes[i]
      let anoP: number | null = null
      let mesP: number | null = null

      if (p.data_vencimento) {
        // Formato esperado: YYYY-MM-DD ou ISO
        const match = p.data_vencimento.match(/^(\d{4})-(\d{2})/)
        if (match) {
          anoP = parseInt(match[1], 10)
          mesP = parseInt(match[2], 10)
        }
      }

      // Se não tem data_vencimento na parcela, calcular a partir do mês de corte + offset
      if (!anoP || !mesP) {
        const offset = i + 1
        const dt = new Date(anoCorte, mesCorte - 1 + offset, 1)
        anoP = dt.getFullYear()
        mesP = dt.getMonth() + 1
      }

      const chave = `${anoP}-${String(mesP).padStart(2, '0')}`
      const valAtual = mapa.get(chave) || 0
      mapa.set(chave, valAtual + (p.valor || conta.valor_parcela || 0))
    }
  }

  return mapa
}

export interface CalcularProjecaoParams {
  motos: Moto[]
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
  // Ponto de corte do presente (se omitido, usa a data atual do sistema)
  anoAtual?: number
  mesAtual?: number // 1 a 12
  // Mês de início dos 12 meses exibidos (se omitido, calcula a partir do mês de início histórico dos dados ou mês atual - N)
  anoInicio?: number
  mesInicio?: number // 1 a 12
  // Quantidade de motos novas projetadas (padrão: 3, conforme usuária)
  motosNovas?: number
}

/**
 * Calcula os 12 meses da Projeção de Fluxo de Caixa
 */
export function calcularProjecaoFluxoCaixa(
  params: CalcularProjecaoParams,
): ProjecaoFluxoCaixaResultado {
  const agora = new Date()
  const anoAtual = params.anoAtual ?? agora.getFullYear()
  const mesAtual = params.mesAtual ?? agora.getMonth() + 1
  const motosNovas = params.motosNovas ?? 3

  // Identificar motos ativas da frota (exclui vendidas e cedidas)
  const motosAtivas = params.motos.filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
  const motosAtivasCount = motosAtivas.length
  const frotaTotalProjetada = motosAtivasCount + motosNovas

  // Contas Honda
  const contasHonda = getContasHonda(params.contasAPagar)
  const contasHondaIds = new Set(contasHonda.map((c) => c.id))

  // 1. Determinar o mês inicial da régua de 12 meses
  // Se informado explicitamente nos params, usa-o.
  // Senão, detecta se há dados históricos anteriores ao mês atual para iniciar no primeiro mês relevante (ex: jun/2026),
  // garantindo que cubra exatamente 12 meses correndo como na planilha (ex: jun/2026 a mai/2027).
  let anoInicio = params.anoInicio
  let mesInicio = params.mesInicio

  if (!anoInicio || !mesInicio) {
    // Buscar o primeiro mês com movimentação relevante de caixa
    let menorAno = anoAtual
    let menorMes = mesAtual

    for (const c of params.caixa) {
      if (!c.data) continue
      const match = c.data.match(/^(\d{4})-(\d{2})/)
      if (match) {
        const y = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        if (y < menorAno || (y === menorAno && m < menorMes)) {
          menorAno = y
          menorMes = m
        }
      }
    }

    // Se houver histórico anterior até 6 meses antes, começa no menor mês;
    // caso contrário, fixa numa janela de 12 meses que contenha o mês atual.
    anoInicio = menorAno
    mesInicio = menorMes
  }

  // 2. Agrupar lançamentos de caixa por chave YYYY-MM
  const caixaPorMes = new Map<
    string,
    {
      receita: number
      custos: number
      honda: number
    }
  >()

  for (const c of params.caixa) {
    if (!c.data) continue
    const match = c.data.match(/^(\d{4})-(\d{2})/)
    if (!match) continue
    const chave = `${match[1]}-${match[2]}`

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

  // 3. Calcular média histórica realizada por moto ativa para projetar meses futuros
  // Considera meses realizados que possuem receita > 0
  let somaReceitasRealizadas = 0
  let somaCustosRealizados = 0
  let mesesRealizadosComDados = 0

  caixaPorMes.forEach((dados, chave) => {
    const [yStr, mStr] = chave.split('-')
    const y = parseInt(yStr, 10)
    const m = parseInt(mStr, 10)
    const isPassado = y < anoAtual || (y === anoAtual && m <= mesAtual)

    if (isPassado && dados.receita > 0) {
      somaReceitasRealizadas += dados.receita
      somaCustosRealizados += dados.custos
      mesesRealizadosComDados++
    }
  })

  // Média mensal global realizada
  const mediaMensalReceita =
    mesesRealizadosComDados > 0 ? somaReceitasRealizadas / mesesRealizadosComDados : 14000
  const mediaMensalCustos =
    mesesRealizadosComDados > 0 ? somaCustosRealizados / mesesRealizadosComDados : 4200

  // Média por moto ativa
  const baseMotosDivisor = Math.max(1, motosAtivasCount)
  const mediaReceitaPorMoto = mediaMensalReceita / baseMotosDivisor
  const mediaCustosPorMoto = mediaMensalCustos / baseMotosDivisor

  // Estimativa mensal para a frota expandida (frotaTotalProjetada = ativas + 3)
  const receitaEstimadaMensal = Math.round(mediaReceitaPorMoto * frotaTotalProjetada)
  const custosEstimadosMensais = Math.round(mediaCustosPorMoto * frotaTotalProjetada)

  // 4. Mapa de parcelas futuras da Honda
  const hondaFuturas = getHondaParcelasFuturas(contasHonda, anoAtual, mesAtual)

  // Valor padrão de parcela Honda caso não haja parcelas cadastradas
  const valorParcelaHondaPadrao =
    contasHonda.length > 0 && contasHonda[0].valor_parcela ? contasHonda[0].valor_parcela : 5140

  // 5. Montar os 12 meses
  const meses: MesProjecao[] = []
  let totais: ProjecaoTotais = {
    receita: 0,
    custos: 0,
    percentual33: 0,
    honda: 0,
    ll: 0,
  }

  for (let i = 0; i < 12; i++) {
    const dt = new Date(anoInicio, mesInicio - 1 + i, 1)
    const ano = dt.getFullYear()
    const mes = dt.getMonth() + 1
    const chave = `${ano}-${String(mes).padStart(2, '0')}`

    const isPassadoOuPresente = ano < anoAtual || (ano === anoAtual && mes <= mesAtual)
    const isMesCorrente = ano === anoAtual && mes === mesAtual

    let receita = 0
    let custos = 0
    let honda = 0

    if (isPassadoOuPresente) {
      // Dados reais do Caixa
      const dadosReais = caixaPorMes.get(chave)
      if (dadosReais) {
        receita = Math.round(dadosReais.receita)
        custos = Math.round(dadosReais.custos)
        honda = Math.round(dadosReais.honda)
      }
    } else {
      // Meses futuros = ESTIMATIVAS
      receita = receitaEstimadaMensal
      custos = custosEstimadosMensais

      // Honda futura: puxar da conta Honda cadastrada em Contas a Pagar
      if (hondaFuturas.has(chave)) {
        honda = Math.round(hondaFuturas.get(chave)!)
      } else {
        // Se a conta Honda ainda tem saldo após as parcelas mapeadas ou valor fixo
        // Se já quitou todas as parcelas cadastradas, fica 0
        honda = 0
      }
    }

    // Fórmula da planilha:
    // 33% = Receita - Custos
    // LL = (Receita - Custos) - Honda
    const percentual33 = receita - custos
    const ll = percentual33 - honda

    meses.push({
      ano,
      mes,
      numeroSequencial: i + 1,
      nomeMes: NOMES_MESES_ABREV[mes - 1],
      nomeMesCompleto: NOMES_MESES_COMPLETO[mes - 1],
      isPassadoOuPresente,
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

  const anoFim = meses[meses.length - 1].ano

  return {
    meses,
    totais,
    anoInicio,
    anoFim,
    motosAtivasCount,
    motosNovasCount: motosNovas,
    frotaTotalProjetada,
    mediaReceitaPorMoto,
    mediaCustosPorMoto,
    receitaEstimadaMensal,
    custosEstimadosMensais,
  }
}

/**
 * Formata número no padrão pt-BR sem decimais quando inteiro (ex: 6.250 ou -1.250)
 */
export function formatarNumeroPlanilha(valor: number): string {
  if (valor === undefined || valor === null || isNaN(valor)) return '-'
  return valor.toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
}
