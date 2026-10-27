import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Plus,
  Bike,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  UserCheck,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { caucoesService } from '@/services/caucoes'
import { motosService } from '@/services/motos'
import { getTodayLocalDate, dateToApiMidday, formatDateDisplay } from '@/lib/dateUtils'
import { Caucao, Moto, CaucaoPosse, CaucaoStatus } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

export default function Caucoes() {
  const { isProprietario } = useAuth()
  const [caucoes, setCaucoes] = useState<Caucao[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterPosse, setFilterPosse] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchMoto, setSearchMoto] = useState('')

  // Form Modal (Add / Edit)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCaucao, setEditingCaucao] = useState<Caucao | null>(null)
  const [motoId, setMotoId] = useState('')
  const [valor, setValor] = useState<string>('')
  const [data, setData] = useState(getTodayLocalDate())
  const [posse, setPosse] = useState<CaucaoPosse>('proprietario')
  const [status, setStatus] = useState<CaucaoStatus>('retida')
  const [dataDevolucao, setDataDevolucao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    try {
      const [cList, mList] = await Promise.all([caucoesService.getAll(), motosService.getAll()])
      setCaucoes(cList)
      setMotos(mList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar cauções')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openNewModal = () => {
    setEditingCaucao(null)
    setMotoId(motos[0]?.id || '')
    setValor('')
    setData(getTodayLocalDate())
    setPosse(isProprietario ? 'proprietario' : 'adm')
    setStatus('retida')
    setDataDevolucao('')
    setObservacao('')
    setFormOpen(true)
  }

  const openEditModal = (c: Caucao) => {
    setEditingCaucao(c)
    setMotoId(c.moto)
    setValor(String(c.valor))
    setData(c.data ? c.data.split('T')[0] : '')
    setPosse(c.posse)
    setStatus(c.status || 'retida')
    setDataDevolucao(c.data_devolucao ? c.data_devolucao.split('T')[0] : '')
    setObservacao(c.observacao || '')
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoId) {
      toast.error('Selecione uma moto')
      return
    }
    const numValor = parseFloat(valor)
    if (isNaN(numValor) || numValor <= 0) {
      toast.error('Informe um valor válido maior que zero')
      return
    }
    if (!data) {
      toast.error('Informe a data')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        moto: motoId,
        valor: numValor,
        data: data ? dateToApiMidday(data) : dateToApiMidday(getTodayLocalDate()),
        posse,
        status,
        observacao: observacao.trim(),
      }

      if (status === 'devolvida') {
        payload.data_devolucao = dataDevolucao
          ? dateToApiMidday(dataDevolucao)
          : dateToApiMidday(getTodayLocalDate())
      } else {
        payload.data_devolucao = ''
      }

      if (editingCaucao) {
        await caucoesService.update(editingCaucao.id, payload)
        toast.success('Caução atualizada com sucesso!')
      } else {
        await caucoesService.create(payload)
        toast.success('Caução registrada com sucesso!')
      }
      setFormOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar caução')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await caucoesService.delete(deleteId)
      toast.success('Caução excluída com sucesso!')
      setDeleteId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir caução')
    } finally {
      setDeleting(false)
    }
  }

  // Quick action to toggle possession
  const handleTogglePosse = async (c: Caucao) => {
    const novaPosse: CaucaoPosse = c.posse === 'proprietario' ? 'adm' : 'proprietario'
    try {
      await caucoesService.update(c.id, { posse: novaPosse })
      toast.success(
        `Posse alterada para: ${novaPosse === 'proprietario' ? 'Comigo (proprietária)' : 'Com o ADM'}`,
      )
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar posse')
    }
  }

  // Quick action to toggle devolución
  const handleToggleDevolucao = async (c: Caucao) => {
    const novoStatus: CaucaoStatus = c.status === 'devolvida' ? 'retida' : 'devolvida'
    const today = dateToApiMidday(getTodayLocalDate())
    try {
      await caucoesService.update(c.id, {
        status: 'devolvida',
        data_devolucao: today,
      })      toast.success(
        novoStatus === 'devolvida'
          ? 'Caução marcada como devolvida ao locatário.'
          : 'Caução marcada como retida.',
      )
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status de devolução')
    }
  }

  // Filtered cauções
  const filteredCaucoes = useMemo(() => {
    return caucoes.filter((c) => {
      if (filterPosse !== 'todos' && c.posse !== filterPosse) return false
      if (filterStatus !== 'todos') {
        const curStatus = c.status || 'retida'
        if (curStatus !== filterStatus) return false
      }
      if (searchMoto.trim()) {
        const moto = motos.find((m) => m.id === c.moto)
        const term = searchMoto.toLowerCase()
        const matchNome = (moto?.nome || '').toLowerCase().includes(term)
        const matchPlaca = (moto?.placa || '').toLowerCase().includes(term)
        const matchModelo = (moto?.modelo || '').toLowerCase().includes(term)
        if (!matchNome && !matchPlaca && !matchModelo) return false
      }
      return true
    })
  }, [caucoes, filterPosse, filterStatus, searchMoto, motos])

  // Summary Metrics
  const summary = useMemo(() => {
    let totalRetido = 0
    let totalProprietario = 0
    let totalAdm = 0
    let totalDevolvido = 0

    caucoes.forEach((c) => {
      const isRetida = (c.status || 'retida') === 'retida'
      if (isRetida) {
        totalRetido += c.valor
        if (c.posse === 'proprietario') totalProprietario += c.valor
        if (c.posse === 'adm') totalAdm += c.valor
      } else {
        totalDevolvido += c.valor
      }
    })

    return { totalRetido, totalProprietario, totalAdm, totalDevolvido }
  }, [caucoes])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Controle de Cauções
            </h1>
            <Badge
              variant="outline"
              className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300"
            >
              Patrimonial
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro das cauções das motos e controle da posse entre proprietária e ADM.
          </p>
        </div>
        <Button onClick={openNewModal} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" />
          Adicionar Caução
        </Button>
      </div>

      {/* Explicit Financial Notice Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 rounded-xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
            <span>Valor fora do Fluxo de Caixa</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold">
              Separação Contábil Estrita
            </span>
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
            As cauções são depósitos de garantia devolvíveis aos locatários. Por isso,{' '}
            <strong>não entram no Livro Caixa, DRE ou projeções de receita</strong>. Este painel
            serve exclusivamente para auditar e conferir quem está com o dinheiro em custódia (a
            proprietária ou o administrador).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
              Total Retido em Caução
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              R$ {summary.totalRetido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Garantias ativas de locatários
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                Comigo (Proprietária)
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              R$ {summary.totalProprietario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Na conta da proprietária
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                Com o ADM
              </span>
              <UserCheck className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
              R$ {summary.totalAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Na posse do administrador
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
              Devolvidas
            </span>
            <p className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">
              R$ {summary.totalDevolvido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Restituídas aos clientes
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Buscar Moto (Nome ou Placa)</Label>
              <Input
                placeholder="Ex: VER J60, BRA2E19, CG..."
                value={searchMoto}
                onChange={(e) => setSearchMoto(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Filtrar por Posse</Label>
              <Select value={filterPosse} onValueChange={setFilterPosse}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Posses</SelectItem>
                  <SelectItem value="proprietario">Comigo (proprietária)</SelectItem>
                  <SelectItem value="adm">Com o ADM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Filtrar por Situação</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="retida">Retida (Garantia Ativa)</SelectItem>
                  <SelectItem value="devolvida">Devolvida ao Locatário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cauções List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Listagem de Cauções</CardTitle>
              <CardDescription className="text-xs">
                {filteredCaucoes.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando cauções...
            </div>
          ) : filteredCaucoes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Shield className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma caução encontrada
              </p>
              <p className="text-xs">
                Clique no botão "Adicionar Caução" para registrar o primeiro valor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCaucoes.map((c) => {
                const moto = motos.find((m) => m.id === c.moto)
                const isRetida = (c.status || 'retida') === 'retida'
                const isProp = c.posse === 'proprietario'

                return (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Left: Moto info & dates */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isProp
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        <Bike className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {moto?.nome || moto?.modelo || 'Moto não identificada'}
                          </span>
                          {moto?.placa && (
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-semibold text-slate-700 dark:text-slate-300">
                              {moto.placa}
                            </span>
                          )}
                          {/* Possession Badge */}
                          <Badge
                            variant="secondary"
                            className={`text-xs font-semibold ${
                              isProp
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                            }`}
                          >
                            {isProp ? 'Comigo (proprietária)' : 'Com o ADM'}
                          </Badge>

                          {/* Status Badge */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isRetida
                                ? 'border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300'
                                : 'border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isRetida ? 'Retida' : 'Devolvida ao Locatário'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Data: {c.data ? formatDateDisplay(c.data) : '-'}
                          </span>
                          {c.data_devolucao && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Devolvida em: {formatDateDisplay(c.data_devolucao)}
                            </span>
                          )}
                          {c.observacao && (
                            <span className="italic text-slate-600 dark:text-slate-400">
                              "{c.observacao}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Value & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right sm:mr-2">
                        <span className="text-[11px] text-muted-foreground block leading-none">
                          Valor da Caução
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePosse(c)}
                          title="Alternar Posse (Proprietária / ADM)"
                          className="h-8 text-xs px-2.5"
                        >
                          Trocar Posse
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleDevolucao(c)}
                          title={isRetida ? 'Marcar como Devolvida' : 'Marcar como Retida'}
                          className={`h-8 text-xs px-2.5 ${
                            isRetida
                              ? 'text-amber-700 hover:text-amber-800'
                              : 'text-emerald-700 hover:text-emerald-800'
                          }`}
                        >
                          {isRetida ? 'Devolver' : 'Reativar'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(c)}
                          className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(c.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCaucao ? 'Editar Caução' : 'Adicionar Nova Caução'}</DialogTitle>
            <DialogDescription>
              A caução é cadastrada por moto e não gera lançamento no Livro Caixa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motoField">Selecione a Moto *</Label>
              <Select value={motoId} onValueChange={setMotoId}>
                <SelectTrigger id="motoField">
                  <SelectValue placeholder="Escolha a moto" />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="valorField">Valor (R$) *</Label>
                <Input
                  id="valorField"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 600,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataField">Data do Recebimento *</Label>
                <Input
                  id="dataField"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="posseField">Situação de Posse *</Label>
                <Select value={posse} onValueChange={(val: CaucaoPosse) => setPosse(val)}>
                  <SelectTrigger id="posseField">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietario">Comigo (proprietária)</SelectItem>
                    <SelectItem value="adm">Com o ADM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusField">Status da Caução</Label>
                <Select value={status} onValueChange={(val: CaucaoStatus) => setStatus(val)}>
                  <SelectTrigger id="statusField">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retida">Retida (Ativa)</SelectItem>
                    <SelectItem value="devolvida">Devolvida ao Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {status === 'devolvida' && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label htmlFor="dataDevolucaoField">Data de Devolução ao Locatário</Label>
                <Input
                  id="dataDevolucaoField"
                  type="date"
                  value={dataDevolucao}
                  onChange={(e) => setDataDevolucao(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="obsField">Observação (Opcional)</Label>
              <Textarea
                id="obsField"
                rows={2}
                placeholder="Ex: Recebido em dinheiro pelo ADM; Pix para chave proprietária..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              ℹ️ Lembre-se: Este valor é patrimonial e <strong>não entra no fluxo de caixa</strong>.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting
                  ? 'Salvando...'
                  : editingCaucao
                    ? 'Salvar Alterações'
                    : 'Registrar Caução'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Caução?</DialogTitle>
            <DialogDescription>
              Esta ação removerá o registro patrimonial da caução. Deseja prosseguir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
