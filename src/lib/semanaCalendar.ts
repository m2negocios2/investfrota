/**
 * Utilitário de calendário para o Painel SEMANA
 *
 * REGRA DEFINIDA PELA USUÁRIA:
 * "A semana pertence ao mês da sua segunda-feira, EXCETO quando a segunda-feira
 * é o último dia do mês (ou seja, apenas 1 dia da semana cai nesse mês),
 * caso em que a semana pertence ao mês seguinte."
 *
 * Cada semana começa na segunda-feira e termina no domingo.
 *
 * Padrão resultante para 2026 (4-4-5 por trimestre):
 * - Janeiro: 4 semanas (05/01, 12/01, 19/01, 26/01)
 * - Fevereiro: 4 semanas (02/02, 09/02, 16/02, 23/02)
 * - Março: 5 semanas (02/03, 09/03, 16/03, 23/03, 30/03)
 * - Abril: 4 semanas (06/04, 13/04, 20/04, 27/04)
 * - Maio: 4 semanas (04/05, 11/05, 18/05, 25/05)
 * - Junho: 5 semanas (01/06, 08/06, 15/06, 22/06, 29/06)
 * - Julho: 4 semanas (06/07, 13/07, 20/07, 27/07)
 * - Agosto: 4 semanas (03/08, 10/08, 17/08, 24/08)
 * - Setembro: 5 semanas (31/08, 07/09, 14/09, 21/09, 28/09)
 * - Outubro: 4 semanas (05/10, 12/10, 19/10, 26/10)
 * - Novembro: 4 semanas (02/11, 09/11, 16/11, 23/11)
 * - Dezembro: 5 semanas (30/11, 07/12, 14/12, 21/12, 28/12)
 *
 * Casos de 2025:
 * - Outubro/2025: 4 semanas (06, 13, 20, 27)
 * - Novembro/2025: 4 semanas (03, 10, 17, 24)
 * - Dezembro/2025: 5 semanas (01, 08, 15, 22, 29)
 */

import { DiaSemana } from '@/types/database'

export const NOMES_MESES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const

export const DIAS_SEMANA_CONFIG: {
  key: DiaSemana
  label: string
  short: string
  dayIndex: number
}[] = [
  { key: 'SEG', label: 'Segunda-feira', short: 'SEG', dayIndex: 1 },
  { key: 'TER', label: 'Terça-feira', short: 'TER', dayIndex: 2 },
  { key: 'QUA', label: 'Quarta-feira', short: 'QUA', dayIndex: 3 },
  { key: 'QUI', label: 'Quinta-feira', short: 'QUI', dayIndex: 4 },
  { key: 'SEX', label: 'Sexta-feira', short: 'SEX', dayIndex: 5 },
  { key: 'SAB', label: 'Sábado', short: 'SAB', dayIndex: 6 },
  { key: 'DOM', label: 'Domingo', short: 'DOM', dayIndex: 0 },
]

/**
 * Retorna o número e código da semana ISO 8601 (ano operacional ISO, semana ISO).
 */
