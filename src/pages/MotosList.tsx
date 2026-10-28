import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  Wrench,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motosService } from '@/services/motos'
import { Moto, MotoStatus, TipoLocacao } from '@/types/database'

export default function MotosList() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [motoToDelete, setMotoToDelete] = useState<Moto | null>(null)
  const navigate = useNavigate()

  const loadMotos = async () => {
    try {
      const data = await motosService.getAll()
      setMotos(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar motos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMotos()
  }, [])

  const filteredMotos = motos.filter((moto) => {
    const matchesSearch =
      (moto.nome && moto.nome.toLowerCase().includes(search.toLowerCase())) ||
      moto.placa.toLowerCase().includes(search.toLowerCase()) ||
      moto.modelo.toLowerCase().includes(search.toLowerCase()) ||
      moto.cor.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'todos' || moto.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = async () => {
    if (!motoToDelete) return
    try {
      await motosService.delete(motoToDelete.id)
      toast.success(`Moto "${motoToDelete.nome || motoToDelete.modelo}" excluída com sucesso`)
      setMotos(motos.filter((m) => m.id !== motoToDelete.id))
      setDeleteModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível excluir a moto. Pode haver contratos associados.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Motos da Frota
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento completo das motos cadastradas para locação.
          </p>
        </div>
        <Button asChild>
          <Link to="/motos/nova">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Nova Moto
          </Link>
        </Button>
      </div>

      {/* Filters and search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, placa, modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:inline" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="locada">Locada</SelectItem>
                  <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="em_loja_detran">Em Loja/Detran</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motos Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredMotos.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Bike className="w-12 h-12 mx-auto text-slate-400" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Nenhuma moto encontrada
            </h3>
            <p className="text-sm max-w-sm mx-auto">
              Tente ajustar os filtros de busca ou cadastre uma nova moto para sua frota.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/motos/nova">
                <Plus className="w-4 h-4 mr-1.5" />
                Cadastrar Moto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {filteredMotos.map((moto) => {
            const statusConfig = {
              disponivel: {
                label: 'Disponível',
                color:
                  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
                icon: CheckCircle,
              },
              locada: {
                label: 'Locada',
                color:
                  'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
                icon: Clock,
              },
              manutencao: {
                label: 'Em Manutenção',
                color:
                  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                icon: Wrench,
              },
              em_loja_detran: {
                label: 'Em Loja/Detran',
                color:
                  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                icon: Clock,
              },
            }
            const statusInfo = statusConfig[moto.status] || {
              label: moto.status,
              color: 'bg-slate-100 text-slate-700 border-slate-200',
              icon: Bike,
            }
            const StatusIcon = statusInfo.icon

            return (
              <Card
                key={moto.id}
                className="shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="p-3 sm:p-3.5 pb-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      {/* Destaque para o NOME da moto com placa secundária */}
                      <CardTitle
                        className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate"
                        title={moto.nome || moto.modelo}
                      >
                        {moto.nome || moto.modelo}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          {moto.placa}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                          {moto.modelo}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 font-medium capitalize shrink-0 ${statusInfo.color} flex items-center gap-1`}
                    >
                      <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{statusInfo.label}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 p-3 sm:p-3.5 pt-0 pb-3">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-md border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Ano / Cor:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {moto.ano} • {moto.cor}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        Valor Semanal:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        R${' '}
                        {(moto.valor_semanal !== undefined && moto.valor_semanal !== null
                          ? moto.valor_semanal
                          : (moto.valor_diario || 0) * 7
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                      <span className="text-muted-foreground text-[10px]">Plano:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-[10px] truncate">
                        {moto.tipo_locacao_padrao === 'plano_conquista'
                          ? 'Plano Conquista'
                          : 'Locação Normal'}
                      </span>
                    </div>
                  </div>

                  {moto.observacoes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                      "{moto.observacoes}"
                    </p>
                  )}
                </CardContent>

                <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/motos/${moto.id}/editar`)}
                      className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400"
                      title="Editar moto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMotoToDelete(moto)
                        setDeleteModalOpen(true)
                      }}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      title="Excluir moto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-7 px-2 gap-1 font-medium"
                  >
                    <Link to={`/motos/${moto.id}`}>
                      <span>Ficha</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Moto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a moto{' '}
              <strong>
                {motoToDelete?.nome || motoToDelete?.modelo} (Placa: {motoToDelete?.placa})
              </strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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
