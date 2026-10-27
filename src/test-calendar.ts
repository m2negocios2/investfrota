/**
 * Teste e validação das regras de calendário para o Painel SEMANA
 *
 * REGRA:
 * "A semana pertence ao mês da sua segunda-feira, EXCETO quando a segunda-feira
 * é o último dia do mês (ou seja, apenas 1 dia da semana cai nesse mês),
 * caso em que a semana pertence ao mês seguinte."
 *
 * Validações obrigatórias especificadas pela usuária:
 * 1. 2026 completo (padrão 4-4-5 por trimestre):
 *    - Janeiro: 4 semanas (05, 12, 19, 26/01)
 *    - Fevereiro: 4 semanas (02, 09, 16, 23/02)
 *    - Março: 5 semanas (02, 09, 16, 23, 30/03)
 *    - Abril: 4 semanas (06, 13, 20, 27/04)
 *    - Maio: 4 semanas (04, 11, 18, 25/05)
 *    - Junho: 5 semanas (01, 08, 15, 22, 29/06)
 *    - Julho: 4 semanas (06, 13, 20, 27/07)
 *    - Agosto: 4 semanas (03, 10, 17, 24/08)
 *    - Setembro: 5 semanas (31/08, 07, 14, 21, 28/09)
 *    - Outubro: 4 semanas (05, 12, 19, 26/10)
 *    - Novembro: 4 semanas (02, 09, 16, 23/11)
 *    - Dezembro: 5 semanas (30/11, 07, 14, 21, 28/12)
 *
 * 2. Casos de borda específicos:
 *    - Semana de 29/12/2025: dez tem 3 dias nela -> fica em DEZEMBRO/2025. Jan/2026 = 4 semanas (05, 12, 19, 26/01).
 *    - Semana de 30/03/2026: mar tem 2 dias nela -> fica em MARÇO/2026 (março = 5 semanas: 02, 09, 16, 23, 30).
 *    - Semana de 29/06/2026: jun tem 2 dias nela -> fica em JUNHO/2026 (junho = 5: 01, 08, 15, 22, 29; julho = 4: 06, 13, 20, 27).
 *    - Semana de 31/08/2026: segunda é o último dia de agosto (só 1 dia em agosto) -> vai para SETEMBRO/2026 (agosto = 4: 03, 10, 17, 24; setembro = 5: 31/08, 07, 14, 21, 28).
 *    - Semana de 30/11/2026: segunda é o último dia de novembro -> vai para DEZEMBRO/2026 (novembro = 4: 02, 09, 16, 23; dezembro = 5: 30/11, 07, 14, 21, 28).
 *    - Casos de 2025: Outubro/2025 = 4, Novembro/2025 = 4, Dezembro/2025 = 5.
 */

import { getAssignedMonthForMonday, getMonthWeeks, NOMES_MESES } from './lib/semanaCalendar'

export interface TestResult {
  passed: boolean
  description: string
  expected: any
  actual: any
}

