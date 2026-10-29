import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  KeyRound,
  Plus,
  Bike,
  Calendar,
  User,
  Clock,
  Trash2,
  AlertTriangle,
  Pencil,
  ChevronDown,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { contratosService } from '@/services/contratos'
import { motosService } from '@/services/motos'
import { recebimentosService } from '@/services/recebimentos'
import { FinalizeContractModal } from '@/components/FinalizeContractModal'
import { MotoCardButton } from '@/components/MotoSelectorGrid'
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'
import { Contrato, Moto, TipoLocacao } from '@/types/database'

export default function Rentals() {
  const [searchParams] = useSearchParams()
  const defaultMotoId = searchParams.get('motoId') || ''

  const [contratos, setContratos] = useState<Contrato[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  // New / Edit Contract Dialog
  const [contractModalOpen, setContractModalOpen] = useState(Boolean(defaultMotoId))
  const [editingContract, setEditingContract] = useState<Contrato | null>(null)
  const [motoSelected, setMotoSelected] = useState<string>(defaultMotoId)
  const [locatarioNome, setLocatarioNome] = useState('')
  const [locatarioDoc, setLocatarioDoc] = useState('')
  const [locatarioTel, setLocatarioTel] = useState('')
  const [tipoContrato, setTipoContrato] = useState<TipoLocacao>('normal')
  const [dataInicio, setDataInicio] = useState(getTodayLocalDate())
  const [diaSemana, setDiaSemana] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'>(
    'SEG',
  )
  const [prazoMeses, setPrazoMeses] = useState<number>(12)
  const [dataEntrega, setDataEntrega] = useState('')
  const [dataFimContratoManual, setDataFimContratoManual] = useState(false)
  const [comissaoPercentual, setComissaoPercentual] = useState<string>('')
  const [valorDiario, setValorDiario] = useState<number>(35)
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Finalize contract dialog with custom end date
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [contractToFinalize, setContractToFinalize] = useState<Contrato | null>(null)

  // Delete contract dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<Contrato | null>(null)
  const [deletingContract, setDeletingContract] = useState(false)

  const loadData = async () => {
    try {
      const [c, m] = await Promise.all([contratosService.getAll(), motosService.getAll()])
      setContratos(c)
      setMotos(m)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-populate weekly value when moto is selected
  const [valorSemanalContrato, setValorSemanalContrato] = useState<number>(245)

  // Calculate projected end date (months ahead)
  const calculateEndDate = (startDate: string, months: number): string => {
    if (!startDate || !months) return ''
    try {
      const [yearStr, monthStr, dayStr] = startDate.split('-')
      const y = parseInt(yearStr, 10)
      const m = parseInt(monthStr, 10) - 1
      const d = parseInt(dayStr, 10)
      // Ajuste para fim de mês se necessário (ex: 31 de janeiro + 1 mês)
      const targetDate = new Date(y, m + months, d)
      const resY = targetDate.getFullYear()
      const resM = String(targetDate.getMonth() + 1).padStart(2, '0')
      const resD = String(targetDate.getDate()).padStart(2, '0')
      return `${resY}-${resM}-${resD}`
    } catch {
      return ''
    }
  }

  const [dadosLocatarioOpen, setDadosLocatarioOpen] = useState(false)

  const handleOpenNewContract = (motoId?: string) => {
    setEditingContract(null)
    const targetMotoId =
      motoId || defaultMotoId || motos.find((m) => m.status === 'disponivel')?.id || ''
    setMotoSelected(targetMotoId)
    setLocatarioNome('')
    setLocatarioDoc('')
    setLocatarioTel('')
    setComissaoPercentual('')
    setObservacoes('')
    setDadosLocatarioOpen(false)
    const today = getTodayLocalDate()
    setDataInicio(today)

    const found = motos.find((m) => m.id === targetMotoId)
    const sem =
      found?.valor_semanal !== undefined && found?.valor_semanal !== null
        ? found.valor_semanal
        : found?.valor_diario
          ? Number((found.valor_diario * 7).toFixed(2))
          : 245
    setValorSemanalContrato(sem)
    setValorDiario(Number((sem / 7).toFixed(2)))
    const tipo = found?.tipo_locacao_padrao || 'normal'
    setTipoContrato(tipo)
    setPrazoMeses(12)
    // Para locação NORMAL, preencher automaticamente 1 mês à frente da data de início
    // Para Plano Conquista, preencher com o prazo (12 meses)
    setDataEntrega(
      tipo === 'plano_conquista' ? calculateEndDate(today, 12) : calculateEndDate(today, 1),
    )
    setDataFimContratoManual(false)

    // Derive dia da semana
    const daysMap: Array<'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'> = [
      'DOM',
      'SEG',
      'TER',
      'QUA',
      'QUI',
      'SEX',
      'SAB',
    ]
    const dt = new Date(today)
    setDiaSemana(daysMap[dt.getUTCDay()] || 'SEG')

    setContractModalOpen(true)
  }

  const handleOpenEditContract = (contrato: Contrato) => {
    setEditingContract(contrato)
    setMotoSelected(contrato.moto)
    const hasLocatarioData = Boolean(
      contrato.locatario_nome?.trim() ||
      contrato.locatario_documento?.trim() ||
      contrato.locatario_telefone?.trim(),
    )
    setDadosLocatarioOpen(hasLocatarioData)
    setLocatarioNome(contrato.locatario_nome || '')
    setLocatarioDoc(contrato.locatario_documento || '')
    setLocatarioTel(contrato.locatario_telefone || '')
    const comVal = contrato.comissao_percentual ?? contrato.percentual_comissao
    setComissaoPercentual(
      comVal !== undefined && comVal !== null && comVal > 0 ? String(comVal) : '',
    )
    setObservacoes(contrato.observacoes || '')

    const cleanInicio = contrato.data_inicio
      ? contrato.data_inicio.split('T')[0].split(' ')[0]
      : getTodayLocalDate()
    setDataInicio(cleanInicio)

    const cleanEntrega = contrato.data_entrega
      ? contrato.data_entrega.split('T')[0].split(' ')[0]
      : ''
    setDataEntrega(cleanEntrega)
    setDataFimContratoManual(Boolean(cleanEntrega))

    setTipoContrato(contrato.tipo || 'normal')
    setPrazoMeses(contrato.prazo_meses || 12)

    const sem =
      contrato.valor_semanal !== undefined && contrato.valor_semanal !== null
        ? contrato.valor_semanal
        : contrato.valor_diario
          ? Number((contrato.valor_diario * 7).toFixed(2))
          : 245
    setValorSemanalContrato(sem)
    setValorDiario(Number((sem / 7).toFixed(2)))

    if (contrato.dia_pagamento_semana) {
      setDiaSemana(contrato.dia_pagamento_semana)
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
      setDiaSemana(daysMap[dt.getUTCDay()] || 'SEG')
    } else {
      setDiaSemana('SEG')
    }

    setContractModalOpen(true)
  }

  const handleMotoChange = (motoId: string) => {
    setMotoSelected(motoId)
    const found = motos.find((m) => m.id === motoId)
    if (found) {
      const sem =
        found.valor_semanal !== undefined && found.valor_semanal !== null
          ? found.valor_semanal
          : found.valor_diario
            ? Number((found.valor_diario * 7).toFixed(2))
            : 245
      setValorSemanalContrato(sem)
      setValorDiario(Number((sem / 7).toFixed(2)))
      setTipoContrato(found.tipo_locacao_padrao)
      if (!dataFimContratoManual) {
        if (found.tipo_locacao_padrao === 'plano_conquista') {
          setDataEntrega(calculateEndDate(dataInicio, prazoMeses))
        } else {
          setDataEntrega(calculateEndDate(dataInicio, 1))
        }
      }
    }
  }

  const handleTipoContratoChange = (newTipo: TipoLocacao) => {
    setTipoContrato(newTipo)
    if (!dataFimContratoManual) {
      if (newTipo === 'plano_conquista') {
        setDataEntrega(calculateEndDate(dataInicio, prazoMeses))
      } else {
        // Se mudou para normal e não foi alterado manualmente, colocar 1 mês à frente
        setDataEntrega(calculateEndDate(dataInicio, 1))
      }
    }
  }

  const handleDataInicioChange = (newDate: string) => {
    setDataInicio(newDate)
    if (!dataFimContratoManual) {
      if (tipoContrato === 'plano_conquista') {
        setDataEntrega(calculateEndDate(newDate, prazoMeses))
      } else {
        setDataEntrega(calculateEndDate(newDate, 1))
      }
    }
  }

  const handlePrazoMesesChange = (months: number) => {
    setPrazoMeses(months)
    if (tipoContrato === 'plano_conquista' && !dataFimContratoManual) {
      setDataEntrega(calculateEndDate(dataInicio, months))
    }
  }

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoSelected || !dataInicio) {
      toast.error('Selecione a moto e a data de início')
      return
    }

    setSubmitting(true)
    try {
      const parsedComissao = comissaoPercentual.trim()
        ? Number(comissaoPercentual.replace(',', '.'))
        : 0

      const finalLocatarioNome = locatarioNome.trim()
      const payload: any = {
        moto: motoSelected,
        locatario_nome: finalLocatarioNome,
        locatario_documento: locatarioDoc.trim(),
        locatario_telefone: locatarioTel.trim(),
        tipo: tipoContrato,
        data_inicio: dataInicio,
        valor_semanal: Number(valorSemanalContrato),
        valor_diario: Number((Number(valorSemanalContrato) / 7).toFixed(2)),
        dia_pagamento_semana: diaSemana,
        comissao_percentual: parsedComissao > 0 ? parsedComissao : 0,
        percentual_comissao: parsedComissao > 0 ? parsedComissao : 0,
        observacoes: observacoes.trim(),
      }

      if (tipoContrato === 'plano_conquista') {
        payload.prazo_meses = Number(prazoMeses)
      } else {
        payload.prazo_meses = null
      }

      if (dataEntrega) {
        payload.data_entrega = dataEntrega
      } else {
        payload.data_entrega = ''
      }

      if (editingContract) {
        // Modo Edição
        await contratosService.update(editingContract.id, payload)
        toast.success('Contrato atualizado com sucesso!')
      } else {
        // Modo Criação
        payload.status = 'ativo'
        const created = await contratosService.create(payload)

        // Automatically generate first weekly installment in recebimentos
        const nextDue = new Date(new Date(dataInicio).getTime() + 7 * 86400000)
          .toISOString()
          .split('T')[0]
        await recebimentosService.create({
          moto: motoSelected,
          contrato: created.id,
          locatario_nome: finalLocatarioNome,
          data_vencimento: nextDue,
          valor: Number(valorSemanalContrato),
          status: 'em_dia',
        })

        toast.success('Contrato de locação iniciado com sucesso!')
      }

      setContractModalOpen(false)
      setEditingContract(null)
      // reset form
      setLocatarioNome('')
      setLocatarioDoc('')
      setLocatarioTel('')
      setComissaoPercentual('')
      setDataEntrega('')
      setDataFimContratoManual(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error(editingContract ? 'Erro ao atualizar contrato' : 'Erro ao cadastrar contrato')
    } finally {
      setSubmitting(false)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Aluguéis e Contratos
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe motos locadas e o histórico de contratos de cada veículo.
          </p>
        </div>
        <Button onClick={() => handleOpenNewContract()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Contrato de Locação
        </Button>
      </div>

      {/* Visão direta: Duas colunas por Moto (Motos à esquerda e Contratos em quadradinhos à direita) */}
      {motos.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bike className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
              Nenhuma moto cadastrada ainda
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Cadastre sua primeira moto para gerenciar aluguéis e gerar contratos.
            </p>
            <Button asChild size="sm" className="gap-2">
              <Link to="/motos/nova">
                <Plus className="w-4 h-4" />
                Cadastrar Moto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {motos.map((moto) => {
            // Contratos da moto ordenados: ativo primeiro, e por data_inicio decrescente
            const motoContratos = contratos
              .filter((c) => c.moto === moto.id)
              .sort((a, b) => {
                const aIsAtivo = a.status === 'ativo' ? 1 : 0
                const bIsAtivo = b.status === 'ativo' ? 1 : 0
                if (aIsAtivo !== bIsAtivo) {
                  return bIsAtivo - aIsAtivo // Ativo primeiro
                }
                const dateA = a.data_inicio || ''
                const dateB = b.data_inicio || ''
                return dateB.localeCompare(dateA) // Mais recente primeiro
              })

            const hasActiveContract = motoContratos.some((c) => c.status === 'ativo')

            return (
              <div
                key={moto.id}
                className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch gap-3 sm:gap-4"
              >
                {/* Coluna ESQUERDA: Ícone/botão da moto com cor cadastrada, nome e placa */}
                <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col justify-between gap-2.5 pb-3 md:pb-0 md:pr-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <Link to={`/motos/${moto.id}`} className="block group">
                      <MotoCardButton
                        moto={moto}
                        isSelected={hasActiveContract}
                        onClick={() => {}}
                      />
                    </Link>

                    {/* Metadados e status da moto */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-muted-foreground">Status atual:</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold capitalize ${
                          moto.status === 'locada'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                            : moto.status === 'disponivel'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : moto.status === 'em_loja_detran'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {moto.status === 'em_loja_detran' ? 'Em Loja / Detran' : moto.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Ações da moto na coluna esquerda */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1"
                    >
                      <Link to={`/motos/${moto.id}`}>Ver Ficha</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => handleOpenNewContract(moto.id)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Contrato
                    </Button>
                  </div>
                </div>

                {/* Coluna DIREITA: Quadradinhos de contratos da moto */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {motoContratos.length === 0 ? (
                    <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center justify-center gap-2">
                      <KeyRound className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      <p className="text-xs text-muted-foreground">
                        Nenhum contrato cadastrado para esta moto.
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 h-7 px-2.5"
                        onClick={() => handleOpenNewContract(moto.id)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Criar Primeiro Contrato
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {motoContratos.map((contrato) => {
                        const isAtivo = contrato.status === 'ativo'
                        const semanal =
                          contrato.valor_semanal !== undefined && contrato.valor_semanal !== null
                            ? contrato.valor_semanal
                            : contrato.valor_diario * 7

                        return (
                          <div
                            key={contrato.id}
                            className={`relative rounded-xl p-3 flex flex-col justify-between transition-all border text-left ${
                              isAtivo
                                ? 'bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 border-emerald-500 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-500/30'
                                : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-90 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            {/* Topo do quadradinho: Locatário e Badges */}
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                                    <p
                                      className={`font-bold text-xs truncate ${
                                        contrato.locatario_nome?.trim()
                                          ? 'text-slate-900 dark:text-white'
                                          : 'text-muted-foreground italic font-normal'
                                      }`}
                                      title={contrato.locatario_nome || 'Sem locatário'}
                                    >
                                      {contrato.locatario_nome?.trim() || 'Sem locatário'}
                                    </p>
                                  </div>
                                  {contrato.locatario_telefone && (
                                    <p className="text-[10px] text-muted-foreground truncate pl-4">
                                      {contrato.locatario_telefone}
                                    </p>
                                  )}
                                </div>

                                {/* Status Badge */}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 leading-tight uppercase shrink-0 font-bold ${
                                    isAtivo
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                                      : 'bg-slate-200/70 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                  }`}
                                >
                                  {isAtivo ? 'ATIVO' : 'ENCERRADO'}
                                </Badge>
                              </div>

                              {/* Tipo de Contrato & Valor Semanal */}
                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 ${
                                    contrato.tipo === 'plano_conquista'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                                  }`}
                                >
                                  {contrato.tipo === 'plano_conquista' ? 'Conquista' : 'Normal'}
                                </Badge>
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                  R$ {semanal.toFixed(2)}
                                  <span className="text-[9px] font-normal text-muted-foreground">
                                    /sem
                                  </span>
                                </span>
                              </div>

                              {/* Período: Início e Fim */}
                              <div className="space-y-0.5 text-[10px] bg-white/70 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    Início:
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {formatDateDisplay(contrato.data_inicio)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    Fim:
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[100px] text-right">
                                    {contrato.data_entrega
                                      ? formatDateDisplay(contrato.data_entrega)
                                      : contrato.prazo_meses
                                        ? `${contrato.prazo_meses} meses`
                                        : 'Sem término'}
                                  </span>
                                </div>
                                {(contrato.comissao_percentual ?? contrato.percentual_comissao) ? (
                                  <div className="flex items-center justify-between text-[9px] text-purple-700 dark:text-purple-300 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                                    <span>Comissão:</span>
                                    <span className="font-semibold">
                                      {contrato.comissao_percentual ?? contrato.percentual_comissao}
                                      %
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Barra de Ações Compactas no rodapé do Quadradinho */}
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                              {isAtivo ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenFinalizeModal(contrato)}
                                  className="h-7 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
                                  title="Finalizar contrato com data de encerramento"
                                >
                                  Finalizar
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic px-1">
                                  Finalizado
                                </span>
                              )}

                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditContract(contrato)}
                                  title="Editar contrato"
                                  aria-label="Editar contrato"
                                  className="h-7 w-7 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-950/40"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDeleteModal(contrato)}
                                  title="Apagar contrato feito por engano"
                                  aria-label="Apagar contrato feito por engano"
                                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New / Edit Contract Modal */}
      <Dialog
        open={contractModalOpen}
        onOpenChange={(open) => {
          setContractModalOpen(open)
          if (!open) {
            setEditingContract(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? 'Editar Contrato de Locação' : 'Novo Contrato de Locação'}
            </DialogTitle>
            <DialogDescription>
              {editingContract
                ? 'Atualize os dados cadastrais, valores, datas ou tipo do contrato.'
                : 'Vincule a moto ao locatário e defina o modelo de aluguel.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContract} className="space-y-4">
            {/* Escolha da Moto por Botões-Ícone Pequenos (cor cadastrada + nome dentro) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Selecione a Moto *
                </Label>
                {motoSelected && (
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                    {(() => {
                      const sel = motos.find((m) => m.id === motoSelected)
                      return sel ? `${sel.nome || sel.modelo} (${sel.placa})` : ''
                    })()}
                  </span>
                )}
              </div>

              {editingContract ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  {(() => {
                    const sel = motos.find((m) => m.id === motoSelected)
                    return sel ? (
                      <MotoCardButton
                        moto={sel}
                        isSelected={true}
                        onClick={() => {}}
                        compact={true}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Moto vinculada</span>
                    )
                  })()}
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    A moto vinculada ao contrato não pode ser trocada na edição (se necessário, crie
                    um novo contrato).
                  </p>
                </div>
              ) : motos.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                  Nenhuma moto cadastrada.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30">
                  {motos
                    .filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
                    .map((m) => (
                      <MotoCardButton
                        key={m.id}
                        moto={m}
                        isSelected={motoSelected === m.id}
                        onClick={() => handleMotoChange(m.id)}
                        compact={true}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Item Recolhível: DADOS LOCATÁRIO (fechado por padrão) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-hidden">
              <Collapsible open={dadosLocatarioOpen} onOpenChange={setDadosLocatarioOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          DADOS LOCATÁRIO
                        </span>
                        <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {locatarioNome.trim()
                          ? locatarioNome.trim()
                          : dadosLocatarioOpen
                            ? 'aberto'
                            : 'clique para informar'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          dadosLocatarioOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 pt-1 space-y-3 border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="locatario" className="text-xs font-medium">
                          Nome do Locatário
                        </Label>
                        <span className="text-[10px] text-muted-foreground">Opcional</span>
                      </div>
                      <Input
                        id="locatario"
                        placeholder="Ex: João Silva de Almeida (ou deixe em branco)"
                        value={locatarioNome}
                        onChange={(e) => setLocatarioNome(e.target.value)}
                        className="bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cpf" className="text-xs font-medium">
                          CPF / Documento
                        </Label>
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          value={locatarioDoc}
                          onChange={(e) => setLocatarioDoc(e.target.value)}
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tel" className="text-xs font-medium">
                          Telefone / WhatsApp
                        </Label>
                        <Input
                          id="tel"
                          placeholder="(11) 90000-0000"
                          value={locatarioTel}
                          onChange={(e) => setLocatarioTel(e.target.value)}
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                <Select
                  value={tipoContrato}
                  onValueChange={(val: TipoLocacao) => handleTipoContratoChange(val)}
                >
                  <SelectTrigger id="tipoContrato">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Locação Normal (Recorrente)</SelectItem>
                    <SelectItem value="plano_conquista">Plano Conquista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Dia de Pagamento e Preço (Valor Semanal) lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="diaPagamento">Dia de Pagamento</Label>
                <Select value={diaSemana} onValueChange={(val: any) => setDiaSemana(val)}>
                  <SelectTrigger id="diaPagamento">
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
                <span className="text-[11px] text-muted-foreground block">
                  Dia de cobrança semanal no painel.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorSemanalContrato">Preço / Valor Semanal (R$)</Label>
                <Input
                  id="valorSemanalContrato"
                  type="number"
                  step="0.01"
                  min={1}
                  value={valorSemanalContrato}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setValorSemanalContrato(val)
                    setValorDiario(Number((val / 7).toFixed(2)))
                  }}
                  required
                />
                <span className="text-[11px] text-muted-foreground block">
                  Equivale a ~R$ {(valorSemanalContrato / 7).toFixed(2)}/dia.
                </span>
              </div>
            </div>

            {tipoContrato === 'plano_conquista' ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="prazo">Prazo (Meses)</Label>
                    <Input
                      id="prazo"
                      type="number"
                      min={1}
                      value={prazoMeses}
                      onChange={(e) => handlePrazoMesesChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dataFimContrato">Data de Fim de Contrato</Label>
                      <span className="text-[10px] text-muted-foreground">(Opcional)</span>
                    </div>
                    <Input
                      id="dataFimContrato"
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => {
                        setDataEntrega(e.target.value)
                        setDataFimContratoManual(true)
                      }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Calculada automaticamente com base no prazo de {prazoMeses} meses. Você pode
                  ajustar ou limpar se desejar.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dataFimContratoNormal">Data de Fim de Contrato</Label>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    Opcional
                  </span>
                </div>
                <Input
                  id="dataFimContratoNormal"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => {
                    setDataEntrega(e.target.value)
                    setDataFimContratoManual(true)
                  }}
                  placeholder="dd/mm/aaaa"
                />
                <p className="text-[11px] text-muted-foreground">
                  Deixe vazio para contratos contínuos/recorrentes sem data de término definida.
                  Preencha apenas se houver uma data estipulada para devolução ou término do
                  contrato.
                </p>
              </div>
            )}

            <div className="space-y-1.5 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200/80 dark:border-purple-900/50">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="comissaoPercentual"
                  className="text-purple-950 dark:text-purple-200 font-semibold"
                >
                  Comissão (%) — opcional
                </Label>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded">
                  Opcional
                </span>
              </div>
              <Input
                id="comissaoPercentual"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 10 ou 10,5"
                value={comissaoPercentual}
                onChange={(e) => setComissaoPercentual(e.target.value)}
                className="bg-white dark:bg-slate-900"
              />
              <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80">
                Se preenchido, todo recebimento/receita deste contrato gerará automaticamente uma
                despesa de comissão no caixa com este percentual. Se em branco, nenhuma despesa de
                comissão é lançada.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setContractModalOpen(false)
                  setEditingContract(null)
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingContract
                    ? 'Salvando...'
                    : 'Cadastrando...'
                  : editingContract
                    ? 'Salvar Alterações'
                    : 'Confirmar Locação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finalize Contract Modal with Custom End Date */}
      <FinalizeContractModal
        open={finalizeModalOpen}
        onOpenChange={setFinalizeModalOpen}
        contrato={contractToFinalize}
        moto={motos.find((m) => m.id === contractToFinalize?.moto)}
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
              <span>Apagar Contrato Feito por Engano</span>
            </DialogTitle>
            <DialogDescription>
              Esta ação removerá definitivamente o contrato do sistema. Use apenas para cadastros
              feitos por engano ou com erros.
            </DialogDescription>
          </DialogHeader>

          {contractToDelete && (
            <div className="space-y-3 py-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">Locatário:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">
                    {contractToDelete.locatario_nome?.trim() || 'Sem locatário'}
                  </span>
                </div>
                {(() => {
                  const moto = motos.find((m) => m.id === contractToDelete.moto)
                  return (
                    moto && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Moto / Placa:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {moto.nome || moto.modelo} —{' '}
                          <span className="font-mono">{moto.placa}</span>
                        </span>
                      </div>
                    )
                  )
                })()}
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
                  a receber (parcelas de recebimento) e registros gerados por este contrato serão
                  apagados permanentemente. Se o contrato estiver ativo, a moto voltará
                  automaticamente para o status <strong>Disponível</strong>.
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
    </div>
  )
}
