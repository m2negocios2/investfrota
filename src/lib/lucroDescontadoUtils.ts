/**
 * Utilitários de cálculo para o relatório LUCRO DESCONTADO (Plano Conquista)
 *
 * Regras de Negócio:
 * - Filtro: apenas motos com contrato Plano Conquista VIGENTE/ATIVO agora (já iniciado e não entregue/encerrado,
 *   respeitando também o checkbox INDEFINIDO sem data de entrega).
 *   Motos vendidas/cedidas, contratos normais e contratos Plano Conquista passados (finalizados, cancelados
 *   ou com data de entrega já passada sem contrato vigente) NÃO entram.
 * - COLUNA 1 — MOTO: nome da moto (sem placa) e situação/status (ex: "Locada", "Disponível").
 * - COLUNA 2 — PREVISÃO DE LUCRO TOTAL ATÉ A DATA DE ENTREGA DO BEM:
 *   Lucro real acumulado no caixa da moto até hoje (entradas − saídas) +
 *   projeção do lucro médio mensal real da própria moto estendido até a data de entrega do contrato.
 *   - Projeção até a entrega: meses futuros completos entre hoje e a data de entrega (calcularMesesCompletos(hoje, data_entrega)).
 *     Adicional projetado = lucroMedioMensalReal * mesesFuturos.
 *   - Se a data de entrega já tiver passado (ou for hoje, mesesFuturos <= 0): usa o lucro real acumulado.
 *   - Se a moto não tiver lucro médio calculável (meses de operação = 0), a projeção futura não tem média real, usa lucro acumulado.
 *   - Se faltar data de entrega no contrato Plano Conquista: previsão fica null ("—").
 * - COLUNA 3 — LUCRO DESCONTADO DO VALOR DA MOTO:
 *   Coluna 2 menos o valor de compra da moto (campo valor_compra da moto).
 *   Se Coluna 2 for nula (sem data de entrega), Coluna 3 fica null ("—").
 * - COLUNA 4 — LUCRO MÉDIO DESCONTADO:
 *   Coluna 3 ÷ meses de operação, usando a MESMA regra de meses completos do LUCRO MÉDIO MOTO
 *   (calcularMesesCompletos(data_compra_ou_primeiro_lanc, hoje)).
 *   Se meses de operação < 1, exibe "—" (sem divisão por zero).
 */

import { Moto, Contrato, CaixaLancamento } from '@/types/database'
import {
  calcularMesesCompletos,
  formatDateDisplay,
  parseYearMonthDay,
  toLocalDateString,
} from '@/lib/dateUtils'

export interface ItemLucroDescontado {
  moto: Moto
  contrato: Contrato
  nomeMoto: string
  situacaoMoto: string
  dataCompraFormatada: string
  dataEntregaFormatada: string
  valorCompra: number
  mesesOperacao: number
  mesesAteEntrega: number
  lucroAcumuladoReal: number
  lucroMedioMensalReal: number | null
  previsaoLucroTotal: number | null
  lucroDescontado: number | null
  lucroMedioDescontado: number | null
  semDataEntrega: boolean
}

export interface TotaisLucroDescontado {
  totalMotos: number
  totalPrevisaoLucro: number
  totalValorCompra: number
  totalLucroDescontado: number
  mediaLucroDescontadoFrota: number | null
  totalLucroRealAcumulado: number
}

export interface ParametrosCalculoLucroDescontado {
  motos: Moto[]
  contratos: Contrato[]
  caixa: CaixaLancamento[]
  dataReferencia?: Date | string
}

/**
 * Determina a data inicial efetiva da moto (data de compra ou 1º lançamento do caixa)
 */
