import React, { useMemo } from 'react'
import { Bike, TrendingUp, Trophy, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Moto, CaixaLancamento } from '@/types/database'

interface LucroPorMotoReportProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
  selectedYear: number
  onYearChange: (year: number) => void
}

const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export function LucroPorMotoReport({
  motos,
  caixa,
  selectedYear,
  onYearChange,
}: LucroPorMotoReportProps) {
  // Matriz moto x mês
  const { matriz, totaisMes, totalGeralAno, motoCampeaoId } = useMemo(() => {
    // Filtrar caixas do ano selecionado que têm moto vinculada
    const caixaAno = caixa.filter((c) => {
      if (!c.data || !c.moto) return false
      const d = new Date(c.data)
      return d.getFullYear() === selectedYear
    })

    // Montar mapa: motoId -> { [mesIndex: 0..11]: { entradas, saidas, lucro } }
    const mapaMotos = new Map<
      string,
      {
        entradasPorMes: number[]
        saidasPorMes: number[]
        lucroPorMes: number[]
        totalEntradas: number
        totalSaidas: number
        totalLucro: number
      }
    >()

    // Inicializar para todas as motos cadastradas
    motos.forEach((m) => {
      mapaMotos.set(m.id, {
        entradasPorMes: Array(12).fill(0),
        saidasPorMes: Array(12).fill(0),
        lucroPorMes: Array(12).fill(0),
        totalEntradas: 0,
        totalSaidas: 0,
        totalLucro: 0,
      })
    })

    caixaAno.forEach((c) => {
      let registro = mapaMotos.get(c.moto!)
      if (!registro) {
        // Se a moto não está na lista principal por algum motivo, criar entrada
        registro = {
          entradasPorMes: Array(12).fill(0),
          saidasPorMes: Array(12).fill(0),
          lucroPorMes: Array(12).fill(0),
          totalEntradas: 0,
          totalSaidas: 0,
          totalLucro: 0,
        }
        mapaMotos.set(c.moto!, registro)
      }
      const d = new Date(c.data)
      const mesIdx = d.getMonth()
      const valor = Number(c.valor) || 0

      if (c.tipo === 'entrada') {
        registro.entradasPorMes[mesIdx] += valor
        registro.totalEntradas += valor
      } else if (c.tipo === 'saida') {
        registro.saidasPorMes[mesIdx] += valor
        registro.totalSaidas += valor
      }
    })

    // Calcular lucros mensais e totais por moto
    mapaMotos.forEach((reg) => {
      for (let i = 0; i < 12; i++) {
        reg.lucroPorMes[i] = reg.entradasPorMes[i] - reg.saidasPorMes[i]
      }
      reg.totalLucro = reg.totalEntradas - reg.totalSaidas
    })

    // Totais gerais por mês (rodapé)
    const totaisMesCalculados = Array(12).fill(0)
    let totalGeral = 0

    // Encontrar moto com maior lucro do ano (apenas se totalLucro > 0)
    let maiorLucro = -Infinity
    let campeaoId: string | null = null

    // Lista de linhas ordenada por nome da moto
    const linhas = motos.map((moto) => {
      const reg = mapaMotos.get(moto.id) || {
        entradasPorMes: Array(12).fill(0),
        saidasPorMes: Array(12).fill(0),
        lucroPorMes: Array(12).fill(0),
        totalEntradas: 0,
        totalSaidas: 0,
        totalLucro: 0,
      }

      if (reg.totalLucro > maiorLucro && reg.totalLucro > 0) {
        maiorLucro = reg.totalLucro
        campeaoId = moto.id
      }

      for (let i = 0; i < 12; i++) {
        totaisMesCalculados[i] += reg.lucroPorMes[i]
      }
      totalGeral += reg.totalLucro

      return {
        moto,
        ...reg,
      }
    })

    return {
      matriz: linhas,
      totaisMes: totaisMesCalculados,
      totalGeralAno: totalGeral,
      motoCampeaoId: campeaoId,
    }
  }, [motos, caixa, selectedYear])

  const formatValor = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const renderCell = (valor: number) => {
    if (Math.abs(valor) < 0.005) {
      return (
        <span className="text-slate-400 dark:text-slate-600 inline-flex items-center justify-center">
          <Minus className="w-3 h-3" />
        </span>
      )
    }
    if (valor > 0) {
      return (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          R$ {formatValor(valor)}
        </span>
      )
    }
    return (
      <span className="font-semibold text-red-600 dark:text-red-400">
        -R$ {formatValor(Math.abs(valor))}
      </span>
    )
  }

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b gap-3">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Lucro por Moto — Exercício {selectedYear}
          </CardTitle>
          <CardDescription>
            Apuração mensal de lucro líquido por moto (Entradas − Saídas vinculadas no Caixa) e
            total acumulado do ano.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ano:
          </span>
          <Select value={String(selectedYear)} onValueChange={(val) => onYearChange(Number(val))}>
            <SelectTrigger className="w-[105px] h-9 bg-white dark:bg-slate-900 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Destaque da Moto Campeã de Lucro */}
        {motoCampeaoId && (
          <div className="mb-5 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            {(() => {
              const campeao = matriz.find((item) => item.moto.id === motoCampeaoId)
              if (!campeao) return null
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Maior Lucro do Ano ({selectedYear})
                        </span>
                        <Badge className="bg-amber-600 text-white text-[10px] font-bold py-0 h-4">
                          Top Performance
                        </Badge>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {campeao.moto.nome || campeao.moto.modelo} ({campeao.moto.placa})
                      </h4>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xs text-muted-foreground block">
                      Lucro Líquido Acumulado
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      R$ {formatValor(campeao.totalLucro)}
                    </span>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Tabela de Matriz */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="py-3 px-3 text-left font-bold uppercase tracking-wider sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 min-w-[170px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Moto / Veículo
                  </th>
                  <th className="py-3 px-3 text-right font-black uppercase tracking-wider bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white min-w-[115px] border-r border-slate-200 dark:border-slate-800">
                    Somatório
                  </th>
                  {MESES_ABREV.map((mes) => (
                    <th
                      key={mes}
                      className="py-3 px-2 text-right font-bold uppercase tracking-wider min-w-[82px]"
                    >
                      {mes}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {matriz.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-muted-foreground">
                      Nenhuma moto cadastrada no sistema.
                    </td>
                  </tr>
                ) : (
                  matriz.map((item) => {
                    const isCampeao = item.moto.id === motoCampeaoId

                    return (
                      <tr
                        key={item.moto.id}
                        className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isCampeao ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Coluna 1 Fixa: Moto */}
                        <td
                          className={`py-2.5 px-3 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${
                            isCampeao
                              ? 'bg-amber-50/90 dark:bg-slate-900'
                              : 'bg-white dark:bg-slate-950'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isCampeao ? (
                              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {item.moto.nome || item.moto.modelo}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.moto.placa}
                                </span>
                                {item.moto.status === 'vendida' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-3.5 font-bold border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 uppercase"
                                  >
                                    Vendida
                                  </Badge>
                                )}
                                {item.moto.status === 'cedida' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-3.5 font-bold border-orange-300 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 uppercase"
                                  >
                                    Cedida
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Coluna 2: Somatório (Total Ano) logo após a Moto */}
                        <td className="py-2.5 px-3 text-right tabular-nums bg-slate-50 dark:bg-slate-900 font-black border-r border-slate-200 dark:border-slate-800">
                          {renderCell(item.totalLucro)}
                        </td>

                        {/* Coluna 3 em diante: Meses Jan a Dez */}
                        {item.lucroPorMes.map((lucroMes, idx) => (
                          <td key={idx} className="py-2.5 px-2 text-right tabular-nums">
                            {renderCell(lucroMes)}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Rodapé Totalizador Geral */}
              <tfoot>
                <tr className="bg-slate-900 dark:bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                  <td className="py-3 px-3 text-left uppercase tracking-wider sticky left-0 bg-slate-900 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                    TOTAL GERAL
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums bg-slate-950 text-white font-black text-sm border-r border-slate-700">
                    {totalGeralAno >= 0 ? (
                      <span className="text-emerald-300 font-extrabold">
                        R$ {formatValor(totalGeralAno)}
                      </span>
                    ) : (
                      <span className="text-red-300 font-extrabold">
                        -R$ {formatValor(Math.abs(totalGeralAno))}
                      </span>
                    )}
                  </td>
                  {totaisMes.map((tot, idx) => (
                    <td key={idx} className="py-3 px-2 text-right tabular-nums">
                      {Math.abs(tot) < 0.005 ? (
                        <span className="text-slate-400 inline-flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </span>
                      ) : tot >= 0 ? (
                        <span className="text-emerald-400 font-bold">R$ {formatValor(tot)}</span>
                      ) : (
                        <span className="text-red-400 font-bold">
                          -R$ {formatValor(Math.abs(tot))}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Legenda explicativa inferior */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Lucro positivo (Entradas &gt; Saídas)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span>Prejuízo no mês (Saídas &gt; Entradas)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="w-3 h-3 text-slate-400" />
              <span>Sem movimentação</span>
            </div>
          </div>
          <div className="text-[11px]">
            * Valores apurados por competência da data de lançamento no Caixa vinculados a cada
            moto.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
