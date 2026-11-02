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
  CheckCircle2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Moto, CaixaLancamento } from '@/types/database'

export interface TaxasBenchmark {
  cdb: number
  fii: number
  petrobras: number
  bb: number
  vale: number
}

const STORAGE_KEY_TAXAS = 'm2_graficos_comparativo_taxas_v1'

const TAXAS_INICIAIS_PADRAO: TaxasBenchmark = {
  cdb: 10.5,
  fii: 9.0,
  petrobras: 15.0,
  bb: 12.0,
  vale: 10.0,
}

interface ComparativoGraficoProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
  selectedYear: number
  selectedMonth: number
  periodoModo?: 'ano' | 'mes'
}

export function ComparativoGrafico({
  motos,
  caixa,
  selectedYear,
  selectedMonth,
  periodoModo = 'ano',
}: ComparativoGraficoProps) {
  // Estado das taxas de referência com persistência local
  const [taxas, setTaxas] = useState<TaxasBenchmark>(() => {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_TAXAS)
      if (salvas) {
        const parsed = JSON.parse(salvas)
        return {
          cdb: typeof parsed.cdb === 'number' ? parsed.cdb : TAXAS_INICIAIS_PADRAO.cdb,
          fii: typeof parsed.fii === 'number' ? parsed.fii : TAXAS_INICIAIS_PADRAO.fii,
          petrobras:
            typeof parsed.petrobras === 'number'
              ? parsed.petrobras
              : TAXAS_INICIAIS_PADRAO.petrobras,
          bb: typeof parsed.bb === 'number' ? parsed.bb : TAXAS_INICIAIS_PADRAO.bb,
          vale: typeof parsed.vale === 'number' ? parsed.vale : TAXAS_INICIAIS_PADRAO.vale,
        }
      }
    } catch {
      // Ignora erro de leitura do localStorage
    }
    return TAXAS_INICIAIS_PADRAO
  })

  // Salvar no localStorage sempre que as taxas forem alteradas
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAXAS, JSON.stringify(taxas))
    } catch {
      // Ignora erro
    }
  }, [taxas])

  const handleRestaurarPadroes = () => {
    setTaxas(TAXAS_INICIAIS_PADRAO)
  }

  const handleUpdateTaxa = (chave: keyof TaxasBenchmark, valorStr: string) => {
    const limpo = valorStr.replace(',', '.')
    const num = parseFloat(limpo)
    setTaxas((prev) => ({
      ...prev,
      [chave]: isNaN(num) ? 0 : num,
    }))
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

  // 2. Lucro acumulado e apuração financeira das motos
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

    // Rentabilidade anualizada = (lucroAnualizado / capitalInvestido) * 100
    const rentabilidadeAnualizadaPct =
      capitalInvestido > 0 ? (lucroAnualizado / capitalInvestido) * 100 : 0

    // Rentabilidade nominal do período
    const rentabilidadeNominalPeriodoPct =
      capitalInvestido > 0 ? (lucroPeriodo / capitalInvestido) * 100 : 0

    return {
      receitas,
      despesas,
      lucroPeriodo,
      mesesComLancamento,
      lucroMensalMedio,
      lucroAnualizado,
      rentabilidadeAnualizadaPct,
      rentabilidadeNominalPeriodoPct,
    }
  }, [caixa, selectedYear, selectedMonth, periodoModo, capitalInvestido])

  // 3. Montar dados para o gráfico de barras comparativo
  const dadosGrafico = useMemo(() => {
    return [
      {
        id: 'motos',
        nome: 'MOTOS (App M2)',
        subtitulo: 'Rentabilidade real anualizada',
        categoria: 'Ativo Próprio',
        taxa: Number(dadosRentabilidadeMotos.rentabilidadeAnualizadaPct.toFixed(1)),
        isDestaque: true,
        corBarra: '#10b981', // emerald-500 vibrante
        corBorda: '#059669', // emerald-600
        descricao: 'Calculada com base no lucro real apurado sobre o capital investido na frota',
      },
      {
        id: 'petrobras',
        nome: 'Petrobras (PBR)',
        subtitulo: 'Ações / Dividendos',
        categoria: 'Renda Variável',
        taxa: Number(taxas.petrobras.toFixed(1)),
        isDestaque: false,
        corBarra: '#64748b', // slate-500
        corBorda: '#475569',
        descricao: 'Estimativa de Dividend Yield e valorização média anual',
      },
      {
        id: 'bb',
        nome: 'Banco do Brasil (BB)',
        subtitulo: 'Ações BBAS3',
        categoria: 'Renda Variável',
        taxa: Number(taxas.bb.toFixed(1)),
        isDestaque: false,
        corBarra: '#64748b',
        corBorda: '#475569',
        descricao: 'Estimativa de proventos e retorno anual médio consolidado',
      },
      {
        id: 'cdb',
        nome: 'CDB 100% CDI',
        subtitulo: 'Renda Fixa Pós-Fixada',
        categoria: 'Renda Fixa',
        taxa: Number(taxas.cdb.toFixed(1)),
        isDestaque: false,
        corBarra: '#64748b',
        corBorda: '#475569',
        descricao: 'Certificado de Depósito Bancário acompanhando a taxa Selic',
      },
      {
        id: 'vale',
        nome: 'Vale (VALE3)',
        subtitulo: 'Ações / Commodities',
        categoria: 'Renda Variável',
        taxa: Number(taxas.vale.toFixed(1)),
        isDestaque: false,
        corBarra: '#64748b',
        corBorda: '#475569',
        descricao: 'Expectativa anualizada de dividendos do setor de mineração',
      },
      {
        id: 'fii',
        nome: 'Fundo Imob. (FII)',
        subtitulo: 'Rendimentos Mensais',
        categoria: 'Fundos Imobiliários',
        taxa: Number(taxas.fii.toFixed(1)),
        isDestaque: false,
        corBarra: '#64748b',
        corBorda: '#475569',
        descricao: 'Média de distribuição anual de rendimentos isentos de IR',
      },
    ]
  }, [dadosRentabilidadeMotos.rentabilidadeAnualizadaPct, taxas])

  const formatBRL = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Ordenar ou manter com MOTOS no centro/primeira posição para destaque máximo
  // MOTOS em primeiro lugar com barra mais espessa e cor esmeralda
  const maiorTaxaReferencia = Math.max(
    ...dadosGrafico.map((d) => d.taxa),
    dadosRentabilidadeMotos.rentabilidadeAnualizadaPct,
    20,
  )

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
              Comparação anualizada: rentabilidade real da locação de <strong>MOTOS</strong> versus
              investimentos tradicionais de mercado (taxas de referência editáveis).
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
          {/* PAINEL DE CONTROLE DE TAXAS EDITÁVEIS (Benchmark de Mercado) */}
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
                    Ajuste as taxas anuais (% a.a.) dos demais ativos para simular diferentes
                    cenários econômicos. Salvo automaticamente.
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRestaurarPadroes}
                className="h-7 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                title="Restaurar taxas iniciais sugeridas"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restaurar Padrões
              </Button>
            </div>

            {/* Inputs das taxas em grid responsiva */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* CDB */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  CDB (100% CDI)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxas.cdb}
                    onChange={(e) => handleUpdateTaxa('cdb', e.target.value)}
                    className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* FII */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fundo Imob. (FII)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxas.fii}
                    onChange={(e) => handleUpdateTaxa('fii', e.target.value)}
                    className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Petrobras */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Petrobras (PBR)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxas.petrobras}
                    onChange={(e) => handleUpdateTaxa('petrobras', e.target.value)}
                    className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Banco do Brasil */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Banco do Brasil (BB)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxas.bb}
                    onChange={(e) => handleUpdateTaxa('bb', e.target.value)}
                    className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Vale */}
              <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Vale (VALE)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxas.vale}
                    onChange={(e) => handleUpdateTaxa('vale', e.target.value)}
                    className="h-8 text-xs font-bold pr-7 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <span className="absolute right-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>
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
                  Lucro anualizado / Capital investido
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
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0">
                <Percent className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* GRÁFICO DE BARRAS COMPARATIVO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                Rentabilidade Anualizada (% ao ano) por Ativo
              </span>
              <span className="text-[11px] text-muted-foreground">
                <strong className="text-emerald-600 dark:text-emerald-400">Verde:</strong> Frota de
                Motos M2 | <strong className="text-slate-500">Cinza:</strong> Mercado financeiro
              </span>
            </div>

            <div className="h-[320px] sm:h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosGrafico}
                  margin={{ top: 25, right: 15, left: -5, bottom: 25 }}
                  barCategoryGap="20%"
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
                    domain={[0, Math.ceil(maiorTaxaReferencia * 1.15)]}
                    stroke="#888888"
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const item = payload[0].payload as (typeof dadosGrafico)[0]
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl text-xs shadow-2xl border border-slate-700 space-y-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                            <span className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                              {item.isDestaque && (
                                <Bike className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              {item.nome}
                            </span>
                            <Badge
                              className={`text-[9px] h-4 font-bold ${
                                item.isDestaque
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              {item.categoria}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1">
                            <span className="text-slate-300 font-medium">Rentabilidade Anual:</span>
                            <span
                              className={`text-base font-black ${
                                item.isDestaque ? 'text-emerald-400' : 'text-slate-200'
                              }`}
                            >
                              {item.taxa.toFixed(1)}% a.a.
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                            {item.descricao}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="taxa" radius={[6, 6, 0, 0]} maxBarSize={56} strokeWidth={1}>
                    <LabelList
                      dataKey="taxa"
                      position="top"
                      formatter={(val: unknown) => `${Number(val || 0).toFixed(1)}%`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        fill: 'currentColor',
                      }}
                      className="fill-slate-700 dark:fill-slate-200"
                    />
                    {dadosGrafico.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.corBarra}
                        stroke={entry.corBorda}
                        strokeWidth={entry.isDestaque ? 2 : 1}
                        className={entry.isDestaque ? 'drop-shadow-md' : 'opacity-85'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LEGENDA E TABELA DETALHADA COM VALORES E COMPARAÇÃO RELATIVA */}
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
                            item.isDestaque ? 'bg-emerald-500' : 'bg-slate-400'
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
                A rentabilidade das motos é calculada a partir do lucro líquido apurado no livro
                caixa dividido pelo capital total investido na compra da frota ativa (R${' '}
                {formatBRL(capitalInvestido)}), multiplicando a média mensal por 12 para normalizar
                para a base anualizada (% ao ano), permitindo uma comparação financeira justa e
                direta contra CDB, FIIs e ações negociadas na B3.
              </p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
