import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bike,
  Pencil,
  Trash2,
  Building2,
  User,
  Users,
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
  EntidadeTipo,
} from '@/types/database'

export const ENTIDADES_CONFIG: Record<
  EntidadeTipo,
  { label: string; chipLabel: string; descricao: string; cor: string }
> = {
  empresa: {
    label: 'EMPRESA (Custos Gerais)',
    chipLabel: 'EMPRESA',
    descricao: 'Custos gerais da empresa (aluguel do ponto, internet, contador, etc.)',
    cor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  socia: {
    label: 'EU / SÓCIA (Pró-labore/Retiradas)',
    chipLabel: 'SÓCIA',
    descricao: 'Retiradas e pró-labore da sócia',
    cor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  },
  terceiros: {
    label: 'DÍVIDAS COM TERCEIROS',
    chipLabel: 'TERCEIROS',
    descricao: 'Lançamentos e pagamentos de dívidas com terceiros',
    cor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
}

export default function CashFlow() {
  const [lancamentos, setLancamentos] = useState<CaixaLancamento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  // motoFilter pode ser 'todas', 'entidade:empresa', 'entidade:socia', 'entidade:terceiros' ou id da moto
  const [targetFilter, setTargetFilter] = useState<string>('todas')

  // New Entry Modal
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [vinculoTipo, setVinculoTipo] = useState<'moto' | 'entidade'>('moto')
  const [motoId, setMotoId] = useState('')
  const [entidade, setEntidade] = useState<EntidadeTipo>('empresa')
  const [tipo, setTipo] = useState<CaixaTipo>('entrada')
  const [descricao, setDescricao] = useState('Aluguel')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState<number>(0)
  const [data, setData] = useState(getTodayLocalDate())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenNewModal = () => {
    setTipo('entrada')
    setVinculoTipo('moto')
    // Preenche com "Aluguel" se estiver vazio ou se for a sugestão padrão
    setDescricao((prev) => (prev.trim() === '' ? 'Aluguel' : prev))
    setNewModalOpen(true)
  }

  const handleSelectTipo = (newTipo: CaixaTipo) => {
    setTipo(newTipo)
    if (newTipo === 'entrada') {
      if (vinculoTipo === 'moto') {
        setDescricao((prev) => (prev.trim() === '' || prev === 'Despesa' ? 'Aluguel' : prev))
      }
    } else {
      if (descricao === 'Aluguel') {
        setDescricao('')
      }
    }
  }

  const handleVinculoTipoChange = (novoVinculo: 'moto' | 'entidade') => {
    setVinculoTipo(novoVinculo)
    if (novoVinculo === 'entidade' && descricao === 'Aluguel') {
      setDescricao('')
    } else if (novoVinculo === 'moto' && tipo === 'entrada' && !descricao.trim()) {
      setDescricao('Aluguel')
    }
  }

  // Edit Entry Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVinculoTipo, setEditVinculoTipo] = useState<'moto' | 'entidade'>('moto')
  const [editMotoId, setEditMotoId] = useState('')
  const [editEntidade, setEditEntidade] = useState<EntidadeTipo>('empresa')
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

    if (vinculoTipo === 'moto' && !motoId) {
      toast.error('Selecione uma moto para este lançamento')
      return
    }
    if (vinculoTipo === 'entidade' && !entidade) {
      toast.error('Selecione uma entidade para este lançamento')
      return
    }
    if (!descricao.trim() || valor <= 0 || !data) {
      toast.error('Preencha os campos obrigatórios e um valor válido')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        tipo,
        descricao: descricao.trim(),
        categoria:
          categoria.trim() ||
          (tipo === 'entrada'
            ? vinculoTipo === 'moto'
              ? 'Aluguel'
              : 'Receita'
            : vinculoTipo === 'entidade'
              ? ENTIDADES_CONFIG[entidade].chipLabel
              : 'Despesa'),
        valor: Number(valor),
        data,
        forma_pagamento: formaPagamento,
      }

      if (vinculoTipo === 'moto') {
        payload.moto = motoId
        payload.entidade = ''
      } else {
        payload.moto = ''
        payload.entidade = entidade
      }

      await caixaService.create(payload)

      // Se for lançamento de receita (entrada) vinculado a moto, verificar se a moto possui contrato ativo com comissão
      // COMISSÃO AUTOMÁTICA NUNCA SE APLICA A ENTIDADES (somente contratos de moto)
      if (tipo === 'entrada' && vinculoTipo === 'moto' && motoId) {
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
      setDescricao('Aluguel')
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
    if (item.entidade) {
      setEditVinculoTipo('entidade')
      setEditEntidade(item.entidade as EntidadeTipo)
      setEditMotoId('')
    } else {
      setEditVinculoTipo('moto')
      setEditMotoId(item.moto || '')
      setEditEntidade('empresa')
    }
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

    if (editVinculoTipo === 'moto' && !editMotoId) {
      toast.error('Selecione uma moto')
      return
    }
    if (editVinculoTipo === 'entidade' && !editEntidade) {
      toast.error('Selecione uma entidade')
      return
    }
    if (!editDescricao.trim() || editValor <= 0 || !editData) {
      toast.error('Preencha os campos obrigatórios e um valor válido')
      return
    }

    setEditSubmitting(true)
    try {
      const payload: any = {
        tipo: editTipo,
        descricao: editDescricao.trim(),
        categoria:
          editCategoria.trim() ||
          (editTipo === 'entrada'
            ? editVinculoTipo === 'moto'
              ? 'Aluguel'
              : 'Receita'
            : editVinculoTipo === 'entidade'
              ? ENTIDADES_CONFIG[editEntidade].chipLabel
              : 'Despesa'),
        valor: Number(editValor),
        data: editData,
        forma_pagamento: editFormaPagamento,
      }

      if (editVinculoTipo === 'moto') {
        payload.moto = editMotoId
        payload.entidade = ''
      } else {
        payload.moto = ''
        payload.entidade = editEntidade
      }

      await caixaService.update(editingId, payload)

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

  // Filtered List para o extrato geral
  const filtered = lancamentos.filter((l) => {
    const desc = l.descricao || ''
    const cat = l.categoria || ''
    const matchesSearch =
      desc.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = tipoFilter === 'todos' || l.tipo === tipoFilter

    let matchesTarget = true
    if (targetFilter === 'todas') {
      matchesTarget = true
    } else if (targetFilter.startsWith('entidade:')) {
      const entName = targetFilter.replace('entidade:', '')
      matchesTarget = l.entidade === entName
    } else {
      matchesTarget = l.moto === targetFilter
    }

    return matchesSearch && matchesTipo && matchesTarget
  })

  // Totals gerais do extrato filtrado
  const totalEntradas = filtered
    .filter((l) => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0)
  const totalSaidas = filtered
    .filter((l) => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0)
  const saldoFinal = totalEntradas - totalSaidas

  // Dados da seleção para a tabela de fluxo detalhada (moto OU entidade)
  const isEntidadeSelected = targetFilter.startsWith('entidade:')
  const selectedEntidadeKey = isEntidadeSelected
    ? (targetFilter.replace('entidade:', '') as EntidadeTipo)
    : null
  const selectedMoto =
    !isEntidadeSelected && targetFilter !== 'todas'
      ? motos.find((m) => m.id === targetFilter)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de receitas e despesas por Moto e por Entidade (Empresa, Sócia e Terceiros).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenNewModal} className="gap-2">
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
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {isEntidadeSelected ? (
                  <Building2 className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Bike className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Fluxo Individual: Motos ou Entidades
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Selecione uma moto ou uma entidade geral para visualizar a tabela de fluxo e
                    saldo
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-80">
                <Select value={targetFilter} onValueChange={setTargetFilter}>
                  <SelectTrigger className="font-medium bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <SelectValue placeholder="Selecione moto ou entidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Motos e Entidades (Visão Geral)</SelectItem>

                    {/* Grupo: ENTIDADES GERAIS */}
                    <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 my-1">
                      Entidades Gerais da Empresa
                    </div>
                    <SelectItem value="entidade:empresa">🏢 EMPRESA (Custos Gerais)</SelectItem>
                    <SelectItem value="entidade:socia">
                      👤 EU / SÓCIA (Retiradas / Pró-labore)
                    </SelectItem>
                    <SelectItem value="entidade:terceiros">🤝 DÍVIDAS COM TERCEIROS</SelectItem>

                    {/* Grupo: MOTOS */}
                    <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 my-1">
                      Motos da Frota
                    </div>
                    {motos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        🏍️ {m.nome ? m.nome : m.modelo} {m.placa ? `(${m.placa})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Fluxo Individual (exibida quando uma moto OU entidade específica está selecionada) */}
      {targetFilter !== 'todas' &&
        (() => {
          // Filtrar lançamentos daquele alvo (moto ou entidade)
          const targetLancamentos = isEntidadeSelected
            ? lancamentos.filter((l) => l.entidade === selectedEntidadeKey)
            : lancamentos.filter((l) => l.moto === targetFilter)

          // Ordenar cronologicamente crescente para running balance correto
          const targetLancamentosAsc = [...targetLancamentos].sort((a, b) => {
            const dateA = a.data ? a.data.slice(0, 10) : ''
            const dateB = b.data ? b.data.slice(0, 10) : ''
            if (dateA !== dateB) return dateA.localeCompare(dateB)
            return (a.created || '').localeCompare(b.created || '')
          })

          let running = 0
          const rowsWithBalanceAsc = targetLancamentosAsc.map((item) => {
            if (item.tipo === 'entrada') {
              running += item.valor
            } else {
              running -= item.valor
            }
            return {
              ...item,
              runningBalance: running,
            }
          })

          // Inverter para exibição com a data MAIS RECENTE no topo (descendo para a mais antiga)
          const rowsWithBalance = [...rowsWithBalanceAsc].reverse()

          // Totais
          const targetEntradasTotal = targetLancamentosAsc
            .filter((l) => l.tipo === 'entrada')
            .reduce((sum, l) => sum + l.valor, 0)
          const targetSaidasTotal = targetLancamentosAsc
            .filter((l) => l.tipo === 'saida')
            .reduce((sum, l) => sum + l.valor, 0)
          const targetSaldoTotal = targetEntradasTotal - targetSaidasTotal

          const headerTitle = isEntidadeSelected
            ? `Fluxo de Caixa: ${ENTIDADES_CONFIG[selectedEntidadeKey!].label}`
            : `Fluxo de Caixa da Moto: ${selectedMoto?.nome || selectedMoto?.modelo || 'Moto'}`

          const headerSubtitle = isEntidadeSelected
            ? ENTIDADES_CONFIG[selectedEntidadeKey!].descricao
            : 'Histórico de movimentações (mais recentes primeiro) e saldo acumulado da moto'

          const totalLabel = isEntidadeSelected
            ? `Total ${ENTIDADES_CONFIG[selectedEntidadeKey!].chipLabel}`
            : 'Total Moto'

          return (
            <Card className="border-blue-200 dark:border-blue-900 shadow-md">
              <CardHeader className="bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {isEntidadeSelected ? (
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Bike className="w-5 h-5 text-blue-600" />
                      )}
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {headerTitle}
                      </CardTitle>
                      {!isEntidadeSelected && selectedMoto?.placa && (
                        <Badge
                          variant="outline"
                          className="bg-white dark:bg-slate-900 font-mono text-xs"
                        >
                          {selectedMoto.placa}
                        </Badge>
                      )}
                      {isEntidadeSelected && (
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${ENTIDADES_CONFIG[selectedEntidadeKey!].cor}`}
                        >
                          ENTIDADE
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">{headerSubtitle}</CardDescription>
                  </div>

                  {/* Resumo rápido do saldo */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-semibold">
                        Saldo Acumulado
                      </span>
                      <span
                        className={`text-lg font-extrabold ${
                          targetSaldoTotal >= 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-red-600'
                        }`}
                      >
                        R$ {targetSaldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rowsWithBalance.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground p-6">
                    {isEntidadeSelected ? (
                      <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    ) : (
                      <Bike className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    )}
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Nenhum lançamento registrado para este vínculo
                    </p>
                    <p className="text-xs">
                      Lançamentos de entrada e despesa vinculados aqui aparecerão nesta tabela.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                          <th className="py-2 px-2 sm:px-3 text-left font-bold whitespace-nowrap">
                            DATA
                          </th>
                          <th className="py-2 px-2 sm:px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            ENTRADAS
                          </th>
                          <th className="py-2 px-2 sm:px-3 text-right font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                            SAÍDAS
                          </th>
                          <th className="py-2 px-2 sm:px-3 text-right font-bold whitespace-nowrap bg-blue-100/60 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200">
                            SALDO
                          </th>
                          <th className="py-2 px-2 sm:px-3 text-left font-bold min-w-[130px]">
                            DESCRIÇÃO
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rowsWithBalance.map((row) => {
                          const isEntrada = row.tipo === 'entrada'
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* DATA */}
                              <td className="py-2 px-2 sm:px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                                {formatDateDisplay(row.data)}
                              </td>

                              {/* ENTRADAS */}
                              <td className="py-2 px-2 sm:px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-xs">
                                {isEntrada
                                  ? `R$ ${row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : '-'}
                              </td>

                              {/* SAÍDAS */}
                              <td className="py-2 px-2 sm:px-3 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap text-xs">
                                {!isEntrada
                                  ? `R$ ${row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : '-'}
                              </td>

                              {/* SALDO (fundo azul na coluna inteira, letra verde/vermelha) */}
                              <td
                                className={`py-2 px-2 sm:px-3 text-right font-bold whitespace-nowrap text-xs bg-blue-50/70 dark:bg-blue-950/30 ${
                                  row.runningBalance > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : row.runningBalance < 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                R${' '}
                                {row.runningBalance.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>

                              {/* DESCRIÇÃO */}
                              <td className="py-2 px-2 sm:px-3">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs break-words">
                                    {row.descricao}
                                  </span>
                                  {row.categoria && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1 font-normal shrink-0"
                                    >
                                      {row.categoria}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-xs">
                        <tr>
                          <td className="py-2 px-2 sm:px-3 text-left uppercase text-[11px] text-muted-foreground whitespace-nowrap">
                            {totalLabel}
                          </td>
                          <td className="py-2 px-2 sm:px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold whitespace-nowrap">
                            R${' '}
                            {targetEntradasTotal.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2 px-2 sm:px-3 text-right text-red-600 dark:text-red-400 font-extrabold whitespace-nowrap">
                            R${' '}
                            {targetSaidasTotal.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            className={`py-2 px-2 sm:px-3 text-right font-black whitespace-nowrap bg-blue-100/60 dark:bg-blue-950/50 ${
                              targetSaldoTotal > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : targetSaldoTotal < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            R${' '}
                            {targetSaldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 sm:px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                            {rowsWithBalance.length} mov.
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })()}

      {/* Extrato Detalhado de Lançamentos */}
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
                const isEntidade = !!item.entidade
                const entidadeConfig = isEntidade
                  ? ENTIDADES_CONFIG[item.entidade as EntidadeTipo]
                  : null

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
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{formatDateDisplay(item.data)}</span>
                          <span>•</span>
                          {isEntidade && entidadeConfig ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-1.5 font-bold ${entidadeConfig.cor}`}
                            >
                              {entidadeConfig.chipLabel}
                            </Badge>
                          ) : (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {moto?.nome || moto?.modelo || 'Moto'}
                              {moto?.placa && ` (${moto.placa})`}
                            </span>
                          )}
                          <span>
                            • Forma:{' '}
                            {item.forma_pagamento ? item.forma_pagamento.toUpperCase() : 'PIX'}
                          </span>
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
              Adicione uma receita ou despesa vinculada a uma moto ou entidade geral da empresa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntry} className="space-y-4">
            {/* Tipo de Lançamento: Entrada vs Saída */}
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'entrada' ? 'default' : 'outline'}
                  onClick={() => handleSelectTipo('entrada')}
                  className={tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                  Entrada (Receita)
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'saida' ? 'destructive' : 'outline'}
                  onClick={() => handleSelectTipo('saida')}
                >
                  <ArrowDownRight className="w-4 h-4 mr-1.5" />
                  Saída (Custo)
                </Button>
              </div>
            </div>

            {/* Vínculo: MOTO vs ENTIDADES */}
            <div className="space-y-2">
              <Label>Vincular a:</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  variant={vinculoTipo === 'moto' ? 'default' : 'ghost'}
                  onClick={() => handleVinculoTipoChange('moto')}
                  className={`gap-1.5 text-xs font-semibold ${
                    vinculoTipo === 'moto'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Moto da Frota
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={vinculoTipo === 'entidade' ? 'default' : 'ghost'}
                  onClick={() => handleVinculoTipoChange('entidade')}
                  className={`gap-1.5 text-xs font-semibold ${
                    vinculoTipo === 'entidade'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Entidade Geral
                </Button>
              </div>
            </div>

            {/* Campo condicional: Seletor de Moto OU Seletor de Entidade */}
            {vinculoTipo === 'moto' ? (
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="entidadeSelect">Entidade Relacionada *</Label>
                <Select value={entidade} onValueChange={(val: EntidadeTipo) => setEntidade(val)}>
                  <SelectTrigger id="entidadeSelect">
                    <SelectValue placeholder="Selecione a entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">
                      🏢 EMPRESA (Custos gerais: aluguel ponto, contador, etc.)
                    </SelectItem>
                    <SelectItem value="socia">👤 EU / SÓCIA (Retiradas / Pró-labore)</SelectItem>
                    <SelectItem value="terceiros">
                      🤝 TERCEIROS (Pagamento de dívidas com terceiros)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {ENTIDADES_CONFIG[entidade]?.descricao}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição do Lançamento *</Label>
              <Input
                id="desc"
                placeholder={
                  tipo === 'entrada'
                    ? vinculoTipo === 'moto'
                      ? 'Ex: Aluguel semanal Carlos'
                      : 'Ex: Aporte / Devolução'
                    : vinculoTipo === 'moto'
                      ? 'Ex: Troca de pastilhas de freio'
                      : entidade === 'empresa'
                        ? 'Ex: Aluguel do ponto comercial, Internet, Contador'
                        : entidade === 'socia'
                          ? 'Ex: Retirada de lucros sócia'
                          : 'Ex: Parcela empréstimo fornecedor'
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
                <Label htmlFor="catSelect">Categoria</Label>
                {tipo === 'entrada' ? (
                  <Input
                    id="catInput"
                    placeholder="Ex: Aluguel, Caução..."
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  />
                ) : (
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger id="catSelect">
                      <SelectValue placeholder="Selecione categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {vinculoTipo === 'entidade' && (
                        <SelectItem value={ENTIDADES_CONFIG[entidade].chipLabel}>
                          {ENTIDADES_CONFIG[entidade].chipLabel}
                        </SelectItem>
                      )}
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>
                          {c.nome}
                        </SelectItem>
                      ))}
                      <SelectItem value="Custos Gerais">Custos Gerais</SelectItem>
                      <SelectItem value="Pró-labore">Pró-labore</SelectItem>
                      <SelectItem value="Dívidas">Dívidas</SelectItem>
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
            {/* Tipo de Lançamento */}
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

            {/* Vínculo: MOTO vs ENTIDADES */}
            <div className="space-y-2">
              <Label>Vincular a:</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  variant={editVinculoTipo === 'moto' ? 'default' : 'ghost'}
                  onClick={() => setEditVinculoTipo('moto')}
                  className={`gap-1.5 text-xs font-semibold ${
                    editVinculoTipo === 'moto'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Moto da Frota
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={editVinculoTipo === 'entidade' ? 'default' : 'ghost'}
                  onClick={() => setEditVinculoTipo('entidade')}
                  className={`gap-1.5 text-xs font-semibold ${
                    editVinculoTipo === 'entidade'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Entidade Geral
                </Button>
              </div>
            </div>

            {editVinculoTipo === 'moto' ? (
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="editEntidadeSelect">Entidade Relacionada *</Label>
                <Select
                  value={editEntidade}
                  onValueChange={(val: EntidadeTipo) => setEditEntidade(val)}
                >
                  <SelectTrigger id="editEntidadeSelect">
                    <SelectValue placeholder="Selecione a entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa">
                      🏢 EMPRESA (Custos gerais: aluguel ponto, contador, etc.)
                    </SelectItem>
                    <SelectItem value="socia">👤 EU / SÓCIA (Retiradas / Pró-labore)</SelectItem>
                    <SelectItem value="terceiros">
                      🤝 TERCEIROS (Pagamento de dívidas com terceiros)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="editDesc">Descrição do Lançamento *</Label>
              <Input
                id="editDesc"
                placeholder="Descrição da movimentação"
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
                <Label htmlFor="editCatSelect">Categoria</Label>
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
                      {editVinculoTipo === 'entidade' && (
                        <SelectItem value={ENTIDADES_CONFIG[editEntidade].chipLabel}>
                          {ENTIDADES_CONFIG[editEntidade].chipLabel}
                        </SelectItem>
                      )}
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>
                          {c.nome}
                        </SelectItem>
                      ))}
                      <SelectItem value="Custos Gerais">Custos Gerais</SelectItem>
                      <SelectItem value="Pró-labore">Pró-labore</SelectItem>
                      <SelectItem value="Dívidas">Dívidas</SelectItem>
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
