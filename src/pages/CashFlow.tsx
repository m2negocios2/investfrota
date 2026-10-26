import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Calendar,
  Trash2,
  Bike,
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
import { toast } from 'sonner'
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { CaixaLancamento, Moto, CaixaTipo, FormaPagamento } from '@/types/database'

export default function CashFlow() {
  const [lancamentos, setLancamentos] = useState<CaixaLancamento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [motoFilter, setMotoFilter] = useState<string>('todas')

  // New Entry Modal
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [motoId, setMotoId] = useState('')
  const [tipo, setTipo] = useState<CaixaTipo>('entrada')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState<number>(0)
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const [cx, m] = await Promise.all([caixaService.getAll(), motosService.getAll()])
      setLancamentos(cx)
      setMotos(m)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar livro caixa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoId || !descricao.trim() || valor <= 0 || !data) {
      toast.error('Preencha os campos obrigatórios e valor válido')
      return
    }

    setSubmitting(true)
    try {
      await caixaService.create({
        moto: motoId,
        tipo,
        descricao: descricao.trim(),
        categoria: categoria.trim() || (tipo === 'entrada' ? 'Aluguel' : 'Despesa'),
        valor: Number(valor),
        data,
        forma_pagamento: formaPagamento,
      })

      toast.success('Lançamento registrado com sucesso no caixa!')
      setNewModalOpen(false)
      setDescricao('')
      setValor(0)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao lançar no caixa')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento?')) return
    try {
      await caixaService.delete(id)
      toast.success('Lançamento removido')
      setLancamentos(lancamentos.filter((l) => l.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Erro ao remover lançamento')
    }
  }

  // Filtered List
  const filtered = lancamentos.filter((l) => {
    const matchesSearch =
      l.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (l.categoria && l.categoria.toLowerCase().includes(search.toLowerCase()))
    const matchesTipo = tipoFilter === 'todos' || l.tipo === tipoFilter
    const matchesMoto = motoFilter === 'todas' || l.moto === motoFilter
    return matchesSearch && matchesTipo && matchesMoto
  })

  // Totals
  const totalEntradas = filtered
    .filter((l) => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0)
  const totalSaidas = filtered
    .filter((l) => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0)
  const saldoFinal = totalEntradas - totalSaidas

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de entradas (aluguéis) e saídas (manutenções, custos) por moto.
          </p>
        </div>
        <Button onClick={() => setNewModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Lançamento no Caixa
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total de Entradas
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total de Saídas
            </CardTitle>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Saldo Líquido
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-blue-600' : 'text-red-600'}`}
            >
              R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Movimentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Movimentações</SelectItem>
                <SelectItem value="entrada">Apenas Entradas (Receitas)</SelectItem>
                <SelectItem value="saida">Apenas Saídas (Despesas)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={motoFilter} onValueChange={setMotoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Moto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Motos</SelectItem>
                {motos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.modelo} - {m.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Extrato Detalhado de Lançamentos</CardTitle>
          <CardDescription>{filtered.length} registro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Nenhum lançamento encontrado
              </p>
              <p className="text-xs">Registre uma nova entrada ou saída para atualizar o caixa.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => {
                const moto = motos.find((m) => m.id === item.moto)
                return (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                          item.tipo === 'entrada'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                        }`}
                      >
                        {item.tipo === 'entrada' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {item.descricao}
                          </p>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {item.categoria || item.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.data).toLocaleDateString('pt-BR')} •{' '}
                          {moto ? `${moto.modelo} (${moto.placa})` : 'Moto'} • Forma:{' '}
                          {item.forma_pagamento ? item.forma_pagamento.toUpperCase() : 'PIX'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span
                        className={`text-base font-bold ${
                          item.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {item.tipo === 'entrada' ? '+' : '-'} R${' '}
                        {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Entry Modal */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lançamento no Caixa</DialogTitle>
            <DialogDescription>
              Adicione uma receita ou despesa vinculada a uma moto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'entrada' ? 'default' : 'outline'}
                  onClick={() => setTipo('entrada')}
                  className={tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                  Entrada (Receita)
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'saida' ? 'destructive' : 'outline'}
                  onClick={() => setTipo('saida')}
                >
                  <ArrowDownRight className="w-4 h-4 mr-1.5" />
                  Saída (Custo)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motoId">Moto Relacionada *</Label>
              <Select value={motoId} onValueChange={setMotoId}>
                <SelectTrigger id="motoId">
                  <SelectValue placeholder="Selecione a moto" />
                </SelectTrigger>
                <SelectContent>
                  {motos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.modelo} ({m.placa})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição do Lançamento *</Label>
              <Input
                id="desc"
                placeholder={
                  tipo === 'entrada'
                    ? 'Ex: Aluguel semanal Carlos'
                    : 'Ex: Troca de pastilhas de freio'
                }
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="val">Valor (R$) *</Label>
                <Input
                  id="val"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor || ''}
                  onChange={(e) => setValor(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryDate">Data *</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="forma">Forma de Pagamento</Label>
                <Select
                  value={formaPagamento}
                  onValueChange={(val: FormaPagamento) => setFormaPagamento(val)}
                >
                  <SelectTrigger id="forma">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat">Categoria</Label>
                <Input
                  id="cat"
                  placeholder="Ex: Aluguel, Oficina, IPVA"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Confirmar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
