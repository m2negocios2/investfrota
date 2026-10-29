/**
 * Testes das regras de cálculo da Projeção de Fluxo de Caixa Mensal
 * Valida:
 * 1. Linhas e fórmulas da planilha:
 *    - "33%" = Receita - Custos
 *    - "LL" = (Receita - Custos) - Honda
 * 2. Realizado vs Estimativa:
 *    - Meses até o presente são dados reais do caixa
 *    - Meses futuros são estimativas (azul)
 * 3. Projeção com motos novas (+3 motos, sendo 1 não cadastrada):
 *    - Média por moto ativa escalada para frota projetada
 * 4. Parcelas futuras da Honda a partir do Contas a Pagar
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
    mesAtual: 10, // Outubro/2026
    anoInicio: 2026,
    mesInicio: 6, // Junho/2026
    motosNovas: 3,
  })

  // Validação da régua de 12 meses
  assertEqual('Gera exatamente 12 meses', resultado.meses.length, 12)
  assertEqual(
    'Inicia em Junho/2026',
    `${resultado.meses[0].nomeMes}/${resultado.meses[0].ano}`,
    'jun/2026',
  )
  assertEqual(
    'Termina em Maio/2027',
    `${resultado.meses[11].nomeMes}/${resultado.meses[11].ano}`,
    'mai/2027',
  )

  // Validação das fórmulas no mês 1 (jun/2026 - realizado):
  // Receita = 6250
  // Custos = 2579
  // 33% = 6250 - 2579 = 3671
  // Honda = 2330
  // LL = 3671 - 2330 = 1341
  const mes1 = resultado.meses[0]
  assertEqual('Jun/2026 é passado/presente (realizado)', mes1.isPassadoOuPresente, true)
  assertEqual('Jun/2026 Receita bate com caixa', mes1.receita, 6250)
  assertEqual('Jun/2026 Custos bate com caixa', mes1.custos, 2579)
  assertEqual('Jun/2026 33% = Receita - Custos (3671)', mes1.percentual33, 3671)
  assertEqual('Jun/2026 Honda = 2330', mes1.honda, 2330)
  assertEqual('Jun/2026 LL = 33% - Honda (1341)', mes1.ll, 1341)

  // Validação do mês corrente (out/2026 - mês 5):
  // Receita = 14066, Custos = 4220, 33% = 9846, Honda = 5140, LL = 4706
  const mes5 = resultado.meses[4]
  assertEqual('Out/2026 é o mês corrente', mes5.isMesCorrente, true)
  assertEqual('Out/2026 é realizado', mes5.isPassadoOuPresente, true)
  assertEqual('Out/2026 Receita bate', mes5.receita, 14066)
  assertEqual('Out/2026 Custos bate', mes5.custos, 4220)
  assertEqual('Out/2026 33% bate (9846)', mes5.percentual33, 9846)
  assertEqual('Out/2026 Honda bate (5140)', mes5.honda, 5140)
  assertEqual('Out/2026 LL bate (4706)', mes5.ll, 4706)

  // Validação dos meses futuros (nov/2026 - mês 6):
  // Deve ser estimativa (isPassadoOuPresente = false)
  const mes6 = resultado.meses[5]
  assertEqual('Nov/2026 é estimativa futura', mes6.isPassadoOuPresente, false)
  assertEqual('Nov/2026 não é mês corrente', mes6.isMesCorrente, false)
  // Honda futura em nov/2026 deve ser parcela 6 (5140)
  assertEqual('Nov/2026 Honda deve vir do Contas a Pagar (5140)', mes6.honda, 5140)
  // LL deve bater com fórmula: (Receita - Custos) - Honda
  assertEqual(
    'Nov/2026 LL bate com (Receita - Custos) - Honda',
    mes6.ll,
    mes6.percentual33 - mes6.honda,
  )

  // Validação de Abril/2027 (mês 11 - parcela final da Honda = 2810):
  const mes11 = resultado.meses[10]
  assertEqual('Abr/2027 Parcela final da Honda = 2810', mes11.honda, 2810)

  // Validação de Maio/2027 (mês 12 - após término das parcelas Honda = 0):
  const mes12 = resultado.meses[11]
  assertEqual('Mai/2027 Honda quitada = 0', mes12.honda, 0)
  assertEqual('Mai/2027 LL = Receita - Custos', mes12.ll, mes12.percentual33)

  // Validação da contagem de frota
  assertEqual('Motos ativas contadas (exclui vendidas)', resultado.motosAtivasCount, 8)
  assertEqual('Frota total projetada (+3 motos)', resultado.frotaTotalProjetada, 11)

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
