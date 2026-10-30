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
  Gauge,
  Wallet,
  AlertTriangle,
  Wrench,
  Clock,
  Sparkles,
  Trophy,
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
import { contasAPagarService } from '@/services/contasAPagar'
import { contasAReceberService } from '@/services/contasAReceber'
import {
  Moto,
  Contrato,
  CaixaLancamento,
  Recebimento,
  ContaAPagarComProgresso,
  ContaAReceber,
} from '@/types/database'
import { PaybackTab } from '@/components/PaybackTab'
import { LucroPorMotoReport } from '@/components/LucroPorMotoReport'
import { GraficosReport } from '@/components/GraficosReport'
import { ProjecaoFluxoCaixaReport } from '@/components/ProjecaoFluxoCaixaReport'
import { MediaLucroPorMotoReport } from '@/components/MediaLucroPorMotoReport'

export default function Reports() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [contasAPagar, setContasAPagar] = useState<ContaAPagarComProgresso[]>([])
  const [contasAReceberAvulsas, setContasAReceberAvulsas] = useState<ContaAReceber[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for DRE and Balanço
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [activeReportTab, setActiveReportTab] = useState('dre-mensal')

  const reportPrintRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      const [m, c, cx, r, cp, cr] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        caixaService.getAll(),
        recebimentosService.getAll(),
        contasAPagarService.getAllWithProgresso(),
        contasAReceberService.getAll(),
      ])
      setMotos(m)
      setContratos(c)
      setCaixa(cx)
      setRecebimentos(r)
      setContasAPagar(cp)
      setContasAReceberAvulsas(cr)
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

  // Cálculos Gerais do Negócio - Frota Operacional (exclui vendidas e cedidas)
  const motosAtivas = motos.filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
  const totalMotos = motosAtivas.length
  const motosLocadas = motosAtivas.filter((m) => m.status === 'locada').length
  const taxaOcupacao = totalMotos > 0 ? (motosLocadas / totalMotos) * 100 : 0

  // Valor do Ativo Imobilizado da Frota:
  // Usa a soma dos valores de compra reais das motos ativas quando disponível, ou o valor médio estimado
  const valorMedioMoto = 13500
  const ativoFrotaTotal = motosAtivas.reduce((acc, m) => {
    return acc + (m.valor_compra && m.valor_compra > 0 ? m.valor_compra : valorMedioMoto)
  }, 0)

  // Saldo total de Caixa acumulado
  const totalEntradasGerais = caixa
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)
  const totalSaidasGerais = caixa
    .filter((c) => c.tipo === 'saida')
    .reduce((acc, c) => acc + c.valor, 0)
  const saldoCaixaAtual = totalEntradasGerais - totalSaidasGerais

  // Contas a Receber (Aluguéis pendentes/em atraso + Vendas de motos aguardando recebimento)
  const contasAReceberAlugueis = recebimentos
    .filter((r) => r.status === 'em_dia' || r.status === 'em_atraso')
    .reduce((acc, r) => acc + r.valor, 0)

  const contasAReceberVendasEmAberto = contasAReceberAvulsas
    .filter((c) => c.status === 'em_aberto')
    .reduce((acc, c) => acc + Number(c.valor), 0)

  const contasAReceber = contasAReceberAlugueis + contasAReceberVendasEmAberto
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

  // Comissões pagas no mês (despesas com comissão / sócios / parceiros)
  const comissoesMes = caixaDoMes
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        (c.categoria?.toLowerCase().includes('comiss') ||
          c.descricao?.toLowerCase().includes('comiss')),
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
  // DRE MÊS ANTERIOR (para comparação de performance MoM)
  // ----------------------------------------------------------------------
  const prevMonthIndex = selectedMonth === 1 ? 12 : selectedMonth - 1
  const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear

  const caixaDoMesAnterior = caixa.filter((c) => {
    if (!c.data) return false
    const d = new Date(c.data)
    return d.getFullYear() === prevMonthYear && d.getMonth() + 1 === prevMonthIndex
  })

  const receitaBrutaMesAnterior = caixaDoMesAnterior
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)

  const totalDespesasMesAnterior = caixaDoMesAnterior
    .filter((c) => c.tipo === 'saida')
    .reduce((acc, c) => acc + c.valor, 0)

  const lucroLiquidoMesAnterior = receitaBrutaMesAnterior - totalDespesasMesAnterior

  const crescimentoReceitaMoM =
    receitaBrutaMesAnterior > 0
      ? ((receitaBrutaMes - receitaBrutaMesAnterior) / receitaBrutaMesAnterior) * 100
      : null

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

  const comissoesAno = caixaDoAno
    .filter(
      (c) =>
        c.tipo === 'saida' &&
        (c.categoria?.toLowerCase().includes('comiss') ||
          c.descricao?.toLowerCase().includes('comiss')),
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
  // KPIS ESPECÍFICOS DE LOCAÇÃO DE MOTOS
  // ----------------------------------------------------------------------
  // Contratos ativos para ticket médio
  const activeContracts = contratos.filter((c) => c.status === 'ativo')
  const ticketMedioSemanal =
    activeContracts.length > 0
      ? activeContracts.reduce(
          (acc, c) => acc + (c.valor_semanal || (c.valor_diario ? c.valor_diario * 7 : 0)),
          0,
        ) / activeContracts.length
      : 0

  // Ticket médio geral das motos da frota cadastradas
  const ticketMedioFrota =
    totalMotos > 0
      ? motos.reduce(
          (acc, m) =>
            acc +
            (m.valor_semanal !== undefined && m.valor_semanal !== null
              ? m.valor_semanal
              : (m.valor_diario || 0) * 7),
          0,
        ) / totalMotos
      : 0

  // Custo médio de manutenção por moto no mês e no ano
  const custoManutencaoPorMotoMes = totalMotos > 0 ? custosOperacionaisMes / totalMotos : 0
  const custoManutencaoPorMotoAno = totalMotos > 0 ? custosOperacionaisAno / totalMotos : 0

  // Estimativa de Payback Médio da Frota (em meses)
  // Receita média líquida gerada por moto por mês:
  const lucroLiquidoMedioPorMotoMes =
    totalMotos > 0
      ? lucroLiquidoAno > 0
        ? lucroLiquidoAno / 12 / totalMotos
        : lucroLiquidoMes / totalMotos
      : 0
  const paybackMedioMeses =
    lucroLiquidoMedioPorMotoMes > 0
      ? Math.round(valorMedioMoto / lucroLiquidoMedioPorMotoMes)
      : null

  // Contas a Pagar Pendentes / Abertas (com saldo devedor restante > 0)
  // Contas já QUITADAS (concluida = true ou saldoRestante <= 0) não entram no passivo
  const contasAPagarAbertas = contasAPagar
    .filter((c) => {
      if (c.concluida) return false
      const saldo =
        c.saldoRestante !== undefined ? c.saldoRestante : c.valor_total - (c.totalPago || 0)
      return saldo > 0
    })
    .map((c) => {
      const saldo =
        c.saldoRestante !== undefined ? c.saldoRestante : c.valor_total - (c.totalPago || 0)
      return {
        ...c,
        saldoDevedor: Math.max(0, saldo),
      }
    })

  const totalContasAPagarPendente = contasAPagarAbertas.reduce((acc, c) => acc + c.saldoDevedor, 0)

  // ----------------------------------------------------------------------
  // BALANÇO PATRIMONIAL SIMPLIFICADO
  // ----------------------------------------------------------------------
  // Ativo Circulante: Disponível em Caixa + Contas a Receber
  const ativoCirculante = Math.max(0, saldoCaixaAtual) + contasAReceber
  // Ativo Não Circulante (Imobilizado): Veículos da frota
  const ativoNaoCirculante = ativoFrotaTotal
  const totalAtivo = ativoCirculante + ativoNaoCirculante

  // Passivo Circulante: Obrigações / Dívidas cadastradas no Contas a Pagar
  const passivoCirculante = totalContasAPagarPendente
  // Patrimônio Líquido: Ativo Total - Passivo Total (capital próprio real da proprietária)
  const patrimonioLiquido = totalAtivo - passivoCirculante
  // Total do Passivo + Patrimônio Líquido (deve fechar perfeitamente igual ao Total do Ativo)
  const totalPassivoEPatrimonioLiquido = passivoCirculante + patrimonioLiquido

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
            Relatórios administrativos, contábeis e KPIs da <strong>M2 Gestão de Motos</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletores de Período (DRE e Balanço) */}
          {activeReportTab !== 'payback' &&
            activeReportTab !== 'lucro-moto' &&
            activeReportTab !== 'projecao-fluxo' &&
            activeReportTab !== 'graficos-receita' &&
            activeReportTab !== 'graficos-custos' &&
            activeReportTab !== 'kpi-media-lucro' && (
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
                    {[2024, 2025, 2026, 2027].map((y) => (
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
            10 relatórios e visões disponíveis
          </span>
        </div>

        {/* Quatro Colunas: Administrativos | Contábeis | KPI | Gráficos (botões de tamanho uniforme) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Coluna 1: Administrativos */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col justify-between">
            <div>
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
                        Gestão operacional e retorno por moto
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-white dark:bg-slate-900"
                  >
                    4 relatórios
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
                    onClick={() => setActiveReportTab('lucro-moto')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'lucro-moto'
                        ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/60 shadow-sm ring-2 ring-blue-500 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'lucro-moto'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Bike className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">Lucro por Moto</span>
                    </div>
                    {activeReportTab === 'lucro-moto' && (
                      <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold shrink-0">
                        Visualizando
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReportTab('projecao-fluxo')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'projecao-fluxo'
                        ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/60 shadow-sm ring-2 ring-blue-500 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'projecao-fluxo'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">Resultado</span>
                    </div>
                    {activeReportTab === 'projecao-fluxo' && (
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
            </div>
          </Card>

          {/* Coluna 2: Contábeis (Centro) */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col justify-between">
            <div>
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
            </div>
          </Card>

          {/* Coluna 3: KPI */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        KPI
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Desempenho e métricas vitais da locação
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
                    onClick={() => setActiveReportTab('kpi-performance')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'kpi-performance'
                        ? 'border-purple-600 bg-purple-50/90 dark:bg-purple-950/60 shadow-sm ring-2 ring-purple-500 text-purple-900 dark:text-purple-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'kpi-performance'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Gauge className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">
                        Principais Índices de Performance
                      </span>
                    </div>
                    {activeReportTab === 'kpi-performance' && (
                      <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] font-bold shrink-0">
                        Visualizando
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReportTab('kpi-media-lucro')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'kpi-media-lucro'
                        ? 'border-purple-600 bg-purple-50/90 dark:bg-purple-950/60 shadow-sm ring-2 ring-purple-500 text-purple-900 dark:text-purple-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'kpi-media-lucro'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">Média Moto</span>
                    </div>
                    {activeReportTab === 'kpi-media-lucro' && (
                      <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] font-bold shrink-0">
                        Visualizando
                      </Badge>
                    )}
                  </button>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Coluna 4: Gráficos (Nova Seção) */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Gráficos
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Visualização visual de receitas e custos
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-white dark:bg-slate-900"
                  >
                    2 gráficos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-3">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveReportTab('graficos-receita')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'graficos-receita'
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 shadow-sm ring-2 ring-indigo-500 text-indigo-900 dark:text-indigo-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'graficos-receita'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">Gráfico — Receita</span>
                    </div>
                    {activeReportTab === 'graficos-receita' && (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white text-[10px] font-bold shrink-0">
                        Visualizando
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReportTab('graficos-custos')}
                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                      activeReportTab === 'graficos-custos'
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 shadow-sm ring-2 ring-indigo-500 text-indigo-900 dark:text-indigo-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          activeReportTab === 'graficos-custos'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <PieChart className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">Gráfico — Custos</span>
                    </div>
                    {activeReportTab === 'graficos-custos' && (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white text-[10px] font-bold shrink-0">
                        Visualizando
                      </Badge>
                    )}
                  </button>
                </div>
              </CardContent>
            </div>
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
        {/* TAB: LUCRO POR MOTO — MATRIZ MOTO × MÊS (Administrativo) */}
        {/* ========================================================================= */}
        {activeReportTab === 'lucro-moto' && (
          <LucroPorMotoReport
            motos={motos}
            caixa={caixa}
            selectedYear={selectedYear}
            onYearChange={(year) => setSelectedYear(year)}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: RESULTADO (FLUXO DE CAIXA REAL) (Administrativo) */}
        {/* ========================================================================= */}
        {activeReportTab === 'projecao-fluxo' && (
          <ProjecaoFluxoCaixaReport motos={motos} caixa={caixa} contasAPagar={contasAPagar} />
        )}

        {/* ========================================================================= */}
        {/* TAB: GRÁFICOS (RECEITA & CUSTOS) */}
        {/* ========================================================================= */}
        {(activeReportTab === 'graficos-receita' || activeReportTab === 'graficos-custos') && (
          <GraficosReport
            caixa={caixa}
            contasAPagar={contasAPagar}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={(year) => setSelectedYear(year)}
            onMonthChange={(month) => setSelectedMonth(month)}
            initialGraphType={activeReportTab === 'graficos-custos' ? 'custos' : 'receita'}
          />
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
                        R${' '}
                        {contasAReceberAlugueis.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {contasAReceberVendasEmAberto > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span>Contas a Receber (Vendas de motos em aberto):</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          R${' '}
                          {contasAReceberVendasEmAberto.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                      Ativo Imobilizado (Patrimônio em Motos Operacionais)
                    </span>

                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Frota Ativa ({totalMotos} motos):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        R$ {ativoFrotaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Base: valor de compra das motos ativas (motos vendidas ou cedidas são
                      retiradas do ativo).
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
                      R${' '}
                      {totalPassivoEPatrimonioLiquido.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                        Passivo Circulante (Obrigações e Dívidas)
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Contas a Pagar
                      </Badge>
                    </div>

                    {/* Lista detalhada das contas a pagar abertas com saldo devedor restante */}
                    {contasAPagarAbertas.length === 0 ? (
                      <div className="py-2 text-xs text-muted-foreground border-b">
                        Nenhuma conta em aberto. Todas as dívidas estão quitadas.
                      </div>
                    ) : (
                      <div className="space-y-2 border-b pb-3">
                        {contasAPagarAbertas.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-sm py-1 px-2 rounded-lg bg-white dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                <span className="text-rose-600 font-bold">🤝</span>
                                {c.credor}
                              </span>
                              {c.descricao && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {c.descricao}
                                  {c.quantidade_parcelas
                                    ? ` (${c.quantidadePaga || 0}/${c.quantidade_parcelas} pagas)`
                                    : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-red-600 dark:text-red-400 block">
                                R${' '}
                                {c.saldoDevedor.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                saldo devedor
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Linha de Totalização Contas a Pagar / Passivo */}
                    <div className="flex justify-between items-center text-sm pt-1 font-bold">
                      <span className="text-slate-900 dark:text-slate-100">
                        Total Contas a Pagar (Passivo):
                      </span>
                      <span className="font-extrabold text-red-600 dark:text-red-400 text-base">
                        R$ {passivoCirculante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Soma dos saldos devedores restantes das contas abertas no módulo Contas a
                      Pagar (contas quitadas são excluídas).
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

        {/* ========================================================================= */}
        {/* TAB 5: PRINCIPAIS ÍNDICES DE PERFORMANCE (KPI) */}
        {/* ========================================================================= */}
        {activeReportTab === 'kpi-performance' && (
          <div className="space-y-6">
            {/* Header explicativo do KPI */}
            <Card className="border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/70 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-slate-900 dark:to-blue-950/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Gauge className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Principais Índices de Performance (KPI) — {monthNames[selectedMonth - 1]}/
                      {selectedYear}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Métricas e indicadores de alto nível para tomada de decisão no negócio de
                      locação de motos M2.
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white font-semibold text-xs shrink-0 self-start sm:self-auto">
                    Visão Consolidada
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Destaques Principais: 4 cartões de grande visibilidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Taxa de Locação da Frota */}
              <Card className="shadow-sm border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Taxa de Locação</span>
                    <Bike className="w-4 h-4 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                      {taxaOcupacao.toFixed(0)}%
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      ({motosLocadas}/{totalMotos} motos)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalMotos - motosLocadas} moto(s) disponível(is) ou em manutenção.
                  </p>
                </CardContent>
              </Card>

              {/* 2. Receita de Aluguéis no Mês */}
              <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Receita no Mês</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                    R$ {receitaBrutaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {crescimentoReceitaMoM !== null ? (
                      <span
                        className={`font-semibold flex items-center gap-0.5 ${
                          crescimentoReceitaMoM >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {crescimentoReceitaMoM >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {Math.abs(crescimentoReceitaMoM).toFixed(1)}% vs mês anterior
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Primeiro mês registrado</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 3. Margem Líquida */}
              <Card className="shadow-sm border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Margem Líquida</span>
                    <Percent className="w-4 h-4 text-purple-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      margemLiquidaMes >= 0 ? 'text-purple-600' : 'text-red-600'
                    }`}
                  >
                    {margemLiquidaMes.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Lucro líquido mensal de R${' '}
                    {lucroLiquidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                  </p>
                </CardContent>
              </Card>

              {/* 4. Ticket Médio Semanal por Moto */}
              <Card className="shadow-sm border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Ticket Médio Semanal</span>
                    <Wallet className="w-4 h-4 text-amber-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    R$ {ticketMedioSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Média de aluguel por contrato ativo por semana.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Grid Detalhada de Indicadores com Comparações e Contexto Operacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Receita e Despesas do Ano */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Receita e Despesas no Ano ({selectedYear})</span>
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Receita Bruta Anual:</span>
                    <span className="font-bold text-emerald-600">
                      R$ {receitaBrutaAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Despesas Totais no Ano:</span>
                    <span className="font-bold text-red-600">
                      R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>Lucro Líquido Anual:</span>
                    <span className={lucroLiquidoAno >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      R$ {lucroLiquidoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Margem Líquida Anual acumulada de {margemLiquidaAno.toFixed(1)}%.
                  </p>
                </CardContent>
              </Card>

              {/* Inadimplência e Atrasos */}
              <Card className="shadow-sm border-amber-200 dark:border-amber-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Inadimplência (Atrasos)</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex items-baseline justify-between border-b pb-1.5">
                    <span className="text-sm text-muted-foreground">Taxa de Inadimplência:</span>
                    <span className="text-xl font-bold text-amber-600">
                      {taxaInadimplencia.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Total em Atraso:</span>
                    <span className="font-bold text-amber-600">
                      R${' '}
                      {recebimentosAtrasados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Contas a Receber Geral:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      R$ {contasAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Baseado nos recebimentos marcados como 'em_atraso'.
                  </p>
                </CardContent>
              </Card>

              {/* Custo Médio de Manutenção por Moto */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Custo Médio de Manutenção</span>
                    <Wrench className="w-4 h-4 text-slate-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Custo p/ Moto no Mês:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      R${' '}
                      {custoManutencaoPorMotoMes.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Custo p/ Moto no Ano:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      R${' '}
                      {custoManutencaoPorMotoAno.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Oficina / Peças no Mês:</span>
                    <span className="font-semibold text-red-600">
                      R${' '}
                      {custosOperacionaisMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Rateio das saídas de oficina, peças e trocas de óleo sobre {totalMotos} motos.
                  </p>
                </CardContent>
              </Card>

              {/* Comissões Pagas */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Comissões Pagas</span>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Comissões no Mês:</span>
                    <span className="font-bold text-purple-600">
                      R$ {comissoesMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Comissões no Ano:</span>
                    <span className="font-bold text-purple-600">
                      R$ {comissoesAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">% da Receita do Mês:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {receitaBrutaMes > 0
                        ? ((comissoesMes / receitaBrutaMes) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Repasses a sócios e comissionados lançados no Fluxo de Caixa.
                  </p>
                </CardContent>
              </Card>

              {/* Payback Médio da Frota */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Payback Médio da Frota</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex items-baseline justify-between border-b pb-1.5">
                    <span className="text-sm text-muted-foreground">Retorno Estimado:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {paybackMedioMeses !== null ? `~${paybackMedioMeses} meses` : 'Em apuração'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Valor Médio da Moto:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      R$ {valorMedioMoto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Lucro Médio/Moto/Mês:</span>
                    <span className="font-semibold text-emerald-600">
                      R${' '}
                      {lucroLiquidoMedioPorMotoMes.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Tempo necessário para o lucro líquido da locação cobrir o valor do veículo.
                  </p>
                </CardContent>
              </Card>

              {/* Crescimento Mês a Mês & Contas a Pagar */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Crescimento & Obrigações</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Receita Mês Anterior:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      R${' '}
                      {receitaBrutaMesAnterior.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-1.5">
                    <span className="text-muted-foreground">Crescimento da Receita:</span>
                    <span
                      className={`font-bold ${
                        crescimentoReceitaMoM !== null && crescimentoReceitaMoM >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {crescimentoReceitaMoM !== null
                        ? `${crescimentoReceitaMoM >= 0 ? '+' : ''}${crescimentoReceitaMoM.toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Contas a Pagar em Aberto:</span>
                    <span className="font-semibold text-red-600">
                      R${' '}
                      {totalContasAPagarPendente.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Soma dos saldos pendentes nas Contas a Pagar parceladas e fixas.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: MÉDIA MOTO (KPI) */}
        {/* ========================================================================= */}
        {activeReportTab === 'kpi-media-lucro' && (
          <MediaLucroPorMotoReport motos={motos} caixa={caixa} />
        )}
      </div>
    </div>
  )
}
