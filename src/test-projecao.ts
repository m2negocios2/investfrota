/**
 * Testes das regras de cálculo do relatório Resultado (Fluxo de Caixa Real)
 * Valida:
 * 1. Identificação de lançamentos da Honda
 * 2. Linhas e fórmulas da planilha:
 *    - Receita (entradas reais do Caixa)
 *    - Custos (saídas operacionais sem Honda)
 *    - Receita − Custos
 *    - 15% HONDA (saídas pagas da dívida Honda no Caixa)
 *    - LL = (Receita − Custos) − Honda
 * 3. Apenas dados reais do primeiro mês com movimentação até o mês presente (inclusive)
 *    - Nenhum mês futuro
 *    - Sem estimativas ou projeções
 * 4. Totais acumulados reais
 */

import {
  calcularProjecaoFluxoCaixa,
  formatarNumeroPlanilha,
  isLancamentoHonda,
} from './lib/projecaoUtils'
import { CaixaLancamento, ContaAPagarComProgresso, Moto } from './types/database'

export interface TestResult {
  passed: boolean
  description: string
  expected: any
  actual: any
}

export function runProjecaoTests(): { success: boolean; results: TestResult[] } {
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

  // 1. Teste de identificação de lançamentos Honda
  const contasHondaIds = new Set(['conta_honda_1'])
  const lancamentoHondaDireto: CaixaLancamento = {
    id: 'l1',
    tipo: 'saida',
    descricao: 'Honda',
    valor: 5140,
    data: '2026-07-05',
    conta_a_pagar: 'conta_honda_1',
    created: '2026-07-05',
    updated: '2026-07-05',
  }
  const lancamentoHondaTexto: CaixaLancamento = {
    id: 'l2',
    tipo: 'saida',
    valor: 2330,
    data: '2026-06-05',
    entidade: 'terceiros',
    descricao: 'Parcela 1 Banco Honda',
    created: '2026-06-05',
    updated: '2026-06-05',
  }
  const lancamentoCustoNormal: CaixaLancamento = {
    id: 'l3',
    tipo: 'saida',
    valor: 130,
    data: '2026-06-11',
    categoria: 'Manutenção',
    descricao: 'Troca de pastilha de freio',
    created: '2026-06-11',
    updated: '2026-06-11',
  }

  assertEqual(
    'Identifica saída com conta_a_pagar da Honda',
    isLancamentoHonda(lancamentoHondaDireto, contasHondaIds),
    true,
  )
  assertEqual(
    'Identifica saída de terceiros mencionando Honda',
    isLancamentoHonda(lancamentoHondaTexto, contasHondaIds),
    true,
  )
  assertEqual(
    'Custo normal não é classificado como Honda',
    isLancamentoHonda(lancamentoCustoNormal, contasHondaIds),
    false,
  )

  // 2. Teste do cálculo da fórmula LL e da linha 33%
  // Criar cenário com:
  // - 8 motos ativas
  // - Mês de corte: Outubro/2026 (mesAtual = 10, anoAtual = 2026)
  // - Mês de início: Junho/2026 (mesInicio = 6, anoInicio = 2026)
  const baseMoto = {
    ano: 2026,
    cor: 'Preta',
    tipo_locacao_padrao: 'normal' as const,
    created: '2026-01-01',
    updated: '2026-01-01',
  }

  const mockMotos: Moto[] = [
    { ...baseMoto, id: 'm1', placa: 'AAA001', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm2', placa: 'AAA002', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm3', placa: 'AAA003', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm4', placa: 'AAA004', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm5', placa: 'AAA005', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm6', placa: 'AAA006', modelo: 'Start', status: 'locada' },
    { ...baseMoto, id: 'm7', placa: 'AAA007', modelo: 'Start', status: 'disponivel' },
    { ...baseMoto, id: 'm8', placa: 'AAA008', modelo: 'Start', status: 'disponivel' },
    { ...baseMoto, id: 'm9', placa: 'AAA009', modelo: 'Start', status: 'vendida' }, // não ativa
  ]

  const mockCaixa: CaixaLancamento[] = [
    // Junho/2026 (mês 1)
    {
      id: 'cx1',
      tipo: 'entrada',
      valor: 6250,
      data: '2026-06-10',
      descricao: 'Aluguel',
      created: '',
      updated: '',
    },
    {
      id: 'cx2',
      tipo: 'saida',
      valor: 2579,
      data: '2026-06-12',
      categoria: 'Manutenção',
      descricao: 'Oficina',
      created: '',
      updated: '',
    },
    {
      id: 'cx3',
      tipo: 'saida',
      valor: 2330,
      data: '2026-06-05',
      conta_a_pagar: 'conta_honda_1',
      descricao: 'Honda parc 1',
      created: '',
      updated: '',
    },

    // Julho/2026 (mês 2)
    {
      id: 'cx4',
      tipo: 'entrada',
      valor: 10015,
      data: '2026-07-10',
      descricao: 'Aluguel',
      created: '',
      updated: '',
    },
    {
      id: 'cx5',
      tipo: 'saida',
      valor: 3864,
      data: '2026-07-15',
      categoria: 'Manutenção',
      descricao: 'Oficina',
      created: '',
      updated: '',
    },
    {
      id: 'cx6',
      tipo: 'saida',
      valor: 5140,
      data: '2026-07-05',
      conta_a_pagar: 'conta_honda_1',
      descricao: 'Honda parc 2',
      created: '',
      updated: '',
    },

    // Outubro/2026 (mês 5 - mês corrente)
    {
      id: 'cx7',
      tipo: 'entrada',
      valor: 14066,
      data: '2026-10-10',
      descricao: 'Aluguel',
      created: '',
      updated: '',
    },
    {
      id: 'cx8',
      tipo: 'saida',
      valor: 4220,
      data: '2026-10-15',
      categoria: 'Manutenção',
      descricao: 'Oficina',
      created: '',
      updated: '',
    },
    {
      id: 'cx9',
      tipo: 'saida',
      valor: 5140,
      data: '2026-10-05',
      conta_a_pagar: 'conta_honda_1',
      descricao: 'Honda parc 5',
      created: '',
      updated: '',
    },
  ]

  const mockContasAPagar: ContaAPagarComProgresso[] = [
    {
      id: 'conta_honda_1',
      credor: 'HONDA',
      descricao: 'Financiamento Honda',
      tipo: 'parcelamento',
      valor_total: 51140,
      quantidade_parcelas: 11,
      valor_parcela: 5140,
      quantidadePaga: 5,
      totalPago: 22890,
      saldoRestante: 28250,
      percentualPago: 45,
      pagamentos: [],
      data_inicio: '2026-06-01',
      proximaParcelaNumero: 6,
      proximaParcelaValorSugerido: 5140,
      parcelasCalculadas: [
        { numero: 1, valor: 2330, data_vencimento: '2026-06-05' },
        { numero: 2, valor: 5140, data_vencimento: '2026-07-05' },
        { numero: 3, valor: 5140, data_vencimento: '2026-08-05' },
        { numero: 4, valor: 5140, data_vencimento: '2026-09-05' },
        { numero: 5, valor: 5140, data_vencimento: '2026-10-05' },
        { numero: 6, valor: 5140, data_vencimento: '2026-11-05' },
        { numero: 7, valor: 5140, data_vencimento: '2026-12-05' },
        { numero: 8, valor: 5140, data_vencimento: '2027-01-05' },
        { numero: 9, valor: 5140, data_vencimento: '2027-02-05' },
        { numero: 10, valor: 5140, data_vencimento: '2027-03-05' },
        { numero: 11, valor: 2810, data_vencimento: '2027-04-05' },
      ],
      created: '2026-06-01',
      updated: '2026-06-01',
    },
  ]

  const resultado = calcularProjecaoFluxoCaixa({
    motos: mockMotos,
    caixa: mockCaixa,
    contasAPagar: mockContasAPagar,
    anoAtual: 2026,
    mesAtual: 10, // Outubro/2026 (mês presente)
  })

  // 1. Validação do intervalo de meses:
  // Primeiro movimento no caixa foi em Junho/2026 (mês 6).
  // Mês presente é Outubro/2026 (mês 10).
  // Total de meses = 5 (jun, jul, ago, set, out).
  assertEqual('Gera exatamente os meses até o mês presente (5 meses)', resultado.meses.length, 5)
  assertEqual(
    'Inicia no primeiro mês com movimento (jun/2026)',
    `${resultado.meses[0].nomeMes}/${resultado.meses[0].ano}`,
    'jun/2026',
  )
  assertEqual(
    'Termina no mês presente (out/2026)',
    `${resultado.meses[4].nomeMes}/${resultado.meses[4].ano}`,
    'out/2026',
  )
  assertEqual(
    'Nenhum mês futuro após o mês presente é retornado',
    resultado.meses.some((m) => m.ano > 2026 || (m.ano === 2026 && m.mes > 10)),
    false,
  )

  // 2. Validação das fórmulas no mês 1 (jun/2026 - realizado):
  // Receita = 6250
  // Custos = 2579
  // Receita - Custos = 6250 - 2579 = 3671
  // Honda = 2330
  // LL = 3671 - 2330 = 1341
  const mes1 = resultado.meses[0]
  assertEqual('Jun/2026 é passado/presente (realizado)', mes1.isPassadoOuPresente, true)
  assertEqual('Jun/2026 Receita bate com caixa real (6250)', mes1.receita, 6250)
  assertEqual('Jun/2026 Custos bate com caixa real (2579)', mes1.custos, 2579)
  assertEqual('Jun/2026 Receita - Custos (3671)', mes1.percentual33, 3671)
  assertEqual('Jun/2026 Honda = 2330', mes1.honda, 2330)
  assertEqual('Jun/2026 LL = (Receita - Custos) - Honda (1341)', mes1.ll, 1341)

  // 3. Validação do mês 2 (jul/2026):
  // Receita = 10015, Custos = 3864, Honda = 5140
  // Receita - Custos = 6151
  // LL = 6151 - 5140 = 1011
  const mes2 = resultado.meses[1]
  assertEqual('Jul/2026 Receita bate (10015)', mes2.receita, 10015)
  assertEqual('Jul/2026 Custos bate (3864)', mes2.custos, 3864)
  assertEqual('Jul/2026 Honda bate (5140)', mes2.honda, 5140)
  assertEqual('Jul/2026 LL bate (1011)', mes2.ll, 1011)

  // 4. Validação de mês sem movimentação intermediário (ago/2026 - mês 3):
  const mes3 = resultado.meses[2]
  assertEqual('Ago/2026 Receita vazia = 0', mes3.receita, 0)
  assertEqual('Ago/2026 Custos vazios = 0', mes3.custos, 0)
  assertEqual('Ago/2026 Honda vazio = 0', mes3.honda, 0)
  assertEqual('Ago/2026 LL = 0', mes3.ll, 0)

  // 5. Validação do mês corrente (out/2026 - mês 5):
  // Receita = 14066, Custos = 4220, Honda = 5140, LL = 4706
  const mes5 = resultado.meses[4]
  assertEqual('Out/2026 é o mês corrente', mes5.isMesCorrente, true)
  assertEqual('Out/2026 Receita bate (14066)', mes5.receita, 14066)
  assertEqual('Out/2026 Custos bate (4220)', mes5.custos, 4220)
  assertEqual('Out/2026 Receita - Custos bate (9846)', mes5.percentual33, 9846)
  assertEqual('Out/2026 Honda bate (5140)', mes5.honda, 5140)
  assertEqual('Out/2026 LL bate (4706)', mes5.ll, 4706)

  // 6. Validação dos totais reais acumulados
  // Receita total = 6250 + 10015 + 0 + 0 + 14066 = 30331
  // Custos total = 2579 + 3864 + 0 + 0 + 4220 = 10663
  // Honda total = 2330 + 5140 + 0 + 0 + 5140 = 12610
  // LL total = (30331 - 10663) - 12610 = 7058
  assertEqual('Totais reais: Receita', resultado.totais.receita, 30331)
  assertEqual('Totais reais: Custos', resultado.totais.custos, 10663)
  assertEqual('Totais reais: Honda', resultado.totais.honda, 12610)
  assertEqual('Totais reais: LL', resultado.totais.ll, 7058)

  // 7. Cenário quando não há movimentação nenhuma no Caixa:
  // Deve gerar de janeiro do ano corrente até o mês corrente (inclusive)
  const resultadoSemCaixa = calcularProjecaoFluxoCaixa({
    motos: mockMotos,
    caixa: [],
    contasAPagar: [],
    anoAtual: 2026,
    mesAtual: 4, // Abril/2026
  })
  assertEqual(
    'Sem movimento gera de janeiro até mês atual (4 meses)',
    resultadoSemCaixa.meses.length,
    4,
  )
  assertEqual('Sem movimento começa em jan/2026', resultadoSemCaixa.meses[0].nomeMes, 'jan')
  assertEqual('Sem movimento termina em abr/2026', resultadoSemCaixa.meses[3].nomeMes, 'abr')
  assertEqual('Sem movimento último é mês corrente', resultadoSemCaixa.meses[3].isMesCorrente, true)

  // Formatação de números padrão pt-BR sem decimais
  assertEqual('Formatação 6250', formatarNumeroPlanilha(6250), '6.250')
  assertEqual('Formatação -1341', formatarNumeroPlanilha(-1341), '-1.341')

  const allPassed = results.every((r) => r.passed)
  return { success: allPassed, results }
}

// Auto-execução em ambiente node ou browser
if (
  typeof window === 'undefined' ||
  (typeof window !== 'undefined' && (window as any).__RUN_TESTS__)
) {
  const res = runProjecaoTests()
  console.log(
    `[TEST-PROJECAO] Resultado: ${res.success ? 'PASSOU' : 'FALHOU'} (${res.results.length} verificações)`,
  )
}
