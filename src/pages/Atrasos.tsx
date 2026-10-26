import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Clock,
  Calendar,
  Bike,
  User,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  Phone,
  FileText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { recebimentosService } from '@/services/recebimentos'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { caixaService } from '@/services/caixa'
import { Recebimento, Moto, Contrato, FormaPagamento } from '@/types/database'

export default function Atrasos() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFaixaDias, setFilterFaixaDias] = useState<string>('todos')

  // Quitar modal
  const [quitarModalOpen, setQuitarModalOpen] = useState(false)
  const [targetRecebimento, setTargetRecebimento] = useState<Recebimento | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [quitarLoading, setQuitarLoading] = useState(false)

  const loadData = async () => {
    try {
      const [rList, mList, cList] = await Promise.all([
        recebimentosService.getAll(),
        motosService.getAll(),
        contratosService.getAll(),
      ])
      setRecebimentos(rList)
      setMotos(mList)
      setContratos(cList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados de atrasos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate days overdue
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // List of items in delay (either marked as em_atraso OR unpaid with vencimento < today)
  const atrasadosList = useMemo(() => {
    return recebimentos
      .filter((r) => {
        if (r.status === 'pago') return false
        if (r.status === 'em_atraso') return true
        const venc = new Date(r.data_vencimento)
        venc.setHours(0, 0, 0, 0)
        return venc < today
      })
      .map((r) => {
        const venc = new Date(r.data_vencimento)
        venc.setHours(0, 0, 0, 0)
        const diffTime = today.getTime() - venc.getTime()
        const diasAtraso = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
        const moto = motos.find((m) => m.id === r.moto)
        const contrato = contratos.find((c) => c.id === r.contrato)

        return {
          ...r,
          diasAtraso,
          motoNome: moto?.nome || moto?.modelo || 'Moto',
          motoPlaca: moto?.placa || '',
          motoObj: moto,
          telefone: contrato?.locatario_telefone || '',
        }
      })
      .sort((a, b) => b.diasAtraso - a.diasAtraso) // Maior atraso primeiro
  }, [recebimentos, motos, contratos, today])

  // Filtered
  const filteredAtrasados = useMemo(() => {
    return atrasadosList.filter((item) => {
      // Faixa de dias
      if (filterFaixaDias === '1-7' && (item.diasAtraso < 1 || item.diasAtraso > 7)) return false
      if (filterFaixaDias === '8-15' && (item.diasAtraso < 8 || item.diasAtraso > 15)) return false
      if (filterFaixaDias === '16+' && item.diasAtraso < 16) return false

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchLocatario = item.locatario_nome.toLowerCase().includes(term)
        const matchMoto = item.motoNome.toLowerCase().includes(term)
        const matchPlaca = item.motoPlaca.toLowerCase().includes(term)
        if (!matchLocatario && !matchMoto && !matchPlaca) return false
      }

      return true
    })
  }, [atrasadosList, filterFaixaDias, searchTerm])

  // Summary Metrics
  const summary = useMemo(() => {
    const totalValorAtrasado = atrasadosList.reduce((acc, i) => acc + i.valor, 0)
    const qtdAtrasados = atrasadosList.length
    const maisAntigoDias = atrasadosList.length > 0 ? atrasadosList[0].diasAtraso : 0
    const mediaDias =
      qtdAtrasados > 0
        ? Math.round(atrasadosList.reduce((acc, i) => acc + i.diasAtraso, 0) / qtdAtrasados)
        : 0

    return { totalValorAtrasado, qtdAtrasados, maisAntigoDias, mediaDias }
  }, [atrasadosList])

  // Handle Quitar Recebimento
  const openQuitarDialog = (rec: Recebimento) => {
    setTargetRecebimento(rec)
    setFormaPagamento('pix')
    setDataPagamento(new Date().toISOString().split('T')[0])
    setQuitarModalOpen(true)
  }

  const handleConfirmQuitar = async () => {
    if (!targetRecebimento) return
    setQuitarLoading(true)
    try {
      const formattedDate = dataPagamento
        ? `${dataPagamento} 00:00:00.000Z`
        : new Date().toISOString()

      // 1. Atualizar recebimento para pago
      await recebimentosService.update(targetRecebimento.id, {
        status: 'pago',
        data_pagamento: formattedDate,
        forma_pagamento: formaPagamento,
      })

      // 2. Registrar entrada no Caixa
      const moto = motos.find((m) => m.id === targetRecebimento.moto)
      const motoNome = moto?.nome || moto?.modelo || 'Moto'
      await caixaService.create({
        moto: targetRecebimento.moto,
        tipo: 'entrada',
        descricao: `Recebimento Aluguel - ${targetRecebimento.locatario_nome} (${motoNome})`,
        categoria: 'Recebimento de Aluguel',
        valor: targetRecebimento.valor,
        data: formattedDate,
        forma_pagamento: formaPagamento,
        observacoes: `Quitação de atraso (Venc original: ${new Date(targetRecebimento.data_vencimento).toLocaleDateString('pt-BR')})`,
      })

      toast.success('Recebimento quitado e entrada registrada no Caixa!')
      setQuitarModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao quitar recebimento')
    } finally {
      setQuitarLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel de Atrasos
            </h1>
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
            >
              Cobrança
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada de locatários em atraso, valores devidos e cálculo automático de dias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/semana">
              <Calendar className="w-4 h-4 mr-1.5" />
              Painel Semana
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/alugueis">
              <User className="w-4 h-4 mr-1.5" />
              Contratos
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Total em Atraso
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              R$ {summary.totalValorAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Soma total a receber de inadimplências
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Locatários em Atraso
              </span>
              <User className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
              {summary.qtdAtrasados}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Pagamentos vencidos não quitados
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Maior Atraso
              </span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {summary.maisAntigoDias} {summary.maisAntigoDias === 1 ? 'dia' : 'dias'}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Título mais antigo pendente
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Média de Atraso
              </span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {summary.mediaDias} {summary.mediaDias === 1 ? 'dia' : 'dias'}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Tempo médio de inadimplência
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Buscar</label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Locatário, moto ou placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Faixa de Atraso</label>
              <Select value={filterFaixaDias} onValueChange={setFilterFaixaDias}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os atrasos</SelectItem>
                  <SelectItem value="1-7">1 a 7 dias</SelectItem>
                  <SelectItem value="8-15">8 a 15 dias</SelectItem>
                  <SelectItem value="16+">Mais de 15 dias (Crítico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Listagem de Inadimplências</CardTitle>
              <CardDescription className="text-xs">
                {filteredAtrasados.length} recebimento(s) em aberto aguardando pagamento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando atrasos...
            </div>
          ) : filteredAtrasados.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Nenhum pagamento em atraso no momento!
              </p>
              <p className="text-xs">
                Todos os locatários estão em dia ou não há cobranças pendentes nesta faixa.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAtrasados.map((item) => {
                const isCritico = item.diasAtraso >= 15
                const isModerado = item.diasAtraso >= 7

                return (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Left: Locatário, Moto, Dias */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isCritico
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : isModerado
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.locatario_nome}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-semibold text-slate-700 dark:text-slate-300">
                            {item.motoNome} ({item.motoPlaca})
                          </span>

                          {/* Days Overdue Badge */}
                          <Badge
                            className={`text-xs font-bold ${
                              isCritico
                                ? 'bg-red-500 text-white hover:bg-red-500'
                                : isModerado
                                  ? 'bg-amber-500 text-white hover:bg-amber-500'
                                  : 'bg-yellow-500 text-slate-900 hover:bg-yellow-500'
                            }`}
                          >
                            {item.diasAtraso}{' '}
                            {item.diasAtraso === 1 ? 'dia de atraso' : 'dias de atraso'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Venceu em:{' '}
                            <strong>
                              {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
                            </strong>
                          </span>
                          {item.telefone && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Phone className="w-3.5 h-3.5" />
                              {item.telefone}
                            </span>
                          )}
                          {item.observacoes && <span className="italic">"{item.observacoes}"</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Value & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right sm:mr-2">
                        <span className="text-[11px] text-muted-foreground block leading-none">
                          Valor Devido
                        </span>
                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openQuitarDialog(item)}
                          className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dar Baixa
                        </Button>

                        {item.telefone && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2.5"
                          >
                            <a
                              href={`https://wa.me/55${item.telefone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(item.locatario_nome)}%2C%20tudo%20bem%3F%20Passando%20para%20lembrar%20do%20pagamento%20do%20aluguel%20da%20moto%20(${encodeURIComponent(item.motoNome)})%20no%20valor%20de%20R%24%20${item.valor.toFixed(2)}.`}
                              target="_blank"
                              rel="noreferrer"
                              title="Cobrar via WhatsApp"
                            >
                              WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quitar Modal */}
      <Dialog open={quitarModalOpen} onOpenChange={setQuitarModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Baixa de Pagamento em Atraso</span>
            </DialogTitle>
            <DialogDescription>
              Confirmar o recebimento de <strong>{targetRecebimento?.locatario_nome}</strong> no
              valor de <strong>R$ {(targetRecebimento?.valor || 0).toFixed(2)}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Data do Recebimento *</label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Forma de Pagamento</label>
              <Select
                value={formaPagamento}
                onValueChange={(val: FormaPagamento) => setFormaPagamento(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
              ℹ️ A baixa registrará automaticamente a entrada correspondente no{' '}
              <strong>Fluxo de Caixa</strong>.
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setQuitarModalOpen(false)}
              disabled={quitarLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmQuitar}
              disabled={quitarLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {quitarLoading ? 'Salvando...' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
