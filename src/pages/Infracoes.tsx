import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Plus,
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Search,
  Filter,
  DollarSign,
  FileText,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { infracoesService } from '@/services/infracoes'
import { motosService } from '@/services/motos'
import { caixaService } from '@/services/caixa'
import { Infracao, Moto, InfracaoStatusPagamento } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

export default function Infracoes() {
  const { isProprietario } = useAuth()
  const [infracoes, setInfracoes] = useState<Infracao[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  // Selected tab (moto id or 'todas')
  const [selectedMotoTab, setSelectedMotoTab] = useState<string>('todas')

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('todos') // todos | pendente | paga
  const [searchTerm, setSearchTerm] = useState('')

  // Add / Edit Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingInfracao, setEditingInfracao] = useState<Infracao | null>(null)
  const [motoId, setMotoId] = useState('')
  const [numero, setNumero] = useState<string>('')
  const [data, setData] = useState('')
  const [codigoMulta, setCodigoMulta] = useState('')
  const [valor, setValor] = useState<string>('')
  const [cliente, setCliente] = useState('')
  const [statusPagamento, setStatusPagamento] = useState<InfracaoStatusPagamento>('pendente')
  const [dataPagamento, setDataPagamento] = useState('')
  const [deuEntradaDetran, setDeuEntradaDetran] = useState(false)
  const [dataEntradaDetran, setDataEntradaDetran] = useState('')
  const [prazo, setPrazo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mark as paid dialog (with Caixa register option)
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false)
  const [targetInfracao, setTargetInfracao] = useState<Infracao | null>(null)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0])
  const [registrarCaixa, setRegistrarCaixa] = useState(false)
  const [caixaSubmitting, setCaixaSubmitting] = useState(false)

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    try {
      const [infList, mList] = await Promise.all([infracoesService.getAll(), motosService.getAll()])
      setInfracoes(infList)
      setMotos(mList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar infrações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openNewModal = (defaultMotoId?: string) => {
    setEditingInfracao(null)
    const initialMoto =
      defaultMotoId && defaultMotoId !== 'todas' ? defaultMotoId : motos[0]?.id || ''
    setMotoId(initialMoto)

    // Calculate next sequence number for this moto
    const motoInfs = infracoes.filter((i) => i.moto === initialMoto)
    const maxNum = motoInfs.reduce((max, i) => Math.max(max, i.numero || 0), 0)
    setNumero(String(maxNum + 1))

    setData(new Date().toISOString().split('T')[0])
    setCodigoMulta('')
    setValor('')
    setCliente('')
    setStatusPagamento('pendente')
    setDataPagamento('')
    setDeuEntradaDetran(false)
    setDataEntradaDetran('')
    setPrazo('')
    setObservacao('')
    setFormOpen(true)
  }

  const openEditModal = (inf: Infracao) => {
    setEditingInfracao(inf)
    setMotoId(inf.moto)
    setNumero(inf.numero !== undefined ? String(inf.numero) : '')
    setData(inf.data ? inf.data.split('T')[0] : '')
    setCodigoMulta(inf.codigo_multa || '')
    setValor(inf.valor !== undefined ? String(inf.valor) : '')
    setCliente(inf.cliente || '')
    setStatusPagamento(inf.status_pagamento)
    setDataPagamento(inf.data_pagamento ? inf.data_pagamento.split('T')[0] : '')
    setDeuEntradaDetran(Boolean(inf.deu_entrada_detran))
    setDataEntradaDetran(inf.data_entrada_detran ? inf.data_entrada_detran.split('T')[0] : '')
    setPrazo(inf.prazo ? inf.prazo.split('T')[0] : '')
    setObservacao(inf.observacao || '')
    setFormOpen(true)
  }

  const handleMotoChangeInForm = (newMotoId: string) => {
    setMotoId(newMotoId)
    if (!editingInfracao) {
      const motoInfs = infracoes.filter((i) => i.moto === newMotoId)
      const maxNum = motoInfs.reduce((max, i) => Math.max(max, i.numero || 0), 0)
      setNumero(String(maxNum + 1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoId) {
      toast.error('Selecione a moto da infração')
      return
    }

    const numValor = parseFloat(valor)
    if (isNaN(numValor) || numValor < 0) {
      toast.error('Informe um valor válido')
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<Infracao> = {
        moto: motoId,
        numero: numero ? parseInt(numero, 10) : undefined,
        data: data ? `${data} 00:00:00.000Z` : '',
        codigo_multa: codigoMulta.trim().toUpperCase(),
        valor: numValor,
        cliente: cliente.trim(),
        status_pagamento: statusPagamento,
        data_pagamento:
          statusPagamento === 'paga' && dataPagamento ? `${dataPagamento} 00:00:00.000Z` : '',
        deu_entrada_detran: deuEntradaDetran,
        data_entrada_detran:
          deuEntradaDetran && dataEntradaDetran ? `${dataEntradaDetran} 00:00:00.000Z` : '',
        prazo: prazo ? `${prazo} 00:00:00.000Z` : '',
        observacao: observacao.trim(),
      }

      if (editingInfracao) {
        await infracoesService.update(editingInfracao.id, payload)
        toast.success('Infração atualizada com sucesso!')
      } else {
        await infracoesService.create(payload)
        toast.success('Infração cadastrada com sucesso!')
      }
      setFormOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar infração')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await infracoesService.delete(deleteId)
      toast.success('Infração excluída com sucesso!')
      setDeleteId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir infração')
    } finally {
      setDeleting(false)
    }
  }

  // Open mark as paid dialog
  const openMarkPaidDialog = (inf: Infracao) => {
    setTargetInfracao(inf)
    setPaidDate(new Date().toISOString().split('T')[0])
    setRegistrarCaixa(true)
    setMarkPaidModalOpen(true)
  }

  const handleConfirmMarkPaid = async () => {
    if (!targetInfracao) return
    setCaixaSubmitting(true)
    try {
      const formattedPaidDate = paidDate ? `${paidDate} 00:00:00.000Z` : new Date().toISOString()

      // 1. Update infracao status to paga
      await infracoesService.update(targetInfracao.id, {
        status_pagamento: 'paga',
        data_pagamento: formattedPaidDate,
      })

      // 2. Optionally register in Caixa
      if (registrarCaixa && (targetInfracao.valor || 0) > 0) {
        const moto = motos.find((m) => m.id === targetInfracao.moto)
        const motoNome = moto?.nome || moto?.modelo || 'Moto'
        await caixaService.create({
          moto: targetInfracao.moto,
          tipo: 'saida',
          descricao: `Pagamento Infração ${targetInfracao.codigo_multa || ''} (${motoNome})`,
          categoria: 'Multas',
          valor: Number(targetInfracao.valor || 0),
          data: formattedPaidDate,
          forma_pagamento: 'pix',
          observacoes: targetInfracao.cliente
            ? `Responsável: ${targetInfracao.cliente}`
            : 'Quitação de infração de trânsito',
        })
        toast.success('Infração quitada e despesa registrada no Caixa!')
      } else {
        toast.success('Infração marcada como paga!')
      }

      setMarkPaidModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar pagamento da infração')
    } finally {
      setCaixaSubmitting(false)
    }
  }

  // Quick toggle DETRAN entry
  const handleToggleDetran = async (inf: Infracao) => {
    const novoStatus = !inf.deu_entrada_detran
    const today = new Date().toISOString()
    try {
      await infracoesService.update(inf.id, {
        deu_entrada_detran: novoStatus,
        data_entrada_detran: novoStatus ? today : '',
      })
      toast.success(novoStatus ? 'Registrada entrada no DETRAN!' : 'Entrada no DETRAN desmarcada.')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar entrada DETRAN')
    }
  }

  // Filtered infracoes
  const filteredInfracoes = useMemo(() => {
    return infracoes.filter((inf) => {
      // Tab filter
      if (selectedMotoTab !== 'todas' && inf.moto !== selectedMotoTab) {
        return false
      }
      // Status filter
      if (filterStatus !== 'todos' && inf.status_pagamento !== filterStatus) {
        return false
      }
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const moto = motos.find((m) => m.id === inf.moto)
        const matchCode = (inf.codigo_multa || '').toLowerCase().includes(term)
        const matchCliente = (inf.cliente || '').toLowerCase().includes(term)
        const matchObs = (inf.observacao || '').toLowerCase().includes(term)
        const matchMotoNome = (moto?.nome || '').toLowerCase().includes(term)
        const matchPlaca = (moto?.placa || '').toLowerCase().includes(term)
        if (!matchCode && !matchCliente && !matchObs && !matchMotoNome && !matchPlaca) {
          return false
        }
      }
      return true
    })
  }, [infracoes, selectedMotoTab, filterStatus, searchTerm, motos])

  // Summary Metrics: Total & per moto
  const summary = useMemo(() => {
    let totalPendenteValor = 0
    let totalPendenteQtd = 0
    let totalPagaValor = 0
    let totalPagaQtd = 0

    // Moto-level stats map
    const motoStats: Record<
      string,
      {
        pendenteQtd: number
        pendenteValor: number
        pagaQtd: number
        pagaValor: number
        isOk: boolean
      }
    > = {}

    motos.forEach((m) => {
      motoStats[m.id] = {
        pendenteQtd: 0,
        pendenteValor: 0,
        pagaQtd: 0,
        pagaValor: 0,
        isOk: true,
      }
    })

    infracoes.forEach((inf) => {
      const valor = inf.valor || 0
      const isPaga = inf.status_pagamento === 'paga'

      if (isPaga) {
        totalPagaValor += valor
        totalPagaQtd += 1
        if (motoStats[inf.moto]) {
          motoStats[inf.moto].pagaQtd += 1
          motoStats[inf.moto].pagaValor += valor
        }
      } else {
        totalPendenteValor += valor
        totalPendenteQtd += 1
        if (motoStats[inf.moto]) {
          motoStats[inf.moto].pendenteQtd += 1
          motoStats[inf.moto].pendenteValor += valor
          motoStats[inf.moto].isOk = false
        }
      }
    })

    return {
      totalPendenteValor,
      totalPendenteQtd,
      totalPagaValor,
      totalPagaQtd,
      totalGeralQtd: infracoes.length,
      totalGeralValor: totalPendenteValor + totalPagaValor,
      motoStats,
    }
  }, [infracoes, motos])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Controle de Infrações & Multas
            </h1>
            <Badge
              variant="outline"
              className="border-red-300 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300"
            >
              Trânsito
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão individual por moto, autos de infração, cobrança de locatários e entrada no
            DETRAN.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => openNewModal(selectedMotoTab)}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Nova Infração
          </Button>
        </div>
      </div>

      {/* KPI Cards: Painel TOTAIS (conforme planilha de referência) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Pendentes (A Pagar)
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              R$ {summary.totalPendenteValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              {summary.totalPendenteQtd} infração(ões) pendente(s)
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Pagas (Quitadas)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {summary.totalPagaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              {summary.totalPagaQtd} infração(ões) quitada(s)
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Total Geral de Multas
              </span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              R$ {summary.totalGeralValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              {summary.totalGeralQtd} infração(ões) registradas no total
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Motos Quites (OK)
              </span>
              <Bike className="w-4 h-4 text-indigo-500" />
            </div>
            {(() => {
              const totalM = motos.length
              const quites = motos.filter((m) => summary.motoStats[m.id]?.isOk).length
              return (
                <>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {quites} / {totalM}
                  </p>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Motos sem pendências de multa
                  </span>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Moto (Tabela de Totais inspirada na aba TOTAIS) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Resumo da Situação por Moto</span>
                <Badge variant="secondary" className="text-[10px]">
                  TOTAIS
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Visão consolidada de pendências, quitações e situação de cada moto cadastrada
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold">Moto (Nome)</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Placa</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Pendentes</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Valor Pendente</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Pagas</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Valor Pago</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Situação (PAGTO)</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {motos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      Nenhuma moto cadastrada no sistema.
                    </td>
                  </tr>
                ) : (
                  motos.map((m) => {
                    const st = summary.motoStats[m.id] || {
                      pendenteQtd: 0,
                      pendenteValor: 0,
                      pagaQtd: 0,
                      pagaValor: 0,
                      isOk: true,
                    }
                    const isOk = st.isOk
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedMotoTab(m.id)}
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {m.nome || m.modelo}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {m.placa}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {st.pendenteQtd > 0 ? (
                            <span className="text-amber-600">{st.pendenteQtd}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {st.pendenteValor > 0 ? (
                            <span className="text-amber-600">
                              R${' '}
                              {st.pendenteValor.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {st.pagaQtd > 0 ? (
                            <span className="text-emerald-600">{st.pagaQtd}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {st.pagaValor > 0 ? (
                            <span className="text-emerald-600">
                              R${' '}
                              {st.pagaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isOk ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] hover:bg-emerald-100">
                              OK (Quites)
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] hover:bg-amber-100">
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMotoTab(m.id)
                            }}
                          >
                            Ver Multas &rarr;
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por Moto (como as abas da planilha: J60, FAN, CROSSER, A91, etc.) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">
                Detalhamento das Infrações por Moto
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione uma moto na aba para ver e lançar as multas daquele veículo
              </CardDescription>
            </div>
            {/* Quick Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Código, cliente ou moto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-44 sm:w-56"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="paga">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Abas com Nomes das Motos */}
          <div className="pt-2 overflow-x-auto">
            <div className="flex gap-1.5 pb-1">
              <Button
                variant={selectedMotoTab === 'todas' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs font-semibold shrink-0"
                onClick={() => setSelectedMotoTab('todas')}
              >
                Todas as Motos ({infracoes.length})
              </Button>
              {motos.map((m) => {
                const count = infracoes.filter((i) => i.moto === m.id).length
                const hasPending = summary.motoStats[m.id]?.pendenteQtd > 0
                return (
                  <Button
                    key={m.id}
                    variant={selectedMotoTab === m.id ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 text-xs font-semibold shrink-0 gap-1.5 ${
                      selectedMotoTab !== m.id && hasPending
                        ? 'border-amber-400 text-amber-800 dark:text-amber-300'
                        : ''
                    }`}
                    onClick={() => setSelectedMotoTab(m.id)}
                  >
                    <span>{m.nome || m.modelo}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                    {hasPending && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando infrações...
            </div>
          ) : filteredInfracoes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma infração encontrada para este filtro
              </p>
              <p className="text-xs">
                Clique no botão "Nova Infração" para registrar um auto de infração.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInfracoes.map((inf) => {
                const moto = motos.find((m) => m.id === inf.moto)
                const isPaga = inf.status_pagamento === 'paga'

                return (
                  <div
                    key={inf.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Left block: NUM, Date, Code, Moto */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        {inf.numero ? `#${inf.numero}` : '•'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {inf.codigo_multa || 'Multa s/ código'}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-semibold text-slate-700 dark:text-slate-300">
                            {moto?.nome || moto?.modelo} ({moto?.placa})
                          </span>

                          {/* Status Badge */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isPaga
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {isPaga ? 'Paga / Quitado' : 'Pendente'}
                          </Badge>

                          {/* DETRAN Badge */}
                          {inf.deu_entrada_detran ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            >
                              Entrada DETRAN OK
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-500 border-dashed"
                            >
                              Sem entrada DETRAN
                            </Badge>
                          )}
                        </div>

                        {/* Details line */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {inf.data && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Data: {new Date(inf.data).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {inf.cliente && (
                            <span>
                              <strong>Cliente:</strong> {inf.cliente}
                            </span>
                          )}
                          {inf.prazo && (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              <strong>Prazo/Verif:</strong>{' '}
                              {new Date(inf.prazo).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {inf.data_pagamento && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Pago em: {new Date(inf.data_pagamento).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {inf.observacao && (
                            <span className="italic text-slate-600 dark:text-slate-400">
                              "{inf.observacao}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right block: Value & Action buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right sm:mr-2">
                        <span className="text-[11px] text-muted-foreground block leading-none">
                          Valor da Multa
                        </span>
                        <span
                          className={`text-lg font-black ${
                            isPaga
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          R${' '}
                          {(inf.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Botão de DETRAN rápido */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleDetran(inf)}
                          title="Alternar se deu entrada no DETRAN"
                          className="h-8 text-xs px-2.5"
                        >
                          {inf.deu_entrada_detran ? 'DETRAN: OK' : 'Dar Entrada'}
                        </Button>

                        {/* Botão Quitar / Marcar como Paga */}
                        {!isPaga ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openMarkPaidDialog(inf)}
                            className="h-8 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Quitar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await infracoesService.update(inf.id, {
                                status_pagamento: 'pendente',
                                data_pagamento: '',
                              })
                              toast.info('Infração reaberta como pendente.')
                              loadData()
                            }}
                            className="h-8 text-xs px-2 text-slate-500 hover:text-slate-700"
                          >
                            Reabrir
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(inf)}
                          className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(inf.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInfracao ? 'Editar Infração' : 'Cadastrar Nova Infração'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da multa de acordo com o auto de infração e o responsável.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="motoField">Moto *</Label>
                <Select value={motoId} onValueChange={handleMotoChangeInForm}>
                  <SelectTrigger id="motoField">
                    <SelectValue placeholder="Escolha a moto" />
                  </SelectTrigger>
                  <SelectContent>
                    {motos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome || m.modelo} — {m.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numField">Número / Sequência (NUM)</Label>
                <Input
                  id="numField"
                  type="number"
                  placeholder="Ex: 1, 2, 3..."
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="codigoField">Código da Multa (Auto DETRAN)</Label>
                <Input
                  id="codigoField"
                  placeholder="Ex: F00321879, M011565184..."
                  value={codigoMulta}
                  onChange={(e) => setCodigoMulta(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorField">Valor (R$) *</Label>
                <Input
                  id="valorField"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 195.23"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dataField">Data da Infração</Label>
                <Input
                  id="dataField"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clienteField">Cliente / Condutor Responsável</Label>
                <Input
                  id="clienteField"
                  placeholder="Ex: José, Malu, Glauber..."
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="statusField">Status do Pagamento *</Label>
                <Select
                  value={statusPagamento}
                  onValueChange={(val: InfracaoStatusPagamento) => setStatusPagamento(val)}
                >
                  <SelectTrigger id="statusField">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente (A Pagar)</SelectItem>
                    <SelectItem value="paga">Paga (Quitada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusPagamento === 'paga' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="dataPagField">Data do Pagamento</Label>
                  <Input
                    id="dataPagField"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="prazoField">Prazo / Verificação (Planilha)</Label>
                  <Input
                    id="prazoField"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* DETRAN Checkbox */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detranCheck"
                  checked={deuEntradaDetran}
                  onCheckedChange={(checked) => setDeuEntradaDetran(Boolean(checked))}
                />
                <Label htmlFor="detranCheck" className="text-xs font-semibold cursor-pointer">
                  Deu entrada no DETRAN / Indicação de Condutor
                </Label>
              </div>

              {deuEntradaDetran && (
                <div className="pt-2">
                  <Label htmlFor="dataDetranField" className="text-xs text-muted-foreground">
                    Data da Entrada no DETRAN
                  </Label>
                  <Input
                    id="dataDetranField"
                    type="date"
                    value={dataEntradaDetran}
                    onChange={(e) => setDataEntradaDetran(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obsField">Observação / Acordo de Pagamento</Label>
              <Textarea
                id="obsField"
                rows={2}
                placeholder="Ex: 150 por semana todo sábado; locatário assumiu os pontos; aguardando boleto..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting
                  ? 'Salvando...'
                  : editingInfracao
                    ? 'Salvar Alterações'
                    : 'Cadastrar Infração'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar como Paga & Lançar no Caixa */}
      <Dialog open={markPaidModalOpen} onOpenChange={setMarkPaidModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Quitar Infração</span>
            </DialogTitle>
            <DialogDescription>
              Marcar a infração <strong>{targetInfracao?.codigo_multa || 'sem código'}</strong> como
              paga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  R${' '}
                  {(targetInfracao?.valor || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {targetInfracao?.cliente && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span>{targetInfracao.cliente}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quitarDataField">Data do Pagamento *</Label>
              <Input
                id="quitarDataField"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="caixaCheck"
                  checked={registrarCaixa}
                  onCheckedChange={(c) => setRegistrarCaixa(Boolean(c))}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="caixaCheck"
                    className="text-xs font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer"
                  >
                    Registrar Saída no Livro Caixa
                  </Label>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                    Cria automaticamente um lançamento de saída vinculado à moto na categoria{' '}
                    <strong>"Multas"</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMarkPaidModalOpen(false)}
              disabled={caixaSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMarkPaid}
              disabled={caixaSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {caixaSubmitting ? 'Registrando...' : 'Confirmar Quitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Infração?</DialogTitle>
            <DialogDescription>
              Esta ação removerá permanentemente o registro desta infração.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
