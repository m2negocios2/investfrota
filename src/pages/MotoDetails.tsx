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
  Circle,
  CircleCheck,
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
import { Checkbox } from '@/components/ui/checkbox'
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

  // Venda e Cessão modals
  const [vendaModalOpen, setVendaModalOpen] = useState(false)
  const [vendaConfirmDialogOpen, setVendaConfirmDialogOpen] = useState(false)
  const [vendaData, setVendaData] = useState(getTodayLocalDate())
  const [vendaDataFimLocacao, setVendaDataFimLocacao] = useState('')
  const [vendaValor, setVendaValor] = useState('')
  const [vendaComprador, setVendaComprador] = useState('')
  const [vendaFormaRecebimento, setVendaFormaRecebimento] = useState<
    'pago_agora' | 'aguardando_recebimento'
  >('pago_agora')
  const [vendaFormaPagamento, setVendaFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
  >('pix')
  const [vendaObservacao, setVendaObservacao] = useState('')
  const [submittingVenda, setSubmittingVenda] = useState(false)

  const [cessaoModalOpen, setCessaoModalOpen] = useState(false)
  const [cessaoData, setCessaoData] = useState(getTodayLocalDate())
  const [cessaoLocatario, setCessaoLocatario] = useState('')
  const [cessaoObservacao, setCessaoObservacao] = useState('')
  const [submittingCessao, setSubmittingCessao] = useState(false)

  const [desfazerModalOpen, setDesfazerModalOpen] = useState(false)
  const [submittingDesfazer, setSubmittingDesfazer] = useState(false)

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
  const [editIsIndefinido, setEditIsIndefinido] = useState(false)
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

  // Símbolos dos selos de status: Locada = círculo com check (CircleCheck), Disponível = círculo vazio (Circle)
  const statusBadgeConfig: Record<string, { label: string; icon: typeof Bike }> = {
    disponivel: { label: 'Disponível', icon: Circle },
    locada: { label: 'Locada', icon: CircleCheck },
    manutencao: { label: 'Em Manutenção', icon: Wrench },
    em_loja_detran: { label: 'Em Loja/Detran', icon: Clock },
    vendida: { label: 'VENDIDA', icon: CircleCheck },
    cedida: { label: 'CEDIDA', icon: CircleCheck },
  }
  const statusBadge = statusBadgeConfig[moto.status] || {
    label: moto.status,
    icon: Bike,
  }
  const StatusIcon = statusBadge.icon

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

  const isSaidaFinal = moto.status === 'vendida' || moto.status === 'cedida'
  const activePlanoConquista = contratos.find(
    (c) => c.status === 'ativo' && c.tipo === 'plano_conquista',
  )

  const handleOpenVendaModal = () => {
    setVendaData(getTodayLocalDate())
    setVendaDataFimLocacao(
      moto.data_fim_locacao ? moto.data_fim_locacao.split('T')[0].split(' ')[0] : '',
    )
    setVendaValor('')
    setVendaComprador(activeContract?.locatario_nome || '')
    setVendaFormaRecebimento('pago_agora')
    setVendaFormaPagamento('pix')
    setVendaObservacao('')
    setVendaModalOpen(true)
  }

  const handleOpenVendaConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendaValor || Number(vendaValor) <= 0) {
      toast.error('Informe um valor de venda válido.')
      return
    }
    if (!vendaComprador.trim()) {
      toast.error('Informe o nome do comprador.')
      return
    }
    setVendaConfirmDialogOpen(true)
  }

  const handleExecuteVenda = async () => {
    setSubmittingVenda(true)
    try {
      await motosService.registrarVenda({
        motoId: moto.id,
        data: vendaData,
        dataFimLocacao: vendaDataFimLocacao.trim() || undefined,
        valor: Number(vendaValor),
        comprador: vendaComprador.trim(),
        formaRecebimento: vendaFormaRecebimento,
        formaPagamento: vendaFormaPagamento,
        observacao: vendaObservacao.trim(),
      })
      toast.success(
        vendaFormaRecebimento === 'pago_agora'
          ? 'Venda registrada e receita lançada no Caixa com sucesso!'
          : 'Venda registrada com sucesso! Conta a receber gerada.',
      )
      setVendaConfirmDialogOpen(false)
      setVendaModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar venda da moto')
    } finally {
      setSubmittingVenda(false)
    }
  }

  const handleOpenCessaoModal = () => {
    if (!activePlanoConquista) {
      toast.error(
        'A cessão só pode ser realizada para motos com contrato do tipo Plano Conquista ativo.',
      )
      return
    }
    setCessaoData(getTodayLocalDate())
    setCessaoLocatario(activePlanoConquista.locatario_nome || '')
    setCessaoObservacao('')
    setCessaoModalOpen(true)
  }

  const handleConfirmCessao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cessaoLocatario.trim()) {
      toast.error('Informe o nome do locatário beneficiário da cessão.')
      return
    }
    setSubmittingCessao(true)
    try {
      await motosService.registrarCessao({
        motoId: moto.id,
        data: cessaoData,
        locatarioNome: cessaoLocatario.trim(),
        contratoId: activePlanoConquista?.id,
        observacao: cessaoObservacao.trim(),
      })
      toast.success('Cessão da moto no Plano Conquista registrada com sucesso!')
      setCessaoModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar cessão da moto')
    } finally {
      setSubmittingCessao(false)
    }
  }

  const handleConfirmDesfazer = async () => {
    setSubmittingDesfazer(true)
    try {
      await motosService.desfazerOperacaoSaida(moto.id)
      toast.success('Operação de saída desfeita! A moto voltou ao status disponível.')
      setDesfazerModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao desfazer operação de saída')
    } finally {
      setSubmittingDesfazer(false)
    }
  }

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
    setEditIsIndefinido(!cleanEntrega)

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
    if (!contractToEdit || !editDataInicio) {
      toast.error('Preencha a data de início do contrato')
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

  // Taxa de Locação - Nova Regra de Cálculo
  // Mede a proporção de dias em que a moto esteve locada dentro do período de referência do ano corrente.
  // Período de referência: da DATA DE COMPRA/RECEBIMENTO DA MOTO até 31/12 do ano atual.
  // Se a moto foi comprada/recebida antes do ano atual, considera o ano todo (01/01 a 31/12).
  // Se a moto foi comprada/recebida no ano atual, conta da data de compra até 31/12 do ano atual.
  // Dias locados: usa o histórico de contratos sem sobreposição (ativos contam até hoje; finalizados usam a data de fim).
  const currentYear = new Date().getFullYear()
  const todayStr = getTodayLocalDate()

  let taxaLocacaoData: {
    taxa: number
    diasLocados: number
    totalDiasPeriodo: number
    dataInicioRef: string
    dataFimRef: string
  } | null = null

  if (moto.data_compra) {
    const rawCompraMatch = moto.data_compra.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (rawCompraMatch) {
      const [, cAno, cMes, cDia] = rawCompraMatch
      const anoCompra = parseInt(cAno, 10)

      let refInicioStr = `${currentYear}-01-01`
      if (anoCompra === currentYear) {
        refInicioStr = `${cAno}-${cMes}-${cDia}`
      } else if (anoCompra > currentYear) {
        // Compra com data futura ao ano atual
        refInicioStr = `${cAno}-${cMes}-${cDia}`
      }

      // Se a moto teve fim de operação (data_fim_locacao ou data_saida),
      // a data final do período de referência de locação não deve ultrapassar o fim da operação.
      let refFimStr = `${currentYear}-12-31`
      const dataFimOperacao = moto.data_fim_locacao || moto.data_saida
      if (dataFimOperacao) {
        const rawFimOperacao = dataFimOperacao.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (rawFimOperacao) {
          const anoFimOperacao = parseInt(rawFimOperacao[1], 10)
          if (anoFimOperacao === currentYear && rawFimOperacao[0] < refFimStr) {
            refFimStr = rawFimOperacao[0]
          }
        }
      }

      if (refInicioStr <= refFimStr) {
        // Gerar conjunto de dias do período de referência
        const refStart = new Date(
          parseInt(refInicioStr.slice(0, 4), 10),
          parseInt(refInicioStr.slice(5, 7), 10) - 1,
          parseInt(refInicioStr.slice(8, 10), 10),
        )
        const refEnd = new Date(
          parseInt(refFimStr.slice(0, 4), 10),
          parseInt(refFimStr.slice(5, 7), 10) - 1,
          parseInt(refFimStr.slice(8, 10), 10),
        )

        // Contratos válidos no período
        const diasLocadosSet = new Set<string>()

        contratos.forEach((contrato) => {
          if (!contrato.data_inicio) return
          const rawInicio = contrato.data_inicio.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!rawInicio) return
          const startStr = rawInicio[0]

          let endStr: string
          if (contrato.data_entrega) {
            const rawEntrega = contrato.data_entrega.match(/^(\d{4})-(\d{2})-(\d{2})/)
            endStr = rawEntrega ? rawEntrega[0] : rawInicio[0]
          } else if (contrato.status === 'ativo') {
            endStr = todayStr
          } else {
            const rawUpdated = (contrato.updated || contrato.created || '').match(
              /^(\d{4})-(\d{2})-(\d{2})/,
            )
            endStr = rawUpdated ? rawUpdated[0] : startStr
          }

          // Se a data de fim for anterior à data de início, ajusta
          if (endStr < startStr) {
            endStr = startStr
          }

          // Interseção entre [startStr, endStr] e [refInicioStr, refFimStr]
          const effectiveStart = startStr > refInicioStr ? startStr : refInicioStr
          const effectiveEnd = endStr < refFimStr ? endStr : refFimStr

          if (effectiveStart <= effectiveEnd) {
            const cur = new Date(
              parseInt(effectiveStart.slice(0, 4), 10),
              parseInt(effectiveStart.slice(5, 7), 10) - 1,
              parseInt(effectiveStart.slice(8, 10), 10),
            )
            const curEnd = new Date(
              parseInt(effectiveEnd.slice(0, 4), 10),
              parseInt(effectiveEnd.slice(5, 7), 10) - 1,
              parseInt(effectiveEnd.slice(8, 10), 10),
            )

            while (cur <= curEnd) {
              const y = cur.getFullYear()
              const m = String(cur.getMonth() + 1).padStart(2, '0')
              const d = String(cur.getDate()).padStart(2, '0')
              diasLocadosSet.add(`${y}-${m}-${d}`)
              cur.setDate(cur.getDate() + 1)
            }
          }
        })

        // Total de dias no período de referência
        const diffMs = refEnd.getTime() - refStart.getTime()
        const totalDias = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

        const diasLocadosCount = diasLocadosSet.size
        const taxa = totalDias > 0 ? (diasLocadosCount / totalDias) * 100 : 0

        taxaLocacaoData = {
          taxa: Math.round(taxa),
          diasLocados: diasLocadosCount,
          totalDiasPeriodo: totalDias,
          dataInicioRef: refInicioStr,
          dataFimRef: refFimStr,
        }
      }
    }
  }

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

        <div className="flex items-center gap-2 flex-wrap">
          {!isSaidaFinal && (
            <>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenVendaModal}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
              >
                Registrar Venda
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCessaoModal}
                className="text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800"
              >
                Registrar Cessão (Plano Conquista)
              </Button>
            </>
          )}
          {isSaidaFinal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDesfazerModalOpen(true)}
              className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800"
            >
              Desfazer Operação de Saída
            </Button>
          )}
        </div>
      </div>

      {/* Banner de Operação Final (Vendida ou Cedida) */}
      {isSaidaFinal && (
        <div className="p-4 rounded-xl border border-slate-300 bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-xs"
              >
                {moto.status === 'vendida' ? 'MOTO VENDIDA' : 'MOTO CEDIDA (PLANO CONQUISTA)'}
              </Badge>
              {moto.data_saida && (
                <span className="text-xs text-muted-foreground">
                  Data da venda/operação: {formatDateDisplay(moto.data_saida)}
                </span>
              )}
              {moto.data_fim_locacao && (
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                  Fim da locação: {formatDateDisplay(moto.data_fim_locacao)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {moto.status === 'vendida' ? (
                <>
                  Destinatário: <strong>{moto.destinatario_saida || 'Comprador'}</strong> • Valor:
                  R$ {(moto.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                  • Recebimento:{' '}
                  {moto.forma_recebimento_venda === 'pago_agora'
                    ? 'Pago na hora (no Caixa)'
                    : 'Aguardando Recebimento (Contas a Receber)'}
                </>
              ) : (
                <>
                  Locatário beneficiário: <strong>{moto.destinatario_saida || 'Locatário'}</strong>{' '}
                  (Quitação do Plano Conquista — sem receita lançada).
                </>
              )}{' '}
              O bem foi removido do Ativo Imobilizado e não figura mais na frota operacional.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDesfazerModalOpen(true)}
            className="shrink-0 text-xs"
          >
            Desfazer Saída
          </Button>
        </div>
      )}

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
                  moto.status === 'vendida' || moto.status === 'cedida'
                    ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    : moto.status === 'locada'
                      ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'
                      : moto.status === 'disponivel'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : moto.status === 'em_loja_detran'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {moto.status === 'vendida'
                ? `Vendida para ${moto.destinatario_saida || 'comprador'}`
                : moto.status === 'cedida'
                  ? `Cedida para ${moto.destinatario_saida || 'locatário'} (Plano Conquista)`
                  : activeContract
                    ? activeContract.locatario_nome?.trim()
                      ? `Locada para ${activeContract.locatario_nome}`
                      : 'Locada (sem locatário cadastrado)'
                    : moto.status === 'em_loja_detran'
                      ? 'Veículo em loja / aguardando Detran'
                      : 'Nenhum contrato ativo no momento'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Taxa de Locação ({currentYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taxaLocacaoData ? (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {taxaLocacaoData.taxa}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taxaLocacaoData.diasLocados} de {taxaLocacaoData.totalDiasPeriodo} dias locados
                  no período
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Sem data de compra/recebimento cadastrada
                </p>
              </>
            )}
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
                          <span
                            className={`font-semibold ${
                              contrato.locatario_nome?.trim()
                                ? 'text-slate-900 dark:text-white'
                                : 'text-muted-foreground italic font-normal'
                            }`}
                          >
                            {contrato.locatario_nome?.trim() || 'Sem locatário'}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="editLocatario">Nome do Locatário</Label>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </div>
                <Input
                  id="editLocatario"
                  placeholder="Ex: João Silva de Almeida (ou deixe em branco)"
                  value={editLocatarioNome}
                  onChange={(e) => setEditLocatarioNome(e.target.value)}
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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="editDataEntrega">Data de Fim</Label>
                        <div className="flex items-center gap-1.5 cursor-pointer select-none bg-amber-100/80 dark:bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                          <Checkbox
                            id="editIndefinidoConquista"
                            checked={editIsIndefinido}
                            onCheckedChange={(checked) => {
                              const val = Boolean(checked)
                              setEditIsIndefinido(val)
                              if (val) setEditDataEntrega('')
                            }}
                            className="h-3.5 w-3.5 border-amber-700 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
                          />
                          <label
                            htmlFor="editIndefinidoConquista"
                            className="text-[10px] font-black tracking-wide text-amber-950 dark:text-amber-100 cursor-pointer uppercase"
                          >
                            INDEFINIDO
                          </label>
                        </div>
                      </div>
                      <Input
                        id="editDataEntrega"
                        type="date"
                        value={editDataEntrega}
                        disabled={editIsIndefinido}
                        onChange={(e) => {
                          setEditDataEntrega(e.target.value)
                          if (e.target.value) setEditIsIndefinido(false)
                        }}
                        className={editIsIndefinido ? 'opacity-40 cursor-not-allowed' : ''}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="editDataEntregaNormal">Data de Fim de Contrato</Label>
                    <div className="flex items-center gap-1.5 cursor-pointer select-none bg-blue-100/80 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800">
                      <Checkbox
                        id="editIndefinidoNormal"
                        checked={editIsIndefinido}
                        onCheckedChange={(checked) => {
                          const val = Boolean(checked)
                          setEditIsIndefinido(val)
                          if (val) setEditDataEntrega('')
                        }}
                        className="h-4 w-4 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <label
                        htmlFor="editIndefinidoNormal"
                        className="text-[11px] font-black tracking-wide text-blue-950 dark:text-blue-100 cursor-pointer uppercase"
                      >
                        INDEFINIDO
                      </label>
                    </div>
                  </div>
                  <Input
                    id="editDataEntregaNormal"
                    type="date"
                    value={editDataEntrega}
                    disabled={editIsIndefinido}
                    onChange={(e) => {
                      setEditDataEntrega(e.target.value)
                      if (e.target.value) setEditIsIndefinido(false)
                    }}
                    className={editIsIndefinido ? 'opacity-40 cursor-not-allowed' : ''}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {editIsIndefinido
                      ? 'Contrato sem data de término estipulada (INDEFINIDO).'
                      : 'Deixe vazio ou marque INDEFINIDO para contratos contínuos/recorrentes.'}
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
                    {contractToDelete.locatario_nome?.trim() || 'Sem locatário'}
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

      {/* Modal Registrar Venda */}
      <Dialog open={vendaModalOpen} onOpenChange={setVendaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Venda da Moto</DialogTitle>
            <DialogDescription>
              A moto será retirada da frota operacional, sairá do Ativo Imobilizado e terá o
              recebimento lançado conforme a forma escolhida.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenVendaConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vendaData">Data da Venda</Label>
                <Input
                  id="vendaData"
                  type="date"
                  required
                  value={vendaData}
                  onChange={(e) => setVendaData(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendaDataFimLocacao">
                  Fim da locação{' '}
                  <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="vendaDataFimLocacao"
                  type="date"
                  placeholder="Data em que parou de alugar"
                  value={vendaDataFimLocacao}
                  onChange={(e) => setVendaDataFimLocacao(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Se a moto parou de ser alugada antes da venda, preencha a data de fim da locação para
              que os relatórios (Lucro Médio Moto, Lucro e Payback) usem o período correto de
              operação. Se deixar em branco, usará a data da venda.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="vendaValor">Valor da Venda (R$)</Label>
              <Input
                id="vendaValor"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Ex: 14500.00"
                value={vendaValor}
                onChange={(e) => setVendaValor(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendaComprador">Comprador</Label>
              <Input
                id="vendaComprador"
                required
                placeholder="Nome do comprador"
                value={vendaComprador}
                onChange={(e) => setVendaComprador(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Como será o recebimento do valor?</Label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Opção 1: Pago agora */}
                <button
                  type="button"
                  onClick={() => setVendaFormaRecebimento('pago_agora')}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3 ${
                    vendaFormaRecebimento === 'pago_agora'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      vendaFormaRecebimento === 'pago_agora'
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'border-slate-400 bg-transparent'
                    }`}
                  >
                    {vendaFormaRecebimento === 'pago_agora' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Pago agora
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 text-[10px] font-bold py-0"
                      >
                        Entra no CAIXA
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      O dinheiro <strong>entra no CAIXA imediatamente</strong> como receita/entrada.
                      Use esta opção somente se o comprador <strong>já pagou</strong> (ex: PIX,
                      dinheiro ou transferência recebida na hora).
                    </p>
                  </div>
                </button>

                {/* Opção 2: Aguardando recebimento */}
                <button
                  type="button"
                  onClick={() => setVendaFormaRecebimento('aguardando_recebimento')}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3 ${
                    vendaFormaRecebimento === 'aguardando_recebimento'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      vendaFormaRecebimento === 'aguardando_recebimento'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-400 bg-transparent'
                    }`}
                  >
                    {vendaFormaRecebimento === 'aguardando_recebimento' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Aguardando recebimento
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/60 dark:text-blue-200 text-[10px] font-bold py-0"
                      >
                        Contas a Receber
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>NÃO entra no caixa agora</strong>. O valor vira uma{' '}
                      <strong>CONTA A RECEBER</strong> e aparece no{' '}
                      <strong>Ativo do Balanço Patrimonial</strong> até que você confirme o
                      recebimento futuro.
                    </p>
                  </div>
                </button>
              </div>

              {/* Box de alerta destacado de acordo com a seleção */}
              <div
                className={`p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                  vendaFormaRecebimento === 'pago_agora'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    vendaFormaRecebimento === 'pago_agora'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                />
                <div className="leading-relaxed">
                  {vendaFormaRecebimento === 'pago_agora' ? (
                    <>
                      <strong>Atenção:</strong> O valor será somado ao saldo do Caixa hoje. Se o
                      pagamento ainda não caiu na conta, escolha <em>"Aguardando recebimento"</em>.
                    </>
                  ) : (
                    <>
                      <strong>Atenção:</strong> Nenhum centavo entrará no saldo do Caixa hoje. O
                      crédito ficará registrado em <em>Contas a Receber</em> (Ativo) para ser
                      baixado quando o comprador pagar.
                    </>
                  )}
                </div>
              </div>
            </div>

            {vendaFormaRecebimento === 'pago_agora' && (
              <div className="space-y-1.5">
                <Label>Meio de Pagamento</Label>
                <Select
                  value={vendaFormaPagamento}
                  onValueChange={(val: any) => setVendaFormaPagamento(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="vendaObs">Observações (opcional)</Label>
              <Input
                id="vendaObs"
                placeholder="Detalhes adicionais da negociação"
                value={vendaObservacao}
                onChange={(e) => setVendaObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVendaModalOpen(false)}
                disabled={submittingVenda}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingVenda}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Avançar para Confirmação &rarr;
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação Resumida da Venda */}
      <Dialog open={vendaConfirmDialogOpen} onOpenChange={setVendaConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Confirmar Venda da Moto</span>
            </DialogTitle>
            <DialogDescription>
              Revise o resumo da operação antes de confirmar a saída definitiva da moto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-sm">
            {/* Resumo da Moto e Comprador */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moto:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {moto.nome || moto.modelo} (Placa: {moto.placa})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data da venda:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDateDisplay(vendaData)}
                </span>
              </div>
              {vendaDataFimLocacao.trim() && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fim da locação (operação):</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {formatDateDisplay(vendaDataFimLocacao)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comprador:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {vendaComprador.trim() || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-muted-foreground font-medium">Valor total da venda:</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  R${' '}
                  {Number(vendaValor || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* O QUE VAI ACONTECER COM O DINHEIRO */}
            <div
              className={`p-3.5 rounded-lg border-2 space-y-1.5 ${
                vendaFormaRecebimento === 'pago_agora'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                  : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-100'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                <span>O que vai acontecer com o dinheiro:</span>
              </div>

              {vendaFormaRecebimento === 'pago_agora' ? (
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                    &rarr; Os R${' '}
                    {Number(vendaValor || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    entrarão no CAIXA imediatamente como entrada (
                    {vendaFormaPagamento.toUpperCase()}).
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    O saldo financeiro será aumentado agora. A moto será marcada como VENDIDA e
                    sairá do Ativo Imobilizado.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                    &rarr; Os R${' '}
                    {Number(vendaValor || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ficarão em CONTAS A RECEBER até o recebimento.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Nenhum valor entrará no Caixa hoje.</strong> O crédito ficará no Ativo
                    do Balanço Patrimonial e aguardará baixa quando o comprador efetuar o pagamento.
                  </p>
                </div>
              )}
            </div>

            {vendaObservacao.trim() && (
              <p className="text-xs text-muted-foreground italic">Obs: {vendaObservacao.trim()}</p>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVendaConfirmDialogOpen(false)}
              disabled={submittingVenda}
            >
              Voltar e Ajustar
            </Button>
            <Button
              type="button"
              disabled={submittingVenda}
              onClick={handleExecuteVenda}
              className={`${
                vendaFormaRecebimento === 'pago_agora'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold`}
            >
              {submittingVenda ? 'Gravando...' : 'Confirmar e Gravar Venda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Cessão (Plano Conquista) */}
      <Dialog open={cessaoModalOpen} onOpenChange={setCessaoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Cessão (Plano Conquista)</DialogTitle>
            <DialogDescription>
              Entrega definitiva da moto ao locatário no fim do contrato Plano Conquista. Sai do
              Ativo Imobilizado e não gera receita no caixa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCessao} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cessaoData">Data da Cessão / Entrega</Label>
              <Input
                id="cessaoData"
                type="date"
                required
                value={cessaoData}
                onChange={(e) => setCessaoData(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cessaoLocatario">Locatário Beneficiário</Label>
              <Input
                id="cessaoLocatario"
                required
                placeholder="Nome do locatário"
                value={cessaoLocatario}
                onChange={(e) => setCessaoLocatario(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Pré-preenchido com o locatário do contrato Plano Conquista ativo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cessaoObs">Observações (opcional)</Label>
              <Input
                id="cessaoObs"
                placeholder="Ex: Quitação das 96 semanas do plano conquista"
                value={cessaoObservacao}
                onChange={(e) => setCessaoObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCessaoModalOpen(false)}
                disabled={submittingCessao}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingCessao}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {submittingCessao ? 'Registrando...' : 'Confirmar Cessão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Desfazer Operação de Saída */}
      <Dialog open={desfazerModalOpen} onOpenChange={setDesfazerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desfazer Operação de Saída</DialogTitle>
            <DialogDescription>
              Deseja reverter a saída desta moto? O status voltará para "Disponível", o bem voltará
              ao Ativo Imobilizado e qualquer lançamento de venda no caixa ou conta a receber
              pendente associado será cancelado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDesfazerModalOpen(false)}
              disabled={submittingDesfazer}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={submittingDesfazer}
              onClick={handleConfirmDesfazer}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submittingDesfazer ? 'Desfazendo...' : 'Sim, Desfazer Operação'}
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
