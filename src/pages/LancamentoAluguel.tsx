import React, { useState, useEffect } from 'react'
import {
  Zap,
  Bike,
  CheckCircle2,
  History,
  AlertCircle,
  Calendar,
  ArrowRight,
  DollarSign,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { getTodayLocalDate, formatDateDisplay, dateToApiMidday } from '@/lib/dateUtils'
import { Moto, Contrato, CaixaLancamento } from '@/types/database'
import { MotoCardButton } from '@/components/MotoSelectorGrid'

export default function LancamentoAluguel() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [selectedMotoId, setSelectedMotoId] = useState<string>('')
  const [valorInput, setValorInput] = useState<string>('')
  const [dataInput, setDataInput] = useState<string>(getTodayLocalDate())
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [recentLancamentos, setRecentLancamentos] = useState<CaixaLancamento[]>([])

  const loadData = async () => {
    try {
      const [mList, cList, allCaixa] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        caixaService.getAll(),
      ])

      // Ordenar motos pelo Nome em ordem alfabética
      const sortedMotos = [...mList].sort((a, b) => {
        const nameA = (a.nome || a.modelo || a.placa || '').toUpperCase()
        const nameB = (b.nome || b.modelo || b.placa || '').toUpperCase()
        return nameA.localeCompare(nameB)
      })

      setMotos(sortedMotos)
      setContratos(cList)

      // Filtrar lançamentos recentes de aluguel ou comissão
      const recent = allCaixa
        .filter((c) => c.categoria === 'Aluguel' || c.categoria === 'Comissão')
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

  // Atualizar sugestão de valor quando selecionar a moto
  useEffect(() => {
    if (selectedMoto) {
      if (activeContract) {
        const val =
          activeContract.valor_semanal !== undefined && activeContract.valor_semanal !== null
            ? activeContract.valor_semanal
            : (activeContract.valor_diario || 0) * 7
        if (val > 0) {
          setValorInput(val.toFixed(2).replace('.', ','))
          return
        }
      }
      const valMoto =
        selectedMoto.valor_semanal !== undefined && selectedMoto.valor_semanal !== null
          ? selectedMoto.valor_semanal
          : (selectedMoto.valor_diario || 0) * 7
      if (valMoto > 0) {
        setValorInput(valMoto.toFixed(2).replace('.', ','))
      }
    }
  }, [selectedMotoId])

  const valorNumerico = parseValor(valorInput)
  const isFormReady = Boolean(selectedMotoId && valorNumerico > 0)

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
      // 1. Criar lançamento de RECEITA do aluguel no Fluxo de Caixa (mesma descrição do sistema)
      const descReceita = locatarioNome
        ? `Recebimento de aluguel - ${locatarioNome}`
        : `Recebimento de aluguel - ${motoNomeDisplay}`

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

      if (percentualComissao > 0) {
        // Reusar serviço existente de comissão do caixa (mantendo deduplicação, data e descrição exatas)
        comissaoCriada = await caixaService.registrarComissaoSeAplicavel({
          contratoId: activeContract.id,
          motoId: selectedMotoId,
          valorReceita: valorNumerico,
          dataReceita: dataInput || getTodayLocalDate(),
          locatarioNome,
          motoIdentificacao: motoNomeDisplay,
          formaPagamento: 'pix',
        })
      }

      // 3. Feedback visual para a usuária conforme o resultado
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      if (percentualComissao > 0 && comissaoCriada) {
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
            LANÇAMENTO ALUGUEL
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
                onChange={(e) => setDataInput(e.target.value || getTodayLocalDate())}
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

          {/* 4. Resumo da Ação e Botão LANÇAR */}
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
                {Number(
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
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente de Lançamentos de Aluguel e Comissão */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Últimos Lançamentos de Aluguel e Comissão no Caixa
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
    </div>
  )
}
