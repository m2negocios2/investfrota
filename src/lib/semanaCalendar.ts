/**
 * Utilitário de calendário para o Painel SEMANA
 *
 * REGRA DEFINIDA PELA USUÁRIA:
 * "NO PAINEL SEMANA começar no DOMINGO e terminar no sábado.
 * OUTUBRO SEMANA 1 vai de 04 a 10, a 2 vai de 11 a 17, 3 vai de 18 a 24, 4 vai de 25 a 31.
 * Reprogramar para o ano todo, frente e trás conforme este."
 *
 * Cada semana começa no DOMINGO e termina no SÁBADO.
 *
 * Regra de pertencimento da semana ao mês:
 * A semana pertence ao mês do seu domingo de início;
 * EXCETO quando o domingo é o último dia do mês (a semana teria só 1 dia nesse mês),
 * caso em que ela pertence ao mês seguinte.
 *
 * Padrão resultante para 2026:
 * - Jan: 4 semanas (04/01 a 10/01, 11/01 a 17/01, 18/01 a 24/01, 25/01 a 31/01)
 * - Fev: 4 semanas (01/02 a 07/02, 08/02 a 14/02, 15/02 a 21/02, 22/02 a 28/02)
 * - Mar: 5 semanas (01/03 a 07/03, 08/03 a 14/03, 15/03 a 21/03, 22/03 a 28/03, 29/03 a 04/04)
 * - Abr: 4 semanas (05/04 a 11/04, 12/04 a 18/04, 19/04 a 25/04, 26/04 a 02/05)
 * - Mai: 4 semanas (03/05 a 09/05, 10/05 a 16/05, 17/05 a 23/05, 24/05 a 30/05) [domingo 31/05 vai p/ Junho]
 * - Jun: 5 semanas (31/05 a 06/06, 07/06 a 13/06, 14/06 a 20/06, 21/06 a 27/06, 28/06 a 04/07)
 * - Jul: 4 semanas (05/07 a 11/07, 12/07 a 18/07, 19/07 a 25/07, 26/07 a 01/08)
 * - Ago: 4 semanas (02/08 a 08/08, 09/08 a 15/08, 16/08 a 22/08, 23/08 a 29/08) [domingo 30/08 é penúltimo dia, mas 31 é seg; domingo 30/08 tem 2 dias em agosto -> fica em Ago ou Set? Ver regra!]
 *   ATENÇÃO na regra: "ago 4, set 5 (domingo 30/08 vai para setembro); nov 4 e dez 5 (domingo 29/11 vai para dezembro)".
 *   Ver getAssignedMonthForSunday abaixo para a condição exata dos meses de 4-4-5.
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

/**
 * Ordem dos dias da semana no painel: DOMINGO a SÁBADO
 */
export const DIAS_SEMANA_CONFIG: {
  key: DiaSemana
  label: string
  short: string
  dayIndex: number
}[] = [
  { key: 'DOM', label: 'Domingo', short: 'DOM', dayIndex: 0 },
  { key: 'SEG', label: 'Segunda-feira', short: 'SEG', dayIndex: 1 },
  { key: 'TER', label: 'Terça-feira', short: 'TER', dayIndex: 2 },
  { key: 'QUA', label: 'Quarta-feira', short: 'QUA', dayIndex: 3 },
  { key: 'QUI', label: 'Quinta-feira', short: 'QUI', dayIndex: 4 },
  { key: 'SEX', label: 'Sexta-feira', short: 'SEX', dayIndex: 5 },
  { key: 'SAB', label: 'Sábado', short: 'SAB', dayIndex: 6 },
]

/**
 * Converte data para string YYYY-MM-DD em UTC
 */
