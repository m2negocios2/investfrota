import React, { useState, useMemo, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  HelpCircle,
  DollarSign,
  Bike,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Moto, CaixaLancamento, ContaAPagarComProgresso } from '@/types/database'

export interface TaxasBenchmark {
  cdb: number
  fii: number
  petrobras: number
  bb: number
  vale: number
}

type ChaveAtivo = keyof TaxasBenchmark

const STORAGE_KEY_TAXAS = 'm2_graficos_comparativo_taxas_v1'
const STORAGE_KEY_IR = 'm2_graficos_comparativo_ir_v1'

const TAXAS_INICIAIS_PADRAO: TaxasBenchmark = {
  cdb: 10.5,
  fii: 9.0,
  petrobras: 15.0,
  bb: 12.0,
  vale: 10.0,
}

// IR padrão editável por ativo: 15% para renda fixa e ações (referência), 0% para FII (isento)
const IR_INICIAL_PADRAO: TaxasBenchmark = {
  cdb: 15,
  fii: 0,
  petrobras: 15,
  bb: 15,
  vale: 15,
}

// Lê os percentuais salvos no localStorage, usando o padrão para chaves ausentes
function carregarPercentuais(key: string, padrao: TaxasBenchmark): TaxasBenchmark {
  const out: TaxasBenchmark = { ...padrao }
  try {
    const salvas = localStorage.getItem(key)
    if (salvas) {
      const parsed = JSON.parse(salvas)
      ;(Object.keys(padrao) as ChaveAtivo[]).forEach((k) => {
        if (typeof parsed[k] === 'number') out[k] = parsed[k]
      })
    }
  } catch {
    // Ignora erro de leitura do localStorage
  }
  return out
}

// Ativos financeiros exibidos no comparativo (ordem dos campos editáveis)
const ATIVOS_CONFIG: {
  chave: ChaveAtivo
  label: string
  subtitulo: string
  categoria: string
  descricao: string
}[] = [
  {
    chave: 'cdb',
    label: 'CDB (100% CDI)',
    subtitulo: 'Renda Fixa Pós-Fixada',
    categoria: 'Renda Fixa',
    descricao: 'Certificado de Depósito Bancário acompanhando a taxa Selic',
  },
  {
    chave: 'fii',
    label: 'Fundo Imob. (FII)',
    subtitulo: 'Rendimentos Mensais',
    categoria: 'Fundos Imobiliários',
    descricao: 'Média de distribuição anual de rendimentos isentos de IR',
  },
  {
    chave: 'petrobras',
    label: 'Petrobras (PBR)',
    subtitulo: 'Ações / Dividendos',
    categoria: 'Renda Variável',
    descricao: 'Estimativa de Dividend Yield e valorização média anual',
  },
  {
    chave: 'bb',
    label: 'Banco do Brasil (BB)',
    subtitulo: 'Ações BBAS3',
    categoria: 'Renda Variável',
    descricao: 'Estimativa de proventos e retorno anual médio consolidado',
  },
  {
    chave: 'vale',
    label: 'Vale (VALE)',
    subtitulo: 'Ações / Commodities',
    categoria: 'Renda Variável',
    descricao: 'Expectativa anualizada de dividendos do setor de mineração',
  },
]

const ATIVO_NOME: Record<ChaveAtivo, string> = {
  cdb: 'CDB 100% CDI',
  fii: 'Fundo Imob. (FII)',
  petrobras: 'Petrobras (PBR)',
  bb: 'Banco do Brasil (BB)',
  vale: 'Vale (VALE3)',
}

interface ComparativoGraficoProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
  contasAPagar?: ContaAPagarComProgresso[]
  selectedYear: number
  selectedMonth: number
  periodoModo?: 'ano' | 'mes'
}

