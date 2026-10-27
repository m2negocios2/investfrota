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
  Pencil,
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
import { FinalizeContractModal } from '@/components/FinalizeContractModal'
import { formatDateDisplay, getTodayLocalDate } from '@/lib/dateUtils'
import { Moto, Contrato, CaixaLancamento, TipoLocacao, DiaSemana } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MotoDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [moto, setMoto] = useState<Moto | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
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

  // Edit contract modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [contractToEdit, setContractToEdit] = useState<Contrato | null>(null)
  const [editLocatarioNome, setEditLocatarioNome] = useState('')
  const [editLocatarioDoc, setEditLocatarioDoc] = useState('')
  const [editLocatarioTel, setEditLocatarioTel] = useState('')
  const [editTipoContrato, setEditTipoContrato] = useState<TipoLocacao>('normal')
  const [editDataInicio, setEditDataInicio] = useState('')
  const [editDiaSemana, setEditDiaSemana] = useState<DiaSemana>('SEG')
  const [editPrazoMeses, setEditPrazoMeses] = useState<number>(12)
  const [editDataEntrega, setEditDataEntrega] = useState('')
  const [editValorSemanal, setEditValorSemanal] = useState<number>(245)
  const [editComissaoPercentual, setEditComissaoPercentual] = useState<string>('')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [savingEditContract, setSavingEditContract] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const [m, c, cx] = await Promise.all([
        motosService.getById(id),
        contratosService.getByMoto(id),
        caixaService.getByMoto(id),
      ])
      setMoto(m)
      setContratos(c)
      setCaixa(cx)
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

  const handleOpenEditModal = (contrato: Contrato) => {
    setContractToEdit(contrato)
    setEditLocatarioNome(contrato.locatario_nome || '')
    setEditLocatarioDoc(contrato.locatario_documento || '')
    setEditLocatarioTel(contrato.locatario_telefone || '')
    setEditObservacoes(contrato.observacoes || '')

    const cleanInicio = contrato.data_inicio
      ? contrato.data_inicio.split('T')[0].split(' ')[0]
      : getTodayLocalDate()
    setEditDataInicio(cleanInicio)

    const cleanEntrega = contrato.data_entrega
      ? contrato.data_entrega.split('T')[0].split(' ')[0]
      : ''
    setEditDataEntrega(cleanEntrega)

    const comVal = contrato.comissao_percentual ?? contrato.percentual_comissao
    setEditComissaoPercentual(
      comVal !== undefined && comVal !== null && comVal > 0 ? String(comVal) : '',
    )

    setEditTipoContrato(contrato.tipo || 'normal')
    setEditPrazoMeses(contrato.prazo_meses || 12)

    const sem =
      contrato.valor_semanal !== undefined && contrato.valor_semanal !== null
        ? contrato.valor_semanal
        : contrato.valor_diario
          ? Number((contrato.valor_diario * 7).toFixed(2))
          : 245
    setEditValorSemanal(sem)

    if (contrato.dia_pagamento_semana) {
      setEditDiaSemana(contrato.dia_pagamento_semana)
    } else if (cleanInicio) {
      const daysMap: Array<'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'> = [
        'DOM',
        'SEG',
        'TER',
        'QUA',
        'QUI',
        'SEX',
        'SAB',
      ]
      const dt = new Date(cleanInicio)
      setEditDiaSemana(daysMap[dt.getUTCDay()] || 'SEG')
    } else {
      setEditDiaSemana('SEG')
    }

    setEditModalOpen(true)
  }

  const handleSaveEditContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractToEdit || !editLocatarioNome.trim() || !editDataInicio) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setSavingEditContract(true)
    try {
      const parsedComissao = editComissaoPercentual.trim()
        ? Number(editComissaoPercentual.replace(',', '.'))
        : 0

      const payload: any = {
        locatario_nome: editLocatarioNome.trim(),
        locatario_documento: editLocatarioDoc.trim(),
        locatario_telefone: editLocatarioTel.trim(),
        tipo: editTipoContrato,
        data_inicio: editDataInicio,
        valor_semanal: Number(editValorSemanal),
        valor_diario: Number((Number(editValorSemanal) / 7).toFixed(2)),
        dia_pagamento_semana: editDiaSemana,
        comissao_percentual: parsedComissao > 0 ? parsedComissao : 0,
        percentual_comissao: parsedComissao > 0 ? parsedComissao : 0,
        observacoes: editObservacoes.trim(),
      }

      if (editTipoContrato === 'plano_conquista') {
        payload.prazo_meses = Number(editPrazoMeses)
      } else {
        payload.prazo_meses = null
      }

      payload.data_entrega = editDataEntrega || ''

      await contratosService.update(contractToEdit.id, payload)
      toast.success('Contrato atualizado com sucesso!')
      setEditModalOpen(false)
      setContractToEdit(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar contrato')
    } finally {
      setSavingEditContract(false)
    }
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
              {moto.data_compra && <> • Compra/Honda: {formatDateDisplay(moto.data_compra)}</>}
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

      {/* Tabs: Mapa de Locação, Contratos e Caixa da Moto */}
      <Tabs defaultValue="ocupacao" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="ocupacao">Mapa Locação</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
          <TabsTrigger value="caixa">Caixa Individual</TabsTrigger>
        </TabsList>

        {/* Tab 1: Mapa de Locação Anual */}
        <TabsContent value="ocupacao" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Mapa de Locação Anual — {selectedYear}
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
                          Início: {formatDateDisplay(contrato.data_inicio)}
                          {contrato.prazo_meses ? ` • Prazo: ${contrato.prazo_meses} meses` : ''}
                          {contrato.data_entrega ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {contrato.tipo === 'plano_conquista'
                                ? ` • Fim / Quitação: ${formatDateDisplay(contrato.data_entrega)}`
                                : ` • Fim do contrato: ${formatDateDisplay(contrato.data_entrega)}`}
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

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(contrato)}
                          title="Editar contrato"
                          aria-label="Editar contrato"
                          className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

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
                          {formatDateDisplay(item.data)} • {item.categoria || 'Geral'} • Forma:{' '}
                          {item.forma_pagamento || 'PIX'}
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

      {/* Edit Contract Modal */}
      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) setContractToEdit(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contrato de Locação</DialogTitle>
            <DialogDescription>
              Atualize locatário, modalidade, prazos, datas ou valor deste contrato.
            </DialogDescription>
          </DialogHeader>

          {contractToEdit && (
            <form onSubmit={handleSaveEditContract} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editLocatario">Nome Completo do Locatário *</Label>
                <Input
                  id="editLocatario"
                  value={editLocatarioNome}
                  onChange={(e) => setEditLocatarioNome(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="editCpf">CPF / Documento</Label>
                  <Input
                    id="editCpf"
                    value={editLocatarioDoc}
                    onChange={(e) => setEditLocatarioDoc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTel">Telefone / WhatsApp</Label>
                  <Input
                    id="editTel"
                    value={editLocatarioTel}
                    onChange={(e) => setEditLocatarioTel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="editTipo">Tipo de Contrato</Label>
                  <Select
                    value={editTipoContrato}
                    onValueChange={(val: TipoLocacao) => setEditTipoContrato(val)}
                  >
                    <SelectTrigger id="editTipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Locação Normal (Recorrente)</SelectItem>
                      <SelectItem value="plano_conquista">Plano Conquista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editDataInicio">Data de Início *</Label>
                  <Input
                    id="editDataInicio"
                    type="date"
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDiaPagamento">Dia de Pagamento Semanal no Painel Semana</Label>
                <Select
                  value={editDiaSemana}
                  onValueChange={(val: DiaSemana) => setEditDiaSemana(val)}
                >
                  <SelectTrigger id="editDiaPagamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEG">SEG — Segunda-feira</SelectItem>
                    <SelectItem value="TER">TER — Terça-feira</SelectItem>
                    <SelectItem value="QUA">QUA — Quarta-feira</SelectItem>
                    <SelectItem value="QUI">QUI — Quinta-feira</SelectItem>
                    <SelectItem value="SEX">SEX — Sexta-feira</SelectItem>
                    <SelectItem value="SAB">SAB — Sábado</SelectItem>
                    <SelectItem value="DOM">DOM — Domingo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editTipoContrato === 'plano_conquista' ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="editPrazo">Prazo (Meses)</Label>
                      <Input
                        id="editPrazo"
                        type="number"
                        min={1}
                        value={editPrazoMeses}
                        onChange={(e) => setEditPrazoMeses(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editDataEntrega">Data de Fim de Contrato</Label>
                      <Input
                        id="editDataEntrega"
                        type="date"
                        value={editDataEntrega}
                        onChange={(e) => setEditDataEntrega(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <Label htmlFor="editDataEntregaNormal">Data de Fim de Contrato (Opcional)</Label>
                  <Input
                    id="editDataEntregaNormal"
                    type="date"
                    value={editDataEntrega}
                    onChange={(e) => setEditDataEntrega(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deixe vazio para contratos contínuos ou preencha para estipular término.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="editValorSemanal">Valor Semanal de Aluguel (R$)</Label>
                <Input
                  id="editValorSemanal"
                  type="number"
                  step="0.01"
                  min={1}
                  value={editValorSemanal}
                  onChange={(e) => setEditValorSemanal(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200/80 dark:border-purple-900/50">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="editComissaoPercentual"
                    className="text-purple-950 dark:text-purple-200 font-semibold"
                  >
                    Comissão (%) — opcional
                  </Label>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded">
                    Opcional
                  </span>
                </div>
                <Input
                  id="editComissaoPercentual"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 10 ou 10,5"
                  value={editComissaoPercentual}
                  onChange={(e) => setEditComissaoPercentual(e.target.value)}
                  className="bg-white dark:bg-slate-900"
                />
                <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80">
                  Se preenchido, toda receita deste contrato gerará automaticamente uma despesa de
                  comissão no caixa com este percentual. Se vazio, nada é gerado.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false)
                    setContractToEdit(null)
                  }}
                  disabled={savingEditContract}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingEditContract}>
                  {savingEditContract ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                    {formatDateDisplay(contractToDelete.data_inicio)}
                  </span>
                </div>
                {contractToDelete.data_entrega && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Data Fim / Término:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDateDisplay(contractToDelete.data_entrega)}
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
                  <strong>Atenção:</strong> A exclusão é irreversível e definitiva. Todos os valores
                  a receber vinculados e registros deste contrato serão apagados permanentemente. Se
                  a moto estiver locada por este contrato, ela voltará automaticamente para{' '}
                  <strong>Disponível</strong>. Se o contrato foi apenas encerrado no prazo, use
                  &quot;Finalizar Contrato&quot;.
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