function toDateStr(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Retorna o domingo que inicia a semana (domingo a sábado) que contém a data d.
 */
export function getSundayOfWeek(d: Date): Date {
  const res = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dow = res.getUTCDay() // 0 = DOM, 1 = SEG, ..., 6 = SAB
  res.setUTCDate(res.getUTCDate() - dow)
  return res
}

/**
 * Retorna o número da semana no ano (1 a 53) e o código único "YYYY-Www"
 * baseado no domingo de início da semana.
 * A semana 1 de um ano é a primeira semana cujo domingo pertence ao ano.
 */
export function getWeekNumberSunday(sunday: Date): { year: number; week: number; code: string } {
  const y = sunday.getUTCFullYear()
  // Primeiro domingo do ano y
  const jan1 = new Date(Date.UTC(y, 0, 1))
  const jan1Dow = jan1.getUTCDay()
  const firstSunday = new Date(Date.UTC(y, 0, 1 + (jan1Dow === 0 ? 0 : 7 - jan1Dow)))

  // Se o domingo estiver antes do primeiro domingo do ano (ex: 28/12/2025 é do ano 2025)
  if (sunday.getTime() < firstSunday.getTime()) {
    return getWeekNumberSunday(new Date(Date.UTC(y - 1, 11, 31)))
  }

  const diffMs = sunday.getTime() - firstSunday.getTime()
  const weekNo = Math.floor(diffMs / (7 * 86400000)) + 1
  return {
    year: y,
    week: weekNo,
    code: `${y}-W${String(weekNo).padStart(2, '0')}`,
  }
}

/**
 * Retorna o identificador de semana para uma data qualquer (hoje, vencimento, etc.)
 * considerando semanas de domingo a sábado.
 */
export function getWeekForDate(d: Date): {
  year: number
  week: number
  code: string
  sundayDate: Date
} {
  const sunday = getSundayOfWeek(d)
  const info = getWeekNumberSunday(sunday)
  return {
    ...info,
    sundayDate: sunday,
  }
}

/**
 * Retorna as datas de DOMINGO a SÁBADO para uma semana a partir da sua data de domingo.
 */
export function getWeekDatesFromSunday(sunday: Date): {
  [key in DiaSemana]: { date: Date; dateStr: string }
} {
  const result = {} as { [key in DiaSemana]: { date: Date; dateStr: string } }
  DIAS_SEMANA_CONFIG.forEach((d, idx) => {
    const cur = new Date(sunday)
    cur.setUTCDate(sunday.getUTCDate() + idx)
    result[d.key] = {
      date: cur,
      dateStr: toDateStr(cur),
    }
  })
  return result
}

/**
 * Regra do painel SEMANA (definida pela usuária e calibrada para o padrão 4-4-5 / 2026):
 *
 * "As semanas do painel passam a iniciar no DOMINGO e terminar no SÁBADO.
 * Regra de pertencimento ao mês, para QUALQUER data (passado e futuro), deve produzir
 * para 2026 exatamente este padrão que a usuária confirmou:
 * jan 4, fev 4, mar 5, abr 4, mai 4, jun 5, jul 4, ago 4, set 5, out 4, nov 4, dez 5 semanas.
 * A regra: a semana pertence ao mês do seu domingo de início;
 * EXCETO quando a maioria dos dias da semana (ou dias operacionais de seg a sab) cai no mês seguinte.
 * Especificamente: se o domingo tem apenas 1 ou 2 dias no mês atual (isto é, dia >= último dia - 1,
 * de modo que a maior parte da semana útil fica no mês seguinte: dom 31/05 vai p/ jun, dom 30/08 vai p/ set,
 * dom 29/11 vai p/ dez), a semana pertence ao mês seguinte."
 *
 * Analisando os dias de domingo em 2026:
 * - 29/03/2026: dia 29 de 31 dias em março -> restam 3 dias de março (29, 30, 31). Março = 5 semanas!
 * - 31/05/2026: dia 31 de 31 dias em maio -> resta 1 dia de maio (31). Vai para Junho! (Mai=4, Jun=5)
 * - 30/08/2026: dia 30 de 31 dias em agosto -> restam 2 dias de agosto (30, 31). Vai para Setembro! (Ago=4, Set=5)
 * - 29/11/2026: dia 29 de 30 dias em novembro -> restam 2 dias de novembro (29, 30). Vai para Dezembro! (Nov=4, Dez=5)
 *
 * Portanto, a regra matemática precisa e universal é:
 * Se (daysInMonth - sundayDate + 1) <= 2 (ou seja, resta no máximo 2 dias do mês a partir do domingo:
 * o domingo é o último ou penúltimo dia do mês), a semana tem no máximo 2 dias nesse mês (e 5 a 6 dias no mês seguinte),
 * então ela pertence ao MÊS SEGUINTE.
 * Caso contrário (restam 3 ou mais dias no mês, como em 29/03 que tem 3 dias: 29, 30, 31),
 * ela pertence ao mês do domingo!
 *
 * Isso atende com exatidão matemática universal:
 * - 2026: Jan 4, Fev 4, Mar 5, Abr 4, Mai 4, Jun 5, Jul 4, Ago 4, Set 5, Out 4, Nov 4, Dez 5.
 * - Outubro/2026: Semana 1 (04/10 a 10/10), Semana 2 (11/10 a 17/10), Semana 3 (18/10 a 24/10), Semana 4 (25/10 a 31/10).
 *
 * @param sunday Data do domingo (Date UTC)
 * @returns { year: number; month: number } onde month é 0-11
 */
export function getAssignedMonthForSunday(sunday: Date): { year: number; month: number } {
  const y = sunday.getUTCFullYear()
  const m = sunday.getUTCMonth()
  const d = sunday.getUTCDate()
  const daysInM = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

  const remainingDaysInMonth = daysInM - d + 1

  // Se restam apenas 1 ou 2 dias deste mês na semana (domingo é penúltimo ou último dia do mês),
  // a semana tem 5 ou 6 dias no mês seguinte, portanto pertence ao mês seguinte!
  if (remainingDaysInMonth <= 2) {
    if (m === 11) {
      return { year: y + 1, month: 0 }
    }
    return { year: y, month: m + 1 }
  }

  // Se restam 3 ou mais dias no mês (ex: 29/03 tem 3 dias em março), pertence ao mês do domingo
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
  sundayDate: Date
  startDateStr: string
  endDateStr: string
}

/**
 * Retorna todas as semanas atribuídas a um determinado mês e ano (selectedMonth 0-11).
 * Cada semana vai de DOMINGO a SÁBADO.
 */
export function getMonthWeeks(
  selectedYear: number,
  selectedMonth: number,
  todayCode?: string,
): MonthWeekInfo[] {
  const assignedSundays: {
    date: Date
    info: { year: number; week: number; code: string }
  }[] = []

  // 1) Verificar domingos no final do mês anterior (últimos 7 dias do mês anterior)
  // Caso o domingo do mês anterior tenha sido atribuído ao mês atual pela regra de transição
  const prevMonthDate = new Date(Date.UTC(selectedYear, selectedMonth, 0))
  const lastDayPrevMonth = prevMonthDate.getUTCDate()
  const prevMonthYear = prevMonthDate.getUTCFullYear()
  const prevMonthIndex = prevMonthDate.getUTCMonth()

  for (let d = Math.max(1, lastDayPrevMonth - 7); d <= lastDayPrevMonth; d++) {
    const cur = new Date(Date.UTC(prevMonthYear, prevMonthIndex, d))
    if (cur.getUTCDay() === 0) {
      const assigned = getAssignedMonthForSunday(cur)
      if (assigned.year === selectedYear && assigned.month === selectedMonth) {
        assignedSundays.push({
          date: cur,
          info: getWeekNumberSunday(cur),
        })
      }
    }
  }

  // 2) Verificar domingos no próprio selectedMonth
  const daysInCurrentMonth = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).getUTCDate()
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const cur = new Date(Date.UTC(selectedYear, selectedMonth, d))
    if (cur.getUTCDay() === 0) {
      const assigned = getAssignedMonthForSunday(cur)
      if (assigned.year === selectedYear && assigned.month === selectedMonth) {
        assignedSundays.push({
          date: cur,
          info: getWeekNumberSunday(cur),
        })
      }
    }
  }

  // Ordenação cronológica para numerar Semana 1, Semana 2...
  assignedSundays.sort((a, b) => a.date.getTime() - b.date.getTime())

  const items: MonthWeekInfo[] = assignedSundays.map((item, index) => {
    const isCurrent = todayCode ? item.info.code === todayCode : false
    const weekDates = getWeekDatesFromSunday(item.date)
    return {
      year: item.info.year,
      week: item.info.week,
      code: item.info.code,
      isCurrent,
      monthName: NOMES_MESES[selectedMonth],
      monthYear: selectedYear,
      weekOfMonth: index + 1,
      sundayDate: item.date,
      startDateStr: weekDates['DOM'].dateStr,
      endDateStr: weekDates['SAB'].dateStr,
    }
  })

  return items
}
