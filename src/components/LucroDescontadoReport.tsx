import React, { useMemo, useState } from 'react'
import {
  TrendingDown,
  Bike,
  Sparkles,
  ArrowUpDown,
  Filter,
  Info,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Moto, Contrato, CaixaLancamento } from '@/types/database'
import { calcularLucroDescontado, ItemLucroDescontado } from '@/lib/lucroDescontadoUtils'

interface LucroDescontadoReportProps {
  motos: Moto[]
  contratos: Contrato[]
  caixa: CaixaLancamento[]
}

type OrdemCampo =
  | 'lucro_medio_desc'
  | 'lucro_medio_asc'
  | 'previsao_desc'
  | 'lucro_descontado_desc'
  | 'nome_asc'

type FiltroSituacao = 'todas' | 'locadas' | 'disponiveis'

export function LucroDescontadoReport({ motos, contratos, caixa }: LucroDescontadoReportProps) {
  const [ordem, setOrdem] = useState<OrdemCampo>('lucro_medio_desc')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas')

  // Executa os cálculos centrais
  const { itens, totais } = useMemo(() => {
    return calcularLucroDescontado({
      motos,
      contratos,
      caixa,
    })
  }, [motos, contratos, caixa])

  // Filtragem local por situação (todas / locadas / disponíveis)
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (filtroSituacao === 'locadas') {
        return it.moto.status === 'locada'
      }
      if (filtroSituacao === 'disponiveis') {
        return (
          it.moto.status === 'disponivel' ||
          it.moto.status === 'manutencao' ||
          it.moto.status === 'em_loja_detran'
        )
      }
      return true
    })
  }, [itens, filtroSituacao])

  // Ordenação dos itens
  const itensOrdenados = useMemo(() => {
    const copia = [...itensFiltrados]
    copia.sort((a, b) => {
      if (ordem === 'lucro_medio_desc') {
        const valA = a.lucroMedioDescontado !== null ? a.lucroMedioDescontado : -Infinity
        const valB = b.lucroMedioDescontado !== null ? b.lucroMedioDescontado : -Infinity
        return valB - valA
      }
      if (ordem === 'lucro_medio_asc') {
        const valA = a.lucroMedioDescontado !== null ? a.lucroMedioDescontado : Infinity
        const valB = b.lucroMedioDescontado !== null ? b.lucroMedioDescontado : Infinity
        return valA - valB
      }
      if (ordem === 'previsao_desc') {
        const valA = a.previsaoLucroTotal !== null ? a.previsaoLucroTotal : -Infinity
        const valB = b.previsaoLucroTotal !== null ? b.previsaoLucroTotal : -Infinity
        return valB - valA
      }
      if (ordem === 'lucro_descontado_desc') {
        const valA = a.lucroDescontado !== null ? a.lucroDescontado : -Infinity
        const valB = b.lucroDescontado !== null ? b.lucroDescontado : -Infinity
        return valB - valA
      }
      if (ordem === 'nome_asc') {
        return a.nomeMoto.localeCompare(b.nomeMoto)
      }
      return 0
    })
    return copia
  }, [itensFiltrados, ordem])

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return `R$ ${val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Identifica a moto de maior destaque em Lucro Médio Descontado
  const motoDestaque = useMemo(() => {
    let melhor: ItemLucroDescontado | null = null
    let maior = -Infinity
    itens.forEach((it) => {
      if (it.lucroMedioDescontado !== null && it.lucroMedioDescontado > maior) {
        maior = it.lucroMedioDescontado
        melhor = it
      }
    })
    return melhor
  }, [itens])

  return (
    <div className="space-y-3">
      {/* Header do Relatório */}
      <Card className="border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/50 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
        <CardHeader className="py-2.5 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <TrendingDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                LUCRO DESCONTADO
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Projeção do lucro total até a entrega do bem no Plano Conquista, descontado do valor
                de compra da moto e distribuído pelos meses totais do plano (compra até entrega).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[10px] shrink-0 self-start sm:self-auto py-0.5 px-2">
                Exclusivo Plano Conquista
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Lucro Médio Descontado Geral */}
        <Card className="shadow-xs border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Lucro Médio Descontado</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                totais.mediaLucroDescontadoFrota !== null && totais.mediaLucroDescontadoFrota >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600'
              }`}
            >
              {formatBRL(totais.mediaLucroDescontadoFrota)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">/mês</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Média sobre {itens.filter((i) => i.lucroMedioDescontado !== null).length} moto(s).
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Lucro Descontado */}
        <Card className="shadow-xs border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Total Lucro Descontado</span>
              <DollarSign className="w-3.5 h-3.5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                totais.totalLucroDescontado >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600'
              }`}
            >
              {formatBRL(totais.totalLucroDescontado)}
            </div>
            <p
              className="text-[10px] text-muted-foreground mt-0.5 truncate"
              title={`Previsão R$ ${formatBRL(totais.totalPrevisaoLucro)} − Compra R$ ${formatBRL(totais.totalValorCompra)}`}
            >
              Previsão total − Compra
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Previsão Total até a Entrega */}
        <Card className="shadow-xs border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Previsão Total Bruta</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatBRL(totais.totalPrevisaoLucro)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Lucro acumulado + Projeção futura
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Motos no Plano Conquista */}
        <Card className="shadow-xs border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Motos Plano Conquista</span>
              <Bike className="w-3.5 h-3.5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {totais.totalMotos}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Exclui vendidas, cedidas e normais.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Destaque visual compacto da moto com maior lucro médio descontado */}
      {motoDestaque && motoDestaque.lucroMedioDescontado !== null && (
        <div className="py-2 px-3 rounded-lg border border-purple-300 dark:border-purple-800/80 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/40 dark:from-purple-950/30 dark:via-slate-900 dark:to-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-purple-600 text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Maior Lucro Médio Descontado
                </span>
                <Badge className="bg-purple-600 text-white text-[9px] font-bold py-0 h-3.5 px-1">
                  Destaque
                </Badge>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {motoDestaque.nomeMoto}
                <span className="text-[10px] text-muted-foreground font-normal ml-2">
                  Compra: {formatBRL(motoDestaque.valorCompra)} • Entrega:{' '}
                  {motoDestaque.dataEntregaFormatada} • {motoDestaque.mesesPrazoTotalPlano}{' '}
                  {motoDestaque.mesesPrazoTotalPlano === 1 ? 'mês de plano' : 'meses de plano'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-1 sm:pt-0 border-purple-200 dark:border-purple-900/60">
            <span className="text-[11px] text-muted-foreground">Lucro Médio:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatBRL(motoDestaque.lucroMedioDescontado)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/mês</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              (Descontado: {formatBRL(motoDestaque.lucroDescontado)})
            </span>
          </div>
        </div>
      )}

      {/* Controles de Filtro e Ordenação + Tabela Desktop / Cards Mobile */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="py-2 px-3 sm:px-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-purple-600" />
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Tabela Lucro Descontado
              </CardTitle>
              <CardDescription className="text-[10px]">
                Previsão = lucro real + projeção até entrega · Lucro descontado = previsão − compra
                · Lucro médio = descontado ÷ meses do plano (compra até entrega)
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Situação */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <Select
                value={filtroSituacao}
                onValueChange={(val) => setFiltroSituacao(val as FiltroSituacao)}
              >
                <SelectTrigger className="w-[125px] h-7 text-[11px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas ({itens.length})</SelectItem>
                  <SelectItem value="locadas">
                    Locadas ({itens.filter((i) => i.moto.status === 'locada').length})
                  </SelectItem>
                  <SelectItem value="disponiveis">
                    Disponíveis (
                    {
                      itens.filter(
                        (i) =>
                          i.moto.status === 'disponivel' ||
                          i.moto.status === 'manutencao' ||
                          i.moto.status === 'em_loja_detran',
                      ).length
                    }
                    )
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <Select value={ordem} onValueChange={(val) => setOrdem(val as OrdemCampo)}>
                <SelectTrigger className="w-[160px] h-7 text-[11px] bg-white dark:bg-slate-900 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lucro_medio_desc">Maior Lucro Médio</SelectItem>
                  <SelectItem value="lucro_medio_asc">Menor Lucro Médio</SelectItem>
                  <SelectItem value="previsao_desc">Maior Previsão Total</SelectItem>
                  <SelectItem value="lucro_descontado_desc">Maior Lucro Descontado</SelectItem>
                  <SelectItem value="nome_asc">Nome da Moto (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-2">
          {/* VISÃO DESKTOP: TABELA COMPACTA (sem rolagem horizontal, text-xs) */}
          <div className="hidden md:block rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {/* COLUNA 1 — MOTO (Nome e Situação) */}
                  <th className="py-2 px-3 text-left font-bold uppercase tracking-wider text-[10px] w-[30%]">
                    Moto
                  </th>

                  {/* COLUNA 2 — PREVISÃO DE LUCRO TOTAL ATÉ A DATA DE ENTREGA DO BEM */}
                  <th className="py-2 px-3 text-right font-bold uppercase tracking-wider text-[10px] w-[26%]">
                    Previsão Lucro Total
                  </th>

                  {/* COLUNA 3 — LUCRO DESCONTADO DO VALOR DA MOTO */}
                  <th className="py-2 px-3 text-right font-bold uppercase tracking-wider text-[10px] w-[24%]">
                    Lucro Descontado
                  </th>

                  {/* COLUNA 4 — LUCRO MÉDIO DESCONTADO (coluna 3 ÷ meses compra até entrega) */}
                  <th className="py-2 px-3 text-right font-black uppercase tracking-wider bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 text-[10px] w-[20%]">
                    Lucro Médio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {itensOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                      Nenhuma moto com contrato Plano Conquista encontrada com os filtros
                      selecionados.
                    </td>
                  </tr>
                ) : (
                  itensOrdenados.map((item) => {
                    const isDestaque = motoDestaque && item.moto.id === motoDestaque.moto.id

                    return (
                      <tr
                        key={item.moto.id}
                        className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isDestaque ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                        }`}
                      >
                        {/* COLUNA 1: Moto — Nome (sem placa) e Situação */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {isDestaque ? (
                              <div
                                className="p-1 rounded bg-purple-600 text-white shrink-0"
                                title="Maior Lucro Médio Descontado"
                              >
                                <Sparkles className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                <Bike className="w-3 h-3" />
                              </div>
                            )}
                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate text-xs leading-tight">
                                {item.nomeMoto}
                              </span>
                              {item.situacaoMoto === 'Locada' && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] px-1 py-0 h-3 font-semibold border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 leading-none"
                                >
                                  Locada
                                </Badge>
                              )}
                              {item.situacaoMoto === 'Disponível' && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] px-1 py-0 h-3 font-medium border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 leading-none"
                                >
                                  Disponível
                                </Badge>
                              )}
                              {item.situacaoMoto === 'Manutenção' && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] px-1 py-0 h-3 font-medium border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 leading-none"
                                >
                                  Manutenção
                                </Badge>
                              )}
                              {item.situacaoMoto === 'Em Loja/Detran' && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] px-1 py-0 h-3 font-medium border-purple-300 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 leading-none"
                                >
                                  Em Loja/Detran
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-1">
                                Entrega: {item.dataEntregaFormatada}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUNA 2: Previsão de Lucro Total até a Entrega do Bem */}
                        <td className="py-2 px-3 text-right tabular-nums text-xs">
                          {item.previsaoLucroTotal !== null ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span
                                className={`font-bold ${
                                  item.previsaoLucroTotal >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {formatBRL(item.previsaoLucroTotal)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Real: {formatBRL(item.lucroAcumuladoReal)}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-muted-foreground font-normal text-xs"
                              title="Sem data de entrega informada no contrato Plano Conquista"
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* COLUNA 3: Lucro Descontado do Valor da Moto (Coluna 2 − Valor Compra) */}
                        <td className="py-2 px-3 text-right tabular-nums text-xs">
                          {item.lucroDescontado !== null ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span
                                className={`font-bold ${
                                  item.lucroDescontado >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {formatBRL(item.lucroDescontado)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Compra: {formatBRL(item.valorCompra)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-normal text-xs">—</span>
                          )}
                        </td>

                        {/* COLUNA 4: Lucro Médio Descontado (Coluna 3 ÷ meses compra até entrega) */}
                        <td className="py-2 px-3 text-right tabular-nums bg-purple-50/40 dark:bg-purple-950/15 text-xs">
                          {item.lucroMedioDescontado !== null ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span
                                className={`font-extrabold ${
                                  item.lucroMedioDescontado >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {formatBRL(item.lucroMedioDescontado)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {item.mesesPrazoTotalPlano}{' '}
                                {item.mesesPrazoTotalPlano === 1 ? 'mês' : 'meses'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="text-muted-foreground font-normal text-xs">—</span>
                              {item.semDataEntrega ? (
                                <span className="text-[9px] text-muted-foreground">Indefinido</span>
                              ) : item.mesesPrazoTotalPlano === 0 ? (
                                <span className="text-[9px] text-muted-foreground">&lt; 1 mês</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Rodapé Totalizador Consolidado */}
              <tfoot>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold border-t-2 border-slate-700 text-xs">
                  <td className="py-2 px-3 text-left uppercase tracking-wider text-[10px]">
                    TOTAL CONSOLIDADO ({itensFiltrados.length} MOTOS)
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-white font-black text-xs">
                    {(() => {
                      const subTotal = itensFiltrados.reduce(
                        (acc, it) => acc + (it.previsaoLucroTotal || 0),
                        0,
                      )
                      return (
                        <span className={subTotal >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                          {formatBRL(subTotal)}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-white font-black text-xs">
                    {(() => {
                      const subTotal = itensFiltrados.reduce(
                        (acc, it) => acc + (it.lucroDescontado || 0),
                        0,
                      )
                      return (
                        <span className={subTotal >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                          {formatBRL(subTotal)}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums bg-purple-950/80 text-purple-200 font-black text-xs border-l border-slate-700">
                    {(() => {
                      const comMedia = itensFiltrados.filter(
                        (it) => it.lucroMedioDescontado !== null,
                      )
                      const mediaSub =
                        comMedia.length > 0
                          ? comMedia.reduce((acc, it) => acc + (it.lucroMedioDescontado || 0), 0) /
                            comMedia.length
                          : null
                      return (
                        <span
                          className={
                            mediaSub !== null && mediaSub >= 0 ? 'text-emerald-300' : 'text-red-300'
                          }
                        >
                          {formatBRL(mediaSub)}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* VISÃO MOBILE: CARDS EMPILHADOS POR MOTO */}
          <div className="block md:hidden space-y-2 p-2">
            {itensOrdenados.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma moto com contrato Plano Conquista encontrada.
              </div>
            ) : (
              itensOrdenados.map((item) => {
                const isDestaque = motoDestaque && item.moto.id === motoDestaque.moto.id

                return (
                  <Card
                    key={item.moto.id}
                    className={`shadow-2xs border ${
                      isDestaque
                        ? 'border-purple-300 bg-purple-50/20 dark:bg-purple-950/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bike className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {item.nomeMoto}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 font-semibold leading-none"
                        >
                          {item.situacaoMoto}
                        </Badge>
                      </div>
                      {isDestaque && (
                        <Badge className="bg-purple-600 text-white text-[8px] font-bold px-1 py-0 h-3.5">
                          Destaque
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b pb-1">
                        <span>Data Entrega:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.dataEntregaFormatada}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b pb-1">
                        <span>Valor de Compra:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatBRL(item.valorCompra)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b pb-1">
                        <span className="text-muted-foreground">Previsão Lucro Total:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            item.previsaoLucroTotal !== null && item.previsaoLucroTotal >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600'
                          }`}
                        >
                          {formatBRL(item.previsaoLucroTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b pb-1">
                        <span className="text-muted-foreground">Lucro Descontado:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            item.lucroDescontado !== null && item.lucroDescontado >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600'
                          }`}
                        >
                          {formatBRL(item.lucroDescontado)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5 bg-purple-50/50 dark:bg-purple-950/20 p-1.5 rounded">
                        <span className="font-bold text-purple-950 dark:text-purple-200">
                          Lucro Médio Descontado:
                        </span>
                        <span
                          className={`font-black tabular-nums text-sm ${
                            item.lucroMedioDescontado !== null && item.lucroMedioDescontado >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600'
                          }`}
                        >
                          {formatBRL(item.lucroMedioDescontado)}
                          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                            /mês
                          </span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Legenda Explicativa Discreta */}
          <div className="mt-2 px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>
                <strong>Fórmulas:</strong> Previsão = lucro real + projeção mensal até entrega ·
                Lucro descontado = previsão − valor da moto · Lucro médio = descontado ÷ meses do
                plano (compra até entrega)
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Contratos sem data de entrega exibem "—".
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
