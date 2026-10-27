import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Trash2,
  Filter,
  Check,
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
import { categoriasService } from '@/services/categorias'
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'
import { Pagamento, Moto, CategoriaGasto, FormaPagamento } from '@/types/database'

export default function BillsToPay() {
  const { user, isProprietario } = useAuth()
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)

  // Novo Aviso de Custo (modal)
  const [newNoticeOpen, setNewNoticeOpen] = useState(false)
  const [motoId, setMotoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Manutenção')
  const [valor, setValor] = useState<number>(0)
  const [dataVencimento, setDataVencimento] = useState(getTodayLocalDate())
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Registro Direto no Caixa pela Dona (modal de quitação)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState<Pagamento | null>(null)
  const [payDate, setPayDate] = useState(getTodayLocalDate())
  const [payForma, setPayForma] = useState<FormaPagamento>('pix')
  const [payCategory, setPayCategory] = useState('')
  const [payValor, setPayValor] = useState<number>(0)
  const [payDescricao, setPayDescricao] = useState('')
  const [paying, setPaying] = useState(false)

  const loadData = async () => {
    try {
      const [p, m, c] = await Promise.all([
        pagamentosService.getAll(),
        motosService.getAll(),
        categoriasService.getAll(),
      ])
      setPagamentos(p)
      setMotos(m)
      setCategorias(c)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar avisos de custos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Admin ou Proprietário lança aviso de pendência da moto
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoId || !descricao.trim() || valor <= 0) {
      toast.error('Preencha os campos obrigatórios (Moto, Descrição e Valor)')
      return
    }

    setSubmitting(true)
    try {
      await pagamentosService.create({
        moto: motoId,
        descricao: descricao.trim(),
        categoria: categoria || 'Manutenção',
        categoria_nome: categoria || 'Manutenção',
        valor: Number(valor),
        data_vencimento: dataVencimento,
        // Status inicial é pendência (aguardando a dona pagar no caixa)
        status: 'pendente',
        lancado_por: user?.id,
        lancado_por_nome: user?.name || user?.email,
        observacoes: observacoes.trim(),
      })

      toast.success(
        isProprietario
          ? 'Aviso de custo registrado com sucesso!'
          : 'Aviso de pendência lançado! A proprietária poderá realizar o pagamento no caixa.',
      )
      setNewNoticeOpen(false)
      setDescricao('')
      setValor(0)
      setDataVencimento(getTodayLocalDate())
      setObservacoes('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao lançar aviso de pendência')
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal de pagamento no caixa pré-preenchido
  const handleOpenPayModal = (item: Pagamento) => {
    const moto = motos.find((m) => m.id === item.moto)
    const motoNome = moto?.nome || moto?.modelo || 'Moto'
    setSelectedNotice(item)
    setPayDate(getTodayLocalDate())
    setPayForma('pix')
    setPayCategory(item.categoria_nome || item.categoria || 'Manutenção')
    setPayValor(item.valor)
    setPayDescricao(`Manutenção ${motoNome}: ${item.descricao}`)
    setPayModalOpen(true)
  }

  // Dona confirma pagamento: lança saída no caixa apropriando à moto e marca aviso como pago
  const handleConfirmPayInCash = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNotice) return

    setPaying(true)
    try {
      await pagamentosService.pagarNoCaixa(selectedNotice, {
        data: payDate,
        formaPagamento: payForma,
        categoria: payCategory,
        descricao: payDescricao.trim(),
        valor: Number(payValor),
      })

      toast.success('Pagamento efetuado! Lançado como saída no Caixa e pendência concluída.')
      setPayModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar pagamento no caixa')
    } finally {
      setPaying(false)
    }
  }

  // Excluir aviso de pendência
  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Deseja realmente remover este aviso de custo?')) return
    try {
      await pagamentosService.delete(id)
      toast.success('Aviso removido')
      setPagamentos(pagamentos.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Erro ao remover aviso')
    }
  }

  // Filtros
  const pendentes = pagamentos.filter((p) => p.status === 'pendente')
  const concluidos = pagamentos.filter((p) => p.status === 'pago')

  const totalPendente = pendentes.reduce((acc, p) => acc + p.valor, 0)
  const totalConcluido = concluidos.reduce((acc, p) => acc + p.valor, 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Avisos de Custos & Manutenções
          </h1>
          <p className="text-sm text-muted-foreground">
            O administrador registra pendências e manutenções das motos. A proprietária quita e
            apropria no Caixa.
          </p>
        </div>
        <Button onClick={() => setNewNoticeOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Lançar Aviso de Custo
        </Button>
      </div>

      {/* Regra de Negócio Clara para Usuário */}
      <Card className="shadow-sm border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950 dark:text-blue-100">
            <div className="space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Fluxo Oficial de Manutenções & Despesas:
              </span>
              <p>
                <strong>1. Administrador:</strong> lança o aviso da moto (peça, revisão, valor). Não
                mexe no caixa.
                <br />
                <strong>2. Proprietária (Dona):</strong> confere o aviso e clica em{' '}
                <strong>"Registrar Pagamento no Caixa"</strong> — a saída é debitada do caixa e a
                pendência é liquidada.
              </p>
            </div>
            {isProprietario ? (
              <Badge className="bg-blue-600 shrink-0 self-start sm:self-center">
                Você é a Proprietária
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 self-start sm:self-center text-amber-700 border-amber-300"
              >
                Acesso de Administrador
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm border-amber-200 dark:border-amber-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pendências a Pagar (Avisos em Aberto)
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
              {pendentes.length} pendência(s) aguardando quitação no caixa pela dona
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200 dark:border-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Manutenções Pagas & Lançadas no Caixa
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              R$ {totalConcluido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {concluidos.length} despesa(s) liquidadas no caixa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="pendentes">Pendências da Frota ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="concluidas">Pagas / Histórico ({concluidos.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Avisos Pendentes */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Avisos de Manutenção & Pendências das Motos
              </CardTitle>
              <CardDescription>
                Lista de necessidades informadas pela equipe. Clique em registrar pagamento para
                debitar do caixa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
                  <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
                    Nenhuma pendência em aberto!
                  </p>
                  <p className="text-xs">
                    Todas as manutenções e avisos de custos foram quitados no caixa.
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
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Destaque para o NOME da moto com placa secundária */}
                            <span className="font-extrabold text-base text-blue-700 dark:text-blue-400">
                              {moto?.nome || moto?.modelo || 'Moto'}
                            </span>
                            {moto?.placa && (
                              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border">
                                {moto.placa}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.categoria_nome || item.categoria}
                            </Badge>
                          </div>

                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {item.descricao}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>
                              Data prevista:{' '}
                              <strong>{formatDateDisplay(item.data_vencimento)}</strong>
                            </span>
                            {item.lancado_por_nome && (
                              <span>• Lançado por: {item.lancado_por_nome}</span>
                            )}
                            {item.observacoes && (
                              <span className="italic">"{item.observacoes}"</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3">
                          <div className="text-right">
                            <span className="text-lg font-bold text-red-600 dark:text-red-400 block leading-tight">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-amber-100 text-amber-800"
                            >
                              Pendente
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Botão para Dona registrar diretamente no caixa */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayModal(item)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Registrar Pagamento no Caixa
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNotice(item.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        {/* Tab 2: Histórico de Concluídas / Pagas */}
        <TabsContent value="concluidas" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Histórico de Despesas Quitadas</CardTitle>
              <CardDescription>
                Avisos que já foram pagos pela proprietária e debitados no fluxo de caixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {concluidos.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum aviso no histórico ainda.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {concluidos.map((item) => {
                    const moto = motos.find((m) => m.id === item.moto)
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {moto?.nome || moto?.modelo || 'Moto'}
                            </span>
                            {moto?.placa && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ({moto.placa})
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              • {item.descricao}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Categoria: {item.categoria_nome || item.categoria} • Pago em:{' '}
                            {item.data_pagamento
                              ? formatDateDisplay(item.data_pagamento)
                              : 'Concluído'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 dark:text-white block">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-300"
                          >
                            Baixado no Caixa
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

      {/* Modal 1: Novo Aviso de Custo (Lançado pelo Admin ou Dona) */}
      <Dialog open={newNoticeOpen} onOpenChange={setNewNoticeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar Aviso de Pendência / Custo</DialogTitle>
            <DialogDescription>
              Informe a moto, a manutenção necessária e o valor orçado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNotice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motoSelectNotice">Moto *</Label>
              <Select value={motoId} onValueChange={setMotoId}>
                <SelectTrigger id="motoSelectNotice">
                  <SelectValue placeholder="Selecione a moto com pendência" />
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

            <div className="space-y-2">
              <Label htmlFor="descNotice">Descrição da Manutenção / Pendência *</Label>
              <Input
                id="descNotice"
                placeholder="Ex: Troca de relação, troca de pastilhas, revisão 15.000 km..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="catNotice">Categoria do Custo</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger id="catNotice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valNotice">Valor Estimado (R$) *</Label>
                <Input
                  id="valNotice"
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
              <Label htmlFor="vencNotice">Data Prevista / Vencimento</Label>
              <Input
                id="vencNotice"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obsNotice">Detalhes / Oficina Mecânica</Label>
              <Input
                id="obsNotice"
                placeholder="Ex: Motores & Cia - Peças já cotadas"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewNoticeOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Lançar Aviso de Pendência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Registrar Pagamento no Caixa (pela Dona) com pré-preenchimento */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento no Caixa</DialogTitle>
            <DialogDescription>
              Apropria o pagamento como <strong>saída no livro caixa</strong> da moto correspondente
              e conclui a pendência.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPayInCash} className="space-y-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moto apropriada:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {motos.find((m) => m.id === selectedNotice?.moto)?.nome || 'Moto'} (
                  {motos.find((m) => m.id === selectedNotice?.moto)?.placa})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aviso original:</span>
                <span className="font-semibold">{selectedNotice?.descricao}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payDesc">Descrição do Lançamento no Caixa *</Label>
              <Input
                id="payDesc"
                value={payDescricao}
                onChange={(e) => setPayDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payVal">Valor Pago (R$) *</Label>
                <Input
                  id="payVal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payValor || ''}
                  onChange={(e) => setPayValor(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payDt">Data do Pagamento *</Label>
                <Input
                  id="payDt"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payForm">Forma de Pagamento</Label>
                <Select value={payForma} onValueChange={(val: FormaPagamento) => setPayForma(val)}>
                  <SelectTrigger id="payForm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Boleto / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payCat">Categoria de Gasto</Label>
                <Select value={payCategory} onValueChange={setPayCategory}>
                  <SelectTrigger id="payCat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayModalOpen(false)}
                disabled={paying}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={paying}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {paying ? 'Processando...' : 'Confirmar e Debitar do Caixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
