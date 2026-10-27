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
  Pencil,
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
import { categoriasService } from '@/services/categorias'
import pb from '@/lib/pocketbase/client'
import { getTodayLocalDate, normalizeDateInput, formatDateDisplay } from '@/lib/dateUtils'
import {
  CaixaLancamento,
  Moto,
  CaixaTipo,
  FormaPagamento,
  CategoriaGasto,
  Contrato,
} from '@/types/database'

export default function CashFlow() {
  const [lancamentos, setLancamentos] = useState<CaixaLancamento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
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
  const [data, setData] = useState(getTodayLocalDate())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [submitting, setSubmitting] = useState(false)

  // Edit Entry Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMotoId, setEditMotoId] = useState('')
  const [editTipo, setEditTipo] = useState<CaixaTipo>('entrada')
  const [editDescricao, setEditDescricao] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editValor, setEditValor] = useState<number>(0)
  const [editData, setEditData] = useState(getTodayLocalDate())
  const [editFormaPagamento, setEditFormaPagamento] = useState<FormaPagamento>('pix')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const [cx, m, c] = await Promise.all([
        caixaService.getAll(),
        motosService.getAll(),
        categoriasService.getAll(),
      ])
      setLancamentos(cx)
      setMotos(m)
      setCategorias(c)
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
      const createdEntry = await caixaService.create({
        moto: motoId,
        tipo,
        descricao: descricao.trim(),
        categoria: categoria.trim() || (tipo === 'entrada' ? 'Aluguel' : 'Despesa'),
        valor: Number(valor),
        data,
        forma_pagamento: formaPagamento,
      })

      // Se for lançamento de receita (entrada), verificar se a moto possui contrato ativo com comissão cadastrada
      if (tipo === 'entrada') {
        try {
          const activeContracts = await pb.collection('contratos').getList<Contrato>(1, 1, {
            filter: `moto = "${motoId}" && status = "ativo"`,
            sort: '-created',
          })
          if (activeContracts.totalItems > 0) {
            const activeContrato = activeContracts.items[0]
            const pct = Number(
              activeContrato.comissao_percentual ?? activeContrato.percentual_comissao ?? 0,
            )
            if (pct > 0) {
              const motoObj = motos.find((m) => m.id === motoId)
              const motoNome = motoObj?.nome || motoObj?.modelo || motoObj?.placa || 'Moto'
              await caixaService.registrarComissaoSeAplicavel({
                contratoId: activeContrato.id,
                motoId,
                valorReceita: Number(valor),
                dataReceita: data,
                locatarioNome: activeContrato.locatario_nome,
                motoIdentificacao: motoNome,
                formaPagamento,
              })
            }
          }
        } catch (errComissao) {
          console.warn('Aviso ao disparar comissão de receita manual no caixa:', errComissao)
        }
      }

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

  const handleOpenEdit = (item: CaixaLancamento) => {
    setEditingId(item.id)
    setEditMotoId(item.moto || '')
    setEditTipo(item.tipo)
    setEditDescricao(item.descricao || '')
    setEditCategoria(item.categoria || '')
    setEditValor(item.valor || 0)
    setEditData(normalizeDateInput(item.data))
    setEditFormaPagamento(item.forma_pagamento || 'pix')
    setEditModalOpen(true)
  }

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    if (!editMotoId || !editDescricao.trim() || editValor <= 0 || !editData) {
      toast.error('Preencha os campos obrigatórios e valor válido')
      return
    }

    setEditSubmitting(true)
    try {
      await caixaService.update(editingId, {
        moto: editMotoId,
        tipo: editTipo,
        descricao: editDescricao.trim(),
        categoria: editCategoria.trim() || (editTipo === 'entrada' ? 'Aluguel' : 'Despesa'),
        valor: Number(editValor),
        data: editData,
        forma_pagamento: editFormaPagamento,
      })

      toast.success('Lançamento atualizado com sucesso!')
      setEditModalOpen(false)
      setEditingId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar lançamento no caixa')
    } finally {
      setEditSubmitting(false)
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
    const desc = l.descricao || ''
    const cat = l.categoria || ''
    const matchesSearch =
      desc.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase())
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        </div>
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
                    {m.nome || m.modelo} — {m.placa}
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
                          {formatDateDisplay(item.data)} •{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {moto?.nome || moto?.modelo || 'Moto'}
                          </span>
                          {moto?.placa && ` (${moto.placa})`} • Forma:{' '}
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                          title="Alterar lançamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          title="Excluir lançamento"
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
                      {m.nome || m.modelo} — {m.placa}
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
                <Label htmlFor="catSelect">Categoria de Gasto/Entrada</Label>
                {tipo === 'entrada' ? (
                  <Input
                    id="catInput"
                    placeholder="Ex: Aluguel Semanal, Caução..."
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  />
                ) : (
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger id="catSelect">
                      <SelectValue placeholder="Selecione a categoria" />
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
                )}
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

      {/* Edit Entry Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Lançamento</DialogTitle>
            <DialogDescription>
              Edite as informações do lançamento de caixa selecionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={editTipo === 'entrada' ? 'default' : 'outline'}
                  onClick={() => setEditTipo('entrada')}
                  className={editTipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                  Entrada (Receita)
                </Button>
                <Button
                  type="button"
                  variant={editTipo === 'saida' ? 'destructive' : 'outline'}
                  onClick={() => setEditTipo('saida')}
                >
                  <ArrowDownRight className="w-4 h-4 mr-1.5" />
                  Saída (Custo)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editMotoId">Moto Relacionada *</Label>
              <Select value={editMotoId} onValueChange={setEditMotoId}>
                <SelectTrigger id="editMotoId">
                  <SelectValue placeholder="Selecione a moto" />
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
              <Label htmlFor="editDesc">Descrição do Lançamento *</Label>
              <Input
                id="editDesc"
                placeholder={
                  editTipo === 'entrada'
                    ? 'Ex: Aluguel semanal Carlos'
                    : 'Ex: Troca de pastilhas de freio'
                }
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editVal">Valor (R$) *</Label>
                <Input
                  id="editVal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editValor || ''}
                  onChange={(e) => setEditValor(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEntryDate">Data *</Label>
                <Input
                  id="editEntryDate"
                  type="date"
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editForma">Forma de Pagamento</Label>
                <Select
                  value={editFormaPagamento}
                  onValueChange={(val: FormaPagamento) => setEditFormaPagamento(val)}
                >
                  <SelectTrigger id="editForma">
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
                <Label htmlFor="editCatSelect">Categoria de Gasto/Entrada</Label>
                {editTipo === 'entrada' ? (
                  <Input
                    id="editCatInput"
                    placeholder="Ex: Aluguel Semanal, Caução..."
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
                  />
                ) : (
                  <Select value={editCategoria} onValueChange={setEditCategoria}>
                    <SelectTrigger id="editCatSelect">
                      <SelectValue placeholder="Selecione a categoria" />
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
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditModalOpen(false)
                  setEditingId(null)
                }}
                disabled={editSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
