import React, { useMemo } from 'react'
import { FileSpreadsheet, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CaixaLancamento, ContaAPagarComProgresso, Moto } from '@/types/database'
import {
  calcularProjecaoFluxoCaixa,
  formatarNumeroPlanilha,
  MesProjecao,
} from '@/lib/projecaoUtils'

interface ResultadoReportProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
  contasAPagar: ContaAPagarComProgresso[]
}

export function ProjecaoFluxoCaixaReport({ motos, caixa, contasAPagar }: ResultadoReportProps) {
  // Ponto de corte do sistema (mês e ano atuais reais)
  const agora = new Date()
  const anoAtualReal = agora.getFullYear()
  const mesAtualReal = agora.getMonth() + 1

  const resultado = useMemo(() => {
    return calcularProjecaoFluxoCaixa({
      motos,
      caixa,
      contasAPagar,
      anoAtual: anoAtualReal,
      mesAtual: mesAtualReal,
    })
  }, [motos, caixa, contasAPagar, anoAtualReal, mesAtualReal])

  // Agrupar colunas por ano para desenhar os blocos de ano do cabeçalho superior
  const blocosAno = useMemo(() => {
    const mapa = new Map<number, number>()
    resultado.meses.forEach((m) => {
      mapa.set(m.ano, (mapa.get(m.ano) || 0) + 1)
    })
    return Array.from(mapa.entries()).map(([ano, colSpan]) => ({
      ano,
      colSpan,
    }))
  }, [resultado.meses])

  // Helper de cor para os valores reais:
  // - Receita -> verde forte (#15803d / text-emerald-700 font-bold)
  // - Custos -> neutro (#334155 / text-slate-700)
  // - Receita - Custos -> verde (#16a34a / text-emerald-600)
  // - 15% HONDA -> vermelho (#dc2626 / text-red-600)
  // - LL -> verde escuro / negrito (#15803d / text-emerald-700 font-extrabold) ou vermelho se negativo
  const getValorClassName = (
    tipoLinha: 'receita' | 'custos' | '33' | 'honda' | 'll',
    mes: MesProjecao,
  ) => {
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

  const primeiroMesDesc =
    resultado.meses.length > 0
      ? `${resultado.meses[0].nomeMesCompleto}/${resultado.meses[0].ano}`
      : 'Início'
  const ultimoMesDesc =
    resultado.meses.length > 0
      ? `${resultado.meses[resultado.meses.length - 1].nomeMesCompleto}/${
          resultado.meses[resultado.meses.length - 1].ano
        }`
      : 'Mês presente'

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Resultado
            </CardTitle>
            <Badge
              variant="outline"
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            >
              {resultado.totalMeses} {resultado.totalMeses === 1 ? 'Mês' : 'Meses'} Realizados
            </Badge>
          </div>
          <CardDescription className="mt-1 text-xs">
            Dados reais do <strong>Fluxo de Caixa</strong> do primeiro mês com movimentação (
            {primeiroMesDesc}) até o <strong>mês presente ({ultimoMesDesc})</strong>.
          </CardDescription>
        </div>

        {/* Indicador de Dados 100% Reais */}
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5 py-1 px-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Dados Reais do Caixa
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* TABELA PRINCIPAL DA PLANILHA — DADOS REAIS ATÉ O MÊS PRESENTE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950">
          <table className="w-full text-xs border-collapse min-w-[760px]">
            <thead>
              {/* NÍVEL 1 DO CABEÇALHO: ANO (2025, 2026...) */}
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                <th
                  colSpan={2}
                  className="py-2 px-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-800"
                >
                  {/* Espaço das labels da esquerda */}
                </th>
                <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                  TOTAL REAL
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
                {resultado.meses.map((m) => (
                  <th
                    key={`mes-${m.ano}-${m.mes}`}
                    className={`py-2 px-2 text-right font-bold text-xs tracking-tight border-r border-slate-200 dark:border-slate-800 min-w-[70px] ${
                      m.isMesCorrente
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500'
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

              {/* NÍVEL 3 DO CABEÇALHO: NÚMERO SEQUENCIAL DO MÊS (1, 2, 3...) */}
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
                {resultado.meses.map((m) => (
                  <th
                    key={`seq-${m.ano}-${m.mes}`}
                    className={`py-1 px-2 text-right font-bold border-r border-slate-200 dark:border-slate-800 ${
                      m.isMesCorrente
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/60'
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
                <td className="py-2.5 px-3 font-black text-sm text-emerald-700 dark:text-emerald-400 w-36 border-r border-slate-200 dark:border-slate-800">
                  Receita
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (+)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(resultado.totais.receita)}
                </td>
                {resultado.meses.map((m) => (
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
                <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-36 border-r border-slate-200 dark:border-slate-800">
                  Custos
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (-)
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(resultado.totais.custos)}
                </td>
                {resultado.meses.map((m) => (
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

              {/* LINHA 3: Receita − Custos (verde) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-slate-100 w-36 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>Receita − Custos</span>
                </td>
                <td className="py-2.5 px-2 text-[10px] text-muted-foreground w-6 border-r border-slate-200 dark:border-slate-800">
                  (=)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/70">
                  {formatarNumeroPlanilha(resultado.totais.percentual33)}
                </td>
                {resultado.meses.map((m) => (
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

              {/* LINHA 4: 15% HONDA (Dívida Honda paga no Caixa, vermelho) */}
              <tr className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-2.5 px-3 font-bold text-red-600 dark:text-red-400 w-36 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>15% HONDA</span>
                  <span className="text-[10px] text-red-400 dark:text-red-500 font-normal">
                    (Dívida)
                  </span>
                </td>
                <td className="py-2.5 px-2 text-[10px] text-red-500 w-6 border-r border-slate-200 dark:border-slate-800">
                  (-)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  {formatarNumeroPlanilha(resultado.totais.honda)}
                </td>
                {resultado.meses.map((m) => (
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
                <td className="py-3 px-3 font-black text-base text-emerald-800 dark:text-emerald-300 w-36 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>LL</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    (Lucro Líquido)
                  </span>
                </td>
                <td className="py-3 px-2 text-[11px] font-bold text-emerald-700 w-6 border-r border-slate-200 dark:border-slate-800">
                  (=)
                </td>
                <td className="py-3 px-3 text-right font-black text-base text-emerald-700 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-800 bg-emerald-100/50 dark:bg-emerald-950/60">
                  {formatarNumeroPlanilha(resultado.totais.ll)}
                </td>
                {resultado.meses.map((m) => (
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

        {/* Resumo consolidado do Resultado Real */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Receita Total Real
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                R$ {formatarNumeroPlanilha(resultado.totais.receita)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({resultado.totalMeses} {resultado.totalMeses === 1 ? 'mês' : 'meses'})
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Soma de todas as entradas do Caixa até o mês presente.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Custos Operacionais + Dívida Honda
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                R$ {formatarNumeroPlanilha(resultado.totais.custos + resultado.totais.honda)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Custos: R$ {formatarNumeroPlanilha(resultado.totais.custos)} | Honda: R${' '}
              {formatarNumeroPlanilha(resultado.totais.honda)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Lucro Líquido Acumulado Real
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-xl font-black ${resultado.totais.ll >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                R$ {formatarNumeroPlanilha(resultado.totais.ll)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">(LL)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fórmula: (Receita − Custos) − 15% Honda
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default ProjecaoFluxoCaixaReport
