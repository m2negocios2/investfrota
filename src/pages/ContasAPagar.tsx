import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  DollarSign,
  TrendingDown,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Receipt,
  HelpCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { contasAPagarService } from '@/services/contasAPagar'
import {
  ContaAPagarComProgresso,
  ContaAPagarTipo,
  ContaAPagarPagamento,
  ItemParcela,
} from '@/types/database'
import { getTodayLocalDate, normalizeDateInput, formatDateDisplay } from '@/lib/dateUtils'
import { gerarParcelasIguais, resolverParcelasConta } from '@/lib/parcelasUtils'
import { ParcelasEditor } from '@/components/contas/ParcelasEditor'

const TIPOS_CONFIG: Record<ContaAPagarTipo, { label: string; cor: string }> = {
  financiamento: {
    label: 'Financiamento',
    cor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
  },
  consorcio: {
    label: 'Consórcio',
    cor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
  },
  parcelamento: {
    label: 'Parcelamento',
    cor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
  },
  outro: {
    label: 'Outro',
    cor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  },
}

export default function ContasAPagar() {
  const [contas, setContas] = useState<ContaAPagarComProgresso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'abertas' | 'quitadas'>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  // Expandir lista de pagamentos nos cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Modal Nova/Editar Conta
  const [contaModalOpen, setContaModalOpen] = useState(false)
  const [editingContaId, setEditingContaId] = useState<string | null>(null)
  const [formDescricao, setFormDescricao] = useState('')
  const [formCredor, setFormCredor] = useState('')
  const [formTipo, setFormTipo] = useState<ContaAPagarTipo>('financiamento')
  const [formValorTotal, setFormValorTotal] = useState<string>('')
  const [formQtdParcelas, setFormQtdParcelas] = useState<string>('')
  const [formValorParcela, setFormValorParcela] = useState<string>('')
  const [formDataInicio, setFormDataInicio] = useState(getTodayLocalDate())
  const [formDiaVencimento, setFormDiaVencimento] = useState<string>('')
  const [formObservacao, setFormObservacao] = useState('')
  const [formParcelas, setFormParcelas] = useState<ItemParcela[]>([])
  const [submittingConta, setSubmittingConta] = useState(false)

  // Modal Registrar Pagamento
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false)
  const [pagamentoConta, setPagamentoConta] = useState<ContaAPagarComProgresso | null>(null)
  const [pagNumeroParcela, setPagNumeroParcela] = useState<number>(1)
  const [pagData, setPagData] = useState(getTodayLocalDate())
  const [pagValor, setPagValor] = useState<string>('')
  const [pagObs, setPagObs] = useState('')
  const [submittingPag, setSubmittingPag] = useState(false)

  // Alerta de Exclusão de Pagamento
  const [deletePagId, setDeletePagId] = useState<string | null>(null)
  const [deletePagContaId, setDeletePagContaId] = useState<string | null>(null)

  // Alerta de Exclusão de Conta
  const [deleteContaTarget, setDeleteContaTarget] = useState<ContaAPagarComProgresso | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await contasAPagarService.getAllWithProgresso()
      setContas(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar Contas a Pagar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleExpandCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Recalcula lista de parcelas iguais (ajuste de centavos na última)
  const recalcularParcelasIguais = (
    totalStr: string,
    qtdStr: string,
    dataIni: string,
    diaVencStr?: string,
  ) => {
    const vTotal = parseFloat(totalStr.replace(',', '.'))
    const qtd = parseInt(qtdStr, 10)
    const diaV = diaVencStr ? parseInt(diaVencStr, 10) : undefined

    if (!isNaN(vTotal) && vTotal > 0 && !isNaN(qtd) && qtd > 0) {
      const lista = gerarParcelasIguais({
        valorTotal: vTotal,
        quantidadeParcelas: qtd,
        dataInicio: dataIni,
        diaVencimento: diaV,
      })
      setFormParcelas(lista)
      // O valor da parcela de referência (1ª parcela padrão)
      setFormValorParcela(lista[0]?.valor ? lista[0].valor.toFixed(2) : (vTotal / qtd).toFixed(2))
    } else {
      setFormParcelas([])
    }
  }

  // Cálculos automáticos do formulário de conta
  const handleValorTotalChange = (valStr: string) => {
    setFormValorTotal(valStr)
    recalcularParcelasIguais(valStr, formQtdParcelas, formDataInicio, formDiaVencimento)
  }

  const handleQtdParcelasChange = (valStr: string) => {
    setFormQtdParcelas(valStr)
    recalcularParcelasIguais(formValorTotal, valStr, formDataInicio, formDiaVencimento)
  }

  const handleValorParcelaChange = (valStr: string) => {
    setFormValorParcela(valStr)
  }

  const handleDataInicioChange = (valStr: string) => {
    setFormDataInicio(valStr)
    if (formParcelas.length > 0) {
      const vTotal = parseFloat(formValorTotal.replace(',', '.'))
      const qtd = parseInt(formQtdParcelas, 10)
      const diaV = formDiaVencimento ? parseInt(formDiaVencimento, 10) : undefined
      if (!isNaN(vTotal) && !isNaN(qtd)) {
        const novas = gerarParcelasIguais({
          valorTotal: vTotal,
          quantidadeParcelas: qtd,
          dataInicio: valStr,
          diaVencimento: diaV,
        })
        setFormParcelas((prev) =>
          prev.length === novas.length
            ? prev.map((p, i) => ({ ...p, data_vencimento: novas[i].data_vencimento }))
            : novas,
        )
      }
    }
  }

  const handleDiaVencimentoChange = (valStr: string) => {
    setFormDiaVencimento(valStr)
    if (formParcelas.length > 0) {
      const vTotal = parseFloat(formValorTotal.replace(',', '.'))
      const qtd = parseInt(formQtdParcelas, 10)
      const diaV = valStr ? parseInt(valStr, 10) : undefined
      if (!isNaN(vTotal) && !isNaN(qtd)) {
        const novas = gerarParcelasIguais({
          valorTotal: vTotal,
          quantidadeParcelas: qtd,
          dataInicio: formDataInicio,
          diaVencimento: diaV,
        })
        setFormParcelas((prev) =>
          prev.length === novas.length
            ? prev.map((p, i) => ({ ...p, data_vencimento: novas[i].data_vencimento }))
            : novas,
        )
      }
    }
  }

  const handleOpenNovaConta = () => {
    setEditingContaId(null)
    setFormDescricao('')
    setFormCredor('')
    setFormTipo('financiamento')
    setFormValorTotal('')
    setFormQtdParcelas('')
    setFormValorParcela('')
    setFormDataInicio(getTodayLocalDate())
    setFormDiaVencimento('')
    setFormObservacao('')
    setFormParcelas([])
    setContaModalOpen(true)
  }

  const handleOpenEditarConta = (conta: ContaAPagarComProgresso) => {
    setEditingContaId(conta.id)
    setFormDescricao(conta.descricao)
    setFormCredor(conta.credor)
    setFormTipo(conta.tipo)
    setFormValorTotal(String(conta.valor_total))
    setFormQtdParcelas(String(conta.quantidade_parcelas))
    setFormValorParcela(String(conta.valor_parcela))
    setFormDataInicio(normalizeDateInput(conta.data_inicio))
    setFormDiaVencimento(conta.dia_vencimento ? String(conta.dia_vencimento) : '')
    setFormObservacao(conta.observacao || '')
    const parcelas = resolverParcelasConta(conta)
    setFormParcelas(parcelas)
    setContaModalOpen(true)
  }

  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDescricao.trim() || !formCredor.trim()) {
      toast.error('Preencha a descrição e o credor')
      return
    }
    const vTotal = parseFloat(formValorTotal.replace(',', '.'))
    const qtd = parseInt(formQtdParcelas, 10)
    const vParcela = parseFloat(formValorParcela.replace(',', '.'))

    if (isNaN(vTotal) || vTotal <= 0) {
      toast.error('Informe um valor total válido')
      return
    }
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade de parcelas válida')
      return
    }
    if (isNaN(vParcela) || vParcela <= 0) {
      toast.error('Informe um valor de parcela válido')
      return
    }

    const diaVenc = formDiaVencimento ? parseInt(formDiaVencimento, 10) : undefined
    if (diaVenc !== undefined && (diaVenc < 1 || diaVenc > 31)) {
      toast.error('O dia de vencimento deve estar entre 1 e 31')
      return
    }

    setSubmittingConta(true)
    try {
      const parcelasParaSalvar =
        formParcelas.length === qtd
          ? formParcelas
          : gerarParcelasIguais({
              valorTotal: vTotal,
              quantidadeParcelas: qtd,
              dataInicio: formDataInicio,
              diaVencimento: diaVenc,
            })

      if (editingContaId) {
        await contasAPagarService.update(editingContaId, {
          descricao: formDescricao.trim(),
          credor: formCredor.trim(),
          tipo: formTipo,
          valor_total: vTotal,
          quantidade_parcelas: qtd,
          valor_parcela: vParcela,
          data_inicio: formDataInicio,
          dia_vencimento: diaVenc,
          observacao: formObservacao.trim() || '',
          parcelas_customizadas: parcelasParaSalvar,
        })
        toast.success('Conta a pagar atualizada!')
      } else {
        await contasAPagarService.create({
          descricao: formDescricao.trim(),
          credor: formCredor.trim(),
          tipo: formTipo,
          valor_total: vTotal,
          quantidade_parcelas: qtd,
          valor_parcela: vParcela,
          data_inicio: formDataInicio,
          dia_vencimento: diaVenc,
          observacao: formObservacao.trim() || '',
          parcelas_customizadas: parcelasParaSalvar,
        })
        toast.success('Conta a pagar cadastrada com sucesso!')
      }
      setContaModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar conta a pagar')
    } finally {
      setSubmittingConta(false)
    }
  }

  const handleOpenRegistrarPagamento = (conta: ContaAPagarComProgresso) => {
    setPagamentoConta(conta)
    const numParcela = conta.proximaParcelaNumero
    setPagNumeroParcela(numParcela)

    // Data padrão: data de vencimento da parcela selecionada (ou hoje como fallback)
    const parcelaItem = conta.parcelasCalculadas.find((p) => p.numero === numParcela)
    const dataInicial = parcelaItem?.data_vencimento
      ? normalizeDateInput(parcelaItem.data_vencimento)
      : getTodayLocalDate()
    setPagData(dataInicial)

    // Sugestão baseada no valor da parcela daquela posição específica
    const sugestao =
      conta.proximaParcelaValorSugerido > 0
        ? conta.proximaParcelaValorSugerido
        : Math.min(conta.valor_parcela, conta.saldoRestante)

    setPagValor(String(sugestao > 0 ? sugestao : conta.valor_parcela))
    setPagObs('')
    setPagamentoModalOpen(true)
  }

  const handleSavePagamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pagamentoConta) return

    const vPag = parseFloat(pagValor.replace(',', '.'))
    if (isNaN(vPag) || vPag <= 0) {
      toast.error('Informe um valor de pagamento válido')
      return
    }

    setSubmittingPag(true)
    try {
      await contasAPagarService.registrarPagamento({
        contaId: pagamentoConta.id,
        data: pagData,
        valor: vPag,
        numeroParcela: pagNumeroParcela,
        observacao: pagObs.trim(),
      })
      toast.success(
        'Pagamento registrado! Saída lançada em Dívidas com Terceiros no Fluxo de Caixa.',
      )
      setPagamentoModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar pagamento')
    } finally {
      setSubmittingPag(false)
    }
  }

  const handleConfirmDeletePagamento = async () => {
    if (!deletePagId) return
    try {
      await contasAPagarService.excluirPagamento(deletePagId)
      toast.success('Pagamento e lançamento de caixa correspondente excluídos!')
      setDeletePagId(null)
      setDeletePagContaId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir pagamento')
    }
  }

  const handleConfirmDeleteConta = async () => {
    if (!deleteContaTarget) return
    try {
      await contasAPagarService.delete(deleteContaTarget.id)
      toast.success('Conta a pagar, histórico de pagamentos e lançamentos de caixa excluídos!')
      setDeleteContaTarget(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir conta a pagar')
    }
  }

  // Filtragem
  const filteredContas = contas.filter((c) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      c.descricao.toLowerCase().includes(q) ||
      c.credor.toLowerCase().includes(q) ||
      (c.observacao || '').toLowerCase().includes(q)

    let matchStatus = true
    if (filtroStatus === 'abertas') matchStatus = !c.concluida
    if (filtroStatus === 'quitadas') matchStatus = !!c.concluida

    let matchTipo = true
    if (filtroTipo !== 'todos') matchTipo = c.tipo === filtroTipo

    return matchSearch && matchStatus && matchTipo
  })

  // Totais do Resumo
  const totalPassivo = contas.reduce((acc, c) => acc + c.valor_total, 0)
  const totalPagoGeral = contas.reduce((acc, c) => acc + c.totalPago, 0)
  const saldoDevedorGeral = contas.reduce((acc, c) => acc + c.saldoRestante, 0)
  const contasAbertasQtd = contas.filter((c) => !c.concluida).length

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-600 text-white rounded-lg shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Contas a Pagar
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gestão de dívidas, financiamentos, consórcios e parcelamentos da empresa
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={handleOpenNovaConta}
            className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4" />
            Nova Conta a Pagar
          </Button>
        </div>
      </div>

      {/* Resumo do Topo (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Total do Passivo
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-black text-slate-900 dark:text-white">
              R$ {totalPassivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Soma total das dívidas registradas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-100 dark:border-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Total Já Pago
            </span>
            <div className="p-1.5 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              R$ {totalPagoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Amortizado em saídas no caixa
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-rose-100 dark:border-rose-950">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Saldo Devedor Total
            </span>
            <div className="p-1.5 bg-rose-100/70 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded-md">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">
              R$ {saldoDevedorGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Valor pendente de quitação</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-amber-100 dark:border-amber-950">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Contas em Aberto
            </span>
            <div className="p-1.5 bg-amber-100/70 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-md">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-black text-amber-700 dark:text-amber-400">
              {contasAbertasQtd}{' '}
              <span className="text-xs font-medium text-muted-foreground">
                de {contas.length} contas
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Aguardando quitação total</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, credor (ex: Honda)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={filtroStatus} onValueChange={(val: any) => setFiltroStatus(val)}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Contas</SelectItem>
                  <SelectItem value="abertas">Em Aberto</SelectItem>
                  <SelectItem value="quitadas">Quitadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="financiamento">Financiamento</SelectItem>
                  <SelectItem value="consorcio">Consórcio</SelectItem>
                  <SelectItem value="parcelamento">Parcelamento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas em Cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : filteredContas.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            Nenhuma conta a pagar encontrada
          </h3>
          <p className="text-xs mt-1">
            Clique no botão acima "Nova Conta a Pagar" para cadastrar sua primeira dívida ou
            parcelamento.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContas.map((conta) => {
            const isQuitada = !!conta.concluida
            const tipoInfo = TIPOS_CONFIG[conta.tipo] || TIPOS_CONFIG.outro
            const isExpanded = !!expandedCards[conta.id]

            return (
              <Card
                key={conta.id}
                className={`overflow-hidden transition-all shadow-xs border ${
                  isQuitada
                    ? 'opacity-70 bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Header do Card */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0 border ${tipoInfo.cor}`}
                        >
                          {tipoInfo.label}
                        </Badge>
                        {isQuitada ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 px-2 py-0">
                            <CheckCircle2 className="w-3 h-3" />
                            QUITADA
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold px-2 py-0"
                          >
                            EM ABERTO
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5 truncate">
                        {conta.descricao}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Building className="w-3.5 h-3.5 text-muted-foreground" />
                          Credor: {conta.credor}
                        </span>
                        {conta.dia_vencimento && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Vence todo dia {conta.dia_vencimento}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        title="Editar Conta"
                        onClick={() => handleOpenEditarConta(conta)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Excluir Conta"
                        onClick={() => setDeleteContaTarget(conta)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Financeiro */}
                <CardContent className="p-4 space-y-3.5">
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-lg text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Valor Total
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        R$ {conta.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                        Já Pago
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {conta.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                        Saldo Restante
                      </span>
                      <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                        R${' '}
                        {conta.saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Progresso de Parcelas */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                        Parcelas:{' '}
                        <strong>
                          {conta.quantidadePaga} de {conta.quantidade_parcelas}
                        </strong>
                        {!isQuitada && (
                          <span className="text-[11px] text-muted-foreground">
                            (Próxima: {conta.proximaParcelaNumero}ª • R${' '}
                            {conta.proximaParcelaValorSugerido.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                            )
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {conta.percentualPago}% pago
                      </span>
                    </div>
                    <Progress value={conta.percentualPago} className="h-2" />
                  </div>

                  {/* Observação */}
                  {conta.observacao && (
                    <p className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800 italic">
                      "{conta.observacao}"
                    </p>
                  )}

                  {/* Ações do Card */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpandCard(conta.id)}
                      className="text-xs gap-1 text-slate-600 hover:text-slate-900 p-1.5 h-auto"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Ocultar Detalhes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Ver Cronograma & Pagamentos (
                          {conta.pagamentos.length}/{conta.quantidade_parcelas})
                        </>
                      )}
                    </Button>

                    {!isQuitada && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenRegistrarPagamento(conta)}
                        className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 h-8"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Pagar {conta.proximaParcelaNumero}ª Parcela
                      </Button>
                    )}
                  </div>

                  {/* Seção expandida: Cronograma de Parcelas e Histórico */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      {/* Cronograma de Parcelas Planejadas */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                            Cronograma de Parcelas Planejadas
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {conta.parcelasCalculadas.length} parcelas
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {conta.parcelasCalculadas.map((parc) => {
                            const jaPaga = parc.numero <= conta.quantidadePaga
                            return (
                              <div
                                key={parc.numero}
                                className={`p-1.5 rounded border text-[11px] flex flex-col justify-between ${
                                  jaPaga
                                    ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                                    : parc.numero === conta.proximaParcelaNumero
                                      ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">
                                    {parc.numero}ª {jaPaga ? '✓' : ''}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      jaPaga
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    R${' '}
                                    {parc.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                                {parc.data_vencimento && (
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                    Venc: {formatDateDisplay(parc.data_vencimento)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Histórico de Pagamentos Lançados */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                          Histórico de Pagamentos Lançados ({conta.pagamentos.length})
                        </span>

                        {conta.pagamentos.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2 text-center">
                            Nenhum pagamento registrado ainda para esta conta.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {conta.pagamentos.map((pag, idx) => (
                              <div
                                key={pag.id}
                                className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>
                                      Parcela {pag.numero_parcela || conta.pagamentos.length - idx}
                                    </span>
                                    <span className="text-muted-foreground font-normal">•</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                      R${' '}
                                      {pag.valor.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                    <span>Data: {formatDateDisplay(pag.data)}</span>
                                    {pag.observacao && <span>• {pag.observacao}</span>}
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Excluir este pagamento (estorna do caixa)"
                                  onClick={() => {
                                    setDeletePagId(pag.id)
                                    setDeletePagContaId(conta.id)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Nova / Editar Conta */}
      <Dialog open={contaModalOpen} onOpenChange={setContaModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContaId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
            </DialogTitle>
            <DialogDescription>
              Cadastre o passivo da empresa (financiamento, consórcio ou parcelamento) para
              acompanhamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConta} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="descricao">Descrição da Dívida *</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Financiamento Moto Honda 01"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="credor">Credor / Instituição *</Label>
                <Input
                  id="credor"
                  placeholder="Ex: Banco Honda, Consórcio Magalu"
                  value={formCredor}
                  onChange={(e) => setFormCredor(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tipo">Tipo de Passivo *</Label>
                <Select value={formTipo} onValueChange={(val: ContaAPagarTipo) => setFormTipo(val)}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                    <SelectItem value="consorcio">Consórcio</SelectItem>
                    <SelectItem value="parcelamento">Parcelamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="valorTotal">Valor Total da Dívida (R$) *</Label>
                <Input
                  id="valorTotal"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 53630.00"
                  value={formValorTotal}
                  onChange={(e) => handleValorTotalChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qtdParcelas">Nº Total de Parcelas *</Label>
                <Input
                  id="qtdParcelas"
                  type="number"
                  step="1"
                  placeholder="Ex: 11"
                  value={formQtdParcelas}
                  onChange={(e) => handleQtdParcelasChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="valorParcela">Valor Padrão da Parcela (R$) *</Label>
                <Input
                  id="valorParcela"
                  type="number"
                  step="0.01"
                  placeholder="Calculado automaticamente"
                  value={formValorParcela}
                  onChange={(e) => handleValorParcelaChange(e.target.value)}
                  required
                />
                <span className="text-[10px] text-muted-foreground block">
                  Divisão igual por padrão.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="diaVencimento">Dia do Vencimento (1 a 31)</Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 10"
                  value={formDiaVencimento}
                  onChange={(e) => handleDiaVencimentoChange(e.target.value)}
                />
              </div>
            </div>

            {/* Editor de Parcelas Individuais */}
            {formParcelas.length > 0 && (
              <ParcelasEditor
                parcelas={formParcelas}
                valorTotal={parseFloat(formValorTotal.replace(',', '.')) || 0}
                onChangeParcelas={setFormParcelas}
                onRedefinirIguais={() =>
                  recalcularParcelasIguais(
                    formValorTotal,
                    formQtdParcelas,
                    formDataInicio,
                    formDiaVencimento,
                  )
                }
              />
            )}

            <div className="space-y-1">
              <Label htmlFor="observacao">Observações (opcional)</Label>
              <Textarea
                id="observacao"
                rows={2}
                placeholder="Detalhes do contrato, nº do consórcio, etc."
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContaModalOpen(false)}
                disabled={submittingConta}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingConta}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {submittingConta
                  ? 'Salvando...'
                  : editingContaId
                    ? 'Salvar Alterações'
                    : 'Cadastrar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pagamento */}
      <Dialog open={pagamentoModalOpen} onOpenChange={setPagamentoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Parcela</DialogTitle>
            <DialogDescription>
              Este pagamento criará automaticamente uma saída vinculada à entidade{' '}
              <strong>"Dívidas com Terceiros"</strong> no Fluxo de Caixa.
            </DialogDescription>
          </DialogHeader>

          {pagamentoConta && (
            <form onSubmit={handleSavePagamento} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1 border border-slate-200/60 dark:border-slate-700/60">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {pagamentoConta.descricao}
                </p>
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Credor: {pagamentoConta.credor}</span>
                  <span>
                    Saldo: R${' '}
                    {pagamentoConta.saldoRestante.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pagNumeroParcela">Nº da Parcela *</Label>
                  <Input
                    id="pagNumeroParcela"
                    type="number"
                    min="1"
                    max={pagamentoConta.quantidade_parcelas}
                    value={pagNumeroParcela}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      setPagNumeroParcela(n)
                      // Ao mudar o número da parcela, atualizar para o vencimento e valor da nova parcela
                      const parcelaItem = pagamentoConta.parcelasCalculadas.find(
                        (p) => p.numero === n,
                      )
                      if (parcelaItem && parcelaItem.valor > 0) {
                        setPagValor(String(parcelaItem.valor))
                      }
                      if (parcelaItem?.data_vencimento) {
                        setPagData(normalizeDateInput(parcelaItem.data_vencimento))
                      }
                    }}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    De 1 a {pagamentoConta.quantidade_parcelas}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pagData">Data do Pagamento *</Label>
                    {pagData === getTodayLocalDate() ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                        Hoje
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPagData(getTodayLocalDate())}
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Hoje
                      </button>
                    )}
                  </div>
                  <Input
                    id="pagData"
                    type="date"
                    value={pagData}
                    onChange={(e) => setPagData(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Padrão: <strong>vencimento da parcela</strong>. Use "Hoje" ou edite se
                    necessário.
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pagValor">Valor Pago (R$) *</Label>
                  <Input
                    id="pagValor"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500.00"
                    value={pagValor}
                    onChange={(e) => setPagValor(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Sugerido da {pagNumeroParcela}ª parcela.
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pagObs">Observação do Pagamento (opcional)</Label>
                <Input
                  id="pagObs"
                  placeholder="Ex: Pago via PIX pelo banco Inter"
                  value={pagObs}
                  onChange={(e) => setPagObs(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPagamentoModalOpen(false)}
                  disabled={submittingPag}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPag}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {submittingPag ? 'Registrando...' : 'Confirmar e Lançar no Caixa'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Pagamento */}
      <AlertDialog
        open={!!deletePagId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePagId(null)
            setDeletePagContaId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro do pagamento e também excluirá com segurança o
              lançamento de saída correspondente no Fluxo de Caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePagamento}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, Excluir Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão de Conta */}
      <AlertDialog
        open={!!deleteContaTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteContaTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta a Pagar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta{' '}
              <strong>"{deleteContaTarget?.descricao}"</strong>?
              <br />
              <br />
              <span className="text-red-600 dark:text-red-400 font-semibold">
                Atenção: todos os pagamentos vinculados a esta conta e os lançamentos de saída
                criados por eles no Fluxo de Caixa também serão removidos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteConta}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
