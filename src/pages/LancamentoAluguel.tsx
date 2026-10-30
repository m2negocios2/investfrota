import React, { useState, useEffect } from 'react'
import {
  Zap,
  Bike,
  CheckCircle2,
  History,
  AlertCircle,
  Calendar,
  FilePlus2,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { contratosService } from '@/services/contratos'
import { categoriasService } from '@/services/categorias'
import { getTodayLocalDate, formatDateDisplay, dateToApiMidday } from '@/lib/dateUtils'
import { Moto, Contrato, CaixaLancamento, CategoriaGasto, FormaPagamento } from '@/types/database'
import { MotoCardButton } from '@/components/MotoSelectorGrid'

export default function LancamentoAluguel() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [selectedMotoId, setSelectedMotoId] = useState<string>('')
  const [valorInput, setValorInput] = useState<string>('')
  const [dataInput, setDataInput] = useState<string>(getTodayLocalDate())
  const [semComissao, setSemComissao] = useState<boolean>(false)

  // Estado para Fim de Contrato / INDEFINIDO na moto selecionada
  const [dataFimInput, setDataFimInput] = useState<string>('')
  const [isIndefinido, setIsIndefinido] = useState<boolean>(false)
  const [updatingFimContrato, setUpdatingFimContrato] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [recentLancamentos, setRecentLancamentos] = useState<CaixaLancamento[]>([])

  // Estado do Modal de OUTRAS ENTRADAS (apenas RECEITAS)
  const [outrosModalOpen, setOutrosModalOpen] = useState<boolean>(false)
  const [outroDescricao, setOutroDescricao] = useState<string>('')
  const [outroCategoria, setOutroCategoria] = useState<string>('')
  const [outroValor, setOutroValor] = useState<number | ''>('')
  const [outroData, setOutroData] = useState<string>(getTodayLocalDate())
  const [outroFormaPagamento, setOutroFormaPagamento] = useState<FormaPagamento>('pix')
  const [outroObservacoes, setOutroObservacoes] = useState<string>('')
  const [submittingOutro, setSubmittingOutro] = useState<boolean>(false)

  const loadData = async () => {
    try {
      const [mList, cList, allCaixa, catList] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        caixaService.getAll(),
        categoriasService.getAll(),
      ])

      // Excluir motos vendidas/cedidas do Lançamento de Aluguel e ordenar por nome
      const sortedMotos = [...mList]
        .filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
        .sort((a, b) => {
          const nameA = (a.nome || a.modelo || a.placa || '').toUpperCase()
          const nameB = (b.nome || b.modelo || b.placa || '').toUpperCase()
          return nameA.localeCompare(nameB)
        })

      setMotos(sortedMotos)
      setContratos(cList)
      setCategorias(catList)

      // Filtrar lançamentos recentes de entradas ou comissão no caixa
      const recent = allCaixa
        .filter((c) => c.tipo === 'entrada' || c.categoria === 'Comissão')
        .slice(0, 10)
      setRecentLancamentos(recent)
    } catch (err) {
      console.error('Erro ao carregar dados do lançamento de aluguel:', err)
      toast.error('Erro ao carregar dados. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Parse do valor aceitando vírgula e ponto
  const parseValor = (str: string): number => {
    if (!str) return 0
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  const selectedMoto = motos.find((m) => m.id === selectedMotoId)

  // Encontra contrato ativo da moto selecionada (se houver)
  const activeContract = selectedMotoId
    ? contratos.find((c) => c.moto === selectedMotoId && c.status === 'ativo')
    : undefined

  // Sincronizar campos de Fim de Contrato e sugestão de valor ao trocar moto / contrato ativo
  useEffect(() => {
    if (selectedMoto) {
      if (activeContract) {
        // Inicializar Fim de Contrato e INDEFINIDO conforme contrato ativo
        const rawEntrega = activeContract.data_entrega
          ? activeContract.data_entrega.split('T')[0].split(' ')[0]
          : ''
        setDataFimInput(rawEntrega)
        setIsIndefinido(!rawEntrega)

        const val =
          activeContract.valor_semanal !== undefined && activeContract.valor_semanal !== null
            ? activeContract.valor_semanal
            : (activeContract.valor_diario || 0) * 7
        if (val > 0) {
          setValorInput(val.toFixed(2).replace('.', ','))
          return
        }
      } else {
        setDataFimInput('')
        setIsIndefinido(false)
      }

      const valMoto =
        selectedMoto.valor_semanal !== undefined && selectedMoto.valor_semanal !== null
          ? selectedMoto.valor_semanal
          : (selectedMoto.valor_diario || 0) * 7
      if (valMoto > 0) {
        setValorInput(valMoto.toFixed(2).replace('.', ','))
      }
    } else {
      setDataFimInput('')
      setIsIndefinido(false)
    }
  }, [selectedMotoId, activeContract?.id, activeContract?.data_entrega])

  // Ação ao marcar/desmarcar o checkbox INDEFINIDO na tela Lançamento Entradas
  const handleToggleIndefinido = async (checked: boolean) => {
    if (!activeContract) return

    setIsIndefinido(checked)

    if (checked) {
      // Ao marcar: o campo da data de fim fica limpo e o contrato é gravado sem data de fim (indefinido)
      setDataFimInput('')
      setUpdatingFimContrato(true)
      try {
        const updated = await contratosService.update(activeContract.id, {
          data_entrega: '',
        })
        setContratos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast.success(
          `Contrato registrado como INDEFINIDO (sem data de término). O cliente segue com a moto normalmente.`,
        )
      } catch (err) {
        console.error('Erro ao definir contrato como indefinido:', err)
        toast.error('Não foi possível atualizar o contrato para indefinido.')
      } finally {
        setUpdatingFimContrato(false)
      }
    } else {
      // Ao desmarcar: volta a permitir preencher a data de fim.
      // Se não havia data antes, sugere 1 mês à frente ou deixa o campo focado
      const fallbackDate = getTodayLocalDate()
      setDataFimInput(fallbackDate)
    }
  }

  // Ação ao alterar a data no input de data fim
  const handleDataFimChange = async (newDate: string) => {
    setDataFimInput(newDate)
    if (!activeContract) return

    if (!newDate) {
      setIsIndefinido(true)
    } else {
      setIsIndefinido(false)
    }

    setUpdatingFimContrato(true)
    try {
      const updated = await contratosService.update(activeContract.id, {
        data_entrega: newDate || '',
      })
      setContratos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      if (newDate) {
        toast.success(`Fim do contrato atualizado para ${formatDateDisplay(newDate)}.`)
      } else {
        toast.success(`Contrato registrado como INDEFINIDO.`)
      }
    } catch (err) {
      console.error('Erro ao salvar nova data de fim do contrato:', err)
      toast.error('Erro ao atualizar a data de fim do contrato.')
    } finally {
      setUpdatingFimContrato(false)
    }
  }

  const valorNumerico = parseValor(valorInput)
  const isFormReady = Boolean(selectedMotoId && valorNumerico > 0)

  // Abrir modal tradicional de OUTRAS ENTRADAS
  const handleOpenOutrasEntradas = () => {
    if (!selectedMotoId) {
      toast.error('Selecione primeiro a Moto (no item 1) antes de abrir Outras Entradas!')
      return
    }
    // Inicializar campos com valores padrões para receitas
    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'
    setOutroDescricao(`Receita — ${motoNomeDisplay}`)
    // Categoria default: Aluguel se existir ou primeira da lista
    const defaultCat =
      categorias.find((c) => c.nome.toLowerCase() === 'aluguel')?.nome ||
      categorias[0]?.nome ||
      'Aluguel'
    setOutroCategoria(defaultCat)
    setOutroValor('')
    // Preserva a data escolhida no campo de data da tela principal para coerência
    setOutroData(dataInput || getTodayLocalDate())
    setOutroFormaPagamento('pix')
    setOutroObservacoes('')
    setOutrosModalOpen(true)
  }

  // Gravação do formulário tradicional de OUTRAS ENTRADAS
  const handleSubmitOutraEntrada = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMotoId) {
      toast.error('Nenhuma moto selecionada!')
      return
    }

    if (!outroDescricao.trim()) {
      toast.error('Informe a descrição do lançamento!')
      return
    }

    const valorFinal = typeof outroValor === 'number' ? outroValor : parseValor(String(outroValor))
    if (!valorFinal || valorFinal <= 0) {
      toast.error('Informe um valor válido maior que zero!')
      return
    }

    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'
    const catFinal = outroCategoria.trim() || 'Receitas'
    const safeData = outroData || getTodayLocalDate()
    const safeDataMidday = dateToApiMidday(safeData)

    setSubmittingOutro(true)
    try {
      const createdEntry = await caixaService.create({
        moto: selectedMotoId,
        tipo: 'entrada',
        descricao: outroDescricao.trim(),
        categoria: catFinal,
        valor: valorFinal,
        data: safeDataMidday,
        forma_pagamento: outroFormaPagamento,
        observacoes: outroObservacoes.trim()
          ? `Lançado via Outras Entradas: ${outroObservacoes.trim()}`
          : 'Lançado via Outras Entradas',
      })

      const valorFormatado = valorFinal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`Entrada de R$ ${valorFormatado} registrada no caixa da ${motoNomeDisplay}!`, {
        duration: 4000,
      })

      // Limpar campos do modal e fechar
      setOutroDescricao('')
      setOutroValor('')
      setOutroObservacoes('')
      setOutrosModalOpen(false)

      // Atualizar lista recente
      setRecentLancamentos((prev) => [
        {
          ...createdEntry,
          expand: { moto: selectedMoto },
        },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      console.error('Erro ao registrar outra entrada no caixa:', err)
      toast.error('Não foi possível gravar o lançamento de entrada. Tente novamente.')
    } finally {
      setSubmittingOutro(false)
    }
  }

  const handleLancar = async () => {
    if (!selectedMotoId) {
      toast.error('Selecione primeiro a Moto (pelo Nome)!')
      return
    }

    if (valorNumerico <= 0) {
      toast.error('Informe o VALOR do aluguel antes de lançar!')
      return
    }

    // Regra: se a moto não tem contrato ativo, avisar e NÃO lançar
    if (!activeContract) {
      toast.error(
        `A moto "${selectedMoto?.nome || selectedMoto?.modelo}" não possui contrato ativo. Não é possível lançar aluguel.`,
        { duration: 5000 },
      )
      return
    }

    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'
    const locatarioNome = activeContract.locatario_nome?.trim() || ''
    const safeDataMidday = dateToApiMidday(dataInput || getTodayLocalDate())

    setSubmitting(true)

    try {
      // 1. Criar lançamento de RECEITA do aluguel no Fluxo de Caixa
      // Regra pedida: na tela Lançamento Aluguel do menu, a descrição deve ser apenas 'Aluguel'
      const descReceita = 'Aluguel'

      const receitaCriada = await caixaService.create({
        moto: selectedMotoId,
        tipo: 'entrada',
        descricao: descReceita,
        categoria: 'Aluguel',
        valor: valorNumerico,
        data: safeDataMidday,
        forma_pagamento: 'pix',
        observacoes: `Lançado via Lançamento Aluguel (Contrato: ${activeContract.id})`,
      })

      // 2. Verificar percentual de comissão do contrato ativo
      const percentualComissao = Number(
        activeContract.comissao_percentual ?? activeContract.percentual_comissao ?? 0,
      )

      let comissaoCriada: CaixaLancamento | null = null

      if (!semComissao && percentualComissao > 0) {
        // Calcular valor da comissão
        const valorComissao = Number(((valorNumerico * percentualComissao) / 100).toFixed(2))
        if (valorComissao > 0) {
          // Lançar despesa de comissão no Caixa
          comissaoCriada = await caixaService.create({
            moto: selectedMotoId,
            tipo: 'saida',
            descricao: 'Comissão',
            categoria: 'Comissão',
            valor: valorComissao,
            data: safeDataMidday,
            forma_pagamento: 'pix',
            comissao_de: activeContract.id,
            recebimento: '',
            observacoes: `Comissão automática de ${percentualComissao}% sobre receita de R$ ${valorNumerico.toFixed(2)}`,
          })
        }
      }

      // 3. Feedback visual para a usuária conforme o resultado
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      if (semComissao) {
        toast.success(
          `Receita de aluguel de R$ ${valorFormatado} lançada com sucesso no Caixa da ${motoNomeDisplay} (sem comissão)!`,
          { duration: 5000 },
        )
      } else if (percentualComissao > 0 && comissaoCriada) {
        const comissaoFormatada = Number(comissaoCriada.valor).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        toast.success(
          `Aluguel de R$ ${valorFormatado} e Comissão de R$ ${comissaoFormatada} (${percentualComissao}%) lançados no Caixa da ${motoNomeDisplay}!`,
          { duration: 5000 },
        )
      } else {
        // Contrato ativo sem comissão configurada: lança só a receita e avisa
        toast.warning(
          `Receita de aluguel de R$ ${valorFormatado} lançada no Caixa. Atenção: Contrato ativo sem % de comissão cadastrado (nenhuma despesa de comissão gerada).`,
          { duration: 6000 },
        )
      }

      // 4. Limpar campos e redefinir data para 'hoje' prontos para o próximo lançamento
      setValorInput('')
      setDataInput(getTodayLocalDate())
      setSemComissao(false)

      // 5. Atualizar lista recente
      const novosItens: CaixaLancamento[] = [{ ...receitaCriada, expand: { moto: selectedMoto } }]
      if (comissaoCriada) {
        novosItens.push({ ...comissaoCriada, expand: { moto: selectedMoto } })
      }
      setRecentLancamentos((prev) => [...novosItens, ...prev].slice(0, 10))
    } catch (err) {
      console.error('Erro ao efetuar lançamento de aluguel:', err)
      toast.error('Erro ao registrar lançamento no Fluxo de Caixa. Tente novamente.')
    } finally {
      setSubmitting(false)
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
            LANÇAMENTO ENTRADAS
          </h1>
          <p className="text-sm text-muted-foreground">
            Lançamento direto de receita de aluguel e comissão automática no Fluxo de Caixa.
          </p>
        </div>
      </div>

      {/* Cartão Principal de Operação */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bike className="w-5 h-5 text-blue-600" />
            1. Selecione a Moto (pelo Nome)
          </CardTitle>
          <CardDescription>
            Botões compactos na cor cadastrada da moto. O sistema valida o contrato ativo
            automaticamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Grade de Botões-Ícone Compactos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Toque na moto *
              </Label>
              {selectedMoto && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {motos.map((m) => (
                  <MotoCardButton
                    key={m.id}
                    moto={m}
                    isSelected={selectedMotoId === m.id}
                    onClick={() => setSelectedMotoId(m.id)}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {/* Aviso de Contrato Ativo */}
            {selectedMoto && (
              <div className="mt-2">
                {activeContract ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Contrato Ativo: {activeContract.locatario_nome?.trim() || 'Sem nome'}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white dark:bg-slate-900 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold"
                      >
                        {activeContract.tipo === 'plano_conquista' ? 'Conquista' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-[11px] pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                      <span>
                        Comissão configurada:{' '}
                        <strong>
                          {activeContract.comissao_percentual ??
                            activeContract.percentual_comissao ??
                            0}
                          %
                        </strong>
                      </span>
                      <span>
                        Semanal sugerido: R${' '}
                        {(
                          activeContract.valor_semanal || (activeContract.valor_diario || 0) * 7
                        ).toFixed(2)}
                      </span>
                    </div>

                    {/* Bloco: Fim do Contrato & Checkbox INDEFINIDO */}
                    <div className="mt-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/70 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="dataFimContratoLancamento"
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          Fim do Contrato
                        </Label>

                        {/* Checkbox INDEFINIDO */}
                        <div className="flex items-center gap-1.5 cursor-pointer select-none bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-700/60">
                          <Checkbox
                            id="indefinidoLancamentoCheckbox"
                            checked={isIndefinido}
                            disabled={updatingFimContrato}
                            onCheckedChange={(checked) => handleToggleIndefinido(Boolean(checked))}
                            className="h-4 w-4 border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <label
                            htmlFor="indefinidoLancamentoCheckbox"
                            className="text-[11px] font-black tracking-wide text-emerald-900 dark:text-emerald-100 cursor-pointer uppercase"
                          >
                            INDEFINIDO
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          id="dataFimContratoLancamento"
                          type="date"
                          value={dataFimInput}
                          disabled={isIndefinido || updatingFimContrato}
                          onChange={(e) => handleDataFimChange(e.target.value)}
                          className={`h-9 text-xs font-semibold bg-white dark:bg-slate-900 border transition-all ${
                            isIndefinido
                              ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                              : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                          }`}
                        />
                        {isIndefinido && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap shrink-0 py-1"
                          >
                            Sem prazo / Contínuo
                          </Badge>
                        )}
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {isIndefinido ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Contrato sem data de término estipulada — o cliente pode ir seguindo com
                            a moto sem prazo.
                          </span>
                        ) : dataFimInput ? (
                          <span>
                            Término estipulado:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {formatDateDisplay(dataFimInput)}
                            </strong>
                            . Se for sem prazo, marque <strong>INDEFINIDO</strong>.
                          </span>
                        ) : (
                          <span>
                            Sem data definida. Marque <strong>INDEFINIDO</strong> ou preencha a data
                            acima.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>Sem contrato ativo!</strong> Esta moto não tem locatário vinculado no
                      momento. O botão <strong>LANÇAR</strong> ficará bloqueado.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Campo de DATA (padrão Hoje já selecionado, com opção de trocar) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="dataAluguelInput"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                2. Data do Pagamento
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
              <Input
                id="dataAluguelInput"
                type="date"
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                className="h-11 text-base font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Padrão &quot;Hoje&quot; já selecionado. Se o recebimento foi em outra data, troque no
              campo acima.
            </p>
          </div>

          {/* 3. Campo de VALOR */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="valorAluguelInput"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                3. Valor do Aluguel (R$) *
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
                id="valorAluguelInput"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorInput}
                onChange={(e) => setValorInput(e.target.value)}
                className="pl-12 h-14 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* 4. Resumo da Ação, Checkbox sem comissão e Botão LANÇAR */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {isFormReady && activeContract && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Ao clicar em LANÇAR serão gerados no Fluxo de Caixa:
                </span>
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>1. Receita de Aluguel:</span>
                  <span>
                    + R$ {valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {semComissao ? (
                  <div className="flex items-center justify-between text-slate-500 italic text-[11px] pt-0.5">
                    <span>2. Despesa de Comissão:</span>
                    <span className="font-medium">Ignorada (opção sem comissão marcada)</span>
                  </div>
                ) : Number(
                    activeContract.comissao_percentual ?? activeContract.percentual_comissao ?? 0,
                  ) > 0 ? (
                  <div className="flex items-center justify-between text-red-600 font-semibold">
                    <span>
                      2. Despesa de Comissão (
                      {activeContract.comissao_percentual ?? activeContract.percentual_comissao}
                      %):
                    </span>
                    <span>
                      - R${' '}
                      {(
                        (valorNumerico *
                          Number(
                            activeContract.comissao_percentual ??
                              activeContract.percentual_comissao ??
                              0,
                          )) /
                        100
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <div className="text-amber-600 text-[11px]">
                    2. Contrato sem % de comissão → nenhuma comissão será lançada.
                  </div>
                )}
              </div>
            )}

            {/* Checkbox: Lançar aluguel sem comissão */}
            <div className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none">
              <Checkbox
                id="semComissaoCheckbox"
                checked={semComissao}
                onCheckedChange={(checked) => setSemComissao(Boolean(checked))}
                className="h-5 w-5 border-2 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label
                htmlFor="semComissaoCheckbox"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex-1 leading-snug"
              >
                Lançar aluguel sem comissão
              </label>
            </div>

            <Button
              type="button"
              disabled={!isFormReady || !activeContract || submitting}
              onClick={handleLancar}
              className={`w-full h-14 text-lg font-black uppercase tracking-wider shadow-lg transition-all ${
                !isFormReady || !activeContract
                  ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-500/20'
              }`}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>LANÇANDO NO CAIXA...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span>LANÇAR</span>
                </div>
              )}
            </Button>

            {/* Botão OUTRAS ENTRADAS posicionado logo após o botão LANÇAR */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenOutrasEntradas}
                className="w-full h-14 sm:h-16 text-base font-black tracking-wide uppercase border-2 border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-600 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 rounded-2xl gap-2.5 shadow-sm transition-all"
              >
                <FilePlus2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                OUTRAS ENTRADAS
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                Abre as caixas de lançamento tradicionais (descrição, categoria, valor, data etc.)
                sendo apenas <strong>RECEITAS/ENTRADAS</strong> vinculadas à moto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente de Lançamentos de Aluguel e Comissão */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Últimos Lançamentos de Entradas e Comissão no Caixa
          </CardTitle>
          <CardDescription className="text-xs">
            Conferência em tempo real dos lançamentos gerados no Fluxo de Caixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLancamentos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhum lançamento recente encontrado no caixa.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLancamentos.slice(0, 6).map((item) => {
                const motoItem = item.expand?.moto || motos.find((m) => m.id === item.moto)
                const motoName = motoItem?.nome || motoItem?.modelo || 'Moto'
                const isEntrada = item.tipo === 'entrada'
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isEntrada ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.descricao}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateDisplay(item.data)} • {motoName}
                          {motoItem?.placa ? ` (${motoItem.placa})` : ''} • {item.categoria}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          isEntrada
                            ? 'text-emerald-600 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'text-red-600 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30'
                        }`}
                      >
                        {isEntrada ? '+ ' : '- '}
                        R${' '}
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

      {/* Modal: OUTRAS ENTRADAS (Apenas RECEITAS / ENTRADAS) */}
      <Dialog open={outrosModalOpen} onOpenChange={setOutrosModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  OUTRAS ENTRADAS — Nova Receita
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Registro de receita tradicional no Fluxo de Caixa vinculada à moto selecionada.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedMoto && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Moto vinculada:
                </span>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {selectedMoto.nome?.trim() || selectedMoto.modelo?.trim() || selectedMoto.placa}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              >
                Apenas Entrada (Receita)
              </Badge>
            </div>
          )}

          <form onSubmit={handleSubmitOutraEntrada} className="space-y-4">
            {/* Descrição do Lançamento */}
            <div className="space-y-2">
              <Label htmlFor="outroDescEntrada">Descrição do Lançamento *</Label>
              <Input
                id="outroDescEntrada"
                placeholder="Ex: Receita extra, Bonificação, Reembolso..."
                value={outroDescricao}
                onChange={(e) => setOutroDescricao(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="outroCategoriaSelectEntrada">Categoria *</Label>
              <Select value={outroCategoria} onValueChange={setOutroCategoria}>
                <SelectTrigger id="outroCategoriaSelectEntrada">
                  <SelectValue placeholder="Selecione a categoria de receita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  {categorias
                    .filter((c) => c.nome !== 'Aluguel')
                    .map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  <SelectItem value="Receitas Gerais">Receitas Gerais</SelectItem>
                  <SelectItem value="Outras Receitas">Outras Receitas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor e Data lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="outroValorInputEntrada">Valor (R$) *</Label>
                <Input
                  id="outroValorInputEntrada"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={outroValor}
                  onChange={(e) =>
                    setOutroValor(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outroDataInputEntrada">Data *</Label>
                <Input
                  id="outroDataInputEntrada"
                  type="date"
                  value={outroData}
                  onChange={(e) => setOutroData(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="outroFormaSelectEntrada">Forma de Pagamento</Label>
              <Select
                value={outroFormaPagamento}
                onValueChange={(val: FormaPagamento) => setOutroFormaPagamento(val)}
              >
                <SelectTrigger id="outroFormaSelectEntrada">
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

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="outroObsEntrada">Observações / Detalhes (opcional)</Label>
              <Input
                id="outroObsEntrada"
                placeholder="Ex: Recebimento referente a..."
                value={outroObservacoes}
                onChange={(e) => setOutroObservacoes(e.target.value)}
                maxLength={150}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOutrosModalOpen(false)}
                disabled={submittingOutro}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingOutro}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submittingOutro ? 'Gravando Entrada...' : 'Confirmar Entrada no Caixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
