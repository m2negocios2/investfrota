import React, { useState, useEffect } from 'react'
import { Zap, Bike, CheckCircle2, History, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'
import { Moto, CaixaLancamento, CategoriaGasto } from '@/types/database'

interface QuickButtonConfig {
  id: string
  label: string
  categoriaNome: string
  descricaoPrefix: string
  bgHoverColor: string
}

const QUICK_BUTTONS: QuickButtonConfig[] = [
  {
    id: 'oleo',
    label: 'ÓLEO',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Óleo',
    bgHoverColor: 'hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
  },
  {
    id: 'freio',
    label: 'FREIO',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Freio',
    bgHoverColor: 'hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
  },
  {
    id: 'kit_relacao',
    label: 'KIT RELAÇÃO',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Kit Relação',
    bgHoverColor: 'hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
  },
  {
    id: 'seguro',
    label: 'SEGURO',
    categoriaNome: 'Seguro',
    descricaoPrefix: 'Seguro',
    bgHoverColor: 'hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
  },
]

export default function LancamentosRapidos() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [selectedMotoId, setSelectedMotoId] = useState<string>('')
  const [precoInput, setPrecoInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [submittingButton, setSubmittingButton] = useState<string | null>(null)
  const [recentLancamentos, setRecentLancamentos] = useState<CaixaLancamento[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])

  const loadData = async () => {
    try {
      const [mList, cList, allCaixa] = await Promise.all([
        motosService.getAll(),
        categoriasService.getAll(),
        caixaService.getAll(),
      ])

      // Ordenar motos pelo Nome em ordem alfabética (padrão de uso da usuária)
      const sortedMotos = [...mList].sort((a, b) => {
        const nameA = (a.nome || a.modelo || a.placa || '').toUpperCase()
        const nameB = (b.nome || b.modelo || b.placa || '').toUpperCase()
        return nameA.localeCompare(nameB)
      })

      setMotos(sortedMotos)
      setCategorias(cList)

      // Filtrar os 10 últimos lançamentos de saída para feedback visual recente
      const quickRecent = allCaixa.filter((c) => c.tipo === 'saida').slice(0, 10)
      setRecentLancamentos(quickRecent)
    } catch (err) {
      console.error('Erro ao carregar dados dos lançamentos rápidos:', err)
      toast.error('Erro ao carregar dados. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Garante que a categoria exista no banco; se não existir, cria
  const ensureCategoriaExists = async (nomeCategoria: string): Promise<string> => {
    const existing = categorias.find(
      (c) => c.nome.trim().toLowerCase() === nomeCategoria.trim().toLowerCase(),
    )
    if (existing) return existing.nome

    try {
      const created = await categoriasService.create({
        nome: nomeCategoria,
        descricao: `Categoria ${nomeCategoria} criada via Lançamentos Rápidos`,
      })
      setCategorias((prev) => [...prev, created])
      return created.nome
    } catch (err) {
      console.warn(`Aviso ao criar categoria ${nomeCategoria}:`, err)
      return nomeCategoria
    }
  }

  // Parse do preço aceitando tanto vírgula quanto ponto
  const parsePreco = (str: string): number => {
    if (!str) return 0
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  const selectedMoto = motos.find((m) => m.id === selectedMotoId)
  const valorNumerico = parsePreco(precoInput)
  const isFormReady = Boolean(selectedMotoId && valorNumerico > 0)

  const handleQuickLaunch = async (btn: QuickButtonConfig) => {
    if (!selectedMotoId) {
      toast.error('Selecione primeiro a Moto (pelo Nome)!')
      return
    }

    if (valorNumerico <= 0) {
      toast.error('Informe o PREÇO abaixo dos botões antes de lançar!')
      return
    }

    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'

    setSubmittingButton(btn.id)

    try {
      // 1. Categoria garantida
      const categoriaFinal = await ensureCategoriaExists(btn.categoriaNome)

      // 2. Descrição no padrão pedido: "Óleo — {nome da moto}"
      const descricaoLancamento = `${btn.descricaoPrefix} — ${motoNomeDisplay}`

      // 3. Data de hoje com padrão seguro de meio-dia já aplicado em caixaService.create
      const hojeLocal = getTodayLocalDate()

      const createdEntry = await caixaService.create({
        moto: selectedMotoId,
        tipo: 'saida',
        descricao: descricaoLancamento,
        categoria: categoriaFinal,
        valor: valorNumerico,
        data: hojeLocal,
        forma_pagamento: 'pix',
        observacoes: 'Lançado via Lançamentos Rápidos',
      })

      // 4. Feedback imediato ao usuário (toast claro e vibrante)
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`${btn.label} — R$ ${valorFormatado} lançado no caixa da ${motoNomeDisplay}!`, {
        duration: 4000,
      })

      // 5. Limpar campo de preço pronto para o próximo lançamento
      setPrecoInput('')

      // 6. Atualizar lista rápida de recentes
      setRecentLancamentos((prev) => [
        {
          ...createdEntry,
          expand: { moto: selectedMoto },
        },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      console.error('Erro ao registrar lançamento rápido:', err)
      toast.error('Não foi possível gravar o lançamento. Tente novamente.')
    } finally {
      setSubmittingButton(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Lançamentos Rápidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Lançamento instantâneo de saídas no Fluxo de Caixa em 1 toque.
          </p>
        </div>
      </div>

      {/* Cartão Principal de Operação */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bike className="w-5 h-5 text-blue-600" />
            1. Escolha a Moto (pelo Nome)
          </CardTitle>
          <CardDescription>
            A despesa será vinculada diretamente à moto escolhida no livro caixa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Seletor de Moto */}
          <div className="space-y-2">
            <Label
              htmlFor="motoSelect"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Nome da Moto *
            </Label>
            <Select value={selectedMotoId} onValueChange={setSelectedMotoId} disabled={loading}>
              <SelectTrigger
                id="motoSelect"
                className="h-13 text-base font-medium bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              >
                <SelectValue
                  placeholder={loading ? 'Carregando motos...' : 'Selecione o Nome da Moto'}
                />
              </SelectTrigger>
              <SelectContent>
                {motos.map((m) => {
                  const nomePrincipal = m.nome?.trim() || m.modelo?.trim() || m.placa
                  return (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="py-2.5 text-base font-medium cursor-pointer"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">
                        {nomePrincipal}
                      </span>
                      {m.nome && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({m.modelo} — {m.placa})
                        </span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            {!selectedMotoId && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Selecione a moto para liberar os botões de lançamento.</span>
              </div>
            )}
          </div>

          {/* Os 4 Botões */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                2. Botões Rápidos
              </Label>
              <span className="text-xs text-muted-foreground">Toque para lançar</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {QUICK_BUTTONS.map((btn) => {
                const isThisLoading = submittingButton === btn.id
                return (
                  <Button
                    key={btn.id}
                    type="button"
                    variant="outline"
                    disabled={!isFormReady || submittingButton !== null}
                    onClick={() => handleQuickLaunch(btn)}
                    className={`h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 text-base sm:text-lg font-black tracking-wide border-2 transition-all active:scale-95 shadow-sm ${btn.bgHoverColor} ${
                      !isFormReady
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-400'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:shadow-md'
                    }`}
                  >
                    {isThisLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                        <span className="text-sm">Lançando...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-lg sm:text-xl font-extrabold uppercase">
                          {btn.label}
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {btn.categoriaNome}
                        </span>
                      </>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Campo de PREÇO - Posicionado ABAIXO dos 4 botões */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="precoInput"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                3. Preço (R$) *
              </Label>
              {valorNumerico > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  R$ {valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                R$
              </div>
              <Input
                id="precoInput"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={precoInput}
                onChange={(e) => setPrecoInput(e.target.value)}
                className="pl-12 h-14 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o valor (ex: 45 ou 45,00) e toque no botão desejado acima. O campo é limpo
              automaticamente após cada lançamento.
            </p>
          </div>

          {/* Status / Orientações */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>
              <strong>Forma padrão:</strong> PIX
            </span>
            <span>
              <strong>Data:</strong> Hoje ({formatDateDisplay(getTodayLocalDate())})
            </span>
            <span>
              <strong>Tipo:</strong> Saída
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente de Lançamentos Rápidos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Últimas Saídas Registradas no Caixa
          </CardTitle>
          <CardDescription className="text-xs">
            Mostra os lançamentos mais recentes para conferência rápida. Para editar ou excluir,
            acesse o menu Fluxo de Caixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLancamentos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma saída recente encontrada no caixa.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLancamentos.slice(0, 5).map((item) => {
                const motoItem = item.expand?.moto || motos.find((m) => m.id === item.moto)
                const motoName = motoItem?.nome || motoItem?.modelo || 'Moto'
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.descricao}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateDisplay(item.data)} • {motoName}
                          {motoItem?.placa ? ` (${motoItem.placa})` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs font-bold text-red-600 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30"
                      >
                        - R${' '}
                        {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
