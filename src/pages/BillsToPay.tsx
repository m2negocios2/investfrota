import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  Filter,
  DollarSign,
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
import { useAuth } from '@/contexts/AuthContext'
import { pagamentosService } from '@/services/pagamentos'
import { motosService } from '@/services/motos'
import { Pagamento, Moto, PagamentoCategoria } from '@/types/database'

export default function BillsToPay() {
  const { user, isProprietario } = useAuth()
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  // New Bill modal
  const [newBillOpen, setNewBillOpen] = useState(false)
  const [motoId, setMotoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<PagamentoCategoria>('manutencao')
  const [valor, setValor] = useState<number>(0)
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Payment Execution modal
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Pagamento | null>(null)
  const [payForma, setPayForma] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
  >('pix')

  const loadData = async () => {
    try {
      const [p, m] = await Promise.all([pagamentosService.getAll(), motosService.getAll()])
      setPagamentos(p)
      setMotos(m)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar contas a pagar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Create Bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoId || !descricao.trim() || valor <= 0 || !dataVencimento) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      await pagamentosService.create({
        moto: motoId,
        descricao: descricao.trim(),
        categoria,
        valor: Number(valor),
        data_vencimento: dataVencimento,
        // Administrators launch as "pendente", Proprietário can launch as already "aprovado"
        status: isProprietario ? 'aprovado' : 'pendente',
        lancado_por: user?.id,
        lancado_por_nome: user?.name || user?.email,
        observacoes: observacoes.trim(),
      })

      toast.success(
        isProprietario
          ? 'Conta cadastrada e aprovada!'
          : 'Manutenção/Conta lançada com sucesso! Aguarda aprovação do proprietário.',
      )
      setNewBillOpen(false)
      setDescricao('')
      setValor(0)
      setObservacoes('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao lançar conta a pagar')
    } finally {
      setSubmitting(false)
    }
  }

  // Approve Bill (Proprietario only)
  const handleApprove = async (id: string) => {
    if (!user) return
    try {
      await pagamentosService.aprovar(id, user.id)
      toast.success('Pagamento de manutenção aprovado com sucesso!')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao aprovar pagamento')
    }
  }

  // Reject Bill
  const handleReject = async (id: string) => {
    if (!confirm('Deseja realmente rejeitar esta despesa?')) return
    try {
      await pagamentosService.rejeitar(id)
      toast.success('Despesa rejeitada')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao rejeitar pagamento')
    }
  }

  // Execute Payment (mark as pago and add to Caixa)
  const handleConfirmPayment = async () => {
    if (!selectedBill) return
    try {
      await pagamentosService.pagar(selectedBill, payForma)
      toast.success('Pagamento efetuado e registrado como saída no caixa!')
      setPayModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar pagamento')
    }
  }

  // Filter bills
  const pendentes = pagamentos.filter((p) => p.status === 'pendente')
  const aprovadas = pagamentos.filter((p) => p.status === 'aprovado')
  const pagas = pagamentos.filter((p) => p.status === 'pago')

  const totalPendente = pendentes.reduce((acc, p) => acc + p.valor, 0)
  const totalAprovado = aprovadas.reduce((acc, p) => acc + p.valor, 0)
  const totalPago = pagas.reduce((acc, p) => acc + p.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contas a Pagar & Manutenções
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe despesas da frota e gerencie a aprovação de pagamentos pelo proprietário.
          </p>
        </div>
        <Button onClick={() => setNewBillOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Lançar Conta / Manutenção
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-amber-200 dark:border-amber-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pendentes de Aprovação
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendentes.length} conta(s) aguardando proprietário
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Aprovadas para Pagar
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {aprovadas.length} conta(s) prontas para liquidação
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200 dark:border-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Liquidadas / Pagas
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pagas.length} conta(s) baixadas no caixa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas ({aprovadas.length})</TabsTrigger>
          <TabsTrigger value="historico">Pagas / Histórico ({pagas.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Pendentes */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Contas Aguardando Aprovação do Proprietário
              </CardTitle>
              <CardDescription>
                {isProprietario
                  ? 'Como proprietário, você pode aprovar ou rejeitar os lançamentos feitos pela equipe.'
                  : 'Lançamentos enviados ao proprietário para validação antes do pagamento.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Tudo em ordem! Nenhuma conta pendente de aprovação.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendentes.map((item) => {
                    const moto = motos.find((m) => m.id === item.moto)
                    return (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-slate-900 dark:text-white">
                              {item.descricao}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.categoria}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Moto: {moto ? `${moto.modelo} (${moto.placa})` : 'Não especificada'} •
                            Vencimento:{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
                            </span>
                          </p>
                          {item.lancado_por_nome && (
                            <p className="text-[11px] text-muted-foreground">
                              Lançado por: {item.lancado_por_nome}
                            </p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                              "{item.observacoes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <span className="text-base font-bold text-red-600 dark:text-red-400 block">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-amber-100 text-amber-800"
                            >
                              Pendente
                            </Badge>
                          </div>

                          {isProprietario ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(item.id)}
                                className="text-xs text-red-600 hover:bg-red-50"
                              >
                                Rejeitar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(item.id)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Aprovar Pagamento
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Aguardando aprovação
                            </span>
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

        {/* Tab 2: Aprovadas */}
        <TabsContent value="aprovadas" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Contas Aprovadas Prontas para Pagamento
              </CardTitle>
              <CardDescription>
                Contas validadas pelo proprietário prontas para quitação e lançamento no caixa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aprovadas.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma conta aprovada aguardando quitação.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {aprovadas.map((item) => {
                    const moto = motos.find((m) => m.id === item.moto)
                    return (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {item.descricao}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.categoria}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-blue-100 text-blue-800"
                            >
                              Aprovado pelo Proprietário
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Moto: {moto ? `${moto.modelo} (${moto.placa})` : 'Moto'} • Venc:{' '}
                            {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
                            {item.data_aprovacao
                              ? ` • Aprovado em: ${new Date(item.data_aprovacao).toLocaleDateString('pt-BR')}`
                              : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-red-600">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedBill(item)
                              setPayModalOpen(true)
                            }}
                            className="text-xs bg-primary"
                          >
                            Realizar Pagamento
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Histórico / Pagas */}
        <TabsContent value="historico" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Histórico de Contas Pagas</CardTitle>
              <CardDescription>
                Registro de despesas quitadas e integradas ao fluxo de caixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagas.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum registro de conta paga no histórico.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pagas.map((item) => {
                    const moto = motos.find((m) => m.id === item.moto)
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {item.descricao}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Moto: {moto ? `${moto.modelo} (${moto.placa})` : 'Moto'} • Categoria:{' '}
                            {item.categoria} • Pago em:{' '}
                            {item.data_pagamento
                              ? new Date(item.data_pagamento).toLocaleDateString('pt-BR')
                              : 'Concluído'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 dark:text-white block">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-200"
                          >
                            Liquidado
                          </Badge>
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

      {/* New Bill Modal */}
      <Dialog open={newBillOpen} onOpenChange={setNewBillOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar Conta / Manutenção</DialogTitle>
            <DialogDescription>
              {isProprietario
                ? 'Lançamento com aprovação direta pelo proprietário.'
                : 'Lançamento de administrador que será enviado para aprovação do proprietário.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBill} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motoBill">Moto Relacionada *</Label>
              <Select value={motoId} onValueChange={setMotoId}>
                <SelectTrigger id="motoBill">
                  <SelectValue placeholder="Selecione a moto" />
                </SelectTrigger>
                <SelectContent>
                  {motos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.modelo} - {m.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descBill">Descrição da Despesa / Manutenção *</Label>
              <Input
                id="descBill"
                placeholder="Ex: Troca de relação, IPVA 2024, Seguro..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="catBill">Categoria</Label>
                <Select
                  value={categoria}
                  onValueChange={(val: PagamentoCategoria) => setCategoria(val)}
                >
                  <SelectTrigger id="catBill">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao">Manutenção Mecânica</SelectItem>
                    <SelectItem value="ipva_seguro">IPVA & Seguro</SelectItem>
                    <SelectItem value="combustivel">Combustível</SelectItem>
                    <SelectItem value="rastreador">Rastreador GPS</SelectItem>
                    <SelectItem value="outros">Outros Custos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valBill">Valor (R$) *</Label>
                <Input
                  id="valBill"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor || ''}
                  onChange={(e) => setValor(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencBill">Data de Vencimento *</Label>
              <Input
                id="vencBill"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obsBill">Observações / Oficina / Detalhes</Label>
              <Input
                id="obsBill"
                placeholder="Ex: Nota fiscal nº 1234 - Oficina Central"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewBillOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Cadastrar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Execute Payment Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Liquidação de Pagamento</DialogTitle>
            <DialogDescription>
              Quitar <strong>{selectedBill?.descricao}</strong> no valor de R${' '}
              {selectedBill?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e debitar
              no caixa da moto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Forma de Pagamento Utilizada</Label>
            <Select value={payForma} onValueChange={(val: any) => setPayForma(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                <SelectItem value="cartao">Cartão de Crédito / Débito</SelectItem>
                <SelectItem value="outro">Boleto / Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar e Debitar do Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
