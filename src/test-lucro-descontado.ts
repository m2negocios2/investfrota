/**
 * Testes das regras de cálculo do relatório LUCRO DESCONTADO (Plano Conquista)
 *
 * Casos cobertos:
 * 1. Moto com contrato Plano Conquista normal (compra, meses decorridos, meses futuros, previsão, lucro descontado e lucro médio).
 * 2. Moto vendida/cedida NÃO entra no relatório (mesmo se teve contrato Plano Conquista).
 * 3. Moto com contrato normal NÃO entra no relatório.
 * 4. Contrato sem data_entrega -> previsão = null, lucro descontado = null, lucro médio = null (exibe "—").
 * 5. Data de entrega já passada (meses futuros <= 0) -> previsão = lucro real acumulado.
 * 6. Moto com menos de 1 mês completo de operação -> mesesOperacao = 0, lucroMédioDescontado = null (proteção contra divisão por zero).
 * 7. Valores negativos e positivos respeitados nas colunas de projeção e lucro descontado.
 */

import { calcularLucroDescontado } from './lib/lucroDescontadoUtils'
import { Moto, Contrato, CaixaLancamento } from './types/database'

export interface TestResult {
  passed: boolean
  description: string
  expected: any
  actual: any
}

export function runLucroDescontadoTests(): { success: boolean; results: TestResult[] } {
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

  // Fixture: Data de referência fixa = 2026-11-02
  const hoje = '2026-11-02'

  // Moto 1: G71 (Plano Conquista ativo)
  // Compra: 2026-06-17. Valor de compra: 19.900
  // De 2026-06-17 até 2026-11-02 = 4 meses completos (17/06 até 17/10; 17/11 será o 5º)
  // Contrato: data_inicio 2026-07-18, data_entrega 2029-04-18
  // Meses até a entrega (de 2026-11-02 a 2029-04-18):
  // 02/11/2026 a 02/04/2029 são 29 meses completos (nov/26 a nov/28 = 24 meses; dez, jan, fev, mar, abr = +5 meses = 29 meses)
  const motoG71: Moto = {
    id: 'moto_g71',
    placa: 'RLR4G71',
    nome: 'G71',
    modelo: 'START / HONDA',
    ano: '2026',
    cor: 'Preta',
    status: 'locada',
    tipo_locacao_padrao: 'plano_conquista',
    data_compra: '2026-06-17',
    valor_compra: 19900,
    created: '2026-06-17T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }

  const contratoG71: Contrato = {
    id: 'ct_g71',
    moto: 'moto_g71',
    tipo: 'plano_conquista',
    status: 'ativo',
    data_inicio: '2026-07-18',
    data_entrega: '2029-04-18',
    prazo_meses: 28,
    valor_diario: 64.29,
    valor_semanal: 450,
    created: '2026-07-18T12:00:00Z',
    updated: '2026-07-18T12:00:00Z',
  }

  // Caixa G71: R$ 4.000 entradas, R$ 1.000 saídas -> Lucro acumulado = R$ 3.000
  const caixaG71: CaixaLancamento[] = [
    {
      id: 'cx1',
      moto: 'moto_g71',
      tipo: 'entrada',
      descricao: 'Aluguel G71',
      valor: 4000,
      data: '2026-08-01',
      created: '2026-08-01T12:00:00Z',
      updated: '2026-08-01T12:00:00Z',
    },
    {
      id: 'cx2',
      moto: 'moto_g71',
      tipo: 'saida',
      descricao: 'Despesas G71',
      valor: 1000,
      data: '2026-08-10',
      created: '2026-08-10T12:00:00Z',
      updated: '2026-08-10T12:00:00Z',
    },
  ]

  // Moto 2: TITAN (vendida) -> NÃO DEVE ENTRAR
  const motoTitanVendida: Moto = {
    id: 'moto_titan',
    placa: 'RZH8H41',
    nome: 'TITAN',
    modelo: 'TITAN / HONDA',
    ano: '2026',
    cor: 'CINZA',
    status: 'vendida',
    tipo_locacao_padrao: 'normal',
    data_compra: '2025-12-15',
    valor_compra: 16000,
    created: '2025-12-15T12:00:00Z',
    updated: '2026-10-30T12:00:00Z',
  }
  const contratoTitan: Contrato = {
    id: 'ct_titan',
    moto: 'moto_titan',
    tipo: 'plano_conquista',
    status: 'finalizado',
    data_inicio: '2026-01-01',
    data_entrega: '2026-10-01',
    valor_diario: 50,
    created: '2026-01-01T12:00:00Z',
    updated: '2026-01-01T12:00:00Z',
  }

  // Moto 3: FAN (contrato normal) -> NÃO DEVE ENTRAR
  const motoFanNormal: Moto = {
    id: 'moto_fan',
    placa: 'RQD1G78',
    nome: 'FAN',
    modelo: 'Fan / Honda',
    ano: '2023/2024',
    cor: 'CINZA',
    status: 'locada',
    tipo_locacao_padrao: 'normal',
    data_compra: '2025-12-29',
    valor_compra: 15642,
    created: '2025-12-29T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }
  const contratoFan: Contrato = {
    id: 'ct_fan',
    moto: 'moto_fan',
    tipo: 'normal',
    status: 'ativo',
    data_inicio: '2026-09-11',
    valor_diario: 40,
    created: '2026-09-11T12:00:00Z',
    updated: '2026-09-11T12:00:00Z',
  }

  // Moto 4: NOVA (compra recente, menos de 1 mês completo) -> mesesOperacao = 0 -> lucro médio "—"
  const motoNova: Moto = {
    id: 'moto_nova',
    placa: 'NOV0001',
    nome: 'NOVA',
    modelo: 'START / HONDA',
    ano: '2026',
    cor: 'Preta',
    status: 'locada',
    tipo_locacao_padrao: 'plano_conquista',
    data_compra: '2026-10-20',
    valor_compra: 20000,
    created: '2026-10-20T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }
  const contratoNova: Contrato = {
    id: 'ct_nova',
    moto: 'moto_nova',
    tipo: 'plano_conquista',
    status: 'ativo',
    data_inicio: '2026-10-21',
    data_entrega: '2028-10-21',
    valor_diario: 60,
    created: '2026-10-21T12:00:00Z',
    updated: '2026-10-21T12:00:00Z',
  }
  const caixaNova: CaixaLancamento[] = [
    {
      id: 'cx3',
      moto: 'moto_nova',
      tipo: 'entrada',
      descricao: 'Aluguel',
      valor: 500,
      data: '2026-10-25',
      created: '2026-10-25T12:00:00Z',
      updated: '2026-10-25T12:00:00Z',
    },
  ]

  // Moto 5: SEM DATA ENTREGA -> Colunas 2, 3 e 4 devem ser null ("—")
  const motoSemEntrega: Moto = {
    id: 'moto_sem_entrega',
    placa: 'SEM0002',
    nome: 'SEM ENTREGA',
    modelo: 'START / HONDA',
    ano: '2026',
    cor: 'Vermelha',
    status: 'locada',
    tipo_locacao_padrao: 'plano_conquista',
    data_compra: '2026-05-10',
    valor_compra: 18000,
    created: '2026-05-10T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }
  const contratoSemEntrega: Contrato = {
    id: 'ct_sem_entrega',
    moto: 'moto_sem_entrega',
    tipo: 'plano_conquista',
    status: 'ativo',
    data_inicio: '2026-05-15',
    data_entrega: '', // sem data
    valor_diario: 50,
    created: '2026-05-15T12:00:00Z',
    updated: '2026-05-15T12:00:00Z',
  }

  // Moto 6: B71 com plano conquista PASSADO/ENCERRADO e hoje contrato normal ativo -> NÃO DEVE ENTRAR
  const motoB71Passado: Moto = {
    id: 'moto_b71',
    placa: 'RLQ4B71',
    nome: 'B71',
    modelo: 'START / HONDA',
    ano: '2026',
    cor: 'Vermelha',
    status: 'locada',
    tipo_locacao_padrao: 'normal',
    data_compra: '2026-06-11',
    valor_compra: 19800,
    created: '2026-06-11T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }
  const contratoB71ConquistaPassado: Contrato = {
    id: 'ct_b71_conquista_antigo',
    moto: 'moto_b71',
    tipo: 'plano_conquista',
    status: 'finalizado',
    data_inicio: '2026-06-04',
    data_entrega: '2026-09-15',
    prazo_meses: 3,
    valor_diario: 54.29,
    created: '2026-06-04T12:00:00Z',
    updated: '2026-10-28T12:00:00Z',
  }
  const contratoB71NormalAtivo: Contrato = {
    id: 'ct_b71_normal_atual',
    moto: 'moto_b71',
    tipo: 'normal',
    status: 'ativo',
    data_inicio: '2026-09-23',
    data_entrega: '',
    valor_diario: 54.29,
    created: '2026-09-23T12:00:00Z',
    updated: '2026-09-23T12:00:00Z',
  }

  // Moto 7: Moto com contrato Conquista status 'ativo' mas data_entrega no passado (já entregue/concluído) -> NÃO DEVE ENTRAR
  const motoConquistaVencido: Moto = {
    id: 'moto_vencida',
    placa: 'VNC0001',
    nome: 'VENCIDA',
    modelo: 'START / HONDA',
    ano: '2026',
    cor: 'Preta',
    status: 'disponivel',
    tipo_locacao_padrao: 'plano_conquista',
    data_compra: '2024-01-01',
    valor_compra: 15000,
    created: '2024-01-01T12:00:00Z',
    updated: '2026-11-02T12:00:00Z',
  }
  const contratoConquistaEntregaPassada: Contrato = {
    id: 'ct_vencido',
    moto: 'moto_vencida',
    tipo: 'plano_conquista',
    status: 'ativo',
    data_inicio: '2024-01-10',
    data_entrega: '2026-10-10', // data de entrega no passado em relação a 2026-11-02
    prazo_meses: 24,
    valor_diario: 50,
    created: '2024-01-10T12:00:00Z',
    updated: '2024-01-10T12:00:00Z',
  }

  // Executa o cálculo com todas as motos
  const resultado = calcularLucroDescontado({
    motos: [
      motoG71,
      motoTitanVendida,
      motoFanNormal,
      motoNova,
      motoSemEntrega,
      motoB71Passado,
      motoConquistaVencido,
    ],
    contratos: [
      contratoG71,
      contratoTitan,
      contratoFan,
      contratoNova,
      contratoSemEntrega,
      contratoB71ConquistaPassado,
      contratoB71NormalAtivo,
      contratoConquistaEntregaPassada,
    ],
    caixa: [...caixaG71, ...caixaNova],
    dataReferencia: hoje,
  })

  // 1. Apenas motos com Plano Conquista ativo/vigente AGORA devem aparecer:
  // - G71 (ativo, entrega futura) -> entra
  // - NOVA (ativo, entrega futura) -> entra
  // - SEM ENTREGA (ativo, indefinido/sem data de fim) -> entra
  // - TITAN (vendida) -> NÃO entra
  // - FAN (contrato normal) -> NÃO entra
  // - B71 (plano conquista finalizado no passado, hoje normal) -> NÃO entra
  // - VENCIDA (plano conquista com entrega no passado) -> NÃO entra
  assertEqual(
    'Total de motos elegíveis deve ser 3 (G71, NOVA, SEM ENTREGA)',
    resultado.itens.length,
    3,
  )
  assertEqual(
    'TITAN vendida não deve constar',
    resultado.itens.some((i) => i.moto.id === 'moto_titan'),
    false,
  )
  assertEqual(
    'FAN contrato normal não deve constar',
    resultado.itens.some((i) => i.moto.id === 'moto_fan'),
    false,
  )
  assertEqual(
    'B71 com plano conquista passado/finalizado não deve constar',
    resultado.itens.some((i) => i.moto.id === 'moto_b71'),
    false,
  )
  assertEqual(
    'Moto com plano conquista com data de entrega já passada não deve constar',
    resultado.itens.some((i) => i.moto.id === 'moto_vencida'),
    false,
  )

  // 2. Verificação de G71:
  const itemG71 = resultado.itens.find((i) => i.moto.id === 'moto_g71')!
  assertEqual(
    'G71: meses de operação da compra (17/06 a 02/11) = 4 meses completos',
    itemG71.mesesOperacao,
    4,
  )
  assertEqual('G71: lucro acumulado real = 4000 - 1000 = 3000', itemG71.lucroAcumuladoReal, 3000)
  assertEqual('G71: lucro médio mensal real = 3000 / 4 = 750', itemG71.lucroMedioMensalReal, 750)
  // Meses até entrega: 02/11/2026 a 18/04/2029 = 29 meses completos
  assertEqual('G71: meses até entrega = 29', itemG71.mesesAteEntrega, 29)
  // Previsão = 3000 + (750 * 29) = 3000 + 21750 = 24750
  assertEqual('G71: previsão de lucro total = 24750', itemG71.previsaoLucroTotal, 24750)
  // Lucro descontado = 24750 - 19900 = 4850
  assertEqual(
    'G71: lucro descontado do valor da moto (24750 - 19900) = 4850',
    itemG71.lucroDescontado,
    4850,
  )
  // Lucro médio descontado = 4850 / 4 = 1212.50
  assertEqual(
    'G71: lucro médio descontado (4850 / 4) = 1212.50',
    itemG71.lucroMedioDescontado,
    1212.5,
  )

  // 3. Verificação de Moto NOVA (menos de 1 mês):
  const itemNova = resultado.itens.find((i) => i.moto.id === 'moto_nova')!
  assertEqual('NOVA: meses de operação = 0 (menos de 1 mês completo)', itemNova.mesesOperacao, 0)
  assertEqual('NOVA: lucro médio mensal real = null', itemNova.lucroMedioMensalReal, null)
  assertEqual(
    'NOVA: lucro médio descontado = null (não divide por zero, exibe "—")',
    itemNova.lucroMedioDescontado,
    null,
  )

  // 4. Verificação de Moto SEM DATA DE ENTREGA:
  const itemSemEntrega = resultado.itens.find((i) => i.moto.id === 'moto_sem_entrega')!
  assertEqual('SEM ENTREGA: semDataEntrega = true', itemSemEntrega.semDataEntrega, true)
  assertEqual('SEM ENTREGA: previsaoLucroTotal = null', itemSemEntrega.previsaoLucroTotal, null)
  assertEqual('SEM ENTREGA: lucroDescontado = null', itemSemEntrega.lucroDescontado, null)
  assertEqual('SEM ENTREGA: lucroMedioDescontado = null', itemSemEntrega.lucroMedioDescontado, null)

  const allPassed = results.every((r) => r.passed)
  return { success: allPassed, results }
}

if (
  typeof window === 'undefined' ||
  (typeof window !== 'undefined' && (window as any).__RUN_TESTS__)
) {
  const res = runLucroDescontadoTests()
  console.log(
    `[TEST-LUCRO-DESCONTADO] Resultado: ${res.success ? 'PASSOU' : 'FALHOU'} (${res.results.length} verificações)`,
  )
}