export function ComparativoGrafico({
  motos,
  caixa,
  contasAPagar = [],
  selectedYear,
  selectedMonth,
  periodoModo = 'ano',
}: ComparativoGraficoProps) {
  // Taxas de referência (% a.a. brutos) e IR (%) por ativo, com persistência local
  const [taxas, setTaxas] = useState<TaxasBenchmark>(() =>
    carregarPercentuais(STORAGE_KEY_TAXAS, TAXAS_INICIAIS_PADRAO),
  )
  const [irAtivos, setIrAtivos] = useState<TaxasBenchmark>(() =>
    carregarPercentuais(STORAGE_KEY_IR, IR_INICIAL_PADRAO),
  )

  // Salvar no localStorage sempre que forem alterados
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAXAS, JSON.stringify(taxas))
    } catch {
      // Ignora erro
    }
  }, [taxas])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IR, JSON.stringify(irAtivos))
    } catch {
      // Ignora erro
    }
  }, [irAtivos])

  const handleRestaurarPadroes = () => {
    setTaxas(TAXAS_INICIAIS_PADRAO)
    setIrAtivos(IR_INICIAL_PADRAO)
  }

  const parseValor = (valorStr: string) => {
    const num = parseFloat(valorStr.replace(',', '.'))
    return isNaN(num) ? 0 : num
  }

  const handleUpdateTaxa = (chave: ChaveAtivo, valorStr: string) => {
    setTaxas((prev) => ({ ...prev, [chave]: parseValor(valorStr) }))
  }

  const handleUpdateIr = (chave: ChaveAtivo, valorStr: string) => {
    setIrAtivos((prev) => ({ ...prev, [chave]: parseValor(valorStr) }))
  }

  // 1. Capital investido na frota (soma dos valores de compra das motos ativas/operacionais)
  // Coerente com o que já existe em Reports.tsx (ativoFrotaTotal) e PaybackTab.tsx
  const capitalInvestido = useMemo(() => {
    const motosOperacionais = motos.filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
    const valorPadraoSeAusente = 13500 // valor médio de referência do app
    const total = motosOperacionais.reduce((acc, m) => {
      const v =
        typeof m.valor_compra === 'number' && m.valor_compra > 0
          ? m.valor_compra
          : valorPadraoSeAusente
      return acc + v
    }, 0)
    return total
  }, [motos])

  // 2. Saldo devedor total das dívidas a terceiros (contas a pagar ainda em aberto)
  const saldoDividasTerceiros = useMemo(() => {
    return contasAPagar.reduce((acc, c) => acc + Math.max(0, Number(c.saldoRestante) || 0), 0)
  }, [contasAPagar])

  // 3. Lucro acumulado da frota (menos dívidas a terceiros) e rentabilidade das motos
  const dadosRentabilidadeMotos = useMemo(() => {
    // Filtrar lançamentos de caixa pelo período ativo
    const caixaPeriodo = caixa.filter((c) => {
      if (!c.data) return false
      const d = new Date(c.data)
      if (d.getFullYear() !== selectedYear) return false
      if (periodoModo === 'mes' && d.getMonth() + 1 !== selectedMonth) return false
      return true
    })

    const receitas = caixaPeriodo
      .filter((c) => c.tipo === 'entrada')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    const despesas = caixaPeriodo
      .filter((c) => c.tipo === 'saida')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    const lucroPeriodo = receitas - despesas

    // Identificar quantos meses do ano corrente já têm lançamentos para média mensal justa
    let mesesComLancamento = 1
    if (periodoModo === 'ano') {
      const mesesSet = new Set<number>()
      caixaPeriodo.forEach((c) => {
        if (c.data) {
          mesesSet.add(new Date(c.data).getMonth() + 1)
        }
      })
      mesesComLancamento = Math.max(1, mesesSet.size)
    }

    // Lucro mensal médio
    const lucroMensalMedio =
      periodoModo === 'mes' ? lucroPeriodo : lucroPeriodo / mesesComLancamento

    // Lucro anualizado projetado
    const lucroAnualizado = lucroMensalMedio * 12

    // Lucro acumulado da frota descontado das dívidas a terceiros
    const lucroDescontadoDividas = lucroPeriodo - saldoDividasTerceiros

    // Rentabilidade = ((lucro acumulado − saldo das dívidas) / capital investido) * 100
    const rentabilidadeAnualizadaPct =
      capitalInvestido > 0 ? (lucroDescontadoDividas / capitalInvestido) * 100 : 0

    // Rentabilidade nominal do período (mesma base, sem anualizar)
    const rentabilidadeNominalPeriodoPct = rentabilidadeAnualizadaPct

    return {
      receitas,
      despesas,
      lucroPeriodo,
      lucroAnualizado,
      lucroDescontadoDividas,
      mesesComLancamento,
      lucroMensalMedio,
      rentabilidadeAnualizadaPct,
      rentabilidadeNominalPeriodoPct,
    }
  }, [caixa, selectedYear, selectedMonth, periodoModo, capitalInvestido, saldoDividasTerceiros])

  // 4. Dados comparativos: motos (líquidas de dívidas) e ativos (líquidos de IR)
  const dadosGrafico = useMemo(() => {
    const rentMotos = Number(dadosRentabilidadeMotos.rentabilidadeAnualizadaPct.toFixed(1))
    const ativos = ATIVOS_CONFIG.map((a) => {
      const bruta = taxas[a.chave]
      const ir = irAtivos[a.chave]
      const liquida = bruta * (1 - ir / 100)
      return {
        id: a.chave,
        nome: ATIVO_NOME[a.chave],
        subtitulo: a.subtitulo,
        categoria: a.categoria,
        descricao: a.descricao,
        taxaBruta: Number(bruta.toFixed(1)),
        irPct: ir,
        taxa: Number(liquida.toFixed(1)),
        motos: rentMotos,
        isDestaque: false,
      }
    })
    return [
      {
        id: 'motos',
        nome: 'MOTOS (App M2)',
        subtitulo: 'Rentabilidade real anualizada, líquida de dívidas',
        categoria: 'Ativo Próprio',
        taxaBruta: rentMotos,
        irPct: 0,
        taxa: rentMotos,
        motos: rentMotos,
        isDestaque: true,
        descricao:
          'Lucro da frota menos o saldo das dívidas a terceiros, sobre o capital investido',
      },
      ...ativos,
    ]
  }, [dadosRentabilidadeMotos.rentabilidadeAnualizadaPct, taxas, irAtivos])

  const ativosGrafico = dadosGrafico.filter((d) => !d.isDestaque)

  const formatBRL = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Escala do eixo Y cobre todas as linhas (inclusive valores negativos)
  const todosValores = [
    ...ativosGrafico.map((d) => d.taxa),
    dadosRentabilidadeMotos.rentabilidadeAnualizadaPct,
    0,
  ]
  const minTaxaReferencia = Math.floor(Math.min(...todosValores))
  const maiorTaxaReferencia = Math.max(...todosValores, 20)

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              COMPARATIVO — Rentabilidade da Frota vs. Outros Investimentos
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Comparação anualizada: rentabilidade real da locação de <strong>MOTOS</strong> (já
              descontadas as dívidas a terceiros) versus investimentos tradicionais, com os ativos
              financeiros líquidos de IR.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="font-bold text-xs bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 px-2.5 py-1"
            >
              <Bike className="w-3.5 h-3.5 mr-1 text-emerald-600 inline-block" />
              Motos: {dadosRentabilidadeMotos.rentabilidadeAnualizadaPct.toFixed(1)}% a.a.
            </Badge>
            <Badge
              variant="secondary"
              className="font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1"
            >
              Base: % ao ano
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* PAINEL DE CONTROLE DE TAXAS E IR EDITÁVEIS (Benchmark de Mercado) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Taxas de Referência de Mercado (Editáveis)
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Ajuste a taxa bruta anual (% a.a.) e o IR (%) de cada ativo para simular
                    cenários. A rentabilidade mostrada é líquida: taxa × (1 − IR). Salvo
                    automaticamente.
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRestaurarPadroes}
                className="h-7 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                title="Restaurar taxas e IR iniciais sugeridos"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restaurar Padrões
              </Button>
            </div>

            {/* Inputs de taxa bruta e IR por ativo em grid responsiva */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {ATIVOS_CONFIG.map((a) => (
                <div
                  key={a.chave}
                  className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {a.label}
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      aria-label={`Taxa bruta ${a.label}`}
                      value={taxas[a.chave]}
                      onChange={(e) => handleUpdateTaxa(a.chave, e.target.value)}
                      className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                    />
                    <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                      %
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                      IR
                    </span>
                    <div className="relative flex items-center flex-1">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        aria-label={`IR ${a.label}`}
                        value={irAtivos[a.chave]}
                        onChange={(e) => handleUpdateIr(a.chave, e.target.value)}
                        className="h-7 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                      />
                      <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARDS COM MÉTRICAS CHAVE DA APURAÇÃO DAS MOTOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    Rentabilidade Motos (a.a.)
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1 tracking-tight">
                  {dadosRentabilidadeMotos.rentabilidadeAnualizadaPct.toFixed(1)}% ao ano
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  (Lucro − dívidas a terceiros) / Capital investido
                </span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                    Capital Investido na Frota
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-200 block mt-1 tracking-tight">
                  R$ {formatBRL(capitalInvestido)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Soma dos valores de compra das motos ativas
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                    Lucro Apurado no Período
                  </span>
                </div>
                <span
                  className={`text-lg sm:text-xl font-extrabold block mt-1 tracking-tight ${
                    dadosRentabilidadeMotos.lucroPeriodo >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500'
                  }`}
                >
                  R$ {formatBRL(dadosRentabilidadeMotos.lucroPeriodo)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {periodoModo === 'mes'
                    ? 'Receitas − Despesas no mês'
                    : `Acumulado em ${dadosRentabilidadeMotos.mesesComLancamento} ${
                        dadosRentabilidadeMotos.mesesComLancamento === 1 ? 'mês' : 'meses'
                      } de ${selectedYear}`}
                  {` · Dívidas a terceiros: R$ ${formatBRL(saldoDividasTerceiros)}`}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0">
                <Percent className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* GRÁFICO DE LINHAS COMPARATIVO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                Rentabilidade Anualizada (% ao ano) por Ativo
              </span>
              <span className="text-[11px] text-muted-foreground">
                <strong className="text-emerald-800 dark:text-emerald-400">
                  Verde escuro:
                </strong>{' '}
                Frota de Motos M2 | <strong className="text-slate-500">Cinza:</strong> Ativos
                financeiros (líquido de IR)
              </span>
            </div>

            <div className="h-[320px] sm:h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ativosGrafico}
                  margin={{ top: 20, right: 20, left: -5, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    stroke="#888888"
                    interval={0}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[minTaxaReferencia, Math.ceil(maiorTaxaReferencia * 1.15)]}
                    stroke="#888888"
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const item = payload[0].payload as (typeof ativosGrafico)[0]
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl text-xs shadow-2xl border border-slate-700 space-y-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                            <span className="font-extrabold text-sm text-slate-100">
                              {item.nome}
                            </span>
                            <Badge className="text-[9px] h-4 font-bold bg-slate-700 text-slate-200">
                              {item.categoria}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Taxa bruta:</span>
                            <span className="font-bold">{item.taxaBruta.toFixed(1)}% a.a.</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">IR ({item.irPct}%):</span>
                            <span className="font-bold">
                              − {(item.taxaBruta - item.taxa).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1">
                            <span className="text-slate-300 font-medium">Líquida de IR:</span>
                            <span className="text-base font-black text-slate-200">
                              {item.taxa.toFixed(1)}% a.a.
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-300 font-medium">Motos:</span>
                            <span className="font-black text-emerald-400">
                              {item.motos.toFixed(1)}% a.a.
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                            {item.descricao}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="motos"
                    name="MOTOS (App M2)"
                    stroke="#065f46"
                    strokeWidth={4}
                    dot={{ r: 5, fill: '#065f46', stroke: '#065f46' }}
                    activeDot={{ r: 7 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="taxa"
                    name="Ativos financeiros (líquido de IR)"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#64748b', stroke: '#475569' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QUADRO RESUMO DE RENTABILIDADE */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Quadro Resumo de Rentabilidade
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Comparativo direto da frota contra os ativos de mercado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {dadosGrafico.map((item) => {
                const taxaMotos = dadosRentabilidadeMotos.rentabilidadeAnualizadaPct
                const diffPct = item.isDestaque ? 0 : taxaMotos - item.taxa
                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      item.isDestaque
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/30'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            item.isDestaque ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        <span
                          className={`font-bold truncate ${
                            item.isDestaque
                              ? 'text-emerald-950 dark:text-emerald-200 text-sm'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.nome}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate ml-4 mt-0.5">
                        {item.subtitulo}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black block text-sm ${
                          item.isDestaque
                            ? 'text-emerald-600 dark:text-emerald-400 text-base'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.taxa.toFixed(1)}% a.a.
                      </span>
                      {!item.isDestaque && (
                        <span className="text-[10px] text-muted-foreground block">
                          bruta {item.taxaBruta.toFixed(1)}% · IR {item.irPct}%
                        </span>
                      )}
                      {!item.isDestaque && (
                        <span
                          className={`text-[10px] font-semibold block ${
                            diffPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                          }`}
                        >
                          {diffPct >= 0
                            ? `Motos +${diffPct.toFixed(1)}%`
                            : `Motos ${diffPct.toFixed(1)}%`}
                        </span>
                      )}
                      {item.isDestaque && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] h-4 font-bold">
                          Destaque Real
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* NOTA EXPLICATIVA SOBRE O CÁLCULO E FÓRMULA */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-muted-foreground flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Metodologia de Anualização e Comparabilidade
              </span>
              <p className="text-[11px] leading-relaxed">
                A rentabilidade das motos é calculada a partir do lucro apurado no livro caixa,
                descontado o saldo devedor das dívidas a terceiros (R${' '}
                {formatBRL(saldoDividasTerceiros)}), dividido pelo capital total investido na compra
                da frota ativa (R$ {formatBRL(capitalInvestido)}). Os ativos financeiros são
                mostrados líquidos de IR: taxa bruta × (1 − IR%). FIIs têm IR padrão de 0% por serem
                isentos sobre rendimentos.
              </p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
