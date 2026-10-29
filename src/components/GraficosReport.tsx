import React, { useState, useMemo } from 'react'
import {
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Layers,
  TrendingUp,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CaixaLancamento, ContaAPagarComProgresso } from '@/types/database'

interface GraficosReportProps {
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
  selectedYear: number
  selectedMonth: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  initialGraphType?: 'receita' | 'custos'
}

const PALETA_CORES = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#64748b', // slate-500
]

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function GraficosReport({
  caixa,
  contasAPagar,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  initialGraphType = 'receita',
}: GraficosReportProps) {
  // Seletor de período: 'ano' (ano corrente) ou 'mes' (mês selecionado)
  const [periodoModo, setPeriodoModo] = useState<'ano' | 'mes'>('ano')
  // Gráfico em foco ou ambos
  const [activeGraph, setActiveGraph] = useState<'receita' | 'custos' | 'ambos'>('ambos')

  // Seletor visual de gráfico (barras ou rosca) para a Distribuição da Receita
  const [tipoGraficoReceita, setTipoGraficoReceita] = useState<'donut' | 'barras'>('donut')

  // 1. Filtrar lançamentos de caixa pelo período selecionado
  const caixaFiltrado = useMemo(() => {
    return caixa.filter((c) => {
      if (!c.data) return false
      const d = new Date(c.data)
      if (d.getFullYear() !== selectedYear) return false
      if (periodoModo === 'mes' && d.getMonth() + 1 !== selectedMonth) return false
      return true
    })
  }, [caixa, selectedYear, selectedMonth, periodoModo])

  // 2. Cálculos para Gráfico 1 — "RECEITA" (Distribuição de Lucro, Custos e Contas a Pagar)
  const dadosReceita = useMemo(() => {
    // Entradas do período
    const receitas = caixaFiltrado
      .filter((c) => c.tipo === 'entrada')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Custos do período
    const custos = caixaFiltrado
      .filter((c) => c.tipo === 'saida')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Lucro do período = receitas - custos (se negativo, o lucro é 0 na distribuição positiva ou reportado)
    const lucroReal = receitas - custos
    const lucroGrafico = Math.max(0, lucroReal)

    // Contas a pagar = saldo devedor das contas abertas (mesma regra do Balanço Patrimonial)
    const saldoDevedorContas = contasAPagar
      .filter((c) => {
        if (c.concluida) return false
        const saldo =
          c.saldoRestante !== undefined ? c.saldoRestante : c.valor_total - (c.totalPago || 0)
        return saldo > 0
      })
      .reduce((acc, c) => {
        const saldo =
          c.saldoRestante !== undefined ? c.saldoRestante : c.valor_total - (c.totalPago || 0)
        return acc + Math.max(0, saldo)
      }, 0)

    const totalComposicao = lucroGrafico + custos + saldoDevedorContas

    const itens = [
      {
        nome: 'Lucro Líquido',
        valor: lucroGrafico,
        valorReal: lucroReal,
        percentual: totalComposicao > 0 ? (lucroGrafico / totalComposicao) * 100 : 0,
        cor: '#10b981', // emerald-500
        descricao:
          lucroReal < 0
            ? 'Resultado no período foi negativo (-R$ ' +
              Math.abs(lucroReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
              ')'
            : 'Receitas − Custos do período',
      },
      {
        nome: 'Custos e Despesas',
        valor: custos,
        valorReal: custos,
        percentual: totalComposicao > 0 ? (custos / totalComposicao) * 100 : 0,
        cor: '#ef4444', // red-500
        descricao: 'Saídas de caixa no período (manutenções, comissões, fixos)',
      },
      {
        nome: 'Contas a Pagar',
        valor: saldoDevedorContas,
        valorReal: saldoDevedorContas,
        percentual: totalComposicao > 0 ? (saldoDevedorContas / totalComposicao) * 100 : 0,
        cor: '#8b5cf6', // purple-500
        descricao: 'Saldo devedor das obrigações e parcelamentos em aberto',
      },
    ]

    return {
      receitas,
      custos,
      lucroReal,
      saldoDevedorContas,
      totalComposicao,
      itens,
    }
  }, [caixaFiltrado, contasAPagar])

  // 3. Cálculos para Gráfico 2 — "CUSTOS" (Pizza de cada custo/categoria com sua %)
  const dadosCustosPorCategoria = useMemo(() => {
    // Agrupar saídas do período por categoria
    const mapaCategorias = new Map<string, number>()
    let totalSaidas = 0

    caixaFiltrado
      .filter((c) => c.tipo === 'saida')
      .forEach((c) => {
        const cat = (c.categoria || 'OUTROS').trim().toUpperCase()
        const valor = Number(c.valor) || 0
        mapaCategorias.set(cat, (mapaCategorias.get(cat) || 0) + valor)
        totalSaidas += valor
      })

    // Converter para array ordenado por valor decrescente
    const lista = Array.from(mapaCategorias.entries())
      .map(([nome, valor], index) => {
        const percentual = totalSaidas > 0 ? (valor / totalSaidas) * 100 : 0
        return {
          nome,
          valor,
          percentual,
          cor: PALETA_CORES[index % PALETA_CORES.length],
        }
      })
      .sort((a, b) => b.valor - a.valor)

    return {
      totalSaidas,
      lista,
    }
  }, [caixaFiltrado])

  const formatBRL = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Controles dos Gráficos */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Seletor de Período dos Gráficos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Alterne entre a visão anual acumulada ou detalhamento de mês específico
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor Modo Período: Ano ou Mês */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPeriodoModo('ano')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    periodoModo === 'ano'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Ano Completo
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoModo('mes')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    periodoModo === 'mes'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Mês Específico
                </button>
              </div>

              {/* Seletor de Mês (quando em modo mês) */}
              {periodoModo === 'mes' && (
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(val) => onMonthChange(Number(val))}
                >
                  <SelectTrigger className="w-[130px] h-9 bg-white dark:bg-slate-900 font-semibold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Seletor de Ano */}
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => onYearChange(Number(val))}
              >
                <SelectTrigger className="w-[100px] h-9 bg-white dark:bg-slate-900 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid com os 2 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* GRÁFICO 1 — "RECEITA": DISTRIBUIÇÃO DE LUCRO, CUSTOS E CONTAS A PAGAR */}
        {/* ========================================================================= */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  RECEITA — Distribuição Financeira
                </CardTitle>
                <CardDescription className="text-xs">
                  {periodoModo === 'ano'
                    ? `Ano consolidado de ${selectedYear}`
                    : `${MONTH_NAMES[selectedMonth - 1]} de ${selectedYear}`}{' '}
                  • Lucro vs. Custos vs. Contas a Pagar
                </CardDescription>
              </div>

              {/* Alternador Donut / Barras */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTipoGraficoReceita('donut')}
                  className={`p-1.5 rounded text-xs transition-all ${
                    tipoGraficoReceita === 'donut'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-muted-foreground'
                  }`}
                  title="Gráfico de Rosca"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGraficoReceita('barras')}
                  className={`p-1.5 rounded text-xs transition-all ${
                    tipoGraficoReceita === 'barras'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-muted-foreground'
                  }`}
                  title="Gráfico de Barras"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Resumo em 3 mini-cards com valores */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
                    Lucro Período
                  </span>
                  <span
                    className={`text-sm sm:text-base font-extrabold block mt-0.5 truncate ${
                      dadosReceita.lucroReal >= 0
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    R$ {formatBRL(dadosReceita.lucroReal)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block truncate">
                    Custos Totais
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-red-600 dark:text-red-300 block mt-0.5 truncate">
                    R$ {formatBRL(dadosReceita.custos)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block truncate">
                    Contas a Pagar
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-300 block mt-0.5 truncate">
                    R$ {formatBRL(dadosReceita.saldoDevedorContas)}
                  </span>
                </div>
              </div>

              {/* Render do Gráfico */}
              {dadosReceita.totalComposicao === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-xs">
                  <AlertCircle className="w-6 h-6 mb-1 text-slate-400" />
                  Sem movimentação registrada no período selecionado.
                </div>
              ) : tipoGraficoReceita === 'donut' ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosReceita.itens}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {dadosReceita.itens.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.cor}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: unknown) => [`R$ ${formatBRL(Number(val) || 0)}`, 'Valor']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosReceita.itens}
                      margin={{ top: 15, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} stroke="#888888" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        stroke="#888888"
                      />
                      <RechartsTooltip
                        formatter={(val: unknown) => [`R$ ${formatBRL(Number(val) || 0)}`, 'Valor']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {dadosReceita.itens.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Legenda Detalhada em Lista */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {dadosReceita.itens.map((item) => (
                  <div
                    key={item.nome}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.cor }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.nome}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {item.descricao}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        R$ {formatBRL(item.valor)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.percentual.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* GRÁFICO 2 — "CUSTOS": PIZZA DE CADA CUSTO/CATEGORIA COM SUA % */}
        {/* ========================================================================= */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" />
                  CUSTOS — Distribuição por Categoria
                </CardTitle>
                <CardDescription className="text-xs">
                  {periodoModo === 'ano'
                    ? `Ano consolidado de ${selectedYear}`
                    : `${MONTH_NAMES[selectedMonth - 1]} de ${selectedYear}`}{' '}
                  • Cada categoria de saída e sua fatia %
                </CardDescription>
              </div>

              <Badge
                variant="outline"
                className="font-bold text-xs bg-slate-50 dark:bg-slate-800 shrink-0"
              >
                Total: R$ {formatBRL(dadosCustosPorCategoria.totalSaidas)}
              </Badge>
            </CardHeader>

            <CardContent className="pt-4">
              {dadosCustosPorCategoria.lista.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-xs">
                  <AlertCircle className="w-6 h-6 mb-1 text-slate-400" />
                  Nenhum custo registrado no período selecionado.
                </div>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosCustosPorCategoria.lista}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {dadosCustosPorCategoria.lista.map((entry, index) => (
                          <Cell
                            key={`custo-${index}`}
                            fill={entry.cor}
                            stroke="#fff"
                            strokeWidth={1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: unknown) => [`R$ ${formatBRL(Number(val) || 0)}`, 'Valor']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Legenda Completa com Nome, Valor e % de cada fatia */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-[220px] overflow-y-auto pr-1">
                {dadosCustosPorCategoria.lista.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Sem categorias no período.
                  </p>
                ) : (
                  dadosCustosPorCategoria.lista.map((cat) => (
                    <div
                      key={cat.nome}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.cor }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {cat.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          R$ {formatBRL(cat.valor)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-bold text-[10px] w-14 justify-center bg-slate-200 dark:bg-slate-800"
                        >
                          {cat.percentual.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
