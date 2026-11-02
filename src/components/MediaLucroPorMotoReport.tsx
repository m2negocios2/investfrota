import React, { useMemo, useState } from 'react'
import {
  Trophy,
  Bike,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Moto, CaixaLancamento } from '@/types/database'
import { formatDateDisplay } from '@/lib/dateUtils'

interface MediaLucroPorMotoReportProps {
  motos: Moto[]
  caixa: CaixaLancamento[]
}

type OrdemCampo = 'media_desc' | 'media_asc' | 'lucro_desc' | 'nome_asc' | 'meses_desc'
type FiltroStatus = 'todas' | 'ativas' | 'locadas' | 'disponiveis' | 'vendidas_cedidas'

interface MotoMediaItem {
  moto: Moto
  dataInicioFormatada: string
  origemInicio: 'compra' | 'primeiro_lancamento' | 'sem_historico'
  mesesDecorridos: number
  totalEntradas: number
  totalSaidas: number
  lucroTotal: number
  mediaMensal: number | null
  temMovimentacao: boolean
}

export function MediaLucroPorMotoReport({ motos, caixa }: MediaLucroPorMotoReportProps) {
  const [ordem, setOrdem] = useState<OrdemCampo>('media_desc')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas')

  // Mês e ano correntes de referência
  const agora = useMemo(() => new Date(), [])
  const anoAtual = agora.getFullYear()
  const mesAtual = agora.getMonth() // 0-based

  // Cálculos por moto
  const { itens, motoDestaqueId, totaisGerais } = useMemo(() => {
    // 1. Agrupar lançamentos do caixa por moto
    const lancamentosPorMoto = new Map<string, CaixaLancamento[]>()
    caixa.forEach((c) => {
      if (!c.moto) return
      const list = lancamentosPorMoto.get(c.moto) || []
      list.push(c)
      lancamentosPorMoto.set(c.moto, list)
    })

    const lista: MotoMediaItem[] = motos.map((moto) => {
      const lancamentos = lancamentosPorMoto.get(moto.id) || []
      const temMovimentacao = lancamentos.length > 0

      // Totais de entradas e saídas
      // 1. Identificar primeiro lançamento do caixa (para caso de fallback da data base)
      let primeiroLancamentoData: Date | null = null
      lancamentos.forEach((l) => {
        if (l.data) {
          const d = new Date(l.data)
          if (!isNaN(d.getTime())) {
            if (!primeiroLancamentoData || d.getTime() < primeiroLancamentoData.getTime()) {
              primeiroLancamentoData = d
            }
          }
        }
      })

      // 2. Determinar data e mês inicial de contagem (Data Base)
      let anoInicio: number | null = null
      let mesInicio: number | null = null // 0-based
      let dataInicioFormatada = '—'
      let origemInicio: 'compra' | 'primeiro_lancamento' | 'sem_historico' = 'sem_historico'

      if (moto.data_compra) {
        const match = moto.data_compra.match(/^(\d{4})-(\d{2})/)
        if (match) {
          anoInicio = parseInt(match[1], 10)
          mesInicio = parseInt(match[2], 10) - 1
          dataInicioFormatada = formatDateDisplay(moto.data_compra)
          origemInicio = 'compra'
        } else {
          const dCompra = new Date(moto.data_compra)
          if (!isNaN(dCompra.getTime())) {
            anoInicio = dCompra.getFullYear()
            mesInicio = dCompra.getMonth()
            dataInicioFormatada = formatDateDisplay(moto.data_compra)
            origemInicio = 'compra'
          }
        }
      }

      // Se não tem data de compra cadastrada, tenta o primeiro lançamento do caixa
      if ((anoInicio === null || mesInicio === null) && primeiroLancamentoData) {
        const dPrimeiro = primeiroLancamentoData as Date
        anoInicio = dPrimeiro.getFullYear()
        mesInicio = dPrimeiro.getMonth()
        dataInicioFormatada = formatDateDisplay(primeiroLancamentoData)
        origemInicio = 'primeiro_lancamento'
      }

      // 3. Determinar mês e ano final de contagem da janela:
      // Para motos VENDIDAS ou CEDIDAS: o período considera do mês da compra (ou primeiro lançamento)
      // até o mês em que a moto parou a operação (data_fim_locacao). Se não houver data_fim_locacao registrada,
      // cai para a data da venda/saída (data_saida) como fallback, e não até o mês presente.
      const isVendidaOuCedida = moto.status === 'vendida' || moto.status === 'cedida'
      let anoFim = anoAtual
      let mesFim = mesAtual // 0-based

      if (isVendidaOuCedida) {
        let anoOperacao: number | null = null
        let mesOperacao: number | null = null

        // Regra geral: preferir data_fim_locacao (fim da locação/operação) se existir;
        // senão usar data_saida (data da venda).
        const dataEncerramentoOperacao = moto.data_fim_locacao || moto.data_saida

        if (dataEncerramentoOperacao) {
          const matchFim = dataEncerramentoOperacao.match(/^(\d{4})-(\d{2})/)
          if (matchFim) {
            anoOperacao = parseInt(matchFim[1], 10)
            mesOperacao = parseInt(matchFim[2], 10) - 1
          } else {
            const dFim = new Date(dataEncerramentoOperacao)
            if (!isNaN(dFim.getTime())) {
              anoOperacao = dFim.getFullYear()
              mesOperacao = dFim.getMonth()
            }
          }
        }

        // Fallback se não tiver data_saida gravada: usa a data do último lançamento ou updated
        if (anoOperacao === null || mesOperacao === null) {
          if (lancamentos.length > 0) {
            let ultimoLanc: Date | null = null
            lancamentos.forEach((l) => {
              if (l.data) {
                const d = new Date(l.data)
                if (!isNaN(d.getTime())) {
                  if (!ultimoLanc || d.getTime() > ultimoLanc.getTime()) {
                    ultimoLanc = d
                  }
                }
              }
            })
            if (ultimoLanc) {
              const dU = ultimoLanc as Date
              anoOperacao = dU.getFullYear()
              mesOperacao = dU.getMonth()
            }
          } else if (moto.updated) {
            const dUp = new Date(moto.updated)
            if (!isNaN(dUp.getTime())) {
              anoOperacao = dUp.getFullYear()
              mesOperacao = dUp.getMonth()
            }
          }
        }

        if (anoOperacao !== null && mesOperacao !== null) {
          anoFim = anoOperacao
          mesFim = mesOperacao
        }
      }

      // 4. Totais de entradas e saídas DENTRO DA JANELA:
      // "A média (lucro ÷ meses ativos) e o lucro acumulado devem seguir essa janela
      // (lucro da janela, não de todos os tempos, para os números baterem com a janela)."
      let totalEntradas = 0
      let totalSaidas = 0

      lancamentos.forEach((l) => {
        const val = Number(l.valor) || 0
        if (!l.data) {
          if (l.tipo === 'entrada') totalEntradas += val
          else if (l.tipo === 'saida') totalSaidas += val
          return
        }

        const d = new Date(l.data)
        if (isNaN(d.getTime())) {
          if (l.tipo === 'entrada') totalEntradas += val
          else if (l.tipo === 'saida') totalSaidas += val
          return
        }

        // Filtro de janela:
        // A data inicial da janela é anoInicio/mesInicio.
        // A contagem dos meses ativos é do início até o encerramento da operação (data_fim_locacao ou data_saida).
        // Conforme pedido expresso do usuário: "Lucro acumulado continua sendo todo o histórico do caixa dela."
        // Portanto, para motos vendidas com receita de venda posterior ao fim da locação (ou despesas antes/depois),
        // o lucro acumulado considera todo o histórico do caixa vinculado à moto (respeitando data de início da compra se houver).
        if (anoInicio !== null && mesInicio !== null) {
          const lAno = d.getFullYear()
          const lMes = d.getMonth()
          const lComp = lAno * 12 + lMes
          const inicioComp = anoInicio * 12 + mesInicio

          // Se for lançamento anterior ao início da moto, desconsidera
          if (lComp < inicioComp) {
            return
          }
        }

        if (l.tipo === 'entrada') {
          totalEntradas += val
        } else if (l.tipo === 'saida') {
          totalSaidas += val
        }
      })

      const lucroTotal = totalEntradas - totalSaidas

      // 5. Cálculo de meses decorridos (inclusive)
      let mesesDecorridos = 0
      let mediaMensal: number | null = null

      if (anoInicio !== null && mesInicio !== null) {
        // Quantidade de meses decorridos desde o mês de início até o mês final da janela (inclusive)
        const diffMeses = (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1
        // Divisor mínimo é 1 se diffMeses >= 1, ou 1 se a operação ocorreu no mesmo mês da base
        mesesDecorridos = Math.max(1, diffMeses)
        mediaMensal = lucroTotal / mesesDecorridos
      } else if (temMovimentacao) {
        // Tem movimento mas não foi possível determinar a data: considera 1 mês
        mesesDecorridos = 1
        mediaMensal = lucroTotal
      } else {
        // Sem data de compra e sem lançamentos no caixa
        mesesDecorridos = 0
        mediaMensal = null
      }

      return {
        moto,
        dataInicioFormatada,
        origemInicio,
        mesesDecorridos,
        totalEntradas,
        totalSaidas,
        lucroTotal,
        mediaMensal,
        temMovimentacao,
      }
    })

    // Encontrar moto com melhor média mensal
    let melhorMedia = -Infinity
    let destaqueId: string | null = null

    lista.forEach((item) => {
      if (item.mediaMensal !== null && item.mediaMensal > melhorMedia && item.mediaMensal > 0) {
        melhorMedia = item.mediaMensal
        destaqueId = item.moto.id
      }
    })

    // Totais consolidados para o banner superior
    const totalLucroGeral = lista.reduce((acc, it) => acc + it.lucroTotal, 0)
    const totalEntradasGerais = lista.reduce((acc, it) => acc + it.totalEntradas, 0)
    const totalSaidasGerais = lista.reduce((acc, it) => acc + it.totalSaidas, 0)

    const itensComMedia = lista.filter((it) => it.mediaMensal !== null)
    const mediaGeralDaFrota =
      itensComMedia.length > 0
        ? itensComMedia.reduce((acc, it) => acc + (it.mediaMensal || 0), 0) / itensComMedia.length
        : 0

    return {
      itens: lista,
      motoDestaqueId: destaqueId,
      totaisGerais: {
        totalLucroGeral,
        totalEntradasGerais,
        totalSaidasGerais,
        mediaGeralDaFrota,
        totalMotos: lista.length,
      },
    }
  }, [motos, caixa, anoAtual, mesAtual])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      const status = it.moto.status
      if (filtroStatus === 'ativas') {
        return status !== 'vendida' && status !== 'cedida'
      }
      if (filtroStatus === 'locadas') {
        return status === 'locada'
      }
      if (filtroStatus === 'disponiveis') {
        return status === 'disponivel' || status === 'manutencao' || status === 'em_loja_detran'
      }
      if (filtroStatus === 'vendidas_cedidas') {
        return status === 'vendida' || status === 'cedida'
      }
      return true
    })
  }, [itens, filtroStatus])

  // Ordenação
  const itensOrdenados = useMemo(() => {
    const copia = [...itensFiltrados]
    copia.sort((a, b) => {
      if (ordem === 'media_desc') {
        const valA = a.mediaMensal !== null ? a.mediaMensal : -Infinity
        const valB = b.mediaMensal !== null ? b.mediaMensal : -Infinity
        return valB - valA
      }
      if (ordem === 'media_asc') {
        const valA = a.mediaMensal !== null ? a.mediaMensal : Infinity
        const valB = b.mediaMensal !== null ? b.mediaMensal : Infinity
        return valA - valB
      }
      if (ordem === 'lucro_desc') {
        return b.lucroTotal - a.lucroTotal
      }
      if (ordem === 'meses_desc') {
        return b.mesesDecorridos - a.mesesDecorridos
      }
      if (ordem === 'nome_asc') {
        const nomeA = (a.moto.nome || a.moto.modelo || '').toLowerCase()
        const nomeB = (b.moto.nome || b.moto.modelo || '').toLowerCase()
        return nomeA.localeCompare(nomeB)
      }
      return 0
    })
    return copia
  }, [itensFiltrados, ordem])

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const motoDestaque = itens.find((it) => it.moto.id === motoDestaqueId)

  return (
    <div className="space-y-4">
      {/* Header do Relatório */}
      <Card className="border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/20 shadow-xs">
        <CardHeader className="py-2.5 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Média Moto
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Apuração do indicador Média Moto (Lucro ÷ Meses Ativos) desde a Data Base até o mês
                corrente (ou até o fim da locação/operação para vendidas/cedidas).
              </CardDescription>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] shrink-0 self-start sm:self-auto py-0.5 px-2">
              Indicador de Retorno Operacional
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Média Geral por Moto */}
        <Card className="shadow-xs border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Média Moto (Frota)</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                totaisGerais.mediaGeralDaFrota >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600'
              }`}
            >
              R$ {formatBRL(totaisGerais.mediaGeralDaFrota)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">/mês</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sobre {totaisGerais.totalMotos} moto(s).
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Lucro Total Acumulado */}
        <Card className="shadow-xs border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Lucro Líquido Total</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                totaisGerais.totalLucroGeral >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600'
              }`}
            >
              R$ {formatBRL(totaisGerais.totalLucroGeral)}
            </div>
            <p
              className="text-[10px] text-muted-foreground mt-0.5 truncate"
              title={`Entradas R$ ${formatBRL(totaisGerais.totalEntradasGerais)} − Saídas R$ ${formatBRL(totaisGerais.totalSaidasGerais)}`}
            >
              Entradas − Saídas
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Moto Campeã */}
        <Card className="shadow-xs border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Melhor Média Moto</span>
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            {motoDestaque && motoDestaque.mediaMensal !== null ? (
              <>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  R$ {formatBRL(motoDestaque.mediaMensal)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">/mês</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-medium">
                  {motoDestaque.moto.nome || motoDestaque.moto.modelo} ({motoDestaque.moto.placa})
                </p>
              </>
            ) : (
              <div className="text-xs text-muted-foreground mt-0.5">Em apuração</div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Total de Motos */}
        <Card className="shadow-xs border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between tracking-wider">
              <span>Total Veículos</span>
              <Bike className="w-3.5 h-3.5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0">
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {totaisGerais.totalMotos}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ativas, locadas e saídas.</p>
          </CardContent>
        </Card>
      </div>

      {/* Destaque visual compacto da moto campeã */}
      {motoDestaque && motoDestaque.mediaMensal !== null && (
        <div className="py-2 px-3 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-amber-500 text-white shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Moto Destaque (Maior Média)
                </span>
                <Badge className="bg-amber-600 text-white text-[9px] font-bold py-0 h-3.5 px-1">
                  Top 1
                </Badge>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {motoDestaque.moto.nome || motoDestaque.moto.modelo}{' '}
                <span className="font-normal text-muted-foreground font-mono text-[11px]">
                  ({motoDestaque.moto.placa})
                </span>
                <span className="text-[10px] text-muted-foreground font-normal ml-2">
                  Base: {motoDestaque.dataInicioFormatada} • {motoDestaque.mesesDecorridos}{' '}
                  {motoDestaque.mesesDecorridos === 1 ? 'mês' : 'meses'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-1 sm:pt-0 border-amber-200 dark:border-amber-900/60">
            <span className="text-[11px] text-muted-foreground">Média:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              R$ {formatBRL(motoDestaque.mediaMensal)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/mês</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              (Lucro: R$ {formatBRL(motoDestaque.lucroTotal)})
            </span>
          </div>
        </div>
      )}

      {/* Controles de Filtro e Ordenação + Tabela */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="py-2.5 px-3 sm:px-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-emerald-600" />
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Tabela Média Moto
              </CardTitle>
              <CardDescription className="text-[10px]">
                Média Moto = Lucro ÷ Meses Ativos (Data Base até o mês corrente, ou fim da
                locação/operação para vendidas/cedidas)
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Status */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <Select
                value={filtroStatus}
                onValueChange={(val) => setFiltroStatus(val as FiltroStatus)}
              >
                <SelectTrigger className="w-[125px] h-7 text-[11px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas ({itens.length})</SelectItem>
                  <SelectItem value="ativas">
                    Ativas (
                    {
                      itens.filter((i) => i.moto.status !== 'vendida' && i.moto.status !== 'cedida')
                        .length
                    }
                    )
                  </SelectItem>
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
                  <SelectItem value="vendidas_cedidas">
                    Vendidas/Cedidas (
                    {
                      itens.filter((i) => i.moto.status === 'vendida' || i.moto.status === 'cedida')
                        .length
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
                <SelectTrigger className="w-[145px] h-7 text-[11px] bg-white dark:bg-slate-900 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media_desc">Maior Média Moto</SelectItem>
                  <SelectItem value="media_asc">Menor Média Moto</SelectItem>
                  <SelectItem value="lucro_desc">Maior Lucro</SelectItem>
                  <SelectItem value="meses_desc">Mais Meses Ativos</SelectItem>
                  <SelectItem value="nome_asc">Nome da Moto (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-2">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="w-full">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="py-1.5 px-2 text-left font-bold uppercase tracking-wider text-[10px]">
                      Moto
                    </th>
                    <th className="py-1.5 px-2 text-center font-bold uppercase tracking-wider text-[10px] w-[130px] sm:w-[145px]">
                      Data Base
                    </th>
                    <th className="py-1.5 px-2 text-right font-bold uppercase tracking-wider text-[10px] w-[100px] sm:w-[115px]">
                      Lucro
                    </th>
                    <th className="py-1.5 px-2 text-right font-black uppercase tracking-wider bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 text-[10px] w-[105px] sm:w-[120px]">
                      Média Moto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {itensOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                        Nenhuma moto encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    itensOrdenados.map((item) => {
                      const isDestaque = item.moto.id === motoDestaqueId
                      const status = item.moto.status

                      return (
                        <tr
                          key={item.moto.id}
                          className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                            isDestaque ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          {/* Coluna 1: Moto */}
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isDestaque ? (
                                <div
                                  className="p-1 rounded bg-amber-500 text-white shrink-0"
                                  title="Melhor Média Moto"
                                >
                                  <Trophy className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                  <Bike className="w-3 h-3" />
                                </div>
                              )}
                              <div className="min-w-0 flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate text-xs leading-tight">
                                  {item.moto.nome || item.moto.modelo}
                                </span>
                                {isDestaque && (
                                  <Badge className="bg-amber-600 text-white text-[8px] font-bold px-1 py-0 h-3 leading-none">
                                    Top 1
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.moto.placa}
                                </span>
                                {status === 'vendida' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] px-1 py-0 h-3 font-bold border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 uppercase leading-none"
                                  >
                                    Vendida
                                  </Badge>
                                )}
                                {status === 'cedida' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] px-1 py-0 h-3 font-bold border-orange-300 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 uppercase leading-none"
                                  >
                                    Cedida
                                  </Badge>
                                )}
                                {status === 'locada' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] px-1 py-0 h-3 font-semibold border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 leading-none"
                                  >
                                    Locada
                                  </Badge>
                                )}
                                {status === 'disponivel' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] px-1 py-0 h-3 font-medium border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 leading-none"
                                  >
                                    Disponível
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 2: Data Base (Data com 'compra' abaixo + Meses com 'meses ativos' abaixo) */}
                          <td className="py-1 px-2 text-center">
                            <div className="inline-flex items-center justify-center gap-2 sm:gap-3">
                              {/* Bloco 1: Data + rótulo compra */}
                              <div className="flex flex-col items-center leading-tight">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                                  {item.dataInicioFormatada}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                                  {item.origemInicio === 'compra'
                                    ? 'compra'
                                    : item.origemInicio === 'primeiro_lancamento'
                                      ? '1º caixa'
                                      : 's/ data'}
                                </span>
                              </div>

                              <span className="text-slate-300 dark:text-slate-700 text-xs font-light">
                                •
                              </span>

                              {/* Bloco 2: Meses + rótulo meses ativos */}
                              <div className="flex flex-col items-center leading-tight">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                                  {item.mesesDecorridos > 0 ? item.mesesDecorridos : '—'}
                                </span>
                                <span className="text-[9px] text-muted-foreground tracking-wider font-medium">
                                  {item.mesesDecorridos === 1 ? 'mês ativo' : 'meses ativos'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Coluna 3: Lucro */}
                          <td className="py-1.5 px-2 text-right tabular-nums font-bold text-xs">
                            <span
                              className={
                                item.lucroTotal >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              R$ {formatBRL(item.lucroTotal)}
                            </span>
                          </td>

                          {/* Coluna 4: Média Moto = Lucro ÷ Meses Ativos */}
                          <td className="py-1.5 px-2 text-right tabular-nums bg-emerald-50/40 dark:bg-emerald-950/15 font-bold text-xs">
                            {item.mediaMensal !== null ? (
                              <span
                                className={
                                  item.mediaMensal >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                    : 'text-red-600 dark:text-red-400 font-extrabold'
                                }
                              >
                                R$ {formatBRL(item.mediaMensal)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-normal text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>

                {/* Rodapé Totalizador */}
                <tfoot>
                  <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold border-t-2 border-slate-700 text-xs">
                    <td
                      colSpan={2}
                      className="py-1.5 px-2 text-left uppercase tracking-wider text-[10px]"
                    >
                      TOTAL CONSOLIDADO ({itensFiltrados.length} MOTOS)
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-white font-black text-xs">
                      {(() => {
                        const lucroSub = itensFiltrados.reduce((acc, it) => acc + it.lucroTotal, 0)
                        return (
                          <span className={lucroSub >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                            R$ {formatBRL(lucroSub)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-emerald-950/80 text-emerald-300 font-black text-xs border-l border-slate-700">
                      {(() => {
                        const comMedia = itensFiltrados.filter((it) => it.mediaMensal !== null)
                        const mediaSub =
                          comMedia.length > 0
                            ? comMedia.reduce((acc, it) => acc + (it.mediaMensal || 0), 0) /
                              comMedia.length
                            : 0
                        return (
                          <span className={mediaSub >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                            R$ {formatBRL(mediaSub)}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Legenda Explicativa Compacta */}
          <div className="mt-2.5 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>Maior Média Moto</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                <span>Média Moto = Lucro ÷ Meses Ativos</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Data Base ao mês corrente (ou fim da locação/operação para vendidas/cedidas).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
