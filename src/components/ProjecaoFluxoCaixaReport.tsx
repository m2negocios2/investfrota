import React, { useMemo, useState } from 'react'
import {
  TrendingUp,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bike,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CaixaLancamento, ContaAPagarComProgresso, Moto } from '@/types/database'
import {
  calcularProjecaoFluxoCaixa,
  formatarNumeroPlanilha,
  MesProjecao,
} from '@/lib/projecaoUtils'

interface ProjecaoFluxoCaixaReportProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
}

export function ProjecaoFluxoCaixaReport({
  motos,
  caixa,
  contasAPagar,
}: ProjecaoFluxoCaixaReportProps) {
  // Ponto de corte do sistema (mês e ano atuais reais)
  const agora = new Date()
  const anoAtualReal = agora.getFullYear()
  const mesAtualReal = agora.getMonth() + 1

  // Permite navegar a régua de 12 meses caso o usuário queira deslocar a visão,
  // mas o ponto de corte realizado/estimativa permanece o mês presente real do sistema.
  const [deslocamentoMeses, setDeslocamentoMeses] = useState<number>(0)

  const projecao = useMemo(() => {
    // Detectar primeiro mês de caixa para início padrão
    let menorAno = anoAtualReal
    let menorMes = mesAtualReal

    for (const c of caixa) {
      if (!c.data) continue
      const match = c.data.match(/^(\d{4})-(\d{2})/)
      if (match) {
        const y = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        if (y < menorAno || (y === menorAno && m < menorMes)) {
          menorAno = y
          menorMes = m
        }
      }
    }

    // Aplicar deslocamento no mês inicial caso o usuário navegue
    const dtInicio = new Date(menorAno, menorMes - 1 + deslocamentoMeses, 1)

    return calcularProjecaoFluxoCaixa({
      motos,
      caixa,
      contasAPagar,
      anoAtual: anoAtualReal,
      mesAtual: mesAtualReal,
      anoInicio: dtInicio.getFullYear(),
      mesInicio: dtInicio.getMonth() + 1,
      motosNovas: 3,
    })
  }, [motos, caixa, contasAPagar, anoAtualReal, mesAtualReal, deslocamentoMeses])

  // Agrupar colunas por ano para desenhar os blocos de ano do cabeçalho superior
  const blocosAno = useMemo(() => {
    const mapa = new Map<number, number>()
    projecao.meses.forEach((m) => {
      mapa.set(m.ano, (mapa.get(m.ano) || 0) + 1)
    })
    return Array.from(mapa.entries()).map(([ano, colSpan]) => ({
      ano,
      colSpan,
    }))
  }, [projecao.meses])

  // Helper de cor para os valores:
  // - Meses futuros (estimativa) -> sempre azul (#2563eb / text-blue-600)
  // - Meses realizados:
  //   * Receita -> verde forte (#15803d / text-emerald-700 font-bold)
  //   * Custos -> neutro (#334155 / text-slate-700)
  //   * 33% -> verde (#16a34a / text-emerald-600)
  //   * 15% HONDA -> vermelho (#dc2626 / text-red-600)
  //   * LL -> verde escuro / negrito (#15803d / text-emerald-700 font-extrabold)
  const getValorClassName = (
    tipoLinha: 'receita' | 'custos' | '33' | 'honda' | 'll',
    mes: MesProjecao,
  ) => {
    if (!mes.isPassadoOuPresente) {
      // ESTIMATIVA FUTURA -> SEMPRE EM AZUL
      if (tipoLinha === 'receita' || tipoLinha === 'll') {
        return 'text-blue-600 dark:text-blue-400 font-bold'
      }
      return 'text-blue-500 dark:text-blue-400 font-medium'
    }

    // MESES REALIZADOS
    switch (tipoLinha) {
      case 'receita':
        return 'text-emerald-700 dark:text-emerald-400 font-bold'
      case 'custos':
        return 'text-slate-700 dark:text-slate-300 font-medium'
      case '33':
        return 'text-emerald-600 dark:text-emerald-400 font-semibold'
      case 'honda':
        return mes.honda > 0
          ? 'text-red-600 dark:text-red-400 font-semibold'
          : 'text-slate-400 dark:text-slate-600 font-normal'
      case 'll':
        return mes.ll >= 0
          ? 'text-emerald-700 dark:text-emerald-400 font-black'
          : 'text-red-600 dark:text-red-400 font-black'
      default:
        return 'text-slate-800 dark:text-slate-200'
    }
  }

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Projeção de Fluxo de Caixa Mensal
            </CardTitle>
            <Badge
              variant="outline"
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            >
              12 Meses
            </Badge>
          </div>
          <CardDescription className="mt-1 text-xs">
            Régua consolidada de 12 meses: histórico do <strong>Fluxo de Caixa real</strong> até o
            mês presente e <strong>estimativas em azul</strong> considerando 3 novas motos (+1 ainda
            por cadastrar).
          </CardDescription>
        </div>

        {/* Controles de Navegação e Legenda */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeslocamentoMeses((v) => v - 1)}
              className="h-7 w-7 p-0"
              title="Voltar 1 mês"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeslocamentoMeses(0)}
              className="h-7 px-2 text-xs font-semibold"
              title="Voltar ao início do fluxo"
            >
              Padrão
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeslocamentoMeses((v) => v + 1)}
              className="h-7 w-7 p-0"
              title="Avançar 1 mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Banner Explicativo com Base de Cálculo */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-emerald-50/40 to-slate-50 dark:from-blue-950/30 dark:via-emerald-950/20 dark:to-slate-900 border border-blue-200/60 dark:border-blue-900/40 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Regra de Projeção da Planilha
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Até o <strong>mês corrente</strong> são dados reais do Caixa. Os meses futuros são
                exibidos em <strong className="text-blue-600 dark:text-blue-400">azul</strong> e
                projetam a frota com{' '}
                <strong className="text-blue-700 dark:text-blue-300">
                  {projecao.motosAtivasCount} motos ativas + {projecao.motosNovasCount} novas ={' '}
                  {projecao.frotaTotalProjetada} motos
                </strong>{' '}
                (sendo 1 ainda por cadastrar). A linha <strong>15% HONDA</strong> reflete as
                parcelas restantes em Contas a Pagar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Realizado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Estimativa (+3 motos)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
              <span className="text-red-600 dark:text-red-400 font-semibold">
                Honda / Terceiros
              </span>
            </div>
          </div>
        </div>

        {/* TABELA PRINCIPAL DA PLANILHA — RÉPLICA FIEL */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950">
          <table className="w-full text-xs border-collapse min-w-[980px]">
            <thead>
              {/* NÍVEL 1 DO CABEÇALHO: ANO (2026, 2027) */}
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                <th
                  colSpan={2}
                  className="py-2 px-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-800"
                >
                  {/* Espaço das labels da esquerda */}
                </th>
                <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  TOTAL 12M
                </th>
                {blocosAno.map((bloco) => (
                  <th
                    key={bloco.ano}
                    colSpan={bloco.colSpan}
                    className={`py-2 px-3 text-center font-black text-sm tracking-wider border-r border-slate-200 dark:border-slate-800 ${
                      bloco.ano === anoAtualReal
                        ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {bloco.ano}
                  </th>
                ))}
              </tr>

              {/* NÍVEL 2 DO CABEÇALHO: NOME DO MÊS (jun, jul, ago...) */}
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                <th
                  colSpan={2}
                  className="py-2 px-3 text-left font-semibold text-slate-500 text-[11px] border-r border-slate-200 dark:border-slate-800"
                >
                  Descrição
                </th>
                <th className="py-2 px-3 text-right font-semibold text-slate-500 text-[11px] border-r border-slate-200 dark:border-slate-800">
                  Acumulado
                </th>
                {projecao.meses.map((m) => (
                  <th
                    key={`mes-${m.ano}-${m.mes}`}
                    className={`py-2 px-2 text-right font-bold text-xs tracking-tight border-r border-slate-200 dark:border-slate-800 min-w-[70px] ${
                      m.isMesCorrente
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500'
                        : !m.isPassadoOuPresente
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20'
                          : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col items-end">
                      <span className="capitalize">{m.nomeMes}</span>
                      {m.isMesCorrente && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                          Atual
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* NÍVEL 3 DO CABEÇALHO: NÚMERO SEQUENCIAL DO MÊS (1, 2, 3... 12) */}
              <tr className="border-b border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/80 text-[11px]">
                <th
                  colSpan={2}
                  className="py-1 px-3 text-left font-medium text-slate-400 border-r border-slate-200 dark:border-slate-800"
                >
                  Mês
                </th>
                <th className="py-1 px-3 text-right font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800">
                  -
                </th>
                {projecao.meses.map((m) => (
                  <th
                    key={`seq-${m.ano}-${m.mes}`}
                    className={`py-1 px-2 text-right font-bold border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/60'
                        : !m.isPassadoOuPresente
                          ? 'text-blue-500 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m.numeroSequencial}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* LINHA 1: RECEITA (verde, negrito) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-2.5 px-3 font-black text-sm text-emerald-700 dark:text-emerald-400 w-32 border-r border-slate-200 dark:border-slate-800">
                  Receita
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (+)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(projecao.totais.receita)}
                </td>
                {projecao.meses.map((m) => (
                  <td
                    key={`rec-${m.ano}-${m.mes}`}
                    className={`py-2.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/30 font-extrabold'
                        : ''
                    } ${getValorClassName('receita', m)}`}
                  >
                    {formatarNumeroPlanilha(m.receita)}
                  </td>
                ))}
              </tr>

              {/* LINHA 2: CUSTOS (neutro) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-32 border-r border-slate-200 dark:border-slate-800">
                  Custos
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (-)
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(projecao.totais.custos)}
                </td>
                {projecao.meses.map((m) => (
                  <td
                    key={`custo-${m.ano}-${m.mes}`}
                    className={`py-2.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente ? 'bg-emerald-50/40 dark:bg-emerald-950/30 font-bold' : ''
                    } ${getValorClassName('custos', m)}`}
                  >
                    {formatarNumeroPlanilha(m.custos)}
                  </td>
                ))}
              </tr>

              {/* LINHA 3: 33% (Receita - Custos, verde) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-slate-100 w-32 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>33%</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Rec - Custos)
                  </span>
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (=)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/70">
                  {formatarNumeroPlanilha(projecao.totais.percentual33)}
                </td>
                {projecao.meses.map((m) => (
                  <td
                    key={`33-${m.ano}-${m.mes}`}
                    className={`py-2.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente ? 'bg-emerald-50/40 dark:bg-emerald-950/30 font-bold' : ''
                    } ${getValorClassName('33', m)}`}
                  >
                    {formatarNumeroPlanilha(m.percentual33)}
                  </td>
                ))}
              </tr>

              {/* LINHA 4: 15% HONDA (Dívida Honda / Contas a pagar, vermelho) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-2.5 px-3 font-bold text-red-600 dark:text-red-400 w-32 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>15% HONDA</span>
                  <span className="text-[10px] text-red-400 dark:text-red-500 font-normal">
                    (Dívida)
                  </span>
                </td>
                <td className="py-2.5 px-2 text-[10px] text-red-500 w-6 border-r border-slate-200 dark:border-slate-800">
                  (-)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(projecao.totais.honda)}
                </td>
                {projecao.meses.map((m) => (
                  <td
                    key={`honda-${m.ano}-${m.mes}`}
                    className={`py-2.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente ? 'bg-emerald-50/40 dark:bg-emerald-950/30 font-bold' : ''
                    } ${getValorClassName('honda', m)}`}
                  >
                    {m.honda > 0 ? formatarNumeroPlanilha(m.honda) : '-'}
                  </td>
                ))}
              </tr>

              {/* LINHA 5: LL (Lucro Líquido = (Receita - Custos) - Honda, verde negrito) */}
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors">
                <td className="py-3 px-3 font-black text-base text-emerald-800 dark:text-emerald-300 w-32 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>LL</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    (Lucro Líquido)
                  </span>
                </td>
                <td className="py-3 px-2 text-[11px] font-bold text-emerald-700 w-6 border-r border-slate-200 dark:border-slate-800">
                  (=)
                </td>
                <td className="py-3 px-3 text-right font-black text-base text-emerald-700 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-800 bg-emerald-100/50 dark:bg-emerald-950/60">
                  {formatarNumeroPlanilha(projecao.totais.ll)}
                </td>
                {projecao.meses.map((m) => (
                  <td
                    key={`ll-${m.ano}-${m.mes}`}
                    className={`py-3 px-2 text-right border-r border-slate-200 dark:border-slate-800 text-sm ${
                      m.isMesCorrente
                        ? 'bg-emerald-100/70 dark:bg-emerald-900/50 font-black text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600'
                        : ''
                    } ${getValorClassName('ll', m)}`}
                  >
                    {formatarNumeroPlanilha(m.ll)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalhes e Métricas da Estimativa Projetada */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Frota Projetada nos Meses Futuros
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {projecao.frotaTotalProjetada} Motos
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                ({projecao.motosAtivasCount} ativas + 3 novas)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Inclui 1 moto nova ainda em processo de cadastro no sistema.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Média Histórica por Moto Ativa
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {formatarNumeroPlanilha(projecao.mediaReceitaPorMoto)}
              </span>
              <span className="text-xs text-slate-500">receita/mês</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Custos médios: R$ {formatarNumeroPlanilha(projecao.mediaCustosPorMoto)}/moto/mês
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Lucro Líquido Acumulado 12M
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                R$ {formatarNumeroPlanilha(projecao.totais.ll)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">(LL total)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fórmula: (Receita 12M − Custos 12M) − Honda 12M
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default ProjecaoFluxoCaixaReport