export function runCalendarTests(): { success: boolean; results: TestResult[] } {
  const results: TestResult[] = []

  const assertEqual = (desc: string, actual: any, expected: any) => {
    const passed = JSON.stringify(actual) === JSON.stringify(expected)
    results.push({
      passed,
      description: desc,
      expected,
      actual,
    })
    if (!passed) {
      console.error(`FALHA: ${desc}`, { expected, actual })
    }
  }

  // 1. Casos de atribuição direta por segunda-feira (getAssignedMonthForMonday)
  // 29/12/2025 (não é o último dia de dez, último dia é 31) -> DEZEMBRO/2025 (mês 11)
  const d29dez2025 = new Date(Date.UTC(2025, 11, 29))
  assertEqual('29/12/2025 pertence a Dezembro/2025', getAssignedMonthForMonday(d29dez2025), {
    year: 2025,
    month: 11,
  })

  // 30/03/2026 (março tem 31 dias; 30 não é último dia) -> MARÇO/2026 (mês 2)
  const d30mar2026 = new Date(Date.UTC(2026, 2, 30))
  assertEqual('30/03/2026 pertence a Março/2026', getAssignedMonthForMonday(d30mar2026), {
    year: 2026,
    month: 2,
  })

  // 29/06/2026 (junho tem 30 dias; 29 não é último dia) -> JUNHO/2026 (mês 5)
  const d29jun2026 = new Date(Date.UTC(2026, 5, 29))
  assertEqual('29/06/2026 pertence a Junho/2026', getAssignedMonthForMonday(d29jun2026), {
    year: 2026,
    month: 5,
  })

  // 31/08/2026 (agosto tem 31 dias; 31 É o último dia de agosto!) -> SETEMBRO/2026 (mês 8)
  const d31ago2026 = new Date(Date.UTC(2026, 7, 31))
  assertEqual(
    '31/08/2026 (último dia de agosto) vai para Setembro/2026',
    getAssignedMonthForMonday(d31ago2026),
    { year: 2026, month: 8 },
  )

  // 30/11/2026 (novembro tem 30 dias; 30 É o último dia de novembro!) -> DEZEMBRO/2026 (mês 11)
  const d30nov2026 = new Date(Date.UTC(2026, 10, 30))
  assertEqual(
    '30/11/2026 (último dia de novembro) vai para Dezembro/2026',
    getAssignedMonthForMonday(d30nov2026),
    { year: 2026, month: 11 },
  )

  // 2. Validação da contagem de semanas por mês em 2026 (padrão 4-4-5)
  const expectedWeeks2026 = [
    {
      mes: 'JANEIRO',
      monthIdx: 0,
      count: 4,
      mondays: ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'],
    },
    {
      mes: 'FEVEREIRO',
      monthIdx: 1,
      count: 4,
      mondays: ['2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23'],
    },
    {
      mes: 'MARÇO',
      monthIdx: 2,
      count: 5,
      mondays: ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30'],
    },
    {
      mes: 'ABRIL',
      monthIdx: 3,
      count: 4,
      mondays: ['2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27'],
    },
    {
      mes: 'MAIO',
      monthIdx: 4,
      count: 4,
      mondays: ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25'],
    },
    {
      mes: 'JUNHO',
      monthIdx: 5,
      count: 5,
      mondays: ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29'],
    },
    {
      mes: 'JULHO',
      monthIdx: 6,
      count: 4,
      mondays: ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'],
    },
    {
      mes: 'AGOSTO',
      monthIdx: 7,
      count: 4,
      mondays: ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'],
    },
    {
      mes: 'SETEMBRO',
      monthIdx: 8,
      count: 5,
      mondays: ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'],
    },
    {
      mes: 'OUTUBRO',
      monthIdx: 9,
      count: 4,
      mondays: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
    },
    {
      mes: 'NOVEMBRO',
      monthIdx: 10,
      count: 4,
      mondays: ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'],
    },
    {
      mes: 'DEZEMBRO',
      monthIdx: 11,
      count: 5,
      mondays: ['2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'],
    },
  ]

  for (const exp of expectedWeeks2026) {
    const weeks = getMonthWeeks(2026, exp.monthIdx)
    assertEqual(`2026 - ${exp.mes} deve ter ${exp.count} semanas`, weeks.length, exp.count)
    const mondays = weeks.map((w) => w.mondayDate.toISOString().split('T')[0])
    assertEqual(`2026 - ${exp.mes} segundas-feiras corretas`, mondays, exp.mondays)
    // Validação da numeração 1 a N dentro do mês
    const weekOfMonths = weeks.map((w) => w.weekOfMonth)
    const expectedIndices = Array.from({ length: exp.count }, (_, i) => i + 1)
    assertEqual(
      `2026 - ${exp.mes} numeração SEMANA 1 a ${exp.count}`,
      weekOfMonths,
      expectedIndices,
    )
  }

  // 3. Validação dos casos de 2025:
  // Outubro/2025 = 4
  const out2025 = getMonthWeeks(2025, 9)
  assertEqual('2025 - Outubro deve ter 4 semanas', out2025.length, 4)
  assertEqual(
    '2025 - Outubro segundas-feiras (06, 13, 20, 27)',
    out2025.map((w) => w.mondayDate.toISOString().split('T')[0]),
    ['2025-10-06', '2025-10-13', '2025-10-20', '2025-10-27'],
  )

  // Novembro/2025 = 4
  const nov2025 = getMonthWeeks(2025, 10)
  assertEqual('2025 - Novembro deve ter 4 semanas', nov2025.length, 4)
  assertEqual(
    '2025 - Novembro segundas-feiras (03, 10, 17, 24)',
    nov2025.map((w) => w.mondayDate.toISOString().split('T')[0]),
    ['2025-11-03', '2025-11-10', '2025-11-17', '2025-11-24'],
  )

  // Dezembro/2025 = 5
  const dez2025 = getMonthWeeks(2025, 11)
  assertEqual('2025 - Dezembro deve ter 5 semanas', dez2025.length, 5)
  assertEqual(
    '2025 - Dezembro segundas-feiras (01, 08, 15, 22, 29)',
    dez2025.map((w) => w.mondayDate.toISOString().split('T')[0]),
    ['2025-12-01', '2025-12-08', '2025-12-15', '2025-12-22', '2025-12-29'],
  )

  const allPassed = results.every((r) => r.passed)
  return { success: allPassed, results }
}

// Auto-execução ao carregar se estiver em ambiente de teste ou console
if (
  typeof window === 'undefined' ||
  (typeof window !== 'undefined' && (window as any).__RUN_CALENDAR_TESTS__)
) {
  const res = runCalendarTests()
  console.log(
    `[TEST-CALENDAR] Resultado: ${res.success ? 'PASSOU' : 'FALHOU'} (${res.results.length} verificações)`,
  )
}
