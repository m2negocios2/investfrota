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
  const [prazoMeses, setPrazoMeses] = useState<number>(12)
  const [dataEntrega, setDataEntrega] = useState('')
  const [valorDiario, setValorDiario] = useState<number>(35)
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Register payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedRecebimento, setSelectedRecebimento] = useState<Recebimento | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  >('pix')

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

  // Auto-populate daily value when moto is selected
  const handleMotoChange = (motoId: string) => {
    setMotoSelected(motoId)
    const found = motos.find((m) => m.id === motoId)
    if (found) {
      setValorDiario(found.valor_diario)
      setTipoContrato(found.tipo_locacao_padrao)
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
        valor_diario: Number(valorDiario),
        valor_semanal: Number(valorDiario) * 7,
        status: 'ativo',
        observacoes: observacoes.trim(),
      }

      if (tipoContrato === 'plano_conquista') {
        payload.prazo_meses = Number(prazoMeses)
        if (dataEntrega) payload.data_entrega = dataEntrega
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
        valor: Number(valorDiario) * 7,
        status: 'em_dia',
      })

      toast.success('Contrato de locação iniciado com sucesso!')
      setNewContractOpen(false)
      // reset form
      setLocatarioNome('')
      setLocatarioDoc('')
      setLocatarioTel('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cadastrar contrato')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinalizeContract = async (contrato: Contrato) => {
    if (!confirm(`Deseja realmente finalizar o contrato de ${contrato.locatario_nome}?`)) {
      return
    }
    try {
      await contratosService.finalizar(contrato.id, contrato.moto)
      toast.success('Contrato finalizado com sucesso!')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao finalizar contrato')
    }
  }

  const handleConfirmRecebimento = async () => {
    if (!selectedRecebimento) return
    try {
      await recebimentosService.marcarComoPago(
        selectedRecebimento.id,
        selectedRecebimento.moto,
        selectedRecebimento.valor,
        selectedRecebimento.locatario_nome,
        formaPagamento,
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
                              ? 'Prazo / Término:'
                              : 'Término Previsto:'}
                          </span>
                          <span className="font-medium">
                            {contrato.data_entrega
                              ? new Date(contrato.data_entrega).toLocaleDateString('pt-BR')
                              : contrato.prazo_meses
                                ? `${contrato.prazo_meses} meses`
                                : 'Contínuo / Recorrente'}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFinalizeContract(contrato)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Finalizar Contrato
                        </Button>
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
                        Diária: R$ {moto.valor_diario.toFixed(2)}
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
            <CardHeader>
              <CardTitle className="text-base font-bold">Cobranças & Recebimentos</CardTitle>
              <CardDescription>
                Controle de parcelas em dia, em atraso e pagas pelos locatários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recebimentos.map((r) => {
                  const statusColors = {
                    em_dia: 'bg-blue-50 text-blue-700 border-blue-200',
                    em_atraso: 'bg-amber-50 text-amber-700 border-amber-300',
                    pago: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  }
                  return (
                    <div
                      key={r.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {r.locatario_nome}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${statusColors[r.status]}`}
                          >
                            {r.status.replace('_', ' ')}
                          </Badge>
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
                      </div>
                    </div>
                  )
                })}
              </div>
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
                  onValueChange={(val: TipoLocacao) => setTipoContrato(val)}
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
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
              </div>
            </div>

            {tipoContrato === 'plano_conquista' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo (Meses)</Label>
                  <Input
                    id="prazo"
                    type="number"
                    min={1}
                    value={prazoMeses}
                    onChange={(e) => setPrazoMeses(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataEntrega">Data de Entrega da Moto</Label>
                  <Input
                    id="dataEntrega"
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valorDiario">Valor Diário Acordado (R$)</Label>
              <Input
                id="valorDiario"
                type="number"
                step="0.01"
                value={valorDiario}
                onChange={(e) => setValorDiario(Number(e.target.value))}
                required
              />
              <span className="text-[11px] text-muted-foreground">
                Equivalente a R$ {(valorDiario * 7).toFixed(2)} por semana.
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
