import React, { useState, useEffect, useRef } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Percent,
  Bike,
  Scale,
  FileSpreadsheet,
  Building,
  Activity,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { caixaService } from '@/services/caixa'
import { recebimentosService } from '@/services/recebimentos'
import { Moto, Contrato, CaixaLancamento, Recebimento } from '@/types/database'
import { PaybackTab } from '@/components/PaybackTab'

export default function Reports() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for DRE and Balanço
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [activeReportTab, setActiveReportTab] = useState('dre-mensal')

  const reportPrintRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      const [m, c, cx, r] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        caixaService.getAll(),
        recebimentosService.getAll(),
      ])
      setMotos(m)
      setContratos(c)
      setCaixa(cx)
      setRecebimentos(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // Cálculos Gerais do Negócio
  const totalMotos = motos.length
  const motosLocadas = motos.filter((m) => m.status === 'locada').length
  const taxaOcupacao = totalMotos > 0 ? (motosLocadas / totalMotos) * 100 : 0

  // Valor estimado do Patrimônio da Frota (preço médio de mercado aproximado por moto: R$ 13.500)
  const valorMedioMoto = 13500
  const ativoFrotaTotal = totalMotos * valorMedioMoto

  // Saldo total de Caixa acumulado
  const totalEntradasGerais = caixa
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)
  const totalSaidasGerais = caixa
    .filter((c) => c.tipo === 'saida')
    .reduce((acc, c) => acc + c.valor, 0)
  const saldoCaixaAtual = totalEntradasGerais - totalSaidasGerais

  // Contas a Receber (Recebimentos pendentes ou em atraso)
  const contasAReceber = recebimentos
    .filter((r) => r.status === 'em_dia' || r.status === 'em_atraso')
    .reduce((acc, r) => acc + r.valor, 0)
  const recebimentosAtrasados = recebimentos
    .filter((r) => r.status === 'em_atraso')
    .reduce((acc, r) => acc + r.valor, 0)
  const taxaInadimplencia =
    contasAReceber + totalEntradasGerais > 0
      ? (recebimentosAtrasados / (contasAReceber + totalEntradasGerais)) * 100
      : 0

  // ----------------------------------------------------------------------
  // DRE MENSAL (competência / caixa no mês selecionado)
  // ----------------------------------------------------------------------
  const caixaDoMes = caixa.filter((c) => {
    if (!c.data) return false
    const d = new Date(c.data)
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth
  })

  const receitaBrutaMes = caixaDoMes
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)

  // Custos Operacionais Diretos da Frota (Manutenções, peças, oficina, combustível)
  const custosOperacionaisMes = caixaDoMes
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        (c.categoria?.toLowerCase().includes('manuten') ||
          c.categoria?.toLowerCase().includes('peça') ||
          c.categoria?.toLowerCase().includes('combust') ||
          c.categoria?.toLowerCase().includes('oficina')),
    )
    .reduce((acc, c) => acc + c.valor, 0)

  // Despesas Administrativas & Outros (Rastreador, Seguro, Documentação, Taxas)
  const despesasFixasMes = caixaDoMes
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        !c.categoria?.toLowerCase().includes('manuten') &&
        !c.categoria?.toLowerCase().includes('peça') &&
        !c.categoria?.toLowerCase().includes('combust') &&
        !c.categoria?.toLowerCase().includes('oficina'),
    )
    .reduce((acc, c) => acc + c.valor, 0)

  const totalDespesasMes = custosOperacionaisMes + despesasFixasMes
  const lucroBrutoMes = receitaBrutaMes - custosOperacionaisMes
  const lucroLiquidoMes = receitaBrutaMes - totalDespesasMes
  const margemBrutaMes = receitaBrutaMes > 0 ? (lucroBrutoMes / receitaBrutaMes) * 100 : 0
  const margemLiquidaMes = receitaBrutaMes > 0 ? (lucroLiquidoMes / receitaBrutaMes) * 100 : 0

  // ----------------------------------------------------------------------
  // DRE ANUAL (todo o ano selecionado)
  // ----------------------------------------------------------------------
  const caixaDoAno = caixa.filter((c) => {
    if (!c.data) return false
    const d = new Date(c.data)
    return d.getFullYear() === selectedYear
  })

  const receitaBrutaAno = caixaDoAno
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)

  const custosOperacionaisAno = caixaDoAno
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        (c.categoria?.toLowerCase().includes('manuten') ||
          c.categoria?.toLowerCase().includes('peça') ||
          c.categoria?.toLowerCase().includes('combust') ||
          c.categoria?.toLowerCase().includes('oficina')),
    )
    .reduce((acc, c) => acc + c.valor, 0)

  const despesasFixasAno = caixaDoAno
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        !c.categoria?.toLowerCase().includes('manuten') &&
        !c.categoria?.toLowerCase().includes('peça') &&
        !c.categoria?.toLowerCase().includes('combust') &&
        !c.categoria?.toLowerCase().includes('oficina'),
    )
    .reduce((acc, c) => acc + c.valor, 0)

  const totalDespesasAno = custosOperacionaisAno + despesasFixasAno
  const lucroBrutoAno = receitaBrutaAno - custosOperacionaisAno
  const lucroLiquidoAno = receitaBrutaAno - totalDespesasAno
  const margemLiquidaAno = receitaBrutaAno > 0 ? (lucroLiquidoAno / receitaBrutaAno) * 100 : 0

  // ----------------------------------------------------------------------
  // BALANÇO PATRIMONIAL SIMPLIFICADO
  // ----------------------------------------------------------------------
  // Ativo Circulante: Disponível em Caixa + Contas a Receber
  const ativoCirculante = Math.max(0, saldoCaixaAtual) + contasAReceber
  // Ativo Não Circulante (Imobilizado): Veículos da frota
  const ativoNaoCirculante = ativoFrotaTotal
  const totalAtivo = ativoCirculante + ativoNaoCirculante

  // Passivo Circulante: Obrigações a pagar
  const passivoCirculante = 0
  // Patrimônio Líquido: Ativo Total - Passivo
  const patrimonioLiquido = totalAtivo - passivoCirculante

  // ----------------------------------------------------------------------
  // ÍNDICES FINANCEIROS DO NEGÓCIO
  // ----------------------------------------------------------------------
  // ROE (Return on Equity) aproximado anualizado: (Lucro Líquido Anual / Patrimônio Líquido) * 100
  const roeAproximado =
    patrimonioLiquido > 0
      ? ((lucroLiquidoAno || lucroLiquidoMes * 12) / patrimonioLiquido) * 100
      : 0

  // Rentabilidade da Frota (ROA): Lucro Líquido Anual / Total Ativo
  const roaFrota =
    totalAtivo > 0 ? ((lucroLiquidoAno || lucroLiquidoMes * 12) / totalAtivo) * 100 : 0

  // Ponto de Equilíbrio mensal em R$ (quanto precisa faturar para pagar as despesas)
  const pontoEquilibrioMes = totalDespesasMes > 0 ? totalDespesasMes : 500

  const monthNames = [
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

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Relatórios administrativos e contábeis da <strong>M2 Gestão de Motos</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletores de Período (DRE e Balanço) */}
          {activeReportTab !== 'payback' && (
            <>
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => setSelectedMonth(Number(val))}
              >
                <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="w-[100px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir / Exportar
          </Button>
        </div>
      </div>

      {/* Lista Visível de Relatórios Disponíveis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Lista de Relatórios Disponíveis (Clique para Visualizar)
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            5 relatórios disponíveis
          </span>
        </div>

        {/* Duas Colunas: Administrativos à Esquerda | Contábeis à Direita (itens em lista vertical um abaixo do outro com botões de tamanho uniforme) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna 1: Administrativos (Esquerda) */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Administrativos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gestão operacional, retorno por moto e indicadores
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-white dark:bg-slate-900"
                >
                  2 relatórios
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('payback')}
                  className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeReportTab === 'payback'
                      ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/60 shadow-sm ring-2 ring-blue-500 text-blue-900 dark:text-blue-100'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeReportTab === 'payback'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate">Payback por Moto</span>
                  </div>
                  {activeReportTab === 'payback' && (
                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold shrink-0">
                      Visualizando
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReportTab('indices')}
                  className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeReportTab === 'indices'
                      ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/60 shadow-sm ring-2 ring-blue-500 text-blue-900 dark:text-blue-100'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeReportTab === 'indices'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate">Índices & Indicadores</span>
                  </div>
                  {activeReportTab === 'indices' && (
                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold shrink-0">
                      Visualizando
                    </Badge>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Coluna 2: Contábeis (Direita) */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Contábeis
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Demonstrações financeiras, DRE e balanço
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-white dark:bg-slate-900"
                >
                  3 relatórios
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('dre-mensal')}
                  className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeReportTab === 'dre-mensal'
                      ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-2 ring-emerald-500 text-emerald-900 dark:text-emerald-100'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeReportTab === 'dre-mensal'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate">DRE Mensal</span>
                  </div>
                  {activeReportTab === 'dre-mensal' && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      Visualizando
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReportTab('dre-anual')}
                  className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeReportTab === 'dre-anual'
                      ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-2 ring-emerald-500 text-emerald-900 dark:text-emerald-100'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeReportTab === 'dre-anual'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate">DRE Anual</span>
                  </div>
                  {activeReportTab === 'dre-anual' && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      Visualizando
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReportTab('balanco')}
                  className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    activeReportTab === 'balanco'
                      ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-2 ring-emerald-500 text-emerald-900 dark:text-emerald-100'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeReportTab === 'balanco'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate">
                      Balanço Patrimonial Simplificado
                    </span>
                  </div>
                  {activeReportTab === 'balanco' && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      Visualizando
                    </Badge>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Visão do Relatório Ativo selecionado pelas duas colunas */}
      <div className="space-y-4">
        {/* ========================================================================= */}
        {/* TAB: PAYBACK POR MOTO COM RÉGUA DE MESES/ANOS (Administrativo) */}
        {/* ========================================================================= */}
        {activeReportTab === 'payback' && (
          <PaybackTab motos={motos} contratos={contratos} caixa={caixa} />
        )}

        {/* ========================================================================= */}
        {/* TAB 1: DRE MENSAL (Contábil) */}
        {/* ========================================================================= */}
        {activeReportTab === 'dre-mensal' && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Demonstração do Resultado do Exercício (DRE) — {monthNames[selectedMonth - 1]}/
                  {selectedYear}
                </CardTitle>
                <CardDescription>
                  Apuração de receitas de locação, custos diretos de manutenção e despesas
                  operacionais no mês
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="font-semibold text-xs bg-slate-50 dark:bg-slate-800"
              >
                Competência / Caixa
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 max-w-3xl">
                {/* Linha 1: Receita Bruta */}
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                      (+) RECEITA BRUTA DE LOCAÇÕES
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Entradas de aluguéis e diárias liquidadas no mês
                    </p>
                  </div>
                  <span className="font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
                    R$ {receitaBrutaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 2: Custos de Manutenção */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      (-) CUSTOS OPERACIONAIS DIRETOS (Manutenções e Peças)
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Oficina, trocas de óleo, pneus, pastilhas e reposições
                    </p>
                  </div>
                  <span className="font-bold text-base text-red-600 dark:text-red-400">
                    - R${' '}
                    {custosOperacionaisMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 3: Lucro Bruto */}
                <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg flex items-center justify-between font-semibold text-sm text-blue-900 dark:text-blue-200 border-l-4 border-l-blue-600 pl-4">
                  <span>
                    (=) LUCRO BRUTO OPERACIONAL (Margem Bruta: {margemBrutaMes.toFixed(1)}%)
                  </span>
                  <span>
                    R$ {lucroBrutoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 4: Despesas Fixas */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      (-) DESPESAS OPERACIONAIS & ADMINISTRATIVAS
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rastreadores GPS, seguros, documentações e outros gastos
                    </p>
                  </div>
                  <span className="font-bold text-base text-red-600 dark:text-red-400">
                    - R$ {despesasFixasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Linha 5: Resultado Líquido Final */}
                <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-base tracking-wide block">
                      (=) RESULTADO LÍQUIDO DO MÊS (LUCRO LÍQUIDO)
                    </span>
                    <span className="text-xs text-slate-300">
                      Margem Líquida apurada: {margemLiquidaMes.toFixed(1)}% sobre a receita bruta
                    </span>
                  </div>
                  <span
                    className={`font-black text-2xl ${
                      lucroLiquidoMes >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    R$ {lucroLiquidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DRE ANUAL (Contábil) */}
        {/* ========================================================================= */}
        {activeReportTab === 'dre-anual' && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  DRE Anual Consolidado — Exercício {selectedYear}
                </CardTitle>
                <CardDescription>
                  Demonstração contábil acumulada de todo o ano de {selectedYear}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 max-w-3xl">
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                      (+) RECEITA BRUTA ACUMULADA ({selectedYear})
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total de recebimentos de locações durante o exercício
                    </p>
                  </div>
                  <span className="font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
                    R$ {receitaBrutaAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      (-) CUSTOS TOTAIS DE MANUTENÇÃO & PEÇAS
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Oficina, trocas de óleo, pneus e revisões
                    </p>
                  </div>
                  <span className="font-bold text-base text-red-600 dark:text-red-400">
                    - R${' '}
                    {custosOperacionaisAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg flex items-center justify-between font-semibold text-sm text-blue-900 dark:text-blue-200 border-l-4 border-l-blue-600 pl-4">
                  <span>(=) LUCRO BRUTO DO EXERCÍCIO</span>
                  <span>
                    R$ {lucroBrutoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      (-) DESPESAS FIXAS ANUAIS (Rastreador, Seguro, IPVA)
                    </span>
                  </div>
                  <span className="font-bold text-base text-red-600 dark:text-red-400">
                    - R$ {despesasFixasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-base tracking-wide block">
                      (=) RESULTADO LÍQUIDO DO ANO ({selectedYear})
                    </span>
                    <span className="text-xs text-slate-300">
                      Margem Líquida Anual: {margemLiquidaAno.toFixed(1)}%
                    </span>
                  </div>
                  <span
                    className={`font-black text-2xl ${
                      lucroLiquidoAno >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    R$ {lucroLiquidoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BALANÇO PATRIMONIAL SIMPLIFICADO (Contábil) */}
        {/* ========================================================================= */}
        {activeReportTab === 'balanco' && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Balanço Patrimonial Simplificado
                </CardTitle>
                <CardDescription>
                  Demonstração da posição patrimonial: Ativos (Caixa + Frota de Motos), Passivos e
                  Patrimônio Líquido
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lado Esquerdo: ATIVO */}
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
                    <span className="font-extrabold text-base text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      ATIVO TOTAL (Bens & Direitos)
                    </span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block mt-1">
                      R$ {totalAtivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Ativo Circulante (Disponibilidades)
                    </span>

                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Saldo em Caixa / Bancos:</span>
                      <span className="font-bold text-emerald-600">
                        R${' '}
                        {Math.max(0, saldoCaixaAtual).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span>Contas a Receber (Aluguéis a vencer/aberto):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        R$ {contasAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Ativo Imobilizado (Patrimônio em Motos)
                    </span>

                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Frota de Veículos ({totalMotos} motos):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        R$ {ativoFrotaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Base de avaliação estimada: ~R$ {valorMedioMoto.toLocaleString('pt-BR')} por
                      moto.
                    </p>
                  </div>
                </div>

                {/* Lado Direito: PASSIVO & PATRIMÔNIO LÍQUIDO */}
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900">
                    <span className="font-extrabold text-base text-purple-900 dark:text-purple-100 flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      PASSIVO & PATRIMÔNIO LÍQUIDO
                    </span>
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-1">
                      R$ {totalAtivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Passivo Circulante (Obrigações a Pagar)
                    </span>

                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Obrigações Pendentes:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        R$ {passivoCirculante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Despesas operacionais quitadas diretamente no Fluxo de Caixa.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Patrimônio Líquido (Capital Próprio)
                    </span>

                    <div className="flex justify-between items-center text-base border-b pb-2 font-bold text-emerald-900 dark:text-emerald-100">
                      <span>Patrimônio Líquido Consolidado:</span>
                      <span className="text-xl">
                        R$ {patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Valor real do negócio pertencente à proprietária após descontar as obrigações
                      imediatas.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ÍNDICES & INDICADORES FINANCEIROS (Administrativo) */}
        {/* ========================================================================= */}
        {activeReportTab === 'indices' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Margem Líquida */}
            <Card className="shadow-sm border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Margem Líquida</span>
                  <Percent className="w-4 h-4 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-blue-600">
                  {margemLiquidaMes.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentual de cada R$ 1,00 faturado que sobra limpo como lucro após custos e
                  despesas.
                </p>
              </CardContent>
            </Card>

            {/* ROE (Retorno sobre o Patrimônio Líquido) */}
            <Card className="shadow-sm border-emerald-200 dark:border-emerald-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>ROE (Retorno s/ Patrimônio)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-emerald-600">
                  {roeAproximado.toFixed(1)}% a.a.
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rentabilidade estimada anualizada sobre o capital investido na frota e reservas.
                </p>
              </CardContent>
            </Card>

            {/* Taxa de Ocupação da Frota */}
            <Card className="shadow-sm border-purple-200 dark:border-purple-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Taxa de Ocupação da Frota</span>
                  <Bike className="w-4 h-4 text-purple-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-purple-600">
                  {taxaOcupacao.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {motosLocadas} de {totalMotos} motos gerando receita neste momento.
                </p>
              </CardContent>
            </Card>

            {/* Taxa de Inadimplência */}
            <Card className="shadow-sm border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Taxa de Inadimplência</span>
                  <Activity className="w-4 h-4 text-amber-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-amber-600">
                  {taxaInadimplencia.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aluguéis em atraso: R$ {recebimentosAtrasados.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Ponto de Equilíbrio */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Ponto de Equilíbrio Mensal</span>
                  <Scale className="w-4 h-4 text-slate-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  R$ {pontoEquilibrioMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faturamento mínimo mensal necessário para cobrir os custos e despesas totais.
                </p>
              </CardContent>
            </Card>

            {/* Retorno sobre Ativo (ROA) */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>ROA (Retorno sobre Ativo)</span>
                  <Layers className="w-4 h-4 text-slate-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {roaFrota.toFixed(1)}% a.a.
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Eficiência da frota em transformar os ativos físicos em lucro líquido.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
