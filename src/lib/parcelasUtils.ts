import { ItemParcela } from '@/types/database'

/**
 * Arredonda um valor para 2 casas decimais de forma segura
 */
export function round2(val: number): number {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100
}

/**
 * Calcula a data de vencimento estimada para a parcela de índice `indice` (0-based)
 * a partir de `dataInicio` (YYYY-MM-DD) e um eventual `diaVencimento` fixo (1..31).
 */
export function calcularDataVencimentoParcela(
  dataInicio: string,
  indice: number,
  diaVencimento?: number,
): string {
  if (!dataInicio) return ''
  // Normalizar data inicial
  const baseDate = new Date(dataInicio + 'T12:00:00Z')
  if (isNaN(baseDate.getTime())) return ''

  // Mês alvo: mês base + indice
  const anoBase = baseDate.getUTCFullYear()
  const mesBase = baseDate.getUTCMonth() // 0-based
  const totalMeses = mesBase + indice

  const targetAno = anoBase + Math.floor(totalMeses / 12)
  const targetMes = ((totalMeses % 12) + 12) % 12

  // Dia desejado: diaVencimento ou dia da dataInicio
  const diaDesejado =
    diaVencimento && diaVencimento >= 1 && diaVencimento <= 31
      ? diaVencimento
      : baseDate.getUTCDate()

  // Quantidade de dias no mês alvo
  const diasNoMes = new Date(Date.UTC(targetAno, targetMes + 1, 0)).getUTCDate()
  const diaFinal = Math.min(diaDesejado, diasNoMes)

  const mStr = String(targetMes + 1).padStart(2, '0')
  const dStr = String(diaFinal).padStart(2, '0')
  return `${targetAno}-${mStr}-${dStr}`
}

/**
 * Divisão igual correta por padrão:
 * Ao cadastrar/recalcular uma dívida com valor total e nº de parcelas,
 * divide igualmente com o eventual resíduo (centavos) ajustado na ÚLTIMA parcela.
 *
 * Exemplo: total 53.630 em 11 parcelas:
 * 53630 / 11 = 4875.4545... -> base = 4875.45
 * 10 parcelas de 4875.45 = 48754.50
 * 11ª parcela = 53630.00 - 48754.50 = 4875.50
 * Soma exata: 53.630,00!
 */
export function gerarParcelasIguais(params: {
  valorTotal: number
  quantidadeParcelas: number
  dataInicio?: string
  diaVencimento?: number
}): ItemParcela[] {
  const qtd = Math.max(1, Math.floor(params.quantidadeParcelas || 1))
  const total = round2(Math.max(0, params.valorTotal || 0))

  if (qtd === 1) {
    return [
      {
        numero: 1,
        valor: total,
        data_vencimento: params.dataInicio
          ? calcularDataVencimentoParcela(params.dataInicio, 0, params.diaVencimento)
          : undefined,
      },
    ]
  }

  // Valor base arrendondado a 2 casas (centavos)
  const valorBase = round2(Math.floor((total / qtd) * 100) / 100)
  // Soma das primeiras (qtd - 1) parcelas
  const somaPrimeiras = round2(valorBase * (qtd - 1))
  // Resíduo ajustado na última parcela
  const valorUltima = round2(total - somaPrimeiras)

  const parcelas: ItemParcela[] = []
  for (let i = 1; i <= qtd; i++) {
    const valor = i === qtd ? valorUltima : valorBase
    parcelas.push({
      numero: i,
      valor,
      data_vencimento: params.dataInicio
        ? calcularDataVencimentoParcela(params.dataInicio, i - 1, params.diaVencimento)
        : undefined,
    })
  }

  return parcelas
}

/**
 * Normaliza e resolve as parcelas de uma conta a pagar:
 * Se existirem parcelas_customizadas válidas (com mesma quantidade), usa-as;
 * caso contrário, gera a divisão igual com resíduo na última parcela.
 */
export function resolverParcelasConta(conta: {
  valor_total: number
  quantidade_parcelas: number
  data_inicio?: string
  dia_vencimento?: number
  parcelas_customizadas?: ItemParcela[] | string | null
}): ItemParcela[] {
  let custom: ItemParcela[] | null = null

  if (conta.parcelas_customizadas) {
    if (typeof conta.parcelas_customizadas === 'string') {
      try {
        const parsed = JSON.parse(conta.parcelas_customizadas)
        if (Array.isArray(parsed)) custom = parsed
      } catch {
        /* intentionally ignored */
      }
    } else if (Array.isArray(conta.parcelas_customizadas)) {
      custom = conta.parcelas_customizadas
    }
  }

  const qtdEsperada = Math.max(1, Number(conta.quantidade_parcelas) || 1)

  // Se a lista customizada for válida e tiver a quantidade esperada, normalizar
  if (custom && custom.length === qtdEsperada) {
    return custom.map((p, idx) => ({
      numero: Number(p.numero) || idx + 1,
      valor: round2(Number(p.valor) || 0),
      data_vencimento:
        p.data_vencimento ||
        (conta.data_inicio
          ? calcularDataVencimentoParcela(conta.data_inicio, idx, conta.dia_vencimento)
          : undefined),
    }))
  }

  // Fallback / padrão: divisão igual correta
  return gerarParcelasIguais({
    valorTotal: conta.valor_total,
    quantidadeParcelas: qtdEsperada,
    dataInicio: conta.data_inicio,
    diaVencimento: conta.dia_vencimento,
  })
}

/**
 * Calcula a soma total de uma lista de parcelas
 */
export function somarParcelas(parcelas: ItemParcela[]): number {
  return round2(parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0))
}

/**
 * Obtém o valor sugerido para a próxima parcela com base no número da parcela
 * Se a parcela X estiver definida na lista, usa o seu valor; caso contrário, média/saldo.
 */
export function obterValorSugeridoParcela(
  parcelas: ItemParcela[],
  numeroParcela: number,
  saldoRestante: number,
  valorParcelaPadrao?: number,
): number {
  const item = parcelas.find((p) => p.numero === numeroParcela)
  if (item && item.valor > 0) {
    return round2(item.valor)
  }
  if (valorParcelaPadrao && valorParcelaPadrao > 0) {
    return round2(
      Math.min(valorParcelaPadrao, saldoRestante > 0 ? saldoRestante : valorParcelaPadrao),
    )
  }
  return round2(saldoRestante > 0 ? saldoRestante : 0)
}
