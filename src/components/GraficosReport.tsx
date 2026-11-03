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
  LineChart as LineChartIcon,
  Sparkles,
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
  LineChart,
  Line,
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
import { Moto, CaixaLancamento, ContaAPagarComProgresso } from '@/types/database'
import { ComparativoGrafico } from '@/components/ComparativoGrafico'

interface GraficosReportProps {
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
  motos?: Moto[]
  selectedYear: number
  selectedMonth: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  initialGraphType?: 'receita' | 'custos' | 'crescimento' | 'comparativo'
}

// Custom label para desenhar percentual dentro das fatias da pizza
interface PieLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
  name?: string
}

const renderCustomizedPieLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: PieLabelProps) => {
  // Se for fatia menor que 4%, não renderiza texto para não embolar
  if (!percent || percent < 0.04) return null
  const RADIAN = Math.PI / 180
  // Posição no meio da fatia (entre inner e outer radius)
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none select-none"
    >
      {`${(percent * 100).toFixed(2)}%`}
    </text>
  )
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
  motos = [],
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  initialGraphType = 'receita',
}: GraficosReportProps) {
  // Seletor de período: 'ano' (ano corrente) ou 'mes' (mês selecionado)
  const [periodoModo, setPeriodoModo] = useState<'ano' | 'mes'>('ano')

  // Gráfico em foco ou todos
  const [activeGraph, setActiveGraph] = useState<
    'receita' | 'custos' | 'crescimento' | 'comparativo' | 'todos'
  >(
    initialGraphType === 'custos'
      ? 'custos'
      : initialGraphType === 'crescimento'
        ? 'crescimento'
        : initialGraphType === 'comparativo'
          ? 'comparativo'
          : initialGraphType === 'receita'
            ? 'receita'
            : 'todos',
  )

  // Atualizar foco se a prop initialGraphType mudar (ex: ao clicar nos botões do card na tela principal)
  React.useEffect(() => {
    if (initialGraphType) {
      setActiveGraph(initialGraphType)
    }
  }, [initialGraphType])

  // Seletor visual de gráfico para a Distribuição da Receita:
  // 'donut' (rosca com % dentro), 'barras' (barras da composição do período) ou 'mes_a_mes' (evolução mês a mês)
  const [tipoGraficoReceita, setTipoGraficoReceita] = useState<'donut' | 'barras' | 'mes_a_mes'>(
    'donut',
  )

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

  // Helper: identifica se um lançamento de saída é pagamento de Contas a Pagar / Terceiros
  const isContaAPagarOuTerceiros = (c: CaixaLancamento): boolean => {
    if (c.tipo !== 'saida') return false
    const ent = (c.entidade || '').trim().toLowerCase()
    const cat = (c.categoria || '').trim().toLowerCase()
    const temConta = !!c.conta_a_pagar
    return ent === 'terceiros' || cat === 'terceiros' || temConta
  }

  // 2. Cálculos para Gráfico 1 — "RECEITA" (Distribuição de Lucro, Custos e Contas a Pagar pagas no período)
  const dadosReceita = useMemo(() => {
    // Entradas do período (Receita Total bruta recebida no caixa)
    const receitas = caixaFiltrado
      .filter((c) => c.tipo === 'entrada')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Todas as saídas do período
    const saidasGerais = caixaFiltrado.filter((c) => c.tipo === 'saida')
    const totalSaidasGerais = saidasGerais.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Parcelas / Contas a pagar efetivamente PAGAS no período (saídas com entidade='terceiros' ou conta_a_pagar ou cat='Terceiros')
    const contasPagasNoPeriodo = saidasGerais
      .filter(isContaAPagarOuTerceiros)
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Custos e despesas operacionais do período (excluindo os pagamentos de contas a pagar / parcelamentos de terceiros)
    const custosOperacionais = saidasGerais
      .filter((c) => !isContaAPagarOuTerceiros(c))
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

    // Lucro real apurado = Receitas - Total de saídas (custos + contas pagas)
    const lucroReal = receitas - totalSaidasGerais
    const lucroGrafico = Math.max(0, lucroReal)

    // Base de composição: a própria RECEITA total (quando maior que 0) ou a soma dos itens
    const somaFatias = lucroGrafico + custosOperacionais + contasPagasNoPeriodo
    const baseCalculoPct = receitas > 0 ? receitas : somaFatias

    const itens = [
      {
        nome: 'Lucro Líquido',
        valor: lucroGrafico,
        valorReal: lucroReal,
        percentual: baseCalculoPct > 0 ? (lucroGrafico / baseCalculoPct) * 100 : 0,
        cor: '#10b981', // emerald-500
        descricao:
          lucroReal < 0
            ? 'Resultado no período foi negativo (-R$ ' +
              Math.abs(lucroReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
              ')'
            : 'Receitas − (Custos + Contas pagas no período)',
      },
      {
        nome: 'Custos e Despesas',
        valor: custosOperacionais,
        valorReal: custosOperacionais,
        percentual: baseCalculoPct > 0 ? (custosOperacionais / baseCalculoPct) * 100 : 0,
        cor: '#ef4444', // red-500
        descricao: 'Saídas operacionais do caixa (manutenção, comissões, rastreador, despesas)',
      },
      {
        nome: 'Contas a Pagar',
        valor: contasPagasNoPeriodo,
        valorReal: contasPagasNoPeriodo,
        percentual: baseCalculoPct > 0 ? (contasPagasNoPeriodo / baseCalculoPct) * 100 : 0,
        cor: '#8b5cf6', // purple-500
        descricao: 'Parcelas e dívidas com terceiros efetivamente pagas no período selecionado',
      },
    ]

    return {
      receitas,
      totalSaidasGerais,
      custos: custosOperacionais,
      contasPagasNoPeriodo,
      lucroReal,
      totalComposicao: somaFatias,
      baseCalculoPct,
      itens,
    }
  }, [caixaFiltrado])

  // 2b. Série Mês a Mês para o seletor / visão mês a mês do Gráfico RECEITA
  const dadosReceitaMesAMes = useMemo(() => {
    // Array de 12 meses do selectedYear
    return Array.from({ length: 12 }, (_, index) => {
      const mesNum = index + 1
      const lancamentosMes = caixa.filter((c) => {
        if (!c.data) return false
        const d = new Date(c.data)
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === mesNum
      })

      const receitasMes = lancamentosMes
        .filter((c) => c.tipo === 'entrada')
        .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

      const saidasMes = lancamentosMes.filter((c) => c.tipo === 'saida')

      const contasPagasMes = saidasMes
        .filter(isContaAPagarOuTerceiros)
        .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

      const custosMes = saidasMes
        .filter((c) => !isContaAPagarOuTerceiros(c))
        .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

      const totalSaidasMes = custosMes + contasPagasMes
      const lucroRealMes = receitasMes - totalSaidasMes
      const lucroGraficoMes = Math.max(0, lucroRealMes)

      return {
        mes: MONTH_NAMES[index].slice(0, 3),
        mesCompleto: MONTH_NAMES[index],
        mesNum,
        receita: receitasMes,
        lucro: lucroGraficoMes,
        lucroReal: lucroRealMes,
        custos: custosMes,
        contasPagar: contasPagasMes,
        totalSaidas: totalSaidasMes,
      }
    })
  }, [caixa, selectedYear])

  // 3. Cálculos para Gráfico 2 — "CUSTOS" (Pizza de cada custo/categoria com sua % dentro da fatia)
  // REGRA: reflete as saídas reais do período no caixa, separando as parcelas pagas de Contas a Pagar / Terceiros pouco a pouco no período
  const dadosCustosPorCategoria = useMemo(() => {
    // Agrupar saídas do período por categoria padronizada
    const mapaCategorias = new Map<string, number>()
    let totalSaidas = 0

    caixaFiltrado
      .filter((c) => c.tipo === 'saida')
      .forEach((c) => {
        let cat = (c.categoria || '').trim()
        if (!cat) {
          cat = c.entidade === 'terceiros' || c.conta_a_pagar ? 'Contas a Pagar' : 'OUTROS'
        }
        // Padronizar Terceiros / Contas a Pagar
        if (cat.toLowerCase() === 'terceiros') {
          cat = 'Contas a Pagar'
        }
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

  // 4. Cálculos para Gráfico 3 — "CRESCIMENTO" (Gráfico de Linha: Receita Bruta vs. Lucro Líquido ao longo dos meses)
  // Eixo X = os meses do período (ano completo: 12 meses; mês específico: mês em destaque no contexto com pontos ou visão focada)
  const dadosCrescimento = useMemo(() => {
    // Se o modo for 'ano', exibe os 12 meses do ano selecionado
    // Se o modo for 'mes', também mantemos os 12 meses para visualização da linha temporal de crescimento,
    // destacando o mês selecionado, ou gerando a série completa
    const meses = Array.from({ length: 12 }, (_, index) => {
      const mesNum = index + 1
      const lancamentosMes = caixa.filter((c) => {
        if (!c.data) return false
        const d = new Date(c.data)
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === mesNum
      })

      // Receita Bruta = total de entradas do mês no Fluxo de Caixa (mesma fonte do gráfico Receita)
      const receitaBruta = lancamentosMes
        .filter((c) => c.tipo === 'entrada')
        .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

      // Todas as saídas do mês (incluindo parcelas de contas a pagar pagas no mês)
      const saidasMes = lancamentosMes.filter((c) => c.tipo === 'saida')
      const totalSaidas = saidasMes.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)

      // Lucro Líquido = receita bruta menos as saídas do mês
      const lucroLiquido = receitaBruta - totalSaidas

      // Margem líquida do mês (quando há receita)
      const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

      return {
        mes: MONTH_NAMES[index].slice(0, 3),
        mesCompleto: MONTH_NAMES[index],
        mesNum,
        receitaBruta,
        lucroLiquido,
        totalSaidas,
        margemLiquida,
        isMesSelecionado: periodoModo === 'mes' && mesNum === selectedMonth,
      }
    })

    // Totais acumulados para o período selecionado (ano completo ou mês selecionado)
    const dadosPeriodo =
      periodoModo === 'mes' ? meses.filter((m) => m.mesNum === selectedMonth) : meses

    const totalReceitaBrutaPeriodo = dadosPeriodo.reduce((acc, m) => acc + m.receitaBruta, 0)
    const totalLucroLiquidoPeriodo = dadosPeriodo.reduce((acc, m) => acc + m.lucroLiquido, 0)
    const totalSaidasPeriodo = dadosPeriodo.reduce((acc, m) => acc + m.totalSaidas, 0)
    const margemMediaPeriodo =
      totalReceitaBrutaPeriodo > 0 ? (totalLucroLiquidoPeriodo / totalReceitaBrutaPeriodo) * 100 : 0

    return {
      meses,
      dadosPeriodo,
      totalReceitaBrutaPeriodo,
      totalLucroLiquidoPeriodo,
      totalSaidasPeriodo,
      margemMediaPeriodo,
    }
  }, [caixa, selectedYear, selectedMonth, periodoModo])

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

      {/* Barra de Seleção Rápida de Gráfico / Foco */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Visualização dos Gráficos:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveGraph('todos')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeGraph === 'todos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ver Todos
          </button>
          <button
            type="button"
            onClick={() => setActiveGraph('receita')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              activeGraph === 'receita'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Receita
          </button>
          <button
            type="button"
            onClick={() => setActiveGraph('custos')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              activeGraph === 'custos'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3 h-3" />
            Custos
          </button>
          <button
            type="button"
            onClick={() => setActiveGraph('crescimento')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              activeGraph === 'crescimento'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LineChartIcon className="w-3 h-3" />
            Crescimento
          </button>
          <button
            type="button"
            onClick={() => setActiveGraph('comparativo')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              activeGraph === 'comparativo'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Comparativo
          </button>
        </div>
      </div>

      {/* Grid com os Gráficos */}
      <div
        className={`grid gap-6 ${
          activeGraph === 'todos' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* ========================================================================= */}
        {/* GRÁFICO 1 — "RECEITA": DISTRIBUIÇÃO DE LUCRO, CUSTOS E CONTAS A PAGAR */}
        {/* ========================================================================= */}
        {(activeGraph === 'todos' || activeGraph === 'receita') && (
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

                {/* Alternador de Visão do Gráfico Receita: Rosca / Barras Período / Mês a Mês */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTipoGraficoReceita('donut')}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      tipoGraficoReceita === 'donut'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Gráfico de Rosca com % nas fatias"
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rosca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoGraficoReceita('barras')}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      tipoGraficoReceita === 'barras'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Distribuição em Barras"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoGraficoReceita('mes_a_mes')}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      tipoGraficoReceita === 'mes_a_mes'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Visão Evolução Mês a Mês"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mês a Mês</span>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* TOTAL DA RECEITA DO PERÍODO EM DESTAQUE */}
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                        RECEITA TOTAL DO PERÍODO
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {periodoModo === 'ano'
                          ? `Total arrecadado no ano de ${selectedYear}`
                          : `Total arrecadado em ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block tracking-tight">
                      R$ {formatBRL(dadosReceita.receitas)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      100% da receita faturada no caixa
                    </span>
                  </div>
                </div>

                {/* Resumo em 3 mini-cards com valores e % sobre a receita */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
                        Lucro Líquido
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-300"
                      >
                        {dadosReceita.itens[0].percentual.toFixed(2)}%
                      </Badge>
                    </div>
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
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block truncate">
                        Custos / Desp.
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 font-bold border-red-300 text-red-700 dark:text-red-300"
                      >
                        {dadosReceita.itens[1].percentual.toFixed(2)}%
                      </Badge>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-red-600 dark:text-red-300 block mt-0.5 truncate">
                      R$ {formatBRL(dadosReceita.custos)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block truncate">
                        Contas Pagas
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 font-bold border-purple-300 text-purple-700 dark:text-purple-300"
                      >
                        {dadosReceita.itens[2].percentual.toFixed(2)}%
                      </Badge>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-300 block mt-0.5 truncate">
                      R$ {formatBRL(dadosReceita.contasPagasNoPeriodo)}
                    </span>
                  </div>
                </div>

                {/* Render do Gráfico de acordo com tipoGraficoReceita */}
                {tipoGraficoReceita === 'mes_a_mes' ? (
                  /* VISÃO MÊS A MÊS: Gráfico de barras empilhadas/agrupadas com Lucro, Custos e Contas a Pagar por mês */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                        Evolução Mês a Mês no Ano de {selectedYear}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Barras: Lucro Líquido | Custos | Contas a Pagar
                      </span>
                    </div>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dadosReceitaMesAMes}
                          margin={{ top: 15, right: 10, left: -10, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#888888" />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) =>
                              `R$${v >= 1000 ? `${(v / 1000).toFixed(2)}k` : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                            stroke="#888888"
                          />
                          <RechartsTooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null
                              const row = dadosReceitaMesAMes.find((d) => d.mes === label)
                              return (
                                <div className="bg-slate-900/95 text-white p-3 rounded-lg text-xs shadow-xl border border-slate-700 space-y-1.5">
                                  <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
                                    {row?.mesCompleto} / {selectedYear}
                                  </p>
                                  <div className="flex justify-between gap-4 text-emerald-400 font-semibold">
                                    <span>(+) Receita Total:</span>
                                    <span>R$ {formatBRL(row?.receita || 0)}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-emerald-300">
                                    <span>(=) Lucro Líquido:</span>
                                    <span className="font-bold">
                                      R$ {formatBRL(row?.lucroReal || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-red-300">
                                    <span>(-) Custos Operacionais:</span>
                                    <span>R$ {formatBRL(row?.custos || 0)}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-purple-300">
                                    <span>(-) Contas a Pagar pagas:</span>
                                    <span>R$ {formatBRL(row?.contasPagar || 0)}</span>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Bar
                            dataKey="lucro"
                            name="Lucro Líquido"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="custos"
                            name="Custos"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="contasPagar"
                            name="Contas a Pagar"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : dadosReceita.totalComposicao === 0 && dadosReceita.receitas === 0 ? (
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
                          innerRadius={50}
                          outerRadius={95}
                          paddingAngle={3}
                          labelLine={false}
                          label={renderCustomizedPieLabel}
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
                          formatter={(val: unknown, name: unknown) => [
                            `R$ ${formatBRL(Number(val) || 0)} (${(
                              (Number(val) / (dadosReceita.baseCalculoPct || 1)) *
                              100
                            ).toFixed(2)}%)`,
                            String(name),
                          ]}
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
                        margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="nome"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          stroke="#888888"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) =>
                            `R$${v >= 1000 ? `${(v / 1000).toFixed(2)}k` : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                          stroke="#888888"
                        />
                        <RechartsTooltip
                          formatter={(val: unknown, name: unknown) => [
                            `R$ ${formatBRL(Number(val) || 0)} (${(
                              (Number(val) / (dadosReceita.baseCalculoPct || 1)) *
                              100
                            ).toFixed(2)}%)`,
                            String(name),
                          ]}
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

                {/* Legenda Detalhada em Lista com Nome, Valor em R$ e % de cada fatia */}
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
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            R$ {formatBRL(item.valor)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-bold text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-800"
                          >
                            {item.percentual.toFixed(2)}%
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {dadosReceita.receitas > 0 ? 'da receita do período' : 'da composição'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* GRÁFICO 2 — "CUSTOS": PIZZA DE CADA CUSTO/CATEGORIA COM SUA % */}
        {/* ========================================================================= */}
        {(activeGraph === 'todos' || activeGraph === 'custos') && (
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
                          outerRadius={95}
                          paddingAngle={2}
                          labelLine={false}
                          label={renderCustomizedPieLabel}
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
                          formatter={(val: unknown, name: unknown) => [
                            `R$ ${formatBRL(Number(val) || 0)} (${(
                              (Number(val) / (dadosCustosPorCategoria.totalSaidas || 1)) *
                              100
                            ).toFixed(2)}%)`,
                            String(name),
                          ]}
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
                            {cat.percentual.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* GRÁFICO 3 — "CRESCIMENTO": EVOLUÇÃO TEMPORAL RECEITA BRUTA VS LUCRO LÍQUIDO */}
        {/* ========================================================================= */}
        {(activeGraph === 'todos' || activeGraph === 'crescimento') && (
          <Card
            className={`shadow-sm border-slate-200 dark:border-slate-800 flex flex-col justify-between ${
              activeGraph === 'todos' ? 'lg:col-span-2' : ''
            }`}
          >
            <div>
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <LineChartIcon className="w-4 h-4" />
                    </div>
                    CRESCIMENTO — Receita Bruta vs. Lucro Líquido
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {periodoModo === 'ano'
                      ? `Evolução mês a mês de ${selectedYear}`
                      : `${MONTH_NAMES[selectedMonth - 1]} de ${selectedYear} em destaque na série histórica`}{' '}
                    • Linha azul: Receita Bruta | Linha verde: Lucro Líquido
                  </CardDescription>
                </div>

                {/* Badges de Resumo do Período */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-bold text-xs bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 px-2.5 py-1"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />
                    Receita: R$ {formatBRL(dadosCrescimento.totalReceitaBrutaPeriodo)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`font-bold text-xs px-2.5 py-1 ${
                      dadosCrescimento.totalLucroLiquidoPeriodo >= 0
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full inline-block mr-1.5 ${
                        dadosCrescimento.totalLucroLiquidoPeriodo >= 0
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                    />
                    Lucro: R$ {formatBRL(dadosCrescimento.totalLucroLiquidoPeriodo)}
                  </Badge>
                  {dadosCrescimento.totalReceitaBrutaPeriodo > 0 && (
                    <Badge
                      variant="secondary"
                      className="font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1"
                    >
                      Margem: {dadosCrescimento.margemMediaPeriodo.toFixed(2)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Indicadores em Mini-Cards no Topo do Gráfico */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                          Receita Bruta Total
                        </span>
                      </div>
                      <span className="text-base sm:text-xl font-extrabold text-blue-600 dark:text-blue-400 block mt-1 tracking-tight">
                        R$ {formatBRL(dadosCrescimento.totalReceitaBrutaPeriodo)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {periodoModo === 'ano'
                          ? `Total consolidado em ${selectedYear}`
                          : `Total em ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Lucro Líquido Total
                        </span>
                      </div>
                      <span
                        className={`text-base sm:text-xl font-extrabold block mt-1 tracking-tight ${
                          dadosCrescimento.totalLucroLiquidoPeriodo >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        R$ {formatBRL(dadosCrescimento.totalLucroLiquidoPeriodo)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Receita − (Custos + Contas pagas)
                      </span>
                    </div>
                    <div
                      className={`p-2 rounded-lg text-white shrink-0 ${
                        dadosCrescimento.totalLucroLiquidoPeriodo >= 0
                          ? 'bg-emerald-600'
                          : 'bg-red-600'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                          Saídas & Despesas Totais
                        </span>
                      </div>
                      <span className="text-base sm:text-xl font-extrabold text-slate-800 dark:text-slate-200 block mt-1 tracking-tight">
                        R$ {formatBRL(dadosCrescimento.totalSaidasPeriodo)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Custos operacionais e parcelas pagas
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* GRÁFICO DE LINHA: 2 LINHAS (Receita Bruta em azul, Lucro Líquido em verde) */}
                <div className="h-[340px] sm:h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dadosCrescimento.meses}
                      margin={{ top: 20, right: 15, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#888888" dy={8} />
                      <YAxis
                        width={52}
                        tick={{ fontSize: 10 }}
                        tickCount={5}
                        interval={0}
                        domain={['auto', 'auto']}
                        tickFormatter={(v) =>
                          `R$ ${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(2)}k` : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                        stroke="#888888"
                      />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          const row = dadosCrescimento.meses.find((d) => d.mes === label)
                          if (!row) return null
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl text-xs shadow-2xl border border-slate-700 space-y-2 min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                                <span className="font-bold text-slate-200 text-sm">
                                  {row.mesCompleto} / {selectedYear}
                                </span>
                                {row.isMesSelecionado && (
                                  <Badge className="bg-indigo-600 text-[9px] h-4 font-bold">
                                    Mês Selecionado
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-4 text-blue-400 font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                                    Receita Bruta:
                                  </span>
                                  <span className="font-extrabold text-sm">
                                    R$ {formatBRL(row.receitaBruta)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                    Lucro Líquido:
                                  </span>
                                  <span
                                    className={`font-extrabold text-sm ${
                                      row.lucroLiquido < 0 ? 'text-red-400' : ''
                                    }`}
                                  >
                                    R$ {formatBRL(row.lucroLiquido)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-300 text-[11px] pt-1 border-t border-slate-800">
                                  <span>(-) Saídas Totais:</span>
                                  <span>R$ {formatBRL(row.totalSaidas)}</span>
                                </div>
                                {row.receitaBruta > 0 && (
                                  <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
                                    <span>Margem Líquida:</span>
                                    <span className="font-bold text-slate-200">
                                      {row.margemLiquida.toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: 15, fontSize: '12px' }}
                        iconType="circle"
                      />
                      {/* Linha 1: Receita Bruta (azul vibrante) */}
                      <Line
                        type="monotone"
                        dataKey="receitaBruta"
                        name="Receita Bruta"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                      {/* Linha 2: Lucro Líquido (verde esmeralda vibrante) */}
                      <Line
                        type="monotone"
                        dataKey="lucroLiquido"
                        name="Lucro Líquido"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabela Resumo da Série Histórica dos Meses (responsiva) */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      Detalhamento Mensal de Crescimento ({selectedYear})
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Valores de entradas e apuração líquida do caixa
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {dadosCrescimento.meses.map((m) => {
                      const temMovimento = m.receitaBruta > 0 || m.totalSaidas > 0
                      const isDestaque = m.isMesSelecionado
                      return (
                        <div
                          key={m.mesNum}
                          className={`p-2 rounded-lg border text-xs transition-all ${
                            isDestaque
                              ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/40'
                              : temMovimento
                                ? 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                                : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/60 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {m.mesCompleto.slice(0, 3)}
                            </span>
                            {isDestaque && (
                              <Badge className="bg-blue-600 text-[8px] h-3.5 px-1 font-bold">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                Rec:
                              </span>
                              <span className="font-bold truncate text-slate-800 dark:text-slate-200">
                                R${' '}
                                {m.receitaBruta >= 1000
                                  ? `${(m.receitaBruta / 1000).toFixed(2)}k`
                                  : m.receitaBruta.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span
                                className={`font-semibold ${
                                  m.lucroLiquido >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-500'
                                }`}
                              >
                                Luc:
                              </span>
                              <span
                                className={`font-bold truncate ${
                                  m.lucroLiquido >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-500'
                                }`}
                              >
                                R${' '}
                                {Math.abs(m.lucroLiquido) >= 1000
                                  ? `${(m.lucroLiquido / 1000).toFixed(2)}k`
                                  : m.lucroLiquido.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* GRÁFICO 4 — "COMPARATIVO": RENTABILIDADE MOTOS VS CDB, FII, PBR, BB, VALE */}
        {/* ========================================================================= */}
        {(activeGraph === 'todos' || activeGraph === 'comparativo') && (
          <div className={activeGraph === 'todos' ? 'lg:col-span-2' : ''}>
            <ComparativoGrafico
              motos={motos}
              caixa={caixa}
              contasAPagar={contasAPagar}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              periodoModo={periodoModo}
            />
          </div>
        )}
      </div>
    </div>
  )
}
