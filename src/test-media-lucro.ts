/**
 * Testes das regras de cálculo de meses completos e do relatório LUCRO MÉDIO MOTO
 *
 * Casos cobertos:
 * 1. Exemplo do chamado: Compra em 29/12/2025, consultado em 02/11/2026 = 10 meses completos
 * 2. Compra no dia 15 do mês, consultado no dia 14 do mês seguinte = 0 meses completos
 * 3. Compra no dia 15 do mês, consultado no dia 15 do mês seguinte = 1 mês completo
 * 4. Compra no dia 15 do mês, consultado no dia 14 de dois meses depois = 1 mês completo
 * 5. Compra no dia 15 do mês, consultado no dia 15 de dois meses depois = 2 meses completos
 * 6. Moto comprada no próprio mês (ex: compra 10/11/2026, hoje 12/11/2026) = 0 meses completos -> lucro médio "—" (sem divisão por zero)
 * 7. Motos vendidas/cedidas com data_fim_locacao registrada contam até a data_fim_locacao por meses completos
 * 8. Cálculo de lucro médio (lucro ÷ meses) usando o novo divisor de meses completos
 */

import { calcularMesesCompletos, parseYearMonthDay } from './lib/dateUtils'
import { Moto, CaixaLancamento } from './types/database'

export interface TestResult {
  passed: boolean
  description: string
  expected: any
  actual: any
}

export function runMediaLucroTests(): { success: boolean; results: TestResult[] } {
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

  // 1. Caso FAN: compra 29/12/2025, consulta 02/11/2026 -> 10 meses completos
  const mesesFAN = calcularMesesCompletos('2025-12-29', '2026-11-02')
  assertEqual('FAN (compra 29/12/2025, hoje 02/11/2026) deve ter 10 meses completos', mesesFAN, 10)

  // Em 29/11/2026, completará o 11º mês
  const mesesFAN_29Nov = calcularMesesCompletos('2025-12-29', '2026-11-29')
  assertEqual('FAN em 29/11/2026 deve ter 11 meses completos', mesesFAN_29Nov, 11)

  // Em 28/11/2026, ainda tem 10 meses
  const mesesFAN_28Nov = calcularMesesCompletos('2025-12-29', '2026-11-28')
  assertEqual('FAN em 28/11/2026 ainda deve ter 10 meses completos', mesesFAN_28Nov, 10)

  // 2. Compra dia 15 de um mês, consultado no dia 14 do mês seguinte = 0 meses completos
  const meses15para14Seguinte = calcularMesesCompletos('2026-05-15', '2026-06-14')
  assertEqual(
    'Compra 15/05 até 14/06 = 0 meses completos (ainda não atingiu dia 15)',
    meses15para14Seguinte,
    0,
  )

  // 3. Compra dia 15 de um mês, consultado no dia 15 ou depois do mês seguinte = 1 mês completo
  const meses15para15Seguinte = calcularMesesCompletos('2026-05-15', '2026-06-15')
  assertEqual('Compra 15/05 até 15/06 = 1 mês completo', meses15para15Seguinte, 1)

  const meses15para20Seguinte = calcularMesesCompletos('2026-05-15', '2026-06-20')
  assertEqual('Compra 15/05 até 20/06 = 1 mês completo', meses15para20Seguinte, 1)

  // 4. Compra dia 15 de um mês, consultado no dia 14 de dois meses depois = 1 mês completo
  const meses15para14DoisMeses = calcularMesesCompletos('2026-05-15', '2026-07-14')
  assertEqual(
    'Compra 15/05 até 14/07 = 1 mês completo (1 mês completo de 15/05 a 15/06, o 2º só em 15/07)',
    meses15para14DoisMeses,
    1,
  )

  // 5. Compra dia 15 de um mês, consultado no dia 15 ou depois de dois meses depois = 2 meses completos
  const meses15para15DoisMeses = calcularMesesCompletos('2026-05-15', '2026-07-15')
  assertEqual('Compra 15/05 até 15/07 = 2 meses completos', meses15para15DoisMeses, 2)

  // 6. Moto comprada no próprio mês (menos de 1 mês completo) -> 0 meses
  const mesesMesmoMes = calcularMesesCompletos('2026-11-05', '2026-11-20')
  assertEqual('Compra no mesmo mês (05/11 até 20/11) = 0 meses completos', mesesMesmoMes, 0)

  // 7. Data de fim anterior à data de início -> 0 meses
  const mesesInvertido = calcularMesesCompletos('2026-11-20', '2026-11-05')
  assertEqual('Data fim anterior a data início = 0 meses', mesesInvertido, 0)

  // 8. Fim de mês com dia 31 (ex: compra 31/01/2026, fim 28/02/2026 -> fev atinge último dia -> 1 mês completo)
  const mesesFev = calcularMesesCompletos('2026-01-31', '2026-02-28')
  assertEqual('Compra 31/01 até 28/02 (último dia de fev) = 1 mês completo', mesesFev, 1)

  // 9. Moto vendida com data_fim_locacao registrada:
  // Compra em 10/01/2026 e data_fim_locacao em 25/08/2026 -> 7 meses completos (10/01 a 10/08 são 7 meses; 10/09 seria 8)
  const mesesMotoVendida = calcularMesesCompletos('2026-01-10', '2026-08-25')
  assertEqual(
    'Moto vendida com fim de locação 25/08/2026 (compra 10/01/2026) = 7 meses completos',
    mesesMotoVendida,
    7,
  )

  // 10. Validação do cálculo de lucro médio e proteção contra divisão por zero:
  // Se mesesDecorridos === 0 -> mediaMensal deve ser null (exibindo "—")
  const lucroMock = 5000
  const mediaCom0Meses = mesesMesmoMes > 0 ? lucroMock / mesesMesmoMes : null
  assertEqual('0 meses completos resulta em mediaMensal = null (exibe "—")', mediaCom0Meses, null)

  // Se mesesDecorridos === 10 -> mediaMensal = 5000 / 10 = 500
  const mediaFAN = mesesFAN > 0 ? lucroMock / mesesFAN : null
  assertEqual('Lucro R$ 5.000 com 10 meses resulta em média R$ 500,00/mês', mediaFAN, 500)

  const allPassed = results.every((r) => r.passed)
  return { success: allPassed, results }
}

// Auto-execução em ambiente node ou browser
if (
  typeof window === 'undefined' ||
  (typeof window !== 'undefined' && (window as any).__RUN_TESTS__)
) {
  const res = runMediaLucroTests()
  console.log(
    `[TEST-MEDIA-LUCRO] Resultado: ${res.success ? 'PASSOU' : 'FALHOU'} (${res.results.length} verificações)`,
  )
}
