import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  StickyNote,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { dateToApiMidday, formatDateDisplay } from '@/lib/dateUtils'
import { Pendencia } from '@/types/database'

// Paleta suave de tons calmos tipo post-it alternados
const NOTE_THEMES = [
  {
    // Bege suave
    bg: 'bg-amber-50/80 dark:bg-amber-950/25',
    border: 'border-amber-200/90 dark:border-amber-900/40',
    headerAccent: 'bg-amber-200/50 dark:bg-amber-800/30',
    tag: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    tape: 'bg-amber-200/60 dark:bg-amber-800/40',
  },
  {
    // Verde-claro calmo
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    border: 'border-emerald-200/90 dark:border-emerald-900/40',
    headerAccent: 'bg-emerald-200/50 dark:bg-emerald-800/30',
    tag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    tape: 'bg-emerald-200/60 dark:bg-emerald-800/40',
  },
  {
    // Areia / Pêssego suave
    bg: 'bg-stone-50 dark:bg-stone-900/40',
    border: 'border-stone-200/90 dark:border-stone-800/60',
    headerAccent: 'bg-stone-200/50 dark:bg-stone-800/30',
    tag: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    tape: 'bg-stone-200/60 dark:bg-stone-700/40',
  },
  {
    // Azul-acinzentado muito suave
    bg: 'bg-sky-50/70 dark:bg-sky-950/25',
    border: 'border-sky-200/80 dark:border-sky-900/40',
    headerAccent: 'bg-sky-200/50 dark:bg-sky-800/30',
    tag: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    tape: 'bg-sky-200/60 dark:bg-sky-800/40',
  },
  {
    // Sálvia / Oliva claro suave
    bg: 'bg-teal-50/70 dark:bg-teal-950/25',
    border: 'border-teal-200/80 dark:border-teal-900/40',
    headerAccent: 'bg-teal-200/50 dark:bg-teal-800/30',
    tag: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    tape: 'bg-teal-200/60 dark:bg-teal-800/40',
  },
]

