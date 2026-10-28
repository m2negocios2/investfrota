import React, { useState, useEffect } from 'react'
import { Zap, Bike, CheckCircle2, History, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { categoriasService } from '@/services/categorias'
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'
import { Moto, CaixaLancamento, CategoriaGasto } from '@/types/database'
import { MotoCardButton } from '@/components/MotoSelectorGrid'

interface QuickButtonConfig {
  id: string
  label: string
  emoji: string
  categoriaNome: string
  descricaoPrefix: string
  colorClasses: string
}

const QUICK_BUTTONS: QuickButtonConfig[] = [
  {
    id: 'oleo',
    label: 'ÓLEO',
    emoji: '🛢️',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Óleo',
    // Tom Âmbar / Dourado intenso
    colorClasses:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border-amber-600 shadow-amber-500/30',
  },
  {
    id: 'freio',
    label: 'FREIO',
    emoji: '🛑',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Freio',
    // Tom Vermelho vibrante
    colorClasses:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-rose-700 shadow-rose-600/30',
  },
  {
    id: 'kit_relacao',
    label: 'KIT RELAÇÃO',
    emoji: '⛓️',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Kit Relação',
    // Tom Azul / Índigo marcante
    colorClasses:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700 shadow-blue-600/30',
  },
  {
    id: 'seguro',
    label: 'SEGURO',
    emoji: '🛡️',
    categoriaNome: 'Seguro',
    descricaoPrefix: 'Seguro',
    // Tom Verde Esmeralda distinto
    colorClasses:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-700 shadow-emerald-600/30',
  },
  {
    id: 'pneu',
    label: 'PNEU',
    emoji: '🛞',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Pneu',
    // Tom Roxo/Violeta marcante
    colorClasses:
      'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white border-violet-700 shadow-violet-600/30',
  },
]

export default function LancamentosRapidos() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [selectedMotoId, setSelectedMotoId] = useState<string>('')
  const [precoInput, setPrecoInput] = useState<string>('')
  const [dataInput, setDataInput] = useState<string>(getTodayLocalDate())
  const [observacaoInput, setObservacaoInput] = useState<string>('')
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
      toast.error('Informe o PREÇO antes de lançar!')
      return
    }

    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'

    setSubmittingButton(btn.id)

    try {
      // 1. Categoria garantida
      const categoriaFinal = await ensureCategoriaExists(btn.categoriaNome)

      // 2. Descrição no padrão pedido: "Óleo — {nome da moto}" ou "Óleo — {nome da moto} — {observação}"
      const obsTrimmed = observacaoInput.trim()
      const descricaoLancamento = obsTrimmed
        ? `${btn.descricaoPrefix} — ${motoNomeDisplay} — ${obsTrimmed}`
        : `${btn.descricaoPrefix} — ${motoNomeDisplay}`

      // 3. Data selecionada (padrão hoje ou outra escolhida)
      const dataLancamento = dataInput || getTodayLocalDate()

      const createdEntry = await caixaService.create({
        moto: selectedMotoId,
        tipo: 'saida',
        descricao: descricaoLancamento,
        categoria: categoriaFinal,
        valor: valorNumerico,
        data: dataLancamento,
        forma_pagamento: 'pix',
        observacoes: obsTrimmed
          ? `Lançado via Lançamentos Rápidos: ${obsTrimmed}`
          : 'Lançado via Lançamentos Rápidos',
      })

      // 4. Feedback imediato ao usuário (toast claro e vibrante)
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`${btn.label} — R$ ${valorFormatado} lançado no caixa da ${motoNomeDisplay}!`, {
        duration: 4000,
      })

      // 5. Limpar campos de preço e observação e redefinir data para 'hoje' prontos para o próximo lançamento
      setPrecoInput('')
      setDataInput(getTodayLocalDate())
      setObservacaoInput('')

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
          {/* Grade / Botões de Escolha da Moto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Toque na moto desejada *
              </Label>
              {selectedMoto && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Escolhida:{' '}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {motos.map((m) => (
                  <MotoCardButton
                    key={m.id}
                    moto={m}
                    isSelected={selectedMotoId === m.id}
                    onClick={() => setSelectedMotoId(m.id)}
                  />
                ))}
              </div>
            )}

            {!selectedMotoId && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Toque em uma moto acima para liberar os botões de lançamento.</span>
              </div>
            )}
          </div>

          {/* 2. Campo de PREÇO */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="precoInput"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                2. Preço (R$) *
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
            {valorNumerico <= 0 && (
              <p className="text-xs text-muted-foreground">
                Digite o valor antes de tocar no botão desejado.
              </p>
            )}
          </div>

          {/* 3. Os Botões Rápidos */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                3. Botões de Lançamento
              </Label>
              <span className="text-xs text-muted-foreground">Toque para lançar</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {QUICK_BUTTONS.map((btn) => {
                const isThisLoading = submittingButton === btn.id
                return (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={!isFormReady || submittingButton !== null}
                    onClick={() => handleQuickLaunch(btn)}
                    className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center gap-1 p-3 border-2 transition-all select-none ${
                      !isFormReady
                        ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                        : `${btn.colorClasses} shadow-md hover:shadow-lg active:scale-95 cursor-pointer`
                    }`}
                  >
                    {isThisLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span className="text-sm font-bold text-white">Lançando...</span>
                      </div>
                    ) : (
                      <>
                        <span
                          className="text-2xl sm:text-3xl filter drop-shadow-sm leading-none"
                          role="img"
                          aria-label={btn.label}
                        >
                          {btn.emoji}
                        </span>
                        <span className="text-base sm:text-lg font-black uppercase tracking-wide leading-tight">
                          {btn.label}
                        </span>
                        <span
                          className={`text-[11px] font-medium leading-none ${
                            !isFormReady ? 'text-slate-400' : 'text-white/85'
                          }`}
                        >
                          {btn.categoriaNome}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Data do Lançamento e 5. Observação */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* 4. Data do Lançamento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="dataInput"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  4. Data do Lançamento
                </Label>
                <div className="flex items-center gap-1.5">
                  {dataInput === getTodayLocalDate() ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                    >
                      Hoje ({formatDateDisplay(getTodayLocalDate())})
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDataInput(getTodayLocalDate())}
                      className="h-6 px-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      Voltar para Hoje
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant={dataInput === getTodayLocalDate() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDataInput(getTodayLocalDate())}
                    className={`h-11 px-4 font-bold text-sm ${
                      dataInput === getTodayLocalDate()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Hoje
                  </Button>
                </div>
                <Input
                  id="dataInput"
                  type="date"
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value || getTodayLocalDate())}
                  className="h-11 text-base font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Padrão é <strong>Hoje</strong> já selecionado. Se precisar lançar com outra data
                retroativa ou futura, escolha no campo acima.
              </p>
            </div>

            {/* 5. Campo de OBSERVAÇÃO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="observacaoInput"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  5. Observação{' '}
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                {observacaoInput.trim() && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    Acrescenta após o nome
                  </span>
                )}
              </div>

              <Input
                id="observacaoInput"
                type="text"
                placeholder="Ex: troca com filtro, dianteiro, traseiro..."
                value={observacaoInput}
                onChange={(e) => setObservacaoInput(e.target.value)}
                maxLength={100}
                className="h-12 text-sm sm:text-base font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              <p className="text-xs text-muted-foreground">
                O que for escrito será acrescentado após o nome na descrição do lançamento (ex:
                &quot;Óleo — {selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'}
                {observacaoInput.trim() ? ` — ${observacaoInput.trim()}` : ' — troca com filtro'}
                &quot;).
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Escolha a moto, informe o preço e toque no botão do serviço desejado. A data padrão é
              Hoje. Após cada lançamento, os campos de preço e observação são limpos e a data é
              redefinida para hoje.
            </p>
          </div>

          {/* Status / Orientações */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>
              <strong>Data do lançamento:</strong>{' '}
              {formatDateDisplay(dataInput || getTodayLocalDate())}
              {dataInput === getTodayLocalDate() ? ' (Hoje)' : ''}
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
