import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bike,
  KeyRound,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Circle,
  CircleCheck,
  Wrench,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { recebimentosService } from '@/services/recebimentos'
import { caixaService } from '@/services/caixa'
import { Moto, Contrato, Recebimento, CaixaLancamento } from '@/types/database'
import { formatDateDisplay } from '@/lib/dateUtils'

export default function Dashboard() {
  const { isProprietario } = useAuth()
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [m, c, r, cx] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        recebimentosService.getAll(),
        caixaService.getAll(),
      ])
      setMotos(m)
      setContratos(c)
      setRecebimentos(r)
      setCaixa(cx)
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Metrics - Frota Operacional (exclui vendidas e cedidas)
  const motosOperacionais = motos.filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
  const totalMotos = motosOperacionais.length
  const motosLocadas = motosOperacionais.filter((m) => m.status === 'locada').length
  const motosDisponiveis = motosOperacionais.filter((m) => m.status === 'disponivel').length
  const motosManutencao = motosOperacionais.filter((m) => m.status === 'manutencao').length
  const motosLojaDetran = motosOperacionais.filter((m) => m.status === 'em_loja_detran').length
  const taxaOcupacao = totalMotos > 0 ? Math.round((motosLocadas / totalMotos) * 100) : 0

  // Weekly Revenue Forecast (Active Contracts weekly value or daily * 7)
  const activeContracts = contratos.filter((c) => c.status === 'ativo')
  const previsaoSemanal = activeContracts.reduce((acc, c) => {
    const weekly = c.valor_semanal || (c.valor_diario ? c.valor_diario * 7 : 0)
    return acc + weekly
  }, 0)

  // Monthly Revenue Forecast based on weekly revenue (approx 4.33 weeks per month or weekly / 7 * 30)
  const previsaoMensal = activeContracts.reduce((acc, c) => {
    const weekly = c.valor_semanal || (c.valor_diario ? c.valor_diario * 7 : 0)
    return acc + (weekly / 7) * 30
  }, 0)

  // Status of Recebimentos
  const emDia = recebimentos.filter((r) => r.status === 'em_dia').length
  const emAtraso = recebimentos.filter((r) => r.status === 'em_atraso')
  const totalAtrasoValor = emAtraso.reduce((acc, r) => acc + r.valor, 0)

  // Caixa Month Balance
  const totalEntradas = caixa
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)
  const totalSaidas = caixa.filter((c) => c.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
  const saldoCaixa = totalEntradas - totalSaidas

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Painel Geral
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada da frota, contratos e saúde financeira.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/motos/nova">
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Moto
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/alugueis">
              <KeyRound className="w-4 h-4 mr-1.5" />
              Novo Aluguel
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid: 3 cards responsivos mantendo Frota, Previsão Semanal e Atrasos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Motos Status */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Frota & Ocupação
            </CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg">
              <Bike className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {motosLocadas}/{totalMotos}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {taxaOcupacao}% ocupadas
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-1">
              <span className="text-emerald-600">{motosDisponiveis} disponíveis</span>
              <span className="text-amber-600">{motosManutencao} oficina</span>
              {motosLojaDetran > 0 && (
                <span className="text-purple-600">{motosLojaDetran} Loja/Detran</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Previsão Semanal */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Previsão Semanal
            </CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {previsaoSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Projeção mensal: R${' '}
              {previsaoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Recebimentos em Atraso */}
        <Card className="shadow-sm border-amber-200 dark:border-amber-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Locatários em Atraso
            </CardTitle>
            <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${emAtraso.length > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}
              >
                {emAtraso.length}
              </span>
              <span className="text-xs text-muted-foreground">({emDia} em dia)</span>
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              {emAtraso.length > 0
                ? `R$ ${totalAtrasoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber`
                : 'Nenhum atraso no momento'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Frota e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Frota e Contratos Ativos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Frota em Destaque */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Resumo da Frota</CardTitle>
                <CardDescription>Status atual e valores semanais das motos</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/motos" className="text-xs">
                  Ver Todas &rarr;
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {motos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bike className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium">Nenhuma moto cadastrada no momento.</p>
                  <p className="text-xs mt-1">Comece cadastrando as motos reais da frota.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/motos/nova">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Cadastrar Primeira Moto
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {motos
                    .slice()
                    .sort((a, b) => {
                      const aInativa = a.status === 'vendida' || a.status === 'cedida'
                      const bInativa = b.status === 'vendida' || b.status === 'cedida'
                      if (aInativa && !bInativa) return 1
                      if (!aInativa && bInativa) return -1
                      return (a.nome || a.modelo).localeCompare(b.nome || b.modelo)
                    })
                    .map((moto) => {
                      const statusConfig: Record<
                        string,
                        { label: string; color: string; icon: typeof Bike }
                      > = {
                        disponivel: {
                          label: 'Disponível',
                          color:
                            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
                          icon: Circle,
                        },
                        locada: {
                          label: 'Locada',
                          color:
                            'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
                          icon: CircleCheck,
                        },
                        manutencao: {
                          label: 'Em Manutenção',
                          color:
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                          icon: Wrench,
                        },
                        em_loja_detran: {
                          label: 'Em Loja/Detran',
                          color:
                            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                          icon: Clock,
                        },
                        vendida: {
                          label: 'VENDIDA',
                          color:
                            'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                          icon: CircleCheck,
                        },
                        cedida: {
                          label: 'CEDIDA',
                          color:
                            'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                          icon: CircleCheck,
                        },
                      }
                      const statusInfo = statusConfig[moto.status] || {
                        label: moto.status,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                        icon: Bike,
                      }
                      const StatusIcon = statusInfo.icon
                      const isCinza = moto.status === 'vendida' || moto.status === 'cedida'

                      const valorSem =
                        moto.valor_semanal !== undefined && moto.valor_semanal !== null
                          ? moto.valor_semanal
                          : (moto.valor_diario || 0) * 7

                      return (
                        <div
                          key={moto.id}
                          className={`py-3 flex items-center justify-between gap-3 sm:gap-4 ${
                            isCinza ? 'opacity-60 grayscale' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                              <Bike className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {moto.nome || moto.modelo}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-semibold px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border shrink-0">
                                  {moto.placa}
                                </span>
                                <span className="truncate">• {moto.modelo}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                              R$ {valorSem.toFixed(0)}/sem
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[11px] sm:text-xs px-2 py-0.5 font-medium flex items-center gap-1 shrink-0 ${statusInfo.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusInfo.label}</span>
                            </Badge>
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                              <Link to={`/motos/${moto.id}`} title="Ver ficha da moto">
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertas de Atrasos */}
          {emAtraso.length > 0 && (
            <Card className="shadow-sm border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Recebimentos em Atraso
                  </CardTitle>
                  <CardDescription className="text-amber-800/80 dark:text-amber-300/80">
                    Locatários com pagamentos pendentes que precisam de atenção
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emAtraso.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {rec.locatario_nome?.trim() || 'Sem locatário'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {formatDateDisplay(rec.data_vencimento)}
                          {rec.observacoes ? ` • ${rec.observacoes}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-600">
                          R$ {rec.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          >
                            Em Atraso
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1/3): Resumo Financeiro & Saldo de Caixa */}
        <div className="space-y-6">
          {/* Resumo Rápido de Caixa */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Saldo do Caixa</CardTitle>
              <CardDescription>Entradas e saídas consolidadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <span className="text-xs text-muted-foreground block">Saldo Geral Acumulado</span>
                <span
                  className={`text-2xl font-bold ${saldoCaixa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  R$ {saldoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <div className="flex items-center text-emerald-600 mb-1">
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    <span>Total Entradas</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-100 dark:border-red-900">
                  <div className="flex items-center text-red-600 mb-1">
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    <span>Total Saídas</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/caixa">Ver Extrato Completo</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Atalho Rápido para Relatórios */}
          <Card className="shadow-sm border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Relatórios Gerenciais
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300"
                >
                  6 Disponíveis
                </Badge>
              </div>
              <CardDescription>Acesse Payback, Indicadores, DREs, Balanço e KPIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Consulte a apuração contábil, retorno de investimento por moto e indicadores da
                frota.
              </p>
              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="sm"
              >
                <Link to="/relatorios">
                  <TrendingUp className="w-4 h-4" />
                  Abrir Relatórios
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
