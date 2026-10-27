import React, { useState, useEffect } from 'react'
import { Tags, Plus, Edit2, Trash2, CheckCircle2, FolderPlus, Info } from 'lucide-react'
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
import { toast } from 'sonner'
import { categoriasService } from '@/services/categorias'
import { CategoriaGasto } from '@/types/database'

export default function ExpenseCategories() {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [catToDelete, setCatToDelete] = useState<CategoriaGasto | null>(null)

  const loadCategorias = async () => {
    try {
      const data = await categoriasService.getAll()
      setCategorias(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar categorias de gastos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategorias()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setNome('')
    setDescricao('')
    setModalOpen(true)
  }

  const handleOpenEdit = (cat: CategoriaGasto) => {
    setEditingId(cat.id)
    setNome(cat.nome)
    setDescricao(cat.descricao || '')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Informe o nome da categoria')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await categoriasService.update(editingId, {
          nome: nome.trim(),
          descricao: descricao.trim(),
        })
        toast.success('Categoria atualizada com sucesso!')
      } else {
        await categoriasService.create({
          nome: nome.trim(),
          descricao: descricao.trim(),
        })
        toast.success('Categoria cadastrada com sucesso!')
      }
      setModalOpen(false)
      loadCategorias()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar categoria. Verifique se o nome já não existe.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!catToDelete) return
    try {
      await categoriasService.delete(catToDelete.id)
      toast.success('Categoria excluída com sucesso!')
      setCategorias(categorias.filter((c) => c.id !== catToDelete.id))
      setDeleteModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir categoria.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Tags className="w-6 h-6 text-primary" />
            Categorias de Gastos
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre e organize as categorias de despesas utilizadas nos lançamentos rápidos e no
            Fluxo de Caixa.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      <Card className="shadow-sm border-blue-100 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">Como as categorias são usadas no M2:</p>
            <p>
              Ao realizar lançamentos rápidos ou registrar saídas no Caixa, as opções de categoria
              virão desta lista (ex.: Manutenção, Combustível, Documentação/IPVA, Seguro, Peças,
              etc.). Você pode criar novas conforme a necessidade da sua operação.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Categorias Cadastradas</CardTitle>
          <CardDescription>
            {categorias.length} categoria(s) disponível(is) para classificação de despesas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <FolderPlus className="w-10 h-10 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma categoria de gastos cadastrada
              </p>
              <Button size="sm" onClick={handleOpenCreate} className="mt-2">
                Cadastrar Primeira Categoria
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorias.map((cat) => (
                <Card
                  key={cat.id}
                  className="shadow-none border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-colors"
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {cat.nome}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-50 dark:bg-slate-800"
                        >
                          Ativa
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {cat.descricao || 'Sem descrição cadastrada'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(cat)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCatToDelete(cat)
                          setDeleteModalOpen(true)
                        }}
                        className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Categoria de Gasto' : 'Nova Categoria de Gasto'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome da categoria para padronizar as saídas e relatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catNome">Nome da Categoria *</Label>
              <Input
                id="catNome"
                placeholder="Ex: Manutenção, Combustível, Seguro, Peças..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catDesc">Descrição / Observação</Label>
              <Input
                id="catDesc"
                placeholder="Ex: Gastos com oficina mecânica e revisões"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
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
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar Alterações'
                    : 'Cadastrar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{catToDelete?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