export function extrairDataInicioMoto(
  moto: Moto,
  primeiroLancamentoData: Date | null,
): {
  dataInicioEfetiva: string | Date | null
  dataInicioFormatada: string
  origemInicio: 'compra' | 'primeiro_lancamento' | 'sem_historico'
  anoInicio: number | null
  mesInicio: number | null // 0-based
} {
  if (moto.data_compra) {
    const parsed = parseYearMonthDay(moto.data_compra)
    if (parsed) {
      return {
        dataInicioEfetiva: moto.data_compra,
        dataInicioFormatada: formatDateDisplay(moto.data_compra),
        origemInicio: 'compra',
        anoInicio: parsed.year,
        mesInicio: parsed.month - 1,
      }
    }
  }

  if (primeiroLancamentoData) {
    return {
      dataInicioEfetiva: primeiroLancamentoData,
      dataInicioFormatada: formatDateDisplay(primeiroLancamentoData),
      origemInicio: 'primeiro_lancamento',
      anoInicio: primeiroLancamentoData.getFullYear(),
      mesInicio: primeiroLancamentoData.getMonth(),
    }
  }

  return {
    dataInicioEfetiva: null,
    dataInicioFormatada: '—',
    origemInicio: 'sem_historico',
    anoInicio: null,
    mesInicio: null,
  }
}

/**
 * Calcula os totais de caixa (entradas, saídas, lucro) de uma moto, respeitando o início da moto se houver.
 */
export function calcularLucroCaixaMoto(
  lancamentos: CaixaLancamento[],
  anoInicio: number | null,
  mesInicio: number | null,
): {
  totalEntradas: number
  totalSaidas: number
  lucroAcumulado: number
  primeiroLancamentoData: Date | null
} {
  let totalEntradas = 0
  let totalSaidas = 0
  let primeiroLancamentoData: Date | null = null

  // Acha o primeiro lançamento
  lancamentos.forEach((l) => {
    if (l.data) {
      const d = new Date(l.data)
      if (!isNaN(d.getTime())) {
        if (!primeiroLancamentoData || d.getTime() < primeiroLancamentoData.getTime()) {
          primeiroLancamentoData = d
        }
      }
    }
  })

  lancamentos.forEach((l) => {
    const val = Number(l.valor) || 0
    if (!l.data) {
      if (l.tipo === 'entrada') totalEntradas += val
      else if (l.tipo === 'saida') totalSaidas += val
      return
    }

    const d = new Date(l.data)
    if (isNaN(d.getTime())) {
      if (l.tipo === 'entrada') totalEntradas += val
      else if (l.tipo === 'saida') totalSaidas += val
      return
    }

    if (anoInicio !== null && mesInicio !== null) {
      const lComp = d.getFullYear() * 12 + d.getMonth()
      const inicioComp = anoInicio * 12 + mesInicio
      if (lComp < inicioComp) {
        return
      }
    }

    if (l.tipo === 'entrada') {
      totalEntradas += val
    } else if (l.tipo === 'saida') {
      totalSaidas += val
    }
  })

  return {
    totalEntradas,
    totalSaidas,
    lucroAcumulado: totalEntradas - totalSaidas,
    primeiroLancamentoData,
  }
}

/**
 * Função principal para calcular todos os itens do relatório LUCRO DESCONTADO.
 */
