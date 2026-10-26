import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  ListTodo,
  CheckCircle2,
  Clock,
  Search,
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
import { toast } from 'sonner'
import { pendenciasService } from '@/services/pendencias'
import { Pendencia } from '@/types/database'

export default function Pendencias() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)

  // Quick Add input
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDate, setQuickDate] = useState('')

  // Edit / Add Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Pendencia | null>(null)
  const [formTitulo, setFormTitulo] = useState('')
  const [formData, setFormData] = useState('')
  const [formObservacao, setFormObservacao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filter
  const [filterFeito, setFilterFeito] = useState<'todas' | 'abertas' | 'feitas'>('abertas')
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      const list = await pendenciasService.getAll()
      setPendencias(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar pendências')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return

    try {
      await pendenciasService.create({
        titulo: quickTitle.trim(),
        data: quickDate ? `${quickDate} 00:00:00.000Z` : '',
        feito: false,
      })
      toast.success('Pendência adicionada!')
      setQuickTitle('')
      setQuickDate('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao adicionar pendência')
    }
  }

  const handleToggle = async (p: Pendencia) => {
    const novoFeito = !p.feito
    try {
      await pendenciasService.toggleFeito(p.id, Boolean(p.feito))
      toast.success(novoFeito ? 'Item concluído!' : 'Item reaberto!')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar item')
    }
  }

  const openNewModal = () => {
    setEditingItem(null)
    setFormTitulo('')
    setFormData('')
    setFormObservacao('')
    setModalOpen(true)
  }

  const openEditModal = (p: Pendencia) => {
    setEditingItem(p)
    setFormTitulo(p.titulo)
    setFormData(p.data ? p.data.split('T')[0] : '')
    setFormObservacao(p.observacao || '')
    setModalOpen(true)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast.error('Informe o título da pendência')
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<Pendencia> = {
        titulo: formTitulo.trim(),
        data: formData ? `${formData} 00:00:00.000Z` : '',
        observacao: formObservacao.trim(),
      }

      if (editingItem) {
        await pendenciasService.update(editingItem.id, payload)
        toast.success('Pendência atualizada!')
      } else {
        await pendenciasService.create({ ...payload, feito: false })
        toast.success('Pendência cadastrada!')
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar pendência')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await pendenciasService.delete(deleteId)
      toast.success('Pendência excluída!')
      setDeleteId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  // Filtered
  const filteredList = useMemo(() => {
    return pendencias.filter((p) => {
      if (filterFeito === 'abertas' && p.feito) return false
      if (filterFeito === 'feitas' && !p.feito) return false
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchTitle = p.titulo.toLowerCase().includes(term)
        const matchObs = (p.observacao || '').toLowerCase().includes(term)
        if (!matchTitle && !matchObs) return false
      }
      return true
    })
  }, [pendencias, filterFeito, search])

  // Summary counts
  const totalAbertas = pendencias.filter((p) => !p.feito).length
  const totalFeitas = pendencias.filter((p) => p.feito).length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pendências & Agenda
            </h1>
            <Badge
              variant="outline"
              className="border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300"
            >
              Organização
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Checklist de tarefas do negócio: vistorias, óleo, contratos, reuniões e lembretes
            gerais.
          </p>
        </div>

        <Button
          onClick={openNewModal}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Nova Pendência
        </Button>
      </div>

      {/* Quick Add Bar */}
      <Card className="shadow-sm border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10">
        <CardContent className="p-4">
          <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Adicionar tarefa rápida (ex: trocar óleo da moto X, agendar vistoria...)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 text-sm"
            />
            <Input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className="w-full sm:w-44 bg-white dark:bg-slate-900 text-xs"
              placeholder="Data limite"
            />
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Metrics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant={filterFeito === 'abertas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('abertas')}
          >
            Abertas ({totalAbertas})
          </Button>
          <Button
            variant={filterFeito === 'feitas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('feitas')}
          >
            Concluídas ({totalFeitas})
          </Button>
          <Button
            variant={filterFeito === 'todas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('todas')}
          >
            Todas ({pendencias.length})
          </Button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar nas pendências..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Tasks List */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando pendências...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <ListTodo className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {filterFeito === 'abertas'
                  ? 'Nenhuma pendência aberta no momento!'
                  : 'Nenhum item encontrado'}
              </p>
              <p className="text-xs">Utilize o campo acima para adicionar lembretes da operação.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map((item) => {
                const isFeito = Boolean(item.feito)
                const isOverdue =
                  !isFeito &&
                  item.data &&
                  new Date(item.data).setHours(23, 59, 59, 999) < Date.now()

                return (
                  <div
                    key={item.id}
                    className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                      isFeito
                        ? 'bg-slate-50/50 dark:bg-slate-900/20 opacity-70'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Left: Checkbox + Title */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        title={isFeito ? 'Reabrir' : 'Concluir'}
                      >
                        {isFeito ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isFeito
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.titulo}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {item.data && (
                            <span
                              className={`flex items-center gap-1 font-medium ${
                                isOverdue
                                  ? 'text-red-600 dark:text-red-400 font-bold'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Data: {new Date(item.data).toLocaleDateString('pt-BR')}
                              {isOverdue && ' (Atrasada)'}
                            </span>
                          )}
                          {item.observacao && (
                            <span className="italic text-slate-500 truncate max-w-md">
                              "{item.observacao}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(item.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Pendência' : 'Nova Pendência / Tarefa'}
            </DialogTitle>
            <DialogDescription>
              Cadastre itens a fazer para o controle do negócio de motos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pendTitulo">Título / Descrição da Tarefa *</Label>
              <Input
                id="pendTitulo"
                placeholder="Ex: Óleo das motos, vistoria periódica, assinar aditivo..."
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pendData">Data Limite / Prevista (Opcional)</Label>
              <Input
                id="pendData"
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pendObs">Observações / Detalhes</Label>
              <Textarea
                id="pendObs"
                rows={3}
                placeholder="Ex: Ligar antes para confirmar horário; levar capacete..."
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Pendência?</DialogTitle>
            <DialogDescription>
              Esta ação removerá permanentemente esta tarefa da lista.
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