export default function Pendencias() {
  const [lembretes, setLembretes] = useState<Pendencia[]>([])
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
      setLembretes(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar lembretes')
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
        data: quickDate ? dateToApiMidday(quickDate) : '',
        feito: false,
      })
      toast.success('Lembrete adicionado com sucesso!')
      setQuickTitle('')
      setQuickDate('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao adicionar lembrete')
    }
  }

  const handleToggle = async (p: Pendencia) => {
    const novoFeito = !p.feito
    try {
      await pendenciasService.toggleFeito(p.id, Boolean(p.feito))
      toast.success(novoFeito ? 'Lembrete concluído!' : 'Lembrete reaberto!')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar lembrete')
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
      toast.error('Informe o título do lembrete')
      return
    }

    setSubmitting(true)
    try {
      const payload: Partial<Pendencia> = {
        titulo: formTitulo.trim(),
        data: formData ? dateToApiMidday(formData) : '',
        observacao: formObservacao.trim(),
      }

      if (editingItem) {
        await pendenciasService.update(editingItem.id, payload)
        toast.success('Lembrete atualizado!')
      } else {
        await pendenciasService.create({ ...payload, feito: false })
        toast.success('Lembrete cadastrado!')
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar lembrete')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await pendenciasService.delete(deleteId)
      toast.success('Lembrete excluído!')
      setDeleteId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir lembrete')
    } finally {
      setDeleting(false)
    }
  }

  // Filtered
  const filteredList = useMemo(() => {
    return lembretes.filter((p) => {
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
  }, [lembretes, filterFeito, search])

  // Summary counts
  const totalAbertos = lembretes.filter((p) => !p.feito).length
  const totalFeitos = lembretes.filter((p) => p.feito).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <StickyNote className="w-6 h-6 text-amber-500" />
              Lembretes
            </h1>
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-800 bg-amber-50/80 dark:bg-amber-950/40 dark:text-amber-300"
            >
              Quadro de Notas
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Notinhas rápidas e tarefas da operação: trocas de óleo, vistorias, avisos a locatários e
            anotações do dia a dia.
          </p>
        </div>

        <Button
          onClick={openNewModal}
          className="gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Lembrete
        </Button>
      </div>

      {/* Quick Add Bar */}
      <Card className="shadow-sm border-amber-200/70 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-4">
          <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Adicionar lembrete rápido (ex: cobrar vistoria da moto Fan 160, checar óleo...)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 text-sm"
            />
            <Input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className="w-full sm:w-44 bg-white dark:bg-slate-900 text-xs"
              placeholder="Data prevista"
            />
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Metrics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={filterFeito === 'abertas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('abertas')}
          >
            Abertos ({totalAbertos})
          </Button>
          <Button
            variant={filterFeito === 'feitas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('feitas')}
          >
            Concluídos ({totalFeitos})
          </Button>
          <Button
            variant={filterFeito === 'todas' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setFilterFeito('todas')}
          >
            Todos ({lembretes.length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar lembretes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          Carregando lembretes...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground space-y-3 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <StickyNote className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              {filterFeito === 'abertas'
                ? 'Nenhum lembrete em aberto!'
                : filterFeito === 'feitas'
                  ? 'Nenhum lembrete concluído ainda'
                  : 'Nenhum lembrete encontrado'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {filterFeito === 'abertas'
                ? 'Tudo em dia com a operação. Use o campo acima para fixar novas anotações.'
                : 'Suas notinhas e tarefas aparecerão organizadas aqui.'}
            </p>
          </div>
          {filterFeito === 'abertas' && (
            <Button onClick={openNewModal} variant="outline" size="sm" className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Primeiro Lembrete
            </Button>
          )}
        </div>
      ) : (
        /* Grid de Notinhas / Post-its Lado a Lado */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item, index) => {
            const isFeito = Boolean(item.feito)
            const theme = NOTE_THEMES[index % NOTE_THEMES.length]
            const isOverdue =
              !isFeito && item.data && new Date(item.data).setHours(23, 59, 59, 999) < Date.now()

            return (
              <div
                key={item.id}
                className={`relative group rounded-xl p-4 transition-all duration-200 border shadow-sm flex flex-col justify-between min-h-[170px] ${
                  theme.bg
                } ${theme.border} ${
                  isFeito ? 'opacity-60 saturate-50' : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Visual Top Pin / Fita suave decorativa de post-it */}
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-b-sm ${theme.tape} opacity-70`}
                />

                {/* Top Section: Data/Tag à esquerda + CHECKBOX NO CANTO SUPERIOR DIREITO */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                    {item.data ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-semibold'
                            : theme.tag
                        }`}
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDateDisplay(item.data)}</span>
                        {isOverdue && <span className="font-bold">(Atrasado)</span>}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${theme.tag}`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Sem data fixa</span>
                      </span>
                    )}

                    {isFeito && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Concluído
                      </span>
                    )}
                  </div>

                  {/* CHECKBOX NO CANTO SUPERIOR DIREITO */}
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className="p-1 -mr-1 -mt-1 rounded-md text-slate-500 hover:text-emerald-600 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    title={isFeito ? 'Marcar como não feito' : 'Marcar como concluído'}
                    aria-label={isFeito ? 'Marcar como não feito' : 'Marcar como concluído'}
                  >
                    {isFeito ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200" />
                    )}
                  </button>
                </div>

                {/* Corpo da Notinha: Título e Observações */}
                <div className="my-3 flex-1">
                  <h3
                    className={`text-sm font-semibold leading-snug break-words ${
                      isFeito
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {item.titulo}
                  </h3>

                  {item.observacao && (
                    <p
                      className={`text-xs mt-2 leading-relaxed whitespace-pre-wrap break-words ${
                        isFeito
                          ? 'text-slate-400 dark:text-slate-500 line-through'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.observacao}
                    </p>
                  )}
                </div>

                {/* Rodapé da Notinha: Ações rápidas (Editar / Excluir) */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    #{item.id.slice(0, 6)}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(item)}
                      className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      title="Editar lembrete"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(item.id)}
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50/60 dark:hover:bg-red-950/40"
                      title="Excluir lembrete"
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

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              {editingItem ? 'Editar Lembrete' : 'Novo Lembrete'}
            </DialogTitle>
            <DialogDescription>
              Organize uma tarefa, anotação ou compromisso para a gestão das motos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lembreteTitulo">Título do Lembrete *</Label>
              <Input
                id="lembreteTitulo"
                placeholder="Ex: Troca de óleo da Fan 160, vistoria de contrato..."
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lembreteData">Data Prevista / Limite (Opcional)</Label>
              <Input
                id="lembreteData"
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lembreteObs">Anotações / Detalhes (Opcional)</Label>
              <Textarea
                id="lembreteObs"
                rows={3}
                placeholder="Ex: Ligar antes para confirmar com o locatário; deixar capacete reserva..."
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
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Lembrete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Lembrete?</DialogTitle>
            <DialogDescription>
              Esta notinha será removida permanentemente do seu quadro de lembretes.
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
