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
  Gauge,
  Droplet,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { caixaService } from '@/services/caixa'
import { pagamentosService } from '@/services/pagamentos'
import { FinalizeContractModal } from '@/components/FinalizeContractModal'
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

  // Quick KM update dialog
  const [kmModalOpen, setKmModalOpen] = useState(false)
  const [inputKmAtual, setInputKmAtual] = useState('')
  const [inputKmOleo, setInputKmOleo] = useState('')
  const [kmUpdating, setKmUpdating] = useState(false)

  // Finalize contract modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [contractToFinalize, setContractToFinalize] = useState<Contrato | null>(null)

  // Delete contract modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<Contrato | null>(null)
  const [deletingContract, setDeletingContract] = useState(false)

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

  // KM and Oil calculations
  const kmAtualVal = moto.km_atual || 0
  const kmUltimoOleoVal = moto.km_ultimo_oleo || 0
  const kmProximaTrocaOleo = kmUltimoOleoVal > 0 ? kmUltimoOleoVal + 1000 : kmAtualVal + 1000
  const kmRodadosDesdeOleo = kmUltimoOleoVal > 0 ? Math.max(0, kmAtualVal - kmUltimoOleoVal) : 0
  const precisaTrocaOleo = kmUltimoOleoVal > 0 && kmAtualVal >= kmProximaTrocaOleo

  const openKmModal = () => {
    setInputKmAtual(moto.km_atual !== undefined ? String(moto.km_atual) : '')
    setInputKmOleo(moto.km_ultimo_oleo !== undefined ? String(moto.km_ultimo_oleo) : '')
    setKmModalOpen(true)
  }

  const handleOpenFinalizeModal = (contrato: Contrato) => {
    setContractToFinalize(contrato)
    setFinalizeModalOpen(true)
  }

  const handleOpenDeleteModal = (contrato: Contrato) => {
    setContractToDelete(contrato)
    setDeleteModalOpen(true)
  }

  const handleConfirmFinalize = async (contrato: Contrato, dataFim: string) => {
    try {
      await contratosService.finalizar(contrato.id, contrato.moto, dataFim)
      toast.success('Contrato finalizado com sucesso!')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao finalizar contrato')
      throw err
    }
  }

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return
    setDeletingContract(true)
    try {
      await contratosService.delete(contractToDelete.id, contractToDelete.moto)
      toast.success('Contrato excluído com sucesso!')
      setDeleteModalOpen(false)
      setContractToDelete(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error(
        'Não foi possível excluir o contrato. Verifique suas permissões ou tente novamente.',
      )
    } finally {
      setDeletingContract(false)
    }
  }

  const handleSaveKm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moto) return
    setKmUpdating(true)
    try {
      const payload: Partial<Moto> = {
        km_atual: inputKmAtual !== '' ? Number(inputKmAtual) : undefined,
        km_atualizado_em: new Date().toISOString(),
        km_ultimo_oleo: inputKmOleo !== '' ? Number(inputKmOleo) : undefined,
      }
      const updated = await motosService.update(moto.id, payload)
      setMoto(updated)
      toast.success('Quilometragem e controle de óleo atualizados!')
      setKmModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar KM')
    } finally {
      setKmUpdating(false)
    }
  }

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
              Modelo: {moto.modelo} • Ano {moto.ano} • Cor {moto.cor} • Semanal R${' '}
              {(moto.valor_semanal !== undefined && moto.valor_semanal !== null
                ? moto.valor_semanal
                : (moto.valor_diario || 0) * 7
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              {moto.data_compra && (
                <> • Compra/Honda: {new Date(moto.data_compra).toLocaleDateString('pt-BR')}</>
              )}
              {moto.valor_compra !== undefined && moto.valor_compra > 0 && (
                <>
                  {' '}
                  • Valor Compra: R${' '}
                  {moto.valor_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openKmModal} className="gap-1.5">
            <Gauge className="w-4 h-4 text-blue-600" />
            Atualizar KM
          </Button>
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
                className={`text-sm py-1 px-3 font-semibold ${
                  moto.status === 'locada'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                    : moto.status === 'disponivel'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      : moto.status === 'em_loja_detran'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {moto.status === 'em_loja_detran'
                  ? 'Em Loja/Detran'
                  : moto.status === 'disponivel'
                    ? 'Disponível'
                    : moto.status === 'locada'
                      ? 'Locada'
                      : 'Em Manutenção'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeContract
                ? `Locada para ${activeContract.locatario_nome}`
                : moto.status === 'em_loja_detran'
                  ? 'Veículo em loja / aguardando Detran'
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

      {/* Tabs: Mapa de Ocupação, Contratos, Caixa da Moto e Custos da Moto */}
      <Tabs defaultValue="ocupacao" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-lg">
          <TabsTrigger value="ocupacao">Mapa Ocupação</TabsTrigger>
          <TabsTrigger value="custos">Custos da Moto ({pagamentos.length})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
          <TabsTrigger value="caixa">Caixa Individual</TabsTrigger>
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

        {/* Tab Nova: Custos da Moto (pagamentos/avisos vinculados à moto: revisão, pneu, seguro, IPVA...) */}
        <TabsContent value="custos" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Custos & Despesas da Moto</CardTitle>
                <CardDescription>
                  Pagamentos e avisos de custos específicos deste veículo (manutenção, seguro, IPVA,
                  pneus, oficina...)
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/contas-a-pagar">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Lançar Custo
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <Wrench className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-sm">Nenhum custo lançado para esta moto.</p>
                  <p className="text-xs">
                    Você pode lançar despesas de manutenção, seguro ou IPVA em Avisos de Custos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Totais de custos da moto */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                    <span>
                      Total acumulado de custos cadastrados:{' '}
                      <strong>{pagamentos.length} item(ns)</strong>
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                      R${' '}
                      {pagamentos
                        .reduce((acc, p) => acc + p.valor, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pagamentos.map((pag) => (
                      <div
                        key={pag.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {pag.descricao}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {pag.categoria_nome || pag.categoria}
                            </Badge>
                            <Badge
                              className={`text-[10px] ${
                                pag.status === 'pago'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {pag.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Vencimento: {new Date(pag.data_vencimento).toLocaleDateString('pt-BR')}
                            {pag.data_pagamento &&
                              ` • Pago em: ${new Date(pag.data_pagamento).toLocaleDateString('pt-BR')}`}
                            {pag.observacoes && ` • "${pag.observacoes}"`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-red-600 dark:text-red-400">
                            R$ {pag.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Contratos */}
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
                          {contrato.data_entrega ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {contrato.tipo === 'plano_conquista'
                                ? ` • Fim / Quitação: ${new Date(contrato.data_entrega).toLocaleDateString('pt-BR')}`
                                : ` • Fim do contrato: ${new Date(contrato.data_entrega).toLocaleDateString('pt-BR')}`}
                            </span>
                          ) : (
                            contrato.tipo === 'normal' && (
                              <span> • Fim: Recorrente / Sem término</span>
                            )
                          )}
                          {contrato.locatario_telefone
                            ? ` • Tel: ${contrato.locatario_telefone}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-xs text-muted-foreground block">Valor Semanal</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            R${' '}
                            {(contrato.valor_semanal || contrato.valor_diario * 7).toLocaleString(
                              'pt-BR',
                              { minimumFractionDigits: 2 },
                            )}
                            /sem
                          </span>
                        </div>

                        {contrato.status === 'ativo' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFinalizeModal(contrato)}
                            className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                          >
                            Finalizar Contrato
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(contrato)}
                          title="Excluir contrato cadastrado erroneamente"
                          aria-label="Excluir contrato"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      {/* Finalize Contract Modal with Custom End Date */}
      <FinalizeContractModal
        open={finalizeModalOpen}
        onOpenChange={setFinalizeModalOpen}
        contrato={contractToFinalize}
        moto={moto}
        onConfirm={handleConfirmFinalize}
      />

      {/* Delete Contract Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!deletingContract) {
            setDeleteModalOpen(open)
            if (!open) setContractToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Apagar Contrato Errôneo</span>
            </DialogTitle>
            <DialogDescription>
              Esta ação removerá definitivamente o contrato do sistema. Use apenas para cadastros
              feitos por engano ou com erros de digitação.
            </DialogDescription>
          </DialogHeader>

          {contractToDelete && (
            <div className="space-y-3 py-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">Locatário:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">
                    {contractToDelete.locatario_nome}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Data Início:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {new Date(contractToDelete.data_inicio).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {contractToDelete.data_entrega && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Data Fim / Término:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {new Date(contractToDelete.data_entrega).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Valor Semanal:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    R${' '}
                    {(
                      contractToDelete.valor_semanal || contractToDelete.valor_diario * 7
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Status Atual:</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {contractToDelete.status}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-md border border-amber-200 dark:border-amber-900/60 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> A exclusão é irreversível. O contrato deixará de constar
                  no histórico, mapa de ocupação e painéis da semana. Se o contrato for apenas
                  finalizado normalmente, use &quot;Finalizar Contrato&quot;.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setContractToDelete(null)
              }}
              disabled={deletingContract}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingContract}
              className="gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {deletingContract ? 'Apagando...' : 'Sim, Apagar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick KM Modal */}
      <Dialog open={kmModalOpen} onOpenChange={setKmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-600" />
              <span>Atualizar Quilometragem e Óleo</span>
            </DialogTitle>
            <DialogDescription>
              Mantenha o KM atualizado para monitorar o ciclo de troca de óleo a cada 1.000 km.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveKm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dlgKmAtual">KM Atual da Moto</Label>
              <Input
                id="dlgKmAtual"
                type="number"
                min={0}
                placeholder="Ex: 14482"
                value={inputKmAtual}
                onChange={(e) => setInputKmAtual(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlgKmOleo">KM da Última Troca de Óleo</Label>
              <Input
                id="dlgKmOleo"
                type="number"
                min={0}
                placeholder="Ex: 14000"
                value={inputKmOleo}
                onChange={(e) => setInputKmOleo(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                A próxima troca de óleo será calculada automaticamente somando 1.000 km.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setKmModalOpen(false)}
                disabled={kmUpdating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={kmUpdating}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4" />
                {kmUpdating ? 'Salvando...' : 'Salvar KM'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