export function calcularLucroDescontado({
  motos,
  contratos,
  caixa,
  dataReferencia,
}: ParametrosCalculoLucroDescontado): {
  itens: ItemLucroDescontado[]
  totais: TotaisLucroDescontado
} {
  const hoje = dataReferencia ? new Date(dataReferencia) : new Date()

  // 1. Mapear lançamentos de caixa por moto
  const lancamentosPorMoto = new Map<string, CaixaLancamento[]>()
  caixa.forEach((c) => {
    if (!c.moto) return
    const list = lancamentosPorMoto.get(c.moto) || []
    list.push(c)
    lancamentosPorMoto.set(c.moto, list)
  })

  // 2. Mapear contratos Plano Conquista VIGENTES/ATIVOS AGORA
  // Regra da usuária: "Planos conquista passados não contam. apenas as motos que agora estão no plano conquista."
  // Critérios de elegibilidade:
  // - Motos vendidas e cedidas NÃO entram
  // - Apenas motos que possuem um contrato Plano Conquista VIGENTE/ATIVO hoje:
  //   a) status === 'ativo'
  //   b) Já iniciado hoje (data_inicio <= hoje ou sem data_inicio)
  //   c) Não entregue/encerrado: se tiver data_entrega preenchida, ela deve ser >= hoje.
  //      Se data_entrega for vazia/indefinida (checkbox INDEFINIDO), o contrato segue ativo sem prazo de fim.
  // - Contratos Plano Conquista passados (status !== 'ativo', ex: 'finalizado'/'cancelado',
  //   ou data_entrega no passado) NÃO contam — nem fazem a moto aparecer, nem trazem lucro de plano antigo.
  const hojeStr = toLocalDateString(hoje)

  const contratosPlanoConquistaAtivos = contratos.filter((c) => {
    if (c.tipo !== 'plano_conquista') return false
    if (c.status !== 'ativo') return false

    // Verificar se já iniciou
    if (c.data_inicio) {
      const inicioStr = toLocalDateString(c.data_inicio)
      if (inicioStr > hojeStr) {
        // Contrato futuro ainda não iniciado
        return false
      }
    }

    // Se tem data de entrega definida (não é indefinido), verificar se ainda não foi entregue/passado
    if (c.data_entrega && c.data_entrega.trim() !== '') {
      const entregaStr = toLocalDateString(c.data_entrega)
      if (entregaStr < hojeStr) {
        // Data de entrega já no passado (plano concluído/vencido)
        return false
      }
    }

    return true
  })

  // Agrupar contratos ativos por moto (se houver mais de um, pegar o mais recente)
  const contratoAtivoPorMoto = new Map<string, Contrato>()
  contratosPlanoConquistaAtivos.forEach((c) => {
    if (!c.moto) return
    const existente = contratoAtivoPorMoto.get(c.moto)
    if (!existente) {
      contratoAtivoPorMoto.set(c.moto, c)
    } else {
      const d1 = new Date(c.created || 0).getTime()
      const d2 = new Date(existente.created || 0).getTime()
      if (d1 > d2) {
        contratoAtivoPorMoto.set(c.moto, c)
      }
    }
  })

  // 3. Filtrar as motos elegíveis:
  // - status !== 'vendida' && status !== 'cedida'
  // - Possui contrato Plano Conquista ativo/vigente agora
  const itens: ItemLucroDescontado[] = []

  motos.forEach((moto) => {
    // Exclui vendidas e cedidas
    if (moto.status === 'vendida' || moto.status === 'cedida') {
      return
    }

    const contrato = contratoAtivoPorMoto.get(moto.id)
    if (!contrato) {
      // Não tem contrato Plano Conquista ativo/vigente agora
      return
    }

    const lancamentos = lancamentosPorMoto.get(moto.id) || []

    // 1º passo: encontrar a data de início da moto
    let primeiroLanc: Date | null = null
    lancamentos.forEach((l) => {
      if (l.data) {
        const d = new Date(l.data)
        if (!isNaN(d.getTime())) {
          if (!primeiroLanc || d.getTime() < primeiroLanc.getTime()) {
            primeiroLanc = d
          }
        }
      }
    })

    const infoInicio = extrairDataInicioMoto(moto, primeiroLanc)
    const { lucroAcumulado } = calcularLucroCaixaMoto(
      lancamentos,
      infoInicio.anoInicio,
      infoInicio.mesInicio,
    )

    // Meses de operação (regra dos meses completos da data de compra até hoje)
    let mesesOperacao = 0
    let lucroMedioMensalReal: number | null = null

    if (infoInicio.dataInicioEfetiva) {
      mesesOperacao = calcularMesesCompletos(infoInicio.dataInicioEfetiva, hoje)
      if (mesesOperacao > 0) {
        lucroMedioMensalReal = lucroAcumulado / mesesOperacao
      }
    }

    // Informações da entrega do contrato
    const semDataEntrega = !contrato.data_entrega || contrato.data_entrega.trim() === ''
    let dataEntregaFormatada = '—'
    let mesesAteEntrega = 0
    let previsaoLucroTotal: number | null = null

    if (!semDataEntrega && contrato.data_entrega) {
      dataEntregaFormatada = formatDateDisplay(contrato.data_entrega)
      // Meses futuros entre hoje e a data de entrega
      mesesAteEntrega = calcularMesesCompletos(hoje, contrato.data_entrega)

      // Suposição de cálculo:
      // Lucro real acumulado no caixa da moto até hoje (entradas - saídas) +
      // projeção do lucro médio mensal real da própria moto estendido até a data de entrega.
      // Se a entrega já tiver passado (mesesAteEntrega <= 0), usa o lucro real acumulado.
      if (mesesAteEntrega <= 0) {
        previsaoLucroTotal = lucroAcumulado
      } else {
        // Se a moto já tem lucro médio mensal apurado
        if (lucroMedioMensalReal !== null) {
          previsaoLucroTotal = lucroAcumulado + lucroMedioMensalReal * mesesAteEntrega
        } else {
          // Menos de 1 mês completo: projeção futura sem base real utiliza o lucro acumulado atual
          previsaoLucroTotal = lucroAcumulado
        }
      }
    }

    // Coluna 3: Lucro descontado do valor da moto (Coluna 2 menos o valor de compra da moto)
    const valorCompra = Number(moto.valor_compra) || 0
    let lucroDescontado: number | null = null
    if (previsaoLucroTotal !== null) {
      lucroDescontado = previsaoLucroTotal - valorCompra
    }

    // Coluna 4: Lucro Médio Descontado (Coluna 3 ÷ meses de operação)
    // Se mesesOperacao < 1 (0 meses), mostra "—" sem dividir por zero
    let lucroMedioDescontado: number | null = null
    if (lucroDescontado !== null && mesesOperacao > 0) {
      lucroMedioDescontado = lucroDescontado / mesesOperacao
    }

    // Situação legível da moto
    let situacaoMoto = 'Ativa'
    if (moto.status === 'locada') situacaoMoto = 'Locada'
    else if (moto.status === 'disponivel') situacaoMoto = 'Disponível'
    else if (moto.status === 'manutencao') situacaoMoto = 'Manutenção'
    else if (moto.status === 'em_loja_detran') situacaoMoto = 'Em Loja/Detran'

    itens.push({
      moto,
      contrato,
      nomeMoto: moto.nome || moto.modelo || 'Moto',
      situacaoMoto,
      dataCompraFormatada: infoInicio.dataInicioFormatada,
      dataEntregaFormatada,
      valorCompra,
      mesesOperacao,
      mesesAteEntrega,
      lucroAcumuladoReal: lucroAcumulado,
      lucroMedioMensalReal,
      previsaoLucroTotal,
      lucroDescontado,
      lucroMedioDescontado,
      semDataEntrega,
    })
  })

  // Ordenar por padrão alfabético pelo nome da moto
  itens.sort((a, b) => a.nomeMoto.localeCompare(b.nomeMoto))

  // Totais consolidados
  let totalPrevisaoLucro = 0
  let totalValorCompra = 0
  let totalLucroDescontado = 0
  let totalLucroRealAcumulado = 0

  itens.forEach((it) => {
    totalLucroRealAcumulado += it.lucroAcumuladoReal
    totalValorCompra += it.valorCompra
    if (it.previsaoLucroTotal !== null) {
      totalPrevisaoLucro += it.previsaoLucroTotal
    }
    if (it.lucroDescontado !== null) {
      totalLucroDescontado += it.lucroDescontado
    }
  })

  const itensComMedia = itens.filter((it) => it.lucroMedioDescontado !== null)
  const mediaLucroDescontadoFrota =
    itensComMedia.length > 0
      ? itensComMedia.reduce((acc, it) => acc + (it.lucroMedioDescontado || 0), 0) /
        itensComMedia.length
      : null

  return {
    itens,
    totais: {
      totalMotos: itens.length,
      totalPrevisaoLucro,
      totalValorCompra,
      totalLucroDescontado,
      mediaLucroDescontadoFrota,
      totalLucroRealAcumulado,
    },
  }
}
