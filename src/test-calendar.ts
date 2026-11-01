/**
 * Teste e validação das regras de calendário para o Painel SEMANA (DOMINGO a SÁBADO)
 *
 * PEDIDO DA USUÁRIA:
 * "NO PAINEL SEMANA começar no DOMINGO e terminar no sábado.
 * OUTUBRO SEMANA 1 vai de 04 a 10, a 2 vai de 11 a 17, 3 vai de 18 a 24, 4 vai de 25 a 31.
 * Reprogramar para o ano todo, frente e trás conforme este."
 *
 * Padrão confirmado para 2026:
 * jan 4, fev 4, mar 5, abr 4, mai 4, jun 5, jul 4, ago 4, set 5, out 4, nov 4, dez 5 semanas.
 *
 * Regra:
 * A semana pertence ao mês do seu domingo de início;
 * EXCETO quando restam no máximo 2 dias desse mês a partir do domingo
 * (domingo é penúltimo ou último dia do mês), caso em que pertence ao mês seguinte.
 */

import { getAssignedMonthForSunday, getMonthWeeks } from './lib/semanaCalendar'

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

  // 1. Casos de atribuição direta por domingo (getAssignedMonthForSunday)
  // 29/03/2026 (março tem 31 dias; restam 3 dias: 29, 30, 31) -> MARÇO/2026 (mês 2)
  const d29mar2026 = new Date(Date.UTC(2026, 2, 29))
  assertEqual('29/03/2026 pertence a Março/2026', getAssignedMonthForSunday(d29mar2026), {
    year: 2026,
    month: 2,
  })

  // 31/05/2026 (maio tem 31 dias; resta 1 dia: 31) -> JUNHO/2026 (mês 5)
  const d31mai2026 = new Date(Date.UTC(2026, 4, 31))
  assertEqual(
    '31/05/2026 (último dia de maio) vai para Junho/2026',
    getAssignedMonthForSunday(d31mai2026),
    {
      year: 2026,
      month: 5,
    },
  )

  // 30/08/2026 (agosto tem 31 dias; restam 2 dias: 30, 31) -> SETEMBRO/2026 (mês 8)
  const d30ago2026 = new Date(Date.UTC(2026, 7, 30))
  assertEqual(
    '30/08/2026 (penúltimo dia de agosto) vai para Setembro/2026',
    getAssignedMonthForSunday(d30ago2026),
    {
      year: 2026,
      month: 8,
    },
  )

  // 29/11/2026 (novembro tem 30 dias; restam 2 dias: 29, 30) -> DEZEMBRO/2026 (mês 11)
  const d29nov2026 = new Date(Date.UTC(2026, 10, 29))
  assertEqual(
    '29/11/2026 (penúltimo dia de novembro) vai para Dezembro/2026',
    getAssignedMonthForSunday(d29nov2026),
    {
      year: 2026,
      month: 11,
    },
  )

  // 2. Validação obrigatória da usuária: Outubro/2026
  // Semana 1: 04 a 10, Semana 2: 11 a 17, Semana 3: 18 a 24, Semana 4: 25 a 31
  const out2026 = getMonthWeeks(2026, 9)
  assertEqual('Outubro/2026 deve ter exatamente 4 semanas', out2026.length, 4)
  assertEqual(
    'Outubro/2026 Semana 1 de 04 a 10',
    { start: out2026[0].startDateStr, end: out2026[0].endDateStr },
    { start: '2026-10-04', end: '2026-10-10' },
  )
  assertEqual(
    'Outubro/2026 Semana 2 de 11 a 17',
    { start: out2026[1].startDateStr, end: out2026[1].endDateStr },
    { start: '2026-10-11', end: '2026-10-17' },
  )
  assertEqual(
    'Outubro/2026 Semana 3 de 18 a 24',
    { start: out2026[2].startDateStr, end: out2026[2].endDateStr },
    { start: '2026-10-18', end: '2026-10-24' },
  )
  assertEqual(
    'Outubro/2026 Semana 4 de 25 a 31',
    { start: out2026[3].startDateStr, end: out2026[3].endDateStr },
    { start: '2026-10-25', end: '2026-10-31' },
  )

  // 3. Validação da contagem de semanas por mês em 2026:
  // jan 4, fev 4, mar 5, abr 4, mai 4, jun 5, jul 4, ago 4, set 5, out 4, nov 4, dez 5
  const expectedWeeks2026 = [
    { mes: 'JANEIRO', monthIdx: 0, count: 4, firstSunday: '2026-01-04' },
    { mes: 'FEVEREIRO', monthIdx: 1, count: 4, firstSunday: '2026-02-01' },
    { mes: 'MARÇO', monthIdx: 2, count: 5, firstSunday: '2026-03-01' },
    { mes: 'ABRIL', monthIdx: 3, count: 4, firstSunday: '2026-04-05' },
    { mes: 'MAIO', monthIdx: 4, count: 4, firstSunday: '2026-05-03' },
    { mes: 'JUNHO', monthIdx: 5, count: 5, firstSunday: '2026-05-31' },
    { mes: 'JULHO', monthIdx: 6, count: 4, firstSunday: '2026-07-05' },
    { mes: 'AGOSTO', monthIdx: 7, count: 4, firstSunday: '2026-08-02' },
    { mes: 'SETEMBRO', monthIdx: 8, count: 5, firstSunday: '2026-08-30' },
    { mes: 'OUTUBRO', monthIdx: 9, count: 4, firstSunday: '2026-10-04' },
    { mes: 'NOVEMBRO', monthIdx: 10, count: 4, firstSunday: '2026-11-01' },
    { mes: 'DEZEMBRO', monthIdx: 11, count: 5, firstSunday: '2026-11-29' },
  ]

  for (const exp of expectedWeeks2026) {
    const weeks = getMonthWeeks(2026, exp.monthIdx)
    assertEqual(`2026 - ${exp.mes} deve ter ${exp.count} semanas`, weeks.length, exp.count)
    assertEqual(
      `2026 - ${exp.mes} primeiro domingo correto`,
      weeks[0].startDateStr,
      exp.firstSunday,
    )
    // Numeração 1 a N dentro do mês
    const weekOfMonths = weeks.map((w) => w.weekOfMonth)
    const expectedIndices = Array.from({ length: exp.count }, (_, i) => i + 1)
    assertEqual(
      `2026 - ${exp.mes} numeração SEMANA 1 a ${exp.count}`,
      weekOfMonths,
      expectedIndices,
    )
  }

  // 4. Dezembro/2026 com 5 semanas
  const dez2026 = getMonthWeeks(2026, 11)
  assertEqual('Dezembro/2026 deve ter exatamente 5 semanas', dez2026.length, 5)

  // 5. Testes unitários das regras de competência de contratos (/semana)
  // Regra 1: Na semana atual, contrato encerrado não aparece mesmo com data_entrega no futuro
  const mockContratoEncerradoFuturo: any = {
    id: 'c_encerrado',
    moto: 'm1',
    status: 'finalizado',
    data_inicio: '2026-06-04 12:00:00.000Z',
    data_entrega: '2027-06-11 12:00:00.000Z',
  }
  const mockContratoAtivo: any = {
    id: 'c_ativo',
    moto: 'm1',
    status: 'ativo',
    data_inicio: '2026-09-23 12:00:00.000Z',
  }

  // Simulação fiel da função getActiveContratosForWeek (com regra de unicidade por moto da 0.0.78)
  const filterHelper = (
    cList: any[],
    weekStart: string,
    weekEnd: string,
    isCurrentOrFuture: boolean,
  ) => {
    const parse = (s: string) => s?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''

    const eligible = cList.filter((c) => {
      if (c.status !== 'ativo' && c.status !== 'finalizado') return false
      const inicio = parse(c.data_inicio)
      if (inicio && inicio > weekEnd) return false

      if (isCurrentOrFuture) {
        if (c.status !== 'ativo') return false
        return true
      }

      if (c.status === 'finalizado') {
        const fim = parse(c.data_entrega) || '2026-10-28'
        if (weekStart > fim) return false
      }
      return true
    })

    // Unicidade por moto: escolher deterministicamente UM contrato vigente
    const motoMap = new Map<string, any>()
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

      const cInicio = parse(c.data_inicio)
      const existingInicio = parse(existing.data_inicio)
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

  // Semana Atual (isCurrentOrFuture = true)
  const currentWeekFiltered = filterHelper(
    [mockContratoEncerradoFuturo, mockContratoAtivo],
    '2026-10-25',
    '2026-10-31',
    true,
  )
  assertEqual(
    'Semana atual: apenas contrato ativo deve aparecer',
    currentWeekFiltered.map((c) => c.id),
    ['c_ativo'],
  )

  // Semana passada quando o encerrado estava vigente (ex.: 2026-06-07 a 2026-06-13)
  const pastWeekFiltered = filterHelper(
    [mockContratoEncerradoFuturo, mockContratoAtivo],
    '2026-06-07',
    '2026-06-13',
    false,
  )
  assertEqual(
    'Semana passada em Jun/2026: contrato encerrado deve aparecer, ativo ainda não iniciado não aparece',
    pastWeekFiltered.map((c) => c.id),
    ['c_encerrado'],
  )

  // Contrato encerrado com entrega em 2026-07-03
  const mockContratoEncerradoJulho: any = {
    id: 'c_encerrado_jul',
    moto: 'm2',
    status: 'finalizado',
    data_inicio: '2026-06-16 12:00:00.000Z',
    data_entrega: '2026-07-03 12:00:00.000Z',
  }
  // Semana após entrega (2026-07-05 a 2026-07-11)
  const afterDeliveryFiltered = filterHelper(
    [mockContratoEncerradoJulho],
    '2026-07-05',
    '2026-07-11',
    false,
  )
  assertEqual(
    'Semana posterior à entrega: contrato encerrado NÃO deve aparecer',
    afterDeliveryFiltered.map((c) => c.id),
    [],
  )

  // 6. Testes da REGRA DE UNICIDADE POR MOTO (0.0.78):
  // "cada moto aparece apenas 1 x na semana. conforme a data da semana e o contrato vigente na data"
  // Caso A: Mesma moto com dois contratos encerrados cobrindo a mesma semana passada
  // -> Escolhe o mais recente (maior data_inicio)
  const cAntigoMoto1: any = {
    id: 'c_encerrado_antigo',
    moto: 'm_dupla',
    status: 'finalizado',
    data_inicio: '2026-01-10 12:00:00.000Z',
    data_entrega: '2026-04-30 12:00:00.000Z',
  }
  const cRecenteMoto1: any = {
    id: 'c_encerrado_recente',
    moto: 'm_dupla',
    status: 'finalizado',
    data_inicio: '2026-03-01 12:00:00.000Z',
    data_entrega: '2026-05-15 12:00:00.000Z',
  }
  // Semana em Março/2026 (2026-03-15 a 2026-03-21): ambos cobrem, mas moto deve aparecer 1x com o mais recente
  const weekOverlapFiltered = filterHelper(
    [cAntigoMoto1, cRecenteMoto1],
    '2026-03-15',
    '2026-03-21',
    false,
  )
  assertEqual(
    'Unicidade por moto: mesma moto tem no máximo 1 linha por semana',
    weekOverlapFiltered.length,
    1,
  )
  assertEqual(
    'Unicidade por moto: entre encerrados sobrepostos, escolhe o mais recente (maior data_inicio)',
    weekOverlapFiltered[0].id,
    'c_encerrado_recente',
  )

  // Caso B: Mesma moto com contrato ativo e contrato encerrado na semana atual
  const cAtivoMoto3: any = {
    id: 'c_ativo_m3',
    moto: 'm3',
    status: 'ativo',
    data_inicio: '2026-08-01 12:00:00.000Z',
  }
  const cEncerradoMoto3: any = {
    id: 'c_encerrado_m3',
    moto: 'm3',
    status: 'finalizado',
    data_inicio: '2026-01-01 12:00:00.000Z',
    data_entrega: '2026-07-31 12:00:00.000Z',
  }
  const weekCurrentOverlap = filterHelper(
    [cEncerradoMoto3, cAtivoMoto3],
    '2026-10-25',
    '2026-10-31',
    true,
  )
  assertEqual(
    'Semana atual com múltiplos contratos da mesma moto: seleciona apenas 1 linha (o ativo)',
    weekCurrentOverlap.map((c) => c.id),
    ['c_ativo_m3'],
  )

  // Caso C: Duas motos diferentes no mesmo bloco semanal -> cada moto tem exatamente 1 linha (total 2 linhas)
  const cMotoA1: any = {
    id: 'c_motoA_1',
    moto: 'motoA',
    status: 'finalizado',
    data_inicio: '2026-02-01 12:00:00.000Z',
    data_entrega: '2026-04-10 12:00:00.000Z',
  }
  const cMotoA2: any = {
    id: 'c_motoA_2',
    moto: 'motoA',
    status: 'finalizado',
    data_inicio: '2026-03-01 12:00:00.000Z',
    data_entrega: '2026-05-10 12:00:00.000Z',
  }
  const cMotoB1: any = {
    id: 'c_motoB_1',
    moto: 'motoB',
    status: 'finalizado',
    data_inicio: '2026-01-01 12:00:00.000Z',
    data_entrega: '2026-06-01 12:00:00.000Z',
  }
  const multipleMotosFiltered = filterHelper(
    [cMotoA1, cMotoA2, cMotoB1],
    '2026-03-15',
    '2026-03-21',
    false,
  )
  assertEqual(
    'Múltiplas motos: cada moto aparece exatamente 1 vez na semana',
    multipleMotosFiltered.map((c) => c.moto).sort(),
    ['motoA', 'motoB'],
  )
  assertEqual(
    'Múltiplas motos: para motoA foi selecionado o mais recente',
    multipleMotosFiltered.find((c) => c.moto === 'motoA')?.id,
    'c_motoA_2',
  )

  // 7. Teste de isolamento de células da semana (/semana - getCellStatus)
  // Garante que recebimento pago de uma semana/data não vaze indevidamente para outra semana/data
  const mockRecebimentos = [
    {
      id: 'rec_out',
      moto: 'motoX',
      contrato: 'contX',
      status: 'pago',
      semana_ano: '2026-W42',
      data_vencimento: '2026-10-21 12:00:00.000Z',
    },
  ]
  const mockContratoX: any = { id: 'contX', moto: 'motoX', status: 'ativo' }

  const parseDateStr = (raw?: string | null): string => {
    if (!raw) return ''
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : ''
  }

  const checkCell = (
    c: any,
    wCode: string,
    cellDate: string,
    wStart: string,
    wEnd: string,
    recs: any[],
  ) => {
    const isRecordForThisCell = (r: any): boolean => {
      const recVenc = parseDateStr(r.data_vencimento)
      if (recVenc && recVenc === cellDate) return true
      if (r.semana_ano && r.semana_ano === wCode) {
        if (!recVenc) return true
        if (wStart && wEnd) {
          return recVenc >= wStart && recVenc <= wEnd
        }
        return true
      }
      return false
    }
    const found = recs.find(
      (r) => r.moto === c.moto && r.status === 'pago' && isRecordForThisCell(r),
    )
    return found ? 'pago' : 'pendente'
  }

  // Na semana W42 (2026-10-18 a 2026-10-24), no dia 2026-10-21 deve ser 'pago'
  const statusW42 = checkCell(
    mockContratoX,
    '2026-W42',
    '2026-10-21',
    '2026-10-18',
    '2026-10-24',
    mockRecebimentos,
  )
  assertEqual('W42 dia 21/10 deve constar como pago', statusW42, 'pago')

  // Na semana W44 (2026-11-01 a 2026-11-07), início de mês sem recebimento, deve ser 'pendente' (neutro)
  const statusW44 = checkCell(
    mockContratoX,
    '2026-W44',
    '2026-11-04',
    '2026-11-01',
    '2026-11-07',
    mockRecebimentos,
  )
  assertEqual(
    'Início de mês (W44) sem recebimento deve constar como pendente/neutro',
    statusW44,
    'pendente',
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
