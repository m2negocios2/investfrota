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
  CheckCircle2,
  LayoutGrid,
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
import { empresaService, sociosService } from '@/services/cadastros'
import { contasAPagarService } from '@/services/contasAPagar'
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
  Socio,
  ContaAPagar,
  EmpresaConfig,
} from '@/types/database'
import { MotoCardButton, MotoGridSelector } from '@/components/MotoSelectorGrid'

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
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null)
  const [socios, setSocios] = useState<Socio[]>([])
  const [contasAPagar, setContasAPagar] = useState<ContaAPagar[]>([])
  const [loading, setLoading] = useState(true)

  // Sub-filtros quando entidade:socia ou entidade:terceiros está selecionada
  // 'todos' ou id do sócio
  const [selectedSocioFilter, setSelectedSocioFilter] = useState<string>('todos')
  // 'todas' ou id da conta a pagar
  const [selectedContaFilter, setSelectedContaFilter] = useState<string>('todas')

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
  const [socioId, setSocioId] = useState<string>('')
  const [contaAPagarId, setContaAPagarId] = useState<string>('')
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
    setMotoId('')
    setEntidade('empresa')
    setSocioId('')
    setContaAPagarId('')
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
  const [editSocioId, setEditSocioId] = useState<string>('')
  const [editContaAPagarId, setEditContaAPagarId] = useState<string>('')
  const [editTipo, setEditTipo] = useState<CaixaTipo>('entrada')
  const [editDescricao, setEditDescricao] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editValor, setEditValor] = useState<number>(0)
  const [editData, setEditData] = useState(getTodayLocalDate())
  const [editFormaPagamento, setEditFormaPagamento] = useState<FormaPagamento>('pix')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const [cx, m, c, emp, socList, contList] = await Promise.all([
        caixaService.getAll(),
        motosService.getAll(),
        categoriasService.getAll(),
        empresaService.get(),
        sociosService.getAll(),
        contasAPagarService.getAllWithProgresso(),
      ])
      setLancamentos(cx)
      setMotos(m)
      setCategorias(c)
      setEmpresaConfig(emp)
      setSocios(socList)
      setContasAPagar(contList)
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
      toast.error('Selecione um participante para este lançamento')
      return
    }
    if (!descricao.trim() || valor <= 0 || !data) {
      toast.error('Preencha os campos obrigatórios e um valor válido')
      return
    }

    setSubmitting(true)
    try {
      const socioObj = entidade === 'socia' && socioId ? socios.find((s) => s.id === socioId) : null
      const contaObj =
        entidade === 'terceiros' && contaAPagarId
          ? contasAPagar.find((c) => c.id === contaAPagarId)
          : null

      const fallbackCat =
        tipo === 'entrada'
          ? vinculoTipo === 'moto'
            ? 'Aluguel'
            : 'Receita'
          : vinculoTipo === 'entidade'
            ? ENTIDADES_CONFIG[entidade].chipLabel
            : 'Despesa'

      const payload: any = {
        tipo,
        descricao: descricao.trim(),
        categoria: categoria.trim() || fallbackCat,
        valor: Number(valor),
        data,
        forma_pagamento: formaPagamento,
      }

      if (vinculoTipo === 'moto') {
        payload.moto = motoId
        payload.entidade = ''
        payload.socio = ''
        payload.conta_a_pagar = ''
      } else {
        payload.moto = ''
        payload.entidade = entidade
        payload.socio = entidade === 'socia' ? socioId : ''
        payload.conta_a_pagar = entidade === 'terceiros' ? contaAPagarId : ''
        if (entidade === 'socia' && socioObj?.nome) {
          payload.observacoes = `Sócio vinculado: ${socioObj.nome}`
        } else if (entidade === 'terceiros' && contaObj?.credor) {
          payload.observacoes = `Conta a pagar: ${contaObj.credor} — ${contaObj.descricao}`
        }
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
                locatarioNome: activeContrato.locatario_nome || '',
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
      setEditSocioId(item.socio || '')
      setEditContaAPagarId(item.conta_a_pagar || '')
      setEditMotoId('')
    } else {
      setEditVinculoTipo('moto')
      setEditMotoId(item.moto || '')
      setEditEntidade('empresa')
      setEditSocioId('')
      setEditContaAPagarId('')
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
      toast.error('Selecione um participante')
      return
    }
    if (!editDescricao.trim() || editValor <= 0 || !editData) {
      toast.error('Preencha os campos obrigatórios e um valor válido')
      return
    }

    setEditSubmitting(true)
    try {
      const editSocioObj =
        editEntidade === 'socia' && editSocioId ? socios.find((s) => s.id === editSocioId) : null
      const editContaObj =
        editEntidade === 'terceiros' && editContaAPagarId
          ? contasAPagar.find((c) => c.id === editContaAPagarId)
          : null

      const fallbackCat =
        editTipo === 'entrada'
          ? editVinculoTipo === 'moto'
            ? 'Aluguel'
            : 'Receita'
          : editVinculoTipo === 'entidade'
            ? ENTIDADES_CONFIG[editEntidade].chipLabel
            : 'Despesa'

      const payload: any = {
        tipo: editTipo,
        descricao: editDescricao.trim(),
        categoria: editCategoria.trim() || fallbackCat,
        valor: Number(editValor),
        data: editData,
        forma_pagamento: editFormaPagamento,
      }

      if (editVinculoTipo === 'moto') {
        payload.moto = editMotoId
        payload.entidade = ''
        payload.socio = ''
        payload.conta_a_pagar = ''
      } else {
        payload.moto = ''
        payload.entidade = editEntidade
        payload.socio = editEntidade === 'socia' ? editSocioId : ''
        payload.conta_a_pagar = editEntidade === 'terceiros' ? editContaAPagarId : ''
        if (editEntidade === 'socia' && editSocioObj?.nome) {
          payload.observacoes = `Sócio vinculado: ${editSocioObj.nome}`
        } else if (editEntidade === 'terceiros' && editContaObj?.credor) {
          payload.observacoes = `Conta a pagar: ${editContaObj.credor} — ${editContaObj.descricao}`
        }
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
    const socioNome = l.expand?.socio?.nome || ''
    const credorNome = l.expand?.conta_a_pagar?.credor || ''
    const matchesSearch =
      desc.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase()) ||
      socioNome.toLowerCase().includes(search.toLowerCase()) ||
      credorNome.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = tipoFilter === 'todos' || l.tipo === tipoFilter

    let matchesTarget = true
    if (targetFilter === 'todas') {
      matchesTarget = true
    } else if (targetFilter.startsWith('entidade:')) {
      const entName = targetFilter.replace('entidade:', '')
      if (l.entidade !== entName) {
        matchesTarget = false
      } else {
        // Se for socia e tiver filtro de sócio específico
        if (entName === 'socia' && selectedSocioFilter !== 'todos') {
          matchesTarget = l.socio === selectedSocioFilter
        }
        // Se for terceiros e tiver filtro de conta específica
        else if (entName === 'terceiros' && selectedContaFilter !== 'todas') {
          matchesTarget = l.conta_a_pagar === selectedContaFilter
        }
      }
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

  // Nome da empresa cadastrada (fallback para 'Empresa')
  const nomeEmpresaDisplay = empresaConfig?.nome_empresa?.trim() || 'Empresa'

  // Dados da seleção para a tabela de fluxo detalhada (moto OU entidade)
  const isEntidadeSelected = targetFilter.startsWith('entidade:')
  const selectedEntidadeKey = isEntidadeSelected
    ? (targetFilter.replace('entidade:', '') as EntidadeTipo)
    : null
  const selectedMoto =
    !isEntidadeSelected && targetFilter !== 'todas'
      ? motos.find((m) => m.id === targetFilter)
      : null

  // Sócio / Conta selecionados no sub-filtro da visualização detalhada
  const activeSocioFilterObj =
    selectedEntidadeKey === 'socia' && selectedSocioFilter !== 'todos'
      ? socios.find((s) => s.id === selectedSocioFilter)
      : null
  const activeContaFilterObj =
    selectedEntidadeKey === 'terceiros' && selectedContaFilter !== 'todas'
      ? contasAPagar.find((c) => c.id === selectedContaFilter)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fluxo de Caixa
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de receitas e despesas por Moto e por Outros Participantes (
            {nomeEmpresaDisplay}, Sócios e Terceiros).
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

      {/* Seletor em Grade de Motos e Entidades */}
      <Card className="shadow-sm border-2 border-slate-200/80 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bike className="w-5 h-5 text-blue-600" />
                Escolha a Moto ou Entidade para ver o Fluxo
              </CardTitle>
              <CardDescription>
                Toque no botão da moto ou entidade para atualizar a tabela de fluxo de caixa e
                saldo.
              </CardDescription>
            </div>

            {/* Botão de Visão Geral (Todas) */}
            <button
              type="button"
              onClick={() => setTargetFilter('todas')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                targetFilter === 'todas'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Todas (Visão Geral)
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Grade de Motos da Frota com ícone colorido e nome */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-blue-600" />
                Motos da Frota
              </span>
              {selectedMoto && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selecionada:{' '}
                  {selectedMoto.nome?.trim() || selectedMoto.modelo?.trim() || selectedMoto.placa}
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                Carregando motos...
              </div>
            ) : motos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                Nenhuma moto cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {motos.map((m) => (
                  <MotoCardButton
                    key={m.id}
                    moto={m}
                    isSelected={targetFilter === m.id}
                    onClick={() => setTargetFilter(m.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Grupo OUTROS PARTICIPANTES */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                OUTROS PARTICIPANTES
              </span>
              {isEntidadeSelected && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selecionado:{' '}
                  {selectedEntidadeKey === 'empresa'
                    ? nomeEmpresaDisplay
                    : selectedEntidadeKey === 'socia'
                      ? activeSocioFilterObj
                        ? `Sócios (${activeSocioFilterObj.nome})`
                        : 'Sócios'
                      : activeContaFilterObj
                        ? `Terceiros (${activeContaFilterObj.credor})`
                        : 'Terceiros'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* EMPRESA (exibe o nome cadastrado em Cadastros) */}
              <button
                type="button"
                onClick={() => setTargetFilter('entidade:empresa')}
                className={`relative min-h-[64px] sm:min-h-[72px] p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none active:scale-[0.98] ${
                  targetFilter === 'entidade:empresa'
                    ? 'border-amber-600 dark:border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 ring-2 ring-amber-600/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
                    targetFilter === 'entidade:empresa'
                      ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-600 shadow-sm'
                      : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-600'
                  }`}
                >
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-black text-sm sm:text-base leading-tight truncate ${
                      targetFilter === 'entidade:empresa'
                        ? 'text-amber-950 dark:text-amber-100'
                        : 'text-slate-900 dark:text-white'
                    }`}
                    title={nomeEmpresaDisplay}
                  >
                    🏢 {nomeEmpresaDisplay.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-none mt-0.5">
                    Custos Gerais (ponto, luz, etc.)
                  </p>
                </div>
                {targetFilter === 'entidade:empresa' && (
                  <div className="absolute top-1.5 right-1.5 bg-amber-600 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* SÓCIOS (abre aba mostrando os sócios cadastrados) */}
              <button
                type="button"
                onClick={() => setTargetFilter('entidade:socia')}
                className={`relative min-h-[64px] sm:min-h-[72px] p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none active:scale-[0.98] ${
                  targetFilter === 'entidade:socia'
                    ? 'border-purple-600 dark:border-purple-500 bg-purple-50/90 dark:bg-purple-950/60 ring-2 ring-purple-600/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
                    targetFilter === 'entidade:socia'
                      ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-600 shadow-sm'
                      : 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900 text-purple-600'
                  }`}
                >
                  <User className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-black text-sm sm:text-base leading-tight truncate ${
                      targetFilter === 'entidade:socia'
                        ? 'text-purple-950 dark:text-purple-100'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    👤 SÓCIOS
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-none mt-0.5">
                    {socios.length > 0
                      ? `${socios.length} sócio(s) cadastrado(s)`
                      : 'Retiradas / Pró-labore'}
                  </p>
                </div>
                {targetFilter === 'entidade:socia' && (
                  <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* TERCEIROS (abre aba mostrando as contas a pagar cadastradas) */}
              <button
                type="button"
                onClick={() => setTargetFilter('entidade:terceiros')}
                className={`relative min-h-[64px] sm:min-h-[72px] p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none active:scale-[0.98] ${
                  targetFilter === 'entidade:terceiros'
                    ? 'border-rose-600 dark:border-rose-500 bg-rose-50/90 dark:bg-rose-950/60 ring-2 ring-rose-600/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
                    targetFilter === 'entidade:terceiros'
                      ? 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 text-rose-600 shadow-sm'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-600'
                  }`}
                >
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-black text-sm sm:text-base leading-tight truncate ${
                      targetFilter === 'entidade:terceiros'
                        ? 'text-rose-950 dark:text-rose-100'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    🤝 TERCEIROS
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-none mt-0.5">
                    {contasAPagar.length > 0
                      ? `${contasAPagar.length} conta(s) a pagar`
                      : 'Dívidas com Terceiros'}
                  </p>
                </div>
                {targetFilter === 'entidade:terceiros' && (
                  <div className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            </div>

            {/* ABA EXPANSÍVEL: Sócios cadastrados para escolher ao clicar em SÓCIOS */}
            {targetFilter === 'entidade:socia' && (
              <div className="mt-3 p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900 space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    Filtrar por Sócio Cadastrado:
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {socios.length} cadastrado(s) em Cadastros
                  </span>
                </div>
                {socios.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Nenhum sócio cadastrado ainda em Cadastros → Sócios da Empresa.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedSocioFilter === 'todos' ? 'default' : 'outline'}
                      onClick={() => setSelectedSocioFilter('todos')}
                      className={`h-7 text-xs font-semibold ${
                        selectedSocioFilter === 'todos'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-white dark:bg-slate-900 border-purple-200 text-purple-900 dark:text-purple-200'
                      }`}
                    >
                      Todos os Sócios
                    </Button>
                    {socios.map((s) => (
                      <Button
                        key={s.id}
                        type="button"
                        size="sm"
                        variant={selectedSocioFilter === s.id ? 'default' : 'outline'}
                        onClick={() => setSelectedSocioFilter(s.id)}
                        className={`h-7 text-xs font-semibold ${
                          selectedSocioFilter === s.id
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-purple-200 text-purple-900 dark:text-purple-200 hover:bg-purple-100/50'
                        }`}
                      >
                        👤 {s.nome}
                        {s.participacao_percentual !== undefined &&
                          s.participacao_percentual > 0 && (
                            <span className="ml-1 opacity-75 font-normal">
                              ({s.participacao_percentual}%)
                            </span>
                          )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA EXPANSÍVEL: Contas a pagar cadastradas ao clicar em TERCEIROS */}
            {targetFilter === 'entidade:terceiros' && (
              <div className="mt-3 p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    Filtrar por Conta a Pagar Cadastrada:
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {contasAPagar.length} conta(s) em Contas a Pagar
                  </span>
                </div>
                {contasAPagar.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Nenhuma conta a pagar cadastrada no módulo Contas a Pagar.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedContaFilter === 'todas' ? 'default' : 'outline'}
                      onClick={() => setSelectedContaFilter('todas')}
                      className={`h-7 text-xs font-semibold ${
                        selectedContaFilter === 'todas'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-white dark:bg-slate-900 border-rose-200 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      Todas as Dívidas
                    </Button>
                    {contasAPagar.map((c) => (
                      <Button
                        key={c.id}
                        type="button"
                        size="sm"
                        variant={selectedContaFilter === c.id ? 'default' : 'outline'}
                        onClick={() => setSelectedContaFilter(c.id)}
                        className={`h-7 text-xs font-semibold ${
                          selectedContaFilter === c.id
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-rose-200 text-rose-900 dark:text-rose-200 hover:bg-rose-100/50'
                        }`}
                      >
                        🤝 {c.credor}
                        {c.descricao && (
                          <span className="ml-1 opacity-75 font-normal">— {c.descricao}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Busca e Filtro de Tipo para o Extrato */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Tipo de Movimentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Movimentações</SelectItem>
                <SelectItem value="entrada">Apenas Entradas (Receitas)</SelectItem>
                <SelectItem value="saida">Apenas Saídas (Despesas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Fluxo Individual (exibida quando uma moto OU entidade específica está selecionada) */}
      {targetFilter !== 'todas' &&
        (() => {
          // Filtrar lançamentos daquele alvo (moto ou participante)
          const targetLancamentos = isEntidadeSelected
            ? lancamentos.filter((l) => {
                if (l.entidade !== selectedEntidadeKey) return false
                if (selectedEntidadeKey === 'socia' && selectedSocioFilter !== 'todos') {
                  return l.socio === selectedSocioFilter
                }
                if (selectedEntidadeKey === 'terceiros' && selectedContaFilter !== 'todas') {
                  return l.conta_a_pagar === selectedContaFilter
                }
                return true
              })
            : lancamentos.filter((l) => l.moto === targetFilter)

          // Sub-título explicativo se um filtro específico de sócio ou conta estiver ativo
          const subFiltroAtivoBadge =
            selectedEntidadeKey === 'socia' && activeSocioFilterObj ? (
              <span className="text-xs font-normal text-purple-700 dark:text-purple-300 ml-2">
                (Filtrando: {activeSocioFilterObj.nome})
              </span>
            ) : selectedEntidadeKey === 'terceiros' && activeContaFilterObj ? (
              <span className="text-xs font-normal text-rose-700 dark:text-rose-300 ml-2">
                (Filtrando: {activeContaFilterObj.credor})
              </span>
            ) : null

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
            ? selectedEntidadeKey === 'empresa'
              ? `Fluxo de Caixa: ${nomeEmpresaDisplay}`
              : selectedEntidadeKey === 'socia'
                ? activeSocioFilterObj
                  ? `Fluxo de Caixa: Sócio — ${activeSocioFilterObj.nome}`
                  : 'Fluxo de Caixa: Sócios'
                : activeContaFilterObj
                  ? `Fluxo de Caixa: Terceiros — ${activeContaFilterObj.credor}`
                  : 'Fluxo de Caixa: Dívidas com Terceiros'
            : `Fluxo de Caixa da Moto: ${selectedMoto?.nome || selectedMoto?.modelo || 'Moto'}`

          const headerSubtitle = isEntidadeSelected
            ? selectedEntidadeKey === 'empresa'
              ? `Custos gerais da empresa ${nomeEmpresaDisplay}`
              : selectedEntidadeKey === 'socia'
                ? activeSocioFilterObj
                  ? `Retiradas e pró-labore vinculados a ${activeSocioFilterObj.nome}`
                  : 'Retiradas e pró-labore dos sócios'
                : activeContaFilterObj
                  ? `Lançamentos e parcelas de dívida com ${activeContaFilterObj.credor}`
                  : 'Lançamentos e pagamentos de dívidas com terceiros'
            : 'Histórico de movimentações (mais recentes primeiro) e saldo acumulado da moto'

          const totalLabel = isEntidadeSelected
            ? selectedEntidadeKey === 'empresa'
              ? `Total ${nomeEmpresaDisplay}`
              : selectedEntidadeKey === 'socia'
                ? activeSocioFilterObj
                  ? `Total Sócio (${activeSocioFilterObj.nome})`
                  : 'Total Sócios'
                : activeContaFilterObj
                  ? `Total Terceiros (${activeContaFilterObj.credor})`
                  : 'Total Terceiros'
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
                        {subFiltroAtivoBadge}
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
                          className={`text-xs font-semibold ${
                            selectedEntidadeKey === 'empresa'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : selectedEntidadeKey === 'socia'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {selectedEntidadeKey === 'empresa'
                            ? nomeEmpresaDisplay
                            : selectedEntidadeKey === 'socia'
                              ? activeSocioFilterObj?.nome || 'SÓCIOS'
                              : activeContaFilterObj?.credor || 'TERCEIROS'}
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
                          {isEntidade ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-1.5 font-bold ${
                                item.entidade === 'empresa'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : item.entidade === 'socia'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {item.entidade === 'empresa'
                                ? nomeEmpresaDisplay
                                : item.entidade === 'socia'
                                  ? item.expand?.socio?.nome
                                    ? `SÓCIO: ${item.expand.socio.nome}`
                                    : 'SÓCIA'
                                  : item.expand?.conta_a_pagar?.credor
                                    ? `TERCEIRO: ${item.expand.conta_a_pagar.credor}`
                                    : 'TERCEIROS'}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lançamento no Caixa</DialogTitle>
            <DialogDescription>
              Adicione uma receita ou despesa vinculada a uma moto ou a outros participantes (
              {nomeEmpresaDisplay}, Sócios e Terceiros).
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

            {/* Vínculo: MOTO vs OUTROS PARTICIPANTES */}
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
                  Outros Participantes
                </Button>
              </div>
            </div>

            {/* Campo condicional: Grade de Motos OU Seletor de Outros Participantes */}
            {vinculoTipo === 'moto' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Moto Relacionada *</Label>
                  {motoId && (
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {(() => {
                        const m = motos.find((item) => item.id === motoId)
                        return m ? m.nome?.trim() || m.modelo?.trim() || m.placa : ''
                      })()}
                    </span>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2">
                    {motos.map((m) => (
                      <MotoCardButton
                        key={m.id}
                        moto={m}
                        isSelected={motoId === m.id}
                        onClick={() => setMotoId(m.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
                {!motoId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Toque na moto que receberá este lançamento.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="entidadeSelect"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Participante *
                  </Label>
                  <Select value={entidade} onValueChange={(val: EntidadeTipo) => setEntidade(val)}>
                    <SelectTrigger id="entidadeSelect">
                      <SelectValue placeholder="Selecione o participante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">
                        🏢 {nomeEmpresaDisplay.toUpperCase()} (Custos Gerais)
                      </SelectItem>
                      <SelectItem value="socia">👤 SÓCIOS (Retiradas / Pró-labore)</SelectItem>
                      <SelectItem value="terceiros">
                        🤝 TERCEIROS (Contas a Pagar / Dívidas)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Se escolheu SÓCIOS: campo de escolha mostrando os sócios cadastrados */}
                {entidade === 'socia' && (
                  <div className="space-y-1.5 pt-1 border-t border-purple-200 dark:border-purple-900/60">
                    <Label
                      htmlFor="socioSelect"
                      className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center justify-between"
                    >
                      <span>Sócio Cadastrado (opcional ou escolher sócio)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Cadastros → Sócios
                      </span>
                    </Label>
                    <Select
                      value={socioId || 'sem_especificar'}
                      onValueChange={(val) => setSocioId(val === 'sem_especificar' ? '' : val)}
                    >
                      <SelectTrigger
                        id="socioSelect"
                        className="border-purple-300 dark:border-purple-800"
                      >
                        <SelectValue placeholder="Selecione o sócio cadastrado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_especificar">
                          👤 EU / SÓCIA (Geral / Sem especificar)
                        </SelectItem>
                        {socios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            👤 {s.nome} {s.funcao ? `— ${s.funcao}` : ''}{' '}
                            {s.participacao_percentual !== undefined &&
                            s.participacao_percentual > 0
                              ? `(${s.participacao_percentual}%)`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Se escolheu TERCEIROS: campo de escolha mostrando as contas a pagar cadastradas */}
                {entidade === 'terceiros' && (
                  <div className="space-y-1.5 pt-1 border-t border-rose-200 dark:border-rose-900/60">
                    <Label
                      htmlFor="contaSelect"
                      className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center justify-between"
                    >
                      <span>Conta a Pagar Cadastrada (opcional ou escolher dívida)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Módulo Contas a Pagar
                      </span>
                    </Label>
                    <Select
                      value={contaAPagarId || 'sem_especificar'}
                      onValueChange={(val) =>
                        setContaAPagarId(val === 'sem_especificar' ? '' : val)
                      }
                    >
                      <SelectTrigger
                        id="contaSelect"
                        className="border-rose-300 dark:border-rose-800"
                      >
                        <SelectValue placeholder="Selecione a conta/dívida cadastrada" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_especificar">
                          🤝 TERCEIROS (Geral / Sem especificar)
                        </SelectItem>
                        {contasAPagar.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            🤝 {c.credor} — {c.descricao} (Total R$ {c.valor_total.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Vínculo: MOTO vs OUTROS PARTICIPANTES */}
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
                  Outros Participantes
                </Button>
              </div>
            </div>

            {editVinculoTipo === 'moto' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Moto Relacionada *</Label>
                  {editMotoId && (
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {(() => {
                        const m = motos.find((item) => item.id === editMotoId)
                        return m ? m.nome?.trim() || m.modelo?.trim() || m.placa : ''
                      })()}
                    </span>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2">
                    {motos.map((m) => (
                      <MotoCardButton
                        key={m.id}
                        moto={m}
                        isSelected={editMotoId === m.id}
                        onClick={() => setEditMotoId(m.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
                {!editMotoId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Toque na moto desejada.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="editEntidadeSelect"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Participante *
                  </Label>
                  <Select
                    value={editEntidade}
                    onValueChange={(val: EntidadeTipo) => setEditEntidade(val)}
                  >
                    <SelectTrigger id="editEntidadeSelect">
                      <SelectValue placeholder="Selecione o participante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">
                        🏢 {nomeEmpresaDisplay.toUpperCase()} (Custos Gerais)
                      </SelectItem>
                      <SelectItem value="socia">👤 SÓCIOS (Retiradas / Pró-labore)</SelectItem>
                      <SelectItem value="terceiros">
                        🤝 TERCEIROS (Contas a Pagar / Dívidas)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Se for sócios no edit modal */}
                {editEntidade === 'socia' && (
                  <div className="space-y-1.5 pt-1 border-t border-purple-200 dark:border-purple-900/60">
                    <Label
                      htmlFor="editSocioSelect"
                      className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center justify-between"
                    >
                      <span>Sócio Cadastrado (opcional ou escolher sócio)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Cadastros → Sócios
                      </span>
                    </Label>
                    <Select
                      value={editSocioId || 'sem_especificar'}
                      onValueChange={(val) => setEditSocioId(val === 'sem_especificar' ? '' : val)}
                    >
                      <SelectTrigger
                        id="editSocioSelect"
                        className="border-purple-300 dark:border-purple-800"
                      >
                        <SelectValue placeholder="Selecione o sócio cadastrado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_especificar">
                          👤 EU / SÓCIA (Geral / Sem especificar)
                        </SelectItem>
                        {socios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            👤 {s.nome} {s.funcao ? `— ${s.funcao}` : ''}{' '}
                            {s.participacao_percentual !== undefined &&
                            s.participacao_percentual > 0
                              ? `(${s.participacao_percentual}%)`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Se for terceiros no edit modal */}
                {editEntidade === 'terceiros' && (
                  <div className="space-y-1.5 pt-1 border-t border-rose-200 dark:border-rose-900/60">
                    <Label
                      htmlFor="editContaSelect"
                      className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center justify-between"
                    >
                      <span>Conta a Pagar Cadastrada (opcional ou escolher dívida)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Módulo Contas a Pagar
                      </span>
                    </Label>
                    <Select
                      value={editContaAPagarId || 'sem_especificar'}
                      onValueChange={(val) =>
                        setEditContaAPagarId(val === 'sem_especificar' ? '' : val)
                      }
                    >
                      <SelectTrigger
                        id="editContaSelect"
                        className="border-rose-300 dark:border-rose-800"
                      >
                        <SelectValue placeholder="Selecione a conta/dívida cadastrada" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_especificar">
                          🤝 TERCEIROS (Geral / Sem especificar)
                        </SelectItem>
                        {contasAPagar.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            🤝 {c.credor} — {c.descricao} (Total R$ {c.valor_total.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
