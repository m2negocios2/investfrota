import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  ArrowLeft,
  Calendar,
  Wallet,
  Receipt,
  Edit,
  Plus,
  CheckCircle,
  Clock,
  Wrench,
  TrendingUp,
  FileText,
  User,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { caixaService } from '@/services/caixa'
import { pagamentosService } from '@/services/pagamentos'
import { Moto, Contrato, CaixaLancamento, Pagamento } from '@/types/database'

export default function MotoDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [moto, setMoto] = useState<Moto | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const loadData = async () => {
    if (!id) return
    try {
      const [m, c, cx, p] = await Promise.all([
        motosService.getById(id),
        contratosService.getByMoto(id),
        caixaService.getByMoto(id),
        pagamentosService.getByMoto(id),
      ])
      setMoto(m)
      setContratos(c)
      setCaixa(cx)
      setPagamentos(p)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados da moto')
      navigate('/motos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading || !moto) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Active Contract
  const activeContract = contratos.find((c) => c.status === 'ativo')

  // Financial summary for this moto
  const totalReceitas = caixa
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)
  const totalDespesas = caixa.filter((c) => c.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
  const lucroMoto = totalReceitas - totalDespesas

  // Occupation Map Calculation for Selected Year (12 months)
  // Check contracts overlap with each month
  const months = [
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

  const monthOccupancy = months.map((monthName, monthIndex) => {
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate()
    let occupiedDays = 0

    // Check each day of this month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedYear, monthIndex, day)
      const isOccupied = contratos.some((contrato) => {
        const start = new Date(contrato.data_inicio)
        // If contract is active and no end, assume active until today (or future if it started)
        let end: Date
        if (contrato.data_entrega) {
          end = new Date(contrato.data_entrega)
        } else if (contrato.status === 'ativo') {
          end = new Date() // up to current date or end of month if active
          if (end < currentDate) end = currentDate
        } else {
          end = new Date(contrato.updated || contrato.created)
        }

        // Reset hours for pure date comparison
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)

        return currentDate >= start && currentDate <= end
      })

      if (isOccupied) occupiedDays++
    }

    const percentage = Math.round((occupiedDays / daysInMonth) * 100)
    return {
      monthName,
      monthIndex,
      daysInMonth,
      occupiedDays,
      percentage,
    }
  })

  const totalYearDays = monthOccupancy.reduce((acc, m) => acc + m.daysInMonth, 0)
  const totalYearOccupied = monthOccupancy.reduce((acc, m) => acc + m.occupiedDays, 0)
  const yearRate = Math.round((totalYearOccupied / totalYearDays) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/motos">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Frota
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {moto.nome || moto.modelo}
              </h1>
              <span className="font-mono text-sm px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded font-bold border border-blue-200 dark:border-blue-800">
                {moto.placa}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modelo: {moto.modelo} • Ano {moto.ano} • Cor {moto.cor} • Diária R${' '}
              {moto.valor_diario.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/motos/${moto.id}/editar`}>
              <Edit className="w-4 h-4 mr-1.5" />
              Editar Ficha
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/alugueis?motoId=${moto.id}`}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Aluguel
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards for this Moto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Status Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-sm py-1 px-3 capitalize font-semibold ${
                  moto.status === 'locada'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                    : moto.status === 'disponivel'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {moto.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeContract
                ? `Locada para ${activeContract.locatario_nome}`
                : 'Nenhum contrato ativo no momento'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Taxa de Ocupação ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{yearRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalYearOccupied} dias locados em {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Receita Total Gerada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas: R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Lucro Líquido da Moto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${lucroMoto >= 0 ? 'text-blue-600' : 'text-red-600'}`}
            >
              R$ {lucroMoto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Caixa líquido individualizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Mapa de Ocupação, Contratos, Caixa da Moto */}
      <Tabs defaultValue="ocupacao" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="ocupacao">Mapa de Ocupação</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
          <TabsTrigger value="caixa">Caixa & Custos</TabsTrigger>
        </TabsList>

        {/* Tab 1: Mapa de Ocupação Anual */}
        <TabsContent value="ocupacao" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Mapa de Ocupação Anual — {selectedYear}
                </CardTitle>
                <CardDescription>
                  Acompanhamento mês a mês dos dias em que a moto esteve alugada
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedYear(selectedYear - 1)}
                >
                  &larr; {selectedYear - 1}
                </Button>
                <span className="font-semibold text-sm px-2">{selectedYear}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedYear(selectedYear + 1)}
                >
                  {selectedYear + 1} &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {monthOccupancy.map((m) => (
                  <div
                    key={m.monthIndex}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {m.monthName}
                        </span>
                        <span
                          className={`text-xs font-bold ${m.percentage > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          {m.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${m.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {m.occupiedDays} de {m.daysInMonth} dias
                      </span>
                      <span>{m.daysInMonth - m.occupiedDays} ociosos</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Contratos */}
        <TabsContent value="contratos" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Histórico de Contratos</CardTitle>
                <CardDescription>
                  Todos os contratos de locação associados a esta moto
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to={`/alugueis?motoId=${moto.id}`}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Novo Contrato
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contratos.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum contrato registrado para esta moto ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {contratos.map((contrato) => (
                    <div
                      key={contrato.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {contrato.locatario_nome}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              contrato.status === 'ativo'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {contrato.status.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {contrato.tipo === 'plano_conquista' ? 'Plano Conquista' : 'Normal'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Início: {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                          {contrato.prazo_meses ? ` • Prazo: ${contrato.prazo_meses} meses` : ''}
                          {contrato.data_entrega
                            ? ` • Entrega estimada: ${new Date(contrato.data_entrega).toLocaleDateString('pt-BR')}`
                            : ''}
                          {contrato.locatario_telefone
                            ? ` • Tel: ${contrato.locatario_telefone}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-xs text-muted-foreground block">Valor</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            R$ {contrato.valor_diario}/dia (R${' '}
                            {contrato.valor_semanal || contrato.valor_diario * 7}/sem)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Caixa Individual da Moto */}
        <TabsContent value="caixa" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Extrato de Caixa da Moto</CardTitle>
              <CardDescription>
                Histórico detalhado de recebimentos e custos desta moto específica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {caixa.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum lançamento no caixa registrado para esta moto.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {caixa.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {item.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.data).toLocaleDateString('pt-BR')} •{' '}
                          {item.categoria || 'Geral'} • Forma: {item.forma_pagamento || 'PIX'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            item.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.tipo === 'entrada' ? '+' : '-'} R${' '}
                          {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[10px] text-muted-foreground uppercase">
                          {item.tipo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
