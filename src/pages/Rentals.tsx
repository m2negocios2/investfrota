import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  KeyRound,
  Plus,
  Bike,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  Clock,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { contratosService } from '@/services/contratos'
import { motosService } from '@/services/motos'
import { recebimentosService } from '@/services/recebimentos'
import { FinalizeContractModal } from '@/components/FinalizeContractModal'
import { Contrato, Moto, TipoLocacao, Recebimento } from '@/types/database'

export default function Rentals() {
  const [searchParams] = useSearchParams()
  const defaultMotoId = searchParams.get('motoId') || ''

  const [contratos, setContratos] = useState<Contrato[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)

  // New Contract Dialog
  const [newContractOpen, setNewContractOpen] = useState(Boolean(defaultMotoId))
  const [motoSelected, setMotoSelected] = useState<string>(defaultMotoId)
  const [locatarioNome, setLocatarioNome] = useState('')
  const [locatarioDoc, setLocatarioDoc] = useState('')
  const [locatarioTel, setLocatarioTel] = useState('')
  const [tipoContrato, setTipoContrato] = useState<TipoLocacao>('normal')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [diaSemana, setDiaSemana] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'>(
    'SEG',
  )
  const [prazoMeses, setPrazoMeses] = useState<number>(12)
  const [dataEntrega, setDataEntrega] = useState('')
  const [dataFimContratoManual, setDataFimContratoManual] = useState(false)
  const [valorDiario, setValorDiario] = useState<number>(35)
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Register payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedRecebimento, setSelectedRecebimento] = useState<Recebimento | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  >('pix')

  // Finalize contract dialog with custom end date
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [contractToFinalize, setContractToFinalize] = useState<Contrato | null>(null)

  // Delete contract dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<Contrato | null>(null)
  const [deletingContract, setDeletingContract] = useState(false)

  const loadData = async () => {
    try {
      const [c, m, r] = await Promise.all([
        contratosService.getAll(),
        motosService.getAll(),
        recebimentosService.getAll(),
      ])
      setContratos(c)
      setMotos(m)
      setRecebimentos(r)
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

  // Calculate projected end date for Plano Conquista
  const calculateEndDate = (startDate: string, months: number): string => {
    if (!startDate || !months) return ''
    try {
      const [yearStr, monthStr, dayStr] = startDate.split('-')
      const y = parseInt(yearStr, 10)
      const m = parseInt(monthStr, 10) - 1
      const d = parseInt(dayStr, 10)
      const targetDate = new Date(y, m + months, d)
      return targetDate.toISOString().split('T')[0]
    } catch {
      return ''
    }
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
      if (found.tipo_locacao_padrao === 'plano_conquista' && !dataFimContratoManual) {
        setDataEntrega(calculateEndDate(dataInicio, prazoMeses))
      }
    }
  }

  const handleTipoContratoChange = (newTipo: TipoLocacao) => {
    setTipoContrato(newTipo)
    if (newTipo === 'plano_conquista') {
      if (!dataFimContratoManual) {
        setDataEntrega(calculateEndDate(dataInicio, prazoMeses))
      }
    } else {
      // If switching back to normal and wasn't manually set, keep or clear
      if (!dataFimContratoManual) {
        setDataEntrega('')
      }
    }
  }

  const handleDataInicioChange = (newDate: string) => {
    setDataInicio(newDate)
    if (tipoContrato === 'plano_conquista' && !dataFimContratoManual) {
      setDataEntrega(calculateEndDate(newDate, prazoMeses))
    }
  }

  const handlePrazoMesesChange = (months: number) => {
    setPrazoMeses(months)
    if (tipoContrato === 'plano_conquista' && !dataFimContratoManual) {
      setDataEntrega(calculateEndDate(dataInicio, months))
    }
  }

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoSelected || !locatarioNome.trim() || !dataInicio) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        moto: motoSelected,
        locatario_nome: locatarioNome.trim(),
        locatario_documento: locatarioDoc.trim(),
        locatario_telefone: locatarioTel.trim(),
        tipo: tipoContrato,
        data_inicio: dataInicio,
        valor_semanal: Number(valorSemanalContrato),
        valor_diario: Number((Number(valorSemanalContrato) / 7).toFixed(2)),
        dia_pagamento_semana: diaSemana,
        status: 'ativo',
        observacoes: observacoes.trim(),
      }

      if (tipoContrato === 'plano_conquista') {
        payload.prazo_meses = Number(prazoMeses)
      }
      if (dataEntrega) {
        payload.data_entrega = dataEntrega
      }

      const created = await contratosService.create(payload)

      // Automatically generate first weekly installment in recebimentos
      const nextDue = new Date(new Date(dataInicio).getTime() + 7 * 86400000)
        .toISOString()
        .split('T')[0]
      await recebimentosService.create({
        moto: motoSelected,
        contrato: created.id,
        locatario_nome: locatarioNome.trim(),
        data_vencimento: nextDue,
        valor: Number(valorSemanalContrato),
        status: 'em_dia',
      })

      toast.success('Contrato de locação iniciado com sucesso!')
      setNewContractOpen(false)
      // reset form
      setLocatarioNome('')
      setLocatarioDoc('')
      setLocatarioTel('')
      setDataEntrega('')
      setDataFimContratoManual(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cadastrar contrato')
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

  const handleConfirmRecebimento = async () => {
    if (!selectedRecebimento) return
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      await recebimentosService.marcarComoPago(
        selectedRecebimento.id,
        selectedRecebimento.moto,
        selectedRecebimento.valor,
        selectedRecebimento.locatario_nome,
        formaPagamento,
        todayStr,
      )
      toast.success('Recebimento registrado e lançado no caixa!')
      setPaymentDialogOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao confirmar recebimento')
    }
  }

  const activeContratos = contratos.filter((c) => c.status === 'ativo')
  const availableMotos = motos.filter((m) => m.status === 'disponivel')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Aluguéis e Contratos
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe motos locadas, contratos ativos e status de recebimentos.
          </p>
        </div>
        <Button onClick={() => setNewContractOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Contrato de Locação
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="locadas" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="locadas">Motos Locadas ({activeContratos.length})</TabsTrigger>
          <TabsTrigger value="disponiveis">Disponíveis ({availableMotos.length})</TabsTrigger>
          <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
        </TabsList>

        {/* Tab 1: Motos Locadas */}
        <TabsContent value="locadas" className="space-y-4">
          {activeContratos.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bike className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Nenhuma moto alugada no momento
                </p>
                <p className="text-xs">Clique em "Novo Contrato de Locação" para iniciar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeContratos.map((contrato) => {
                const moto = motos.find((m) => m.id === contrato.moto)
                return (
                  <Card key={contrato.id} className="shadow-sm border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <span>{contrato.locatario_nome}</span>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {moto?.nome || moto?.modelo || 'Moto'}
                            </span>
                            {moto?.placa && (
                              <span className="font-mono text-[11px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border">
                                {moto.placa}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            contrato.tipo === 'plano_conquista'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }
                        >
                          {contrato.tipo === 'plano_conquista'
                            ? 'Plano Conquista'
                            : 'Locação Normal'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                        <div>
                          <span className="text-muted-foreground block">Início da Locação:</span>
                          <span className="font-medium">
                            {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">
                            {contrato.tipo === 'plano_conquista'
                              ? 'Fim do Contrato / Prazo:'
                              : 'Fim do Contrato:'}
                          </span>
                          <span className="font-medium">
                            {contrato.data_entrega ? (
                              <span className="text-slate-900 dark:text-white font-semibold">
                                {new Date(contrato.data_entrega).toLocaleDateString('pt-BR')}
                                {contrato.prazo_meses ? ` (${contrato.prazo_meses} meses)` : ''}
                              </span>
                            ) : contrato.prazo_meses ? (
                              `${contrato.prazo_meses} meses`
                            ) : (
                              'Contínuo / Sem data de término'
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Valor Semanal:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            R$ {(contrato.valor_semanal || contrato.valor_diario * 7).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Contato:</span>
                          <span className="font-medium">
                            {contrato.locatario_telefone || 'Não informado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {moto && (
                          <Button asChild variant="outline" size="sm" className="text-xs">
                            <Link to={`/motos/${moto.id}`}>Ver Moto</Link>
                          </Button>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFinalizeModal(contrato)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Finalizar Contrato
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(contrato)}
                            title="Apagar contrato feito por engano"
                            aria-label="Apagar contrato feito por engano"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Motos Disponíveis */}
        <TabsContent value="disponiveis" className="space-y-4">
          {availableMotos.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  100% da frota alugada ou em oficina!
                </p>
                <p className="text-xs">Nenhuma moto ociosa no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableMotos.map((moto) => (
                <Card key={moto.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">
                      {moto.nome || moto.modelo}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">
                        {moto.placa}
                      </span>
                      <span className="text-xs text-muted-foreground">{moto.modelo}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      <p>
                        Ano: {moto.ano} • Cor: {moto.cor}
                      </p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                        Semanal: R${' '}
                        {(moto.valor_semanal !== undefined && moto.valor_semanal !== null
                          ? moto.valor_semanal
                          : (moto.valor_diario || 0) * 7
                        ).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        handleMotoChange(moto.id)
                        setNewContractOpen(true)
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      Alugar Esta Moto
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Recebimentos */}
        <TabsContent value="recebimentos" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
              <div>
                <CardTitle className="text-base font-bold">Cobranças & Recebimentos</CardTitle>
                <CardDescription>
                  Controle de parcelas em dia, em atraso e pagas pelos locatários vinculadas aos
                  contratos
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                {recebimentos.length} lançamento(s)
              </span>
            </CardHeader>
            <CardContent>
              {recebimentos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum recebimento registrado
                  </p>
                  <p className="text-xs mt-1">
                    Ao criar um contrato de locação, as parcelas semanais aparecem aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recebimentos.map((r) => {
                    const statusColors = {
                      em_dia: 'bg-blue-50 text-blue-700 border-blue-200',
                      em_atraso: 'bg-amber-50 text-amber-700 border-amber-300',
                      pago: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    }
                    const relatedContrato = r.contrato
                      ? contratos.find((c) => c.id === r.contrato)
                      : null
                    const moto = motos.find((m) => m.id === r.moto)

                    return (
                      <div
                        key={r.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 px-2 rounded-lg transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {r.locatario_nome}
                            </span>
                            {moto && (
                              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border text-muted-foreground">
                                {moto.placa}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${statusColors[r.status]}`}
                            >
                              {r.status.replace('_', ' ')}
                            </Badge>
                            {relatedContrato && (
                              <Badge variant="secondary" className="text-[10px]">
                                Contrato: {relatedContrato.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Vencimento: {new Date(r.data_vencimento).toLocaleDateString('pt-BR')}
                            {r.data_pagamento
                              ? ` • Pago em: ${new Date(r.data_pagamento).toLocaleDateString('pt-BR')}`
                              : ''}
                            {r.forma_pagamento ? ` (${r.forma_pagamento.toUpperCase()})` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>

                          {r.status !== 'pago' ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                setSelectedRecebimento(r)
                                setPaymentDialogOpen(true)
                              }}
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Baixar / Pago
                            </Button>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-xs text-emerald-700 bg-emerald-50"
                            >
                              Confirmado no Caixa
                            </Badge>
                          )}

                          {relatedContrato && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteModal(relatedContrato)}
                              title="Apagar contrato deste recebimento feito por engano"
                              aria-label="Apagar contrato feito por engano"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Contract Modal */}
      <Dialog open={newContractOpen} onOpenChange={setNewContractOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Locação</DialogTitle>
            <DialogDescription>
              Vincule a moto ao locatário e defina o modelo de aluguel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateContract} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motoSelect">Selecione a Moto *</Label>
              <Select value={motoSelected} onValueChange={handleMotoChange}>
                <SelectTrigger id="motoSelect">
                  <SelectValue placeholder="Escolha a moto" />
                </SelectTrigger>
                <SelectContent>
                  {motos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome || m.modelo} — {m.placa} ({m.status.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locatario">Nome Completo do Locatário *</Label>
              <Input
                id="locatario"
                placeholder="Ex: João Silva de Almeida"
                value={locatarioNome}
                onChange={(e) => setLocatarioNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF / Documento</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={locatarioDoc}
                  onChange={(e) => setLocatarioDoc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Telefone / WhatsApp</Label>
                <Input
                  id="tel"
                  placeholder="(11) 90000-0000"
                  value={locatarioTel}
                  onChange={(e) => setLocatarioTel(e.target.value)}
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="diaPagamento">Dia de Pagamento Semanal no Painel Semana</Label>
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

            <div className="space-y-2">
              <Label htmlFor="valorSemanalContrato">Valor Semanal de Aluguel (R$)</Label>
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
              <span className="text-[11px] text-muted-foreground">
                Valor pago semanalmente (equivale a ~R$ {(valorSemanalContrato / 7).toFixed(2)}
                /dia).
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewContractOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Cadastrando...' : 'Confirmar Locação'}
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
                    {contractToDelete.locatario_nome}
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

      {/* Confirm Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento de Aluguel</DialogTitle>
            <DialogDescription>
              Dar baixa no valor de R$ {selectedRecebimento?.valor.toFixed(2)} recebido de{' '}
              {selectedRecebimento?.locatario_nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Forma de Pagamento Recebida</Label>
            <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                <SelectItem value="cartao">Cartão de Débito / Crédito</SelectItem>
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRecebimento}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirmar Recebimento e Salvar no Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
