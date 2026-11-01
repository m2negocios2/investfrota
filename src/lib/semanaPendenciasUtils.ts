import { Moto, Contrato, Recebimento, DiaSemana } from '@/types/database'
import { getTodayLocalDate } from '@/lib/dateUtils'
import {
  getWeekForDate,
  getWeekDatesFromSunday,
  getAssignedMonthForSunday,
  NOMES_MESES,
} from '@/lib/semanaCalendar'

export interface FaltaPagamentoSemana {
  motoId: string
  motoNome: string
  motoPlaca: string
  contratoId: string
  locatarioNome: string
  valorSemanal: number
  diaSemana: DiaSemana
  dataVencimento: string // YYYY-MM-DD
  weekCode: string // ex: "2026-W18"
  weekNumber: number
  weekYear: number
  monthIndex: number // 0-11
  monthName: string
  monthYear: number
  isCurrentWeek: boolean
}

// Helper para extrair YYYY-MM-DD
function parseDateStr(raw?: string | null): string {
  if (!raw) return ''
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

// Obter dia de pagamento semanal do contrato
export function getContractDayHelper(contrato: Contrato): DiaSemana {
  if (contrato.dia_pagamento_semana) return contrato.dia_pagamento_semana
  if (contrato.data_inicio) {
    const clean = parseDateStr(contrato.data_inicio)
    if (clean) {
      const parts = clean.split('-').map(Number)
      const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
      const map: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
      return map[dt.getUTCDay()] || 'SEG'
    }
  }
  return 'SEG'
}

// Contratos ativos/vigentes para uma semana específica, com a mesma regra da tela Semana
export function getActiveContratosForWeekHelper(
  contratos: Contrato[],
  motos: Moto[],
  weekStartStr: string,
  weekEndStr: string,
  isCurrentOrFutureWeek: boolean,
): Contrato[] {
  const todayStr = getTodayLocalDate()

  const eligible = contratos.filter((c) => {
    if (c.status !== 'ativo' && c.status !== 'finalizado') return false
    const motoExists = motos.some((m) => m.id === c.moto)
    if (!motoExists) return false

    if (isCurrentOrFutureWeek) {
      if (c.status !== 'ativo') return false
      const inicio = parseDateStr(c.data_inicio)
      if (inicio && inicio > weekEndStr) return false
      return true
    }

    const inicio = parseDateStr(c.data_inicio)
    if (inicio && inicio > weekEndStr) return false

    if (c.status === 'finalizado') {
      const fim = parseDateStr(c.data_entrega) || todayStr
      if (weekStartStr > fim) return false
    }

    return true
  })

  const motoMap = new Map<string, Contrato>()
  for (const c of eligible) {
    const existing = motoMap.get(c.moto)
    if (!existing) {
      motoMap.set(c.moto, c)
      continue
    }

    const cIsAtivo = c.status === 'ativo'
    const existingIsAtivo = existing.status === 'ativo'
    if (cIsAtivo && !existingIsAtivo) {
      motoMap.set(c.moto, c)
      continue
    }
    if (!cIsAtivo && existingIsAtivo) {
      continue
    }

    const cInicio = parseDateStr(c.data_inicio)
    const existingInicio = parseDateStr(existing.data_inicio)
    if (cInicio > existingInicio) {
      motoMap.set(c.moto, c)
      continue
    }
    if (cInicio < existingInicio) {
      continue
    }

    if (c.id > existing.id) {
      motoMap.set(c.moto, c)
    }
  }

  return Array.from(motoMap.values())
}

// Checa se o contrato estava vigente no dia específico
export function isContractActiveOnDateHelper(
  contrato: Contrato,
  cellDateStr: string,
  isCurrentOrFutureWeek: boolean,
): boolean {
  if (isCurrentOrFutureWeek && contrato.status !== 'ativo') {
    return false
  }

  const inicio = parseDateStr(contrato.data_inicio)
  if (inicio && cellDateStr < inicio) {
    return false
  }

  if (contrato.status === 'finalizado') {
    const todayStr = getTodayLocalDate()
    const fim = parseDateStr(contrato.data_entrega) || todayStr
    if (cellDateStr > fim) {
      return false
    }
  }

  return true
}

// Status da célula idêntico à página Semana
export function getCellStatusHelper(
  contrato: Contrato,
  recebimentos: Recebimento[],
  weekCode: string,
  cellDateStr: string,
  weekStartStr?: string,
  weekEndStr?: string,
): {
  status: 'pago' | 'pendente' | 'atraso'
  recebimento?: Recebimento
  corCustomizada?: 'verde' | 'vermelho' | 'neutro'
} {
  const isRecordForThisCell = (r: Recebimento): boolean => {
    const recVenc = parseDateStr(r.data_vencimento)
    if (recVenc && recVenc === cellDateStr) {
      return true
    }
    if (r.semana_ano && r.semana_ano === weekCode) {
      if (!recVenc) return true
      if (weekStartStr && weekEndStr) {
        return recVenc >= weekStartStr && recVenc <= weekEndStr
      }
      return true
    }
    return false
  }

  let found = recebimentos.find((r) => {
    if (r.moto !== contrato.moto) return false
    if (r.contrato && r.contrato !== contrato.id) return false
    return isRecordForThisCell(r)
  })

  if (!found || found.status !== 'pago') {
    const anyPaidRecord = recebimentos.find((r) => {
      if (r.moto !== contrato.moto) return false
      if (r.status !== 'pago') return false
      return isRecordForThisCell(r)
    })
    if (anyPaidRecord) {
      found = anyPaidRecord
    }
  }

  if (found) {
    const obs = found.observacoes || ''
    let corCustomizada: 'verde' | 'vermelho' | 'neutro' | undefined
    if (obs.includes('cor_vermelho')) {
      corCustomizada = 'vermelho'
    } else if (obs.includes('cor_neutro')) {
      corCustomizada = 'neutro'
    } else if (obs.includes('cor_verde') || obs.includes('apenas_colorido')) {
      corCustomizada = 'verde'
    }

    if (found.status === 'pago') {
      return { status: 'pago', recebimento: found, corCustomizada }
    }
    if (found.status === 'em_atraso') {
      return { status: 'atraso', recebimento: found, corCustomizada }
    }
    if (corCustomizada === 'vermelho') {
      return { status: 'atraso', recebimento: found, corCustomizada }
    }
    if (corCustomizada === 'neutro') {
      return { status: 'pendente', recebimento: found, corCustomizada }
    }
    const todayStr = getTodayLocalDate()
    if (cellDateStr < todayStr) {
      return { status: 'atraso', recebimento: found, corCustomizada }
    }
    return { status: 'pendente', recebimento: found, corCustomizada }
  }

  const todayStr = getTodayLocalDate()
  if (cellDateStr < todayStr) {
    return { status: 'atraso' }
  }
  return { status: 'pendente' }
}

export interface WeekRangeInfo {
  sundayDate: Date
  weekCode: string
  weekNumber: number
  weekYear: number
  monthIndex: number
  monthName: string
  monthYear: number
  weekStartStr: string
  weekEndStr: string
  isCurrent: boolean
}

/**
 * Retorna as 3 últimas semanas até a data de hoje (semana atual + 2 semanas imediatamente anteriores),
 * da mais recente (topo) para a mais antiga.
 */
export function getLast3WeeksInfo(referenceDate: Date = new Date()): WeekRangeInfo[] {
  const currentWeek = getWeekForDate(referenceDate)
  const currentSunday = currentWeek.sundayDate

  const weeks: WeekRangeInfo[] = []

  // i = 0: semana atual
  // i = 1: 1 semana atrás
  // i = 2: 2 semanas atrás
  for (let i = 0; i < 3; i++) {
    const sDate = new Date(currentSunday)
    sDate.setUTCDate(sDate.getUTCDate() - i * 7)

    const wInfo = getWeekForDate(sDate)
    const weekDates = getWeekDatesFromSunday(sDate)
    const assigned = getAssignedMonthForSunday(sDate)

    weeks.push({
      sundayDate: sDate,
      weekCode: wInfo.code,
      weekNumber: wInfo.week,
      weekYear: wInfo.year,
      monthIndex: assigned.month,
      monthName: NOMES_MESES[assigned.month],
      monthYear: assigned.year,
      weekStartStr: weekDates['DOM'].dateStr,
      weekEndStr: weekDates['SAB'].dateStr,
      isCurrent: i === 0,
    })
  }

  return weeks
}

/**
 * Apura as pendências de atraso das 3 últimas semanas da planilha Semana.
 * Regra solicitada: NÃO CONSIDERAR NEUTRO, considerar apenas os que estiverem
 * explicitamente coloridos em VERMELHO (em atraso explícito).
 *
 * Células neutras (sem cor escolhida, com ou sem pagamento registrado) NÃO são pendências.
 * Células verdes (pago / apenas_colorido verde) também não são pendências.
 */
export function getFaltasUltimas3Semanas(
  motos: Moto[],
  contratos: Contrato[],
  recebimentos: Recebimento[],
  referenceDate: Date = new Date(),
): {
  faltas: FaltaPagamentoSemana[]
  totalValorFaltas: number
  weeks: WeekRangeInfo[]
} {
  const todayStr = getTodayLocalDate()
  const weeks = getLast3WeeksInfo(referenceDate)
  const faltas: FaltaPagamentoSemana[] = []

  for (const w of weeks) {
    const weekDates = getWeekDatesFromSunday(w.sundayDate)
    const isCurrentOrFuture = w.isCurrent || w.weekStartStr >= todayStr

    const activeContratos = getActiveContratosForWeekHelper(
      contratos,
      motos,
      w.weekStartStr,
      w.weekEndStr,
      isCurrentOrFuture,
    )

    for (const contrato of activeContratos) {
      const moto = motos.find((m) => m.id === contrato.moto)
      if (!moto) continue

      const dia = getContractDayHelper(contrato)
      const cellDateStr = weekDates[dia].dateStr

      // Verifica vigência no dia da semana
      const isVigente = isContractActiveOnDateHelper(contrato, cellDateStr, isCurrentOrFuture)
      if (!isVigente) continue

      const cellState = getCellStatusHelper(
        contrato,
        recebimentos,
        w.weekCode,
        cellDateStr,
        w.weekStartStr,
        w.weekEndStr,
      )

      // Regra de apuração: considerar APENAS células que estiverem explicitamente em VERMELHO.
      // Células neutras (com ou sem pagamento) ou verdes NUNCA entram como pendência.
      if (cellState.corCustomizada !== 'vermelho') {
        continue
      }

      // Se por algum motivo o recebimento estiver com status 'pago', não é pendência
      if (cellState.status === 'pago') {
        continue
      }

      const valor =
        contrato.valor_semanal || (contrato.valor_diario ? contrato.valor_diario * 7 : 0)

      faltas.push({
        motoId: moto.id,
        motoNome: moto.nome || moto.modelo,
        motoPlaca: moto.placa,
        contratoId: contrato.id,
        locatarioNome: contrato.locatario_nome?.trim() || 'Sem locatário',
        valorSemanal: valor,
        diaSemana: dia,
        dataVencimento: cellDateStr,
        weekCode: w.weekCode,
        weekNumber: w.weekNumber,
        weekYear: w.weekYear,
        monthIndex: w.monthIndex,
        monthName: w.monthName,
        monthYear: w.monthYear,
        isCurrentWeek: w.isCurrent,
      })
    }
  }

  // Ordenar faltas: primeiro as da semana mais recente, depois por data de vencimento desc, depois por nome
  faltas.sort((a, b) => {
    if (a.dataVencimento !== b.dataVencimento) {
      return b.dataVencimento.localeCompare(a.dataVencimento)
    }
    return a.motoNome.localeCompare(b.motoNome)
  })

  const totalValorFaltas = faltas.reduce((acc, f) => acc + f.valorSemanal, 0)

  return {
    faltas,
    totalValorFaltas,
    weeks,
  }
}
