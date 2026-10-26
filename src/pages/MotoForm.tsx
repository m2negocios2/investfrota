import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Bike, ArrowLeft, Save } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { motosService } from '@/services/motos'
import { MotoStatus, TipoLocacao } from '@/types/database'

export default function MotoForm() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)

  // Form fields
  const [placa, setPlaca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [cor, setCor] = useState('')
  const [valorDiario, setValorDiario] = useState<number>(35)
  const [tipoLocacaoPadrao, setTipoLocacaoPadrao] = useState<TipoLocacao>('normal')
  const [status, setStatus] = useState<MotoStatus>('disponivel')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    if (isEditing && id) {
      motosService
        .getById(id)
        .then((moto) => {
          setPlaca(moto.placa)
          setModelo(moto.modelo)
          setAno(moto.ano)
          setCor(moto.cor)
          setValorDiario(moto.valor_diario)
          setTipoLocacaoPadrao(moto.tipo_locacao_padrao)
          setStatus(moto.status)
          setObservacoes(moto.observacoes || '')
        })
        .catch((err) => {
          console.error(err)
          toast.error('Erro ao carregar moto para edição')
          navigate('/motos')
        })
        .finally(() => setFetching(false))
    }
  }, [id, isEditing, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!placa.trim() || !modelo.trim() || !cor.trim()) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)

    const payload = {
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      ano: Number(ano),
      cor: cor.trim(),
      valor_diario: Number(valorDiario),
      tipo_locacao_padrao: tipoLocacaoPadrao,
      status: status,
      observacoes: observacoes.trim(),
    }

    try {
      if (isEditing && id) {
        await motosService.update(id, payload)
        toast.success('Moto atualizada com sucesso!')
        navigate(`/motos/${id}`)
      } else {
        const created = await motosService.create(payload)
        toast.success('Moto cadastrada com sucesso!')
        navigate(`/motos/${created.id}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar moto. Verifique se a placa já não está cadastrada.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/motos">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para Motos
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isEditing ? 'Editar Dados da Moto' : 'Cadastrar Nova Moto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informações do Veículo</CardTitle>
            <CardDescription>
              Informe placa, modelo, características e política de locação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">
                  Placa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="placa"
                  placeholder="Ex: BRA2E19"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase"
                  maxLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">
                  Modelo / Marca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelo"
                  placeholder="Ex: Honda CG 160 Start"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ano">
                  Ano de Fabricação <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ano"
                  type="number"
                  min={2000}
                  max={2030}
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor">
                  Cor Predominante <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cor"
                  placeholder="Ex: Vermelha, Preta, Azul"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorDiario">
                  Valor Diário (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valorDiario"
                  type="number"
                  step="0.01"
                  min={1}
                  value={valorDiario}
                  onChange={(e) => setValorDiario(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="tipoLocacaoPadrao">Tipo de Locação Padrão</Label>
                <Select
                  value={tipoLocacaoPadrao}
                  onValueChange={(val: TipoLocacao) => setTipoLocacaoPadrao(val)}
                >
                  <SelectTrigger id="tipoLocacaoPadrao">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Locação Normal (Recorrente)</SelectItem>
                    <SelectItem value="plano_conquista">
                      Plano Conquista (Com prazo e entrega)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  A locação normal é contínua; o Plano Conquista possui prazo estipulado para
                  entrega da moto.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Atual</Label>
                <Select value={status} onValueChange={(val: MotoStatus) => setStatus(val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível para Locação</SelectItem>
                    <SelectItem value="locada">Locada (Em Contrato Ativo)</SelectItem>
                    <SelectItem value="manutencao">Em Manutenção / Oficina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="observacoes">Observações / Histórico Inicial</Label>
              <Textarea
                id="observacoes"
                placeholder="Detalhes adicionais, revisões recentes, acessórios instalados..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/motos')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Moto'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