export function getISOWeekNumber(d: Date): { year: number; week: number; code: string } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Quinta-feira define o ano da semana ISO
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return {
    year: date.getUTCFullYear(),
    week: weekNo,
    code: `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
  }
}

/**
 * Retorna as datas de segunda a domingo para uma semana ISO.
 */
export function getWeekDates(
  year: number,
  week: number,
): { [key in DiaSemana]: { date: Date; dateStr: string } } {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay()
  const ISOweekStart = new Date(simple)
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  }

  const result = {} as { [key in DiaSemana]: { date: Date; dateStr: string } }
  DIAS_SEMANA_CONFIG.forEach((d, idx) => {
    const cur = new Date(ISOweekStart)
    cur.setUTCDate(ISOweekStart.getUTCDate() + idx)
    result[d.key] = {
      date: cur,
      dateStr: cur.toISOString().split('T')[0],
    }
  })
  return result
}

/**
 * Regra do painel SEMANA:
 * "A semana pertence ao mês da sua segunda-feira, EXCETO quando a segunda-feira
 * é o último dia do mês (ou seja, apenas 1 dia da semana cai nesse mês),
 * caso em que a semana pertence ao mês seguinte."
 *
 * @param monday Data da segunda-feira (esperado Date UTC ou local com horário zerado)
 * @returns { year: number; month: number } onde month é 0-11
 */
export function getAssignedMonthForMonday(monday: Date): { year: number; month: number } {
  const y = monday.getUTCFullYear()
  const m = monday.getUTCMonth()
  const d = monday.getUTCDate()
  const daysInM = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

  // Se a segunda-feira é o ÚLTIMO dia do mês (d === daysInM), a semana tem apenas 1 dia neste mês,
  // portanto pertence ao mês seguinte!
  if (d === daysInM) {
    if (m === 11) {
      return { year: y + 1, month: 0 }
    }
    return { year: y, month: m + 1 }
  }

  // Em todos os outros casos (2 a 7 dias no mês), pertence ao mês da segunda-feira
  return { year: y, month: m }
}

export interface MonthWeekInfo {
  year: number
  week: number
  code: string
  isCurrent: boolean
  monthName: string
  monthYear: number
  weekOfMonth: number
  mondayDate: Date
}

/**
 * Retorna todas as semanas atribuídas a um determinado mês e ano (selectedMonth 0-11).
 * Opcionalmente reordena para colocar a semana atual no topo se ela estiver presente neste mês.
 */
export function getMonthWeeks(
  selectedYear: number,
  selectedMonth: number,
  todayISOCode?: string,
): MonthWeekInfo[] {
  const assignedMondays: {
    date: Date
    iso: { year: number; week: number; code: string }
  }[] = []

  // 1) Verificar segundas-feiras no final do mês anterior (últimos 7 dias do mês anterior)
  // Caso a segunda-feira do mês anterior seja o último dia desse mês, ela virá para cá!
  const prevMonthDate = new Date(Date.UTC(selectedYear, selectedMonth, 0))
  const lastDayPrevMonth = prevMonthDate.getUTCDate()
  const prevMonthYear = prevMonthDate.getUTCFullYear()
  const prevMonthIndex = prevMonthDate.getUTCMonth()

  for (let d = Math.max(1, lastDayPrevMonth - 6); d <= lastDayPrevMonth; d++) {
    const cur = new Date(Date.UTC(prevMonthYear, prevMonthIndex, d))
    if (cur.getUTCDay() === 1) {
      const assigned = getAssignedMonthForMonday(cur)
      if (assigned.year === selectedYear && assigned.month === selectedMonth) {
        assignedMondays.push({
          date: cur,
          iso: getISOWeekNumber(cur),
        })
      }
    }
  }

  // 2) Verificar segundas-feiras no próprio selectedMonth
  const daysInCurrentMonth = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).getUTCDate()
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const cur = new Date(Date.UTC(selectedYear, selectedMonth, d))
    if (cur.getUTCDay() === 1) {
      const assigned = getAssignedMonthForMonday(cur)
      if (assigned.year === selectedYear && assigned.month === selectedMonth) {
        assignedMondays.push({
          date: cur,
          iso: getISOWeekNumber(cur),
        })
      }
    }
  }

  // Ordenação cronológica
  assignedMondays.sort((a, b) => a.date.getTime() - b.date.getTime())

  const items: MonthWeekInfo[] = assignedMondays.map((m, index) => {
    const isCurrent = todayISOCode ? m.iso.code === todayISOCode : false
    return {
      year: m.iso.year,
      week: m.iso.week,
      code: m.iso.code,
      isCurrent,
      monthName: NOMES_MESES[selectedMonth],
      monthYear: selectedYear,
      weekOfMonth: index + 1,
      mondayDate: m.date,
    }
  })

  // Se houver semana atual, destaca no topo, mantendo a numeração weekOfMonth intacta
  const hasCurrent = items.some((item) => item.isCurrent)
  if (hasCurrent) {
    return [...items].sort((a, b) => {
      if (a.isCurrent) return -1
      if (b.isCurrent) return 1
      return a.weekOfMonth - b.weekOfMonth
    })
  }

  return items
}
