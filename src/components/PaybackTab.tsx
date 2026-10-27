import React, { useMemo, useState } from 'react'
import {
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Bike,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Moto, Contrato, CaixaLancamento } from '@/types/database'
import { formatDateDisplay } from '@/lib/dateUtils'

interface PaybackTabProps {
  motos: Moto[]
  contratos: Contrato[]
  caixa: CaixaLancamento[]
}

interface PaybackMarker {
  multiplicador: number // 1, 2, 3...
  meses: number
  atingido: boolean
  label: string
  dataCalculada?: Date
  dataExibicao?: string // DD/MM/YYYY
  diasFaltantes?: number
  mesesRestantes?: number
}

interface MotoPaybackData {
  moto: Moto
  nomeExibicao: string
  placa: string
  valorCompra: number | null
  temValorCompra: boolean
  lucroAcumulado: number
  totalEntradas: number
  totalSaidas: number
  mesesDecorridos: number
  ritmoMensal: number // lucro por mês
  lucroSobreInvestimentoPct: number | null
  semDadosSuficientes: boolean
  motivoSemDados?: string

  // Data de referência de início (compra ou criação)
  dataInicioRef?: Date
  dataInicioFormatada?: string // DD/MM/YYYY

  // Contrato Conquista
  contratoConquistaAtivo?: Contrato
  fimContratoData?: string
  fimContratoMeses?: number

  // Paybacks
  paybacks: PaybackMarker[]
  mesesMaxEscala: number
}

function parseDateOnly(dateStr?: string): Date | null {
  if (!dateStr) return null
  const clean = dateStr.slice(0, 10)
  const [y, m, d] = clean.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function diffInMonths(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear()
  const months = to.getMonth() - from.getMonth()
  const days = to.getDate() - from.getDate()
  const total = years * 12 + months + days / 30.44
  return Math.max(0, total)
}

function formatMesesAnos(meses: number): string {
  if (!isFinite(meses) || meses < 0) return '—'
  const mRound = Math.round(meses)
  if (mRound < 12) {
    return `${mRound} ${mRound === 1 ? 'mês' : 'meses'}`
  }
  const anos = Math.floor(mRound / 12)
  const restoMeses = mRound % 12
  if (restoMeses === 0) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  }
  return `${anos}a ${restoMeses}m`
}

/**
 * Adiciona fração de meses a uma data base preservando cálculo de dias.
 * 1 mês equivale à média padrão de 30.4375 dias.
 */
function addFractionalMonths(baseDate: Date, months: number): Date {
  const d = new Date(baseDate.getTime())
  const msToAdd = months * 30.4375 * 24 * 60 * 60 * 1000
  return new Date(d.getTime() + msToAdd)
}

export const PaybackTab: React.FC<PaybackTabProps> = ({ motos, contratos, caixa }) => {
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'locadas' | 'disponiveis'>('todas')

  const processedMotos = useMemo<MotoPaybackData[]>(() => {
    const hoje = new Date()

    return motos.map((moto) => {
      const nomeExibicao = moto.nome?.trim() || moto.modelo || `Moto ${moto.placa}`
      const placa = moto.placa || ''
      const valorCompra =
        typeof moto.valor_compra === 'number' && moto.valor_compra > 0 ? moto.valor_compra : null
      const temValorCompra = valorCompra !== null

      // Movimentações financeiras da moto no livro caixa
      const lancamentosMoto = caixa.filter((c) => c.moto === moto.id)
      const totalEntradas = lancamentosMoto
        .filter((c) => c.tipo === 'entrada')
        .reduce((sum, c) => sum + (Number(c.valor) || 0), 0)
      const totalSaidas = lancamentosMoto
        .filter((c) => c.tipo === 'saida')
        .reduce((sum, c) => sum + (Number(c.valor) || 0), 0)
      const lucroAcumulado = totalEntradas - totalSaidas

      // Data de compra / início para calcular tempo decorrido
      const dataCompraDate = parseDateOnly(moto.data_compra) || parseDateOnly(moto.created)
      let mesesDecorridos = 0
      if (dataCompraDate) {
        mesesDecorridos = diffInMonths(dataCompraDate, hoje)
      }

      // Se decorreu menos de meio mês, usar histórico de lançamentos para estimar meses ativos
      if (mesesDecorridos < 0.5 && lancamentosMoto.length > 0) {
        const datas = lancamentosMoto
          .map((l) => parseDateOnly(l.data))
          .filter((d): d is Date => d !== null)
          .sort((a, b) => a.getTime() - b.getTime())
        if (datas.length > 0) {
          const primeiraData = datas[0]
          mesesDecorridos = diffInMonths(primeiraData, hoje)
        }
      }

      // Evitar divisão por zero; se foi cadastrada recentemente, considerar base mínima razoável
      const mesesEfetivosParaRitmo = Math.max(mesesDecorridos, 0.5)

      // Ritmo de lucro por mês
      const ritmoMensal = lucroAcumulado > 0 ? lucroAcumulado / mesesEfetivosParaRitmo : 0

      // Lucro sobre investimento (%)
      const lucroSobreInvestimentoPct =
        temValorCompra && valorCompra > 0 ? (lucroAcumulado / valorCompra) * 100 : null

      // Contrato Conquista ativo
      const contratoConquista = contratos.find(
        (c) =>
          c.moto === moto.id &&
          c.status === 'ativo' &&
          (c.tipo === 'plano_conquista' ||
            c.locatario_nome?.toLowerCase().includes('plano conquista')),
      )

      let fimContratoData: string | undefined = undefined
      let fimContratoMeses: number | undefined = undefined

      if (contratoConquista) {
        let dataFim = parseDateOnly(contratoConquista.data_entrega)
        if (!dataFim && contratoConquista.data_inicio && contratoConquista.prazo_meses) {
          const dInicio = parseDateOnly(contratoConquista.data_inicio)
          if (dInicio) {
            dataFim = new Date(dInicio)
            dataFim.setMonth(dataFim.getMonth() + Number(contratoConquista.prazo_meses))
          }
        }

        if (dataFim) {
          fimContratoData = contratoConquista.data_entrega || dataFim.toISOString().slice(0, 10)
          // Meses a partir da compra da moto até o fim do contrato (para plotar na mesma régua)
          const refInicio = dataCompraDate || hoje
          fimContratoMeses = Math.max(0, diffInMonths(refInicio, dataFim))
        }
      }

      // Validação de dados suficientes
      let semDadosSuficientes = false
      let motivoSemDados: string | undefined = undefined

      if (!temValorCompra) {
        semDadosSuficientes = true
        motivoSemDados = 'Informe o valor de compra da moto para calcular o payback.'
      } else if (lancamentosMoto.length === 0) {
        semDadosSuficientes = true
        motivoSemDados = 'Sem dados suficientes: nenhum lançamento financeiro registrado.'
      } else if (lucroAcumulado <= 0 || ritmoMensal <= 0) {
        semDadosSuficientes = true
        motivoSemDados =
          lucroAcumulado <= 0
            ? 'Sem dados suficientes: lucro acumulado zerado ou negativo até o momento.'
            : 'Sem dados suficientes: ritmo de lucro ainda em apuração.'
      }

      // Cálculo dos paybacks (Payback 1, 2, 3...)
      const paybacks: PaybackMarker[] = []
      let mesesMaxEscala = 24 // padrão mínimo: 2 anos

      const dataBaseInicio = dataCompraDate || hoje
      const dataInicioFormatada = dataCompraDate ? formatDateDisplay(dataCompraDate) : undefined

      if (temValorCompra && valorCompra > 0 && ritmoMensal > 0) {
        // Quantos meses desde o início para cada payback
        // Payback 1: meta = 1 * valorCompra
        // Payback 2: meta = 2 * valorCompra
        // Payback 3: meta = 3 * valorCompra
        for (let mult = 1; mult <= 4; mult++) {
          const metaLucro = valorCompra * mult
          let mesesTotaisAteMeta = 0

          if (lucroAcumulado >= metaLucro) {
            // Já atingiu!
            // Para determinar a data exata em que atingiu:
            // Percorremos os lançamentos cronologicamente acumulando lucro
            // Se encontrar a data do lançamento que superou a meta, usamos ela.
            // Senão, calculamos pela proporção linear a partir do início.
            let dataAtingida: Date | null = null
            if (lancamentosMoto.length > 0) {
              const ordenados = [...lancamentosMoto]
                .map((l) => ({ ...l, dObj: parseDateOnly(l.data) }))
                .filter((l): l is typeof l & { dObj: Date } => l.dObj !== null)
                .sort((a, b) => a.dObj.getTime() - b.dObj.getTime())

              let acum = 0
              for (const l of ordenados) {
                acum += l.tipo === 'entrada' ? Number(l.valor) || 0 : -(Number(l.valor) || 0)
                if (acum >= metaLucro) {
                  dataAtingida = l.dObj
                  break
                }
              }
            }

            if (!dataAtingida) {
              mesesTotaisAteMeta = (metaLucro / Math.max(lucroAcumulado, 1)) * mesesDecorridos
              dataAtingida = addFractionalMonths(dataBaseInicio, mesesTotaisAteMeta)
            } else {
              mesesTotaisAteMeta = Math.max(0, diffInMonths(dataBaseInicio, dataAtingida))
            }

            paybacks.push({
              multiplicador: mult,
              meses: mesesTotaisAteMeta,
              atingido: true,
              label: `Payback ${mult}`,
              dataCalculada: dataAtingida,
              dataExibicao: formatDateDisplay(dataAtingida),
            })
          } else {
            // Falta atingir: meses decorridos + meses restantes projetados
            const falta = metaLucro - lucroAcumulado
            const mesesRestantes = falta / ritmoMensal
            mesesTotaisAteMeta = mesesDecorridos + mesesRestantes

            // Data projetada EXATA (dia/mês/ano) calculada a partir de HOJE + meses restantes
            const dataProjetada = addFractionalMonths(hoje, mesesRestantes)
            const diffDias = Math.max(
              0,
              Math.round((dataProjetada.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000)),
            )

            paybacks.push({
              multiplicador: mult,
              meses: mesesTotaisAteMeta,
              atingido: false,
              label: `Payback ${mult}`,
              dataCalculada: dataProjetada,
              dataExibicao: formatDateDisplay(dataProjetada),
              diasFaltantes: diffDias,
              mesesRestantes,
            })
          }
        }

        // Definir escala da barra para comportar os paybacks e fim de contrato
        const paybacksAteTres = paybacks.filter((p) => p.multiplicador <= 3)
        const maiorMesPayback =
          paybacksAteTres.length > 0
            ? Math.max(...paybacksAteTres.map((p) => p.meses))
            : mesesDecorridos + 12

        const maxCandidato = Math.max(
          maiorMesPayback * 1.15,
          mesesDecorridos * 1.25,
          fimContratoMeses ? fimContratoMeses * 1.1 : 0,
          24, // no mínimo 24 meses
        )
        // Arredondar para múltiplos de 6 ou 12
        mesesMaxEscala = Math.ceil(maxCandidato / 6) * 6
      }

      return {
        moto,
        nomeExibicao,
        placa,
        valorCompra,
        temValorCompra,
        lucroAcumulado,
        totalEntradas,
        totalSaidas,
        mesesDecorridos,
        ritmoMensal,
        lucroSobreInvestimentoPct,
        semDadosSuficientes,
        motivoSemDados,
        dataInicioRef: dataCompraDate || undefined,
        dataInicioFormatada,
        contratoConquistaAtivo: contratoConquista,
        fimContratoData,
        fimContratoMeses,
        paybacks,
        mesesMaxEscala,
      }
    })
  }, [motos, contratos, caixa])

  const filteredMotos = useMemo(() => {
    return processedMotos.filter((item) => {
      if (filtroStatus === 'locadas') return item.moto.status === 'locada'
      if (filtroStatus === 'disponiveis') return item.moto.status === 'disponivel'
      return true
    })
  }, [processedMotos, filtroStatus])

  // KPIs consolidados da aba
  const kpis = useMemo(() => {
    const comValor = processedMotos.filter((m) => m.temValorCompra && (m.valorCompra ?? 0) > 0)
    const totalInvestido = comValor.reduce((sum, m) => sum + (m.valorCompra || 0), 0)
    const lucroTotalGeral = processedMotos.reduce((sum, m) => sum + m.lucroAcumulado, 0)
    const roiGeralPct = totalInvestido > 0 ? (lucroTotalGeral / totalInvestido) * 100 : 0
    const atingiramPayback1 = processedMotos.filter(
      (m) => m.temValorCompra && m.lucroAcumulado >= (m.valorCompra || 0),
    ).length

    return {
      totalInvestido,
      lucroTotalGeral,
      roiGeralPct,
      atingiramPayback1,
      totalMotos: processedMotos.length,
    }
  }, [processedMotos])

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs da Aba Payback */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Investimento na Frota</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              R${' '}
              {kpis.totalInvestido.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma do valor de compra cadastrado das motos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Lucro Líquido Acumulado</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${
                kpis.lucroTotalGeral >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              R${' '}
              {kpis.lucroTotalGeral.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receitas de locação menos despesas operacionais
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Retorno s/ Investimento Geral</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-600">
              {kpis.roiGeralPct.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Razão lucro total / investimento consolidado
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Payback 1 Atingido</span>
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">
              {kpis.atingiramPayback1} / {kpis.totalMotos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Motos cujo lucro já pagou 100% da compra
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cabeçalho da Lista + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            Lista de Motos & Régua de Payback
          </h2>
          <p className="text-xs text-muted-foreground">
            Escala cronológica em meses e anos marcando Payback 1 (1x compra), Payback 2 (2x),
            Payback 3 (3x) e fim de contrato Conquista.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filtroStatus === 'todas' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('todas')}
            className="text-xs h-8"
          >
            Todas ({processedMotos.length})
          </Button>
          <Button
            size="sm"
            variant={filtroStatus === 'locadas' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('locadas')}
            className="text-xs h-8"
          >
            Locadas ({processedMotos.filter((m) => m.moto.status === 'locada').length})
          </Button>
          <Button
            size="sm"
            variant={filtroStatus === 'disponiveis' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('disponiveis')}
            className="text-xs h-8"
          >
            Disponíveis ({processedMotos.filter((m) => m.moto.status === 'disponivel').length})
          </Button>
        </div>
      </div>

      {/* Lista de Cards de Cada Moto */}
      <div className="space-y-4">
        {filteredMotos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Bike className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma moto encontrada neste filtro.
            </p>
          </Card>
        ) : (
          filteredMotos.map((item) => <MotoPaybackCard key={item.moto.id} item={item} />)
        )}
      </div>

      {/* Legenda explicativa no rodapé */}
      <Card className="bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Como funciona o cálculo de Payback:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>
                  <strong>Payback 1</strong>: o lucro líquido acumulado (receitas - custos de
                  manutenção/seguro/comissão) atinge 100% do valor de compra da moto.
                </li>
                <li>
                  <strong>Payback 2</strong>: o lucro acumulado atinge 200% (2x o valor de compra).
                </li>
                <li>
                  <strong>Payback 3</strong>: o lucro acumulado atinge 300% (3x o valor de compra).
                </li>
                <li>
                  <strong>Ritmo de Lucro</strong>: média de lucro mensal obtida desde a compra da
                  moto até hoje. Projetamos os meses futuros a partir desse ritmo real apurado.
                </li>
                <li>
                  <strong>Plano Conquista</strong>: exibe o marcador visual com a data de término do
                  contrato na régua cronológica.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Card individual de cada moto com suas métricas e a barra horizontal com escala em meses e anos.
 */
interface MotoPaybackCardProps {
  item: MotoPaybackData
}

const MotoPaybackCard: React.FC<MotoPaybackCardProps> = ({ item }) => {
  const {
    moto,
    nomeExibicao,
    placa,
    valorCompra,
    temValorCompra,
    lucroAcumulado,
    totalEntradas,
    totalSaidas,
    mesesDecorridos,
    ritmoMensal,
    lucroSobreInvestimentoPct,
    semDadosSuficientes,
    motivoSemDados,
    dataInicioRef,
    dataInicioFormatada,
    contratoConquistaAtivo,
    fimContratoData,
    fimContratoMeses,
    paybacks,
    mesesMaxEscala,
  } = item

  // Próximo payback a ser atingido
  const proximoPayback = paybacks.find((p) => !p.atingido)
  const mesesFaltantesProximo =
    proximoPayback && ritmoMensal > 0 ? Math.max(0, proximoPayback.meses - mesesDecorridos) : null

  // Marcadores de escala na régua (ex: Início, 1 ano — 2027, 2 anos — 2028, etc.)
  const markersEscala = useMemo(() => {
    const step = mesesMaxEscala <= 36 ? 6 : 12
    const list: Array<{
      meses: number
      rotuloPrincipal: string
      rotuloSub?: string
    }> = []

    const anoBase = dataInicioRef ? dataInicioRef.getFullYear() : new Date().getFullYear()

    for (let m = 0; m <= mesesMaxEscala; m += step) {
      if (m === 0) {
        list.push({
          meses: 0,
          rotuloPrincipal: 'Início',
          rotuloSub: dataInicioFormatada,
        })
      } else if (m % 12 === 0) {
        const anos = m / 12
        const anoReal = anoBase + anos
        list.push({
          meses: m,
          rotuloPrincipal: `${anos} ${anos === 1 ? 'ano' : 'anos'}`,
          rotuloSub: `${anoReal}`,
        })
      } else {
        list.push({
          meses: m,
          rotuloPrincipal: `${m}m`,
        })
      }
    }
    return list
  }, [mesesMaxEscala, dataInicioRef, dataInicioFormatada])

  // Posição percentual na barra
  const toPercent = (meses: number) => {
    if (mesesMaxEscala <= 0) return 0
    return Math.min(100, Math.max(0, (meses / mesesMaxEscala) * 100))
  }

  const progressoAtualPct = toPercent(mesesDecorridos)
  const p1 = paybacks.find((p) => p.multiplicador === 1)

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Identificação da moto */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {nomeExibicao}
                </span>
                {placa && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {placa}
                  </Badge>
                )}
                <Badge
                  variant={
                    moto.status === 'locada'
                      ? 'default'
                      : moto.status === 'disponivel'
                        ? 'outline'
                        : 'secondary'
                  }
                  className="text-[11px] capitalize"
                >
                  {moto.status === 'locada'
                    ? 'Locada'
                    : moto.status === 'disponivel'
                      ? 'Disponível'
                      : moto.status === 'manutencao'
                        ? 'Manutenção'
                        : 'Oficina'}
                </Badge>
                {contratoConquistaAtivo && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[11px]">
                    ★ Plano Conquista
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {moto.modelo} {moto.ano ? `• Ano ${moto.ano}` : ''}{' '}
                {moto.data_compra
                  ? `• Comprada em ${formatDateDisplay(moto.data_compra)} (${formatMesesAnos(mesesDecorridos)} ativos)`
                  : ''}
              </p>
            </div>
          </div>

          {/* Lucro sobre o investimento e próxima meta */}
          <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                Lucro s/ Investimento
              </span>
              <span
                className={`text-base sm:text-lg font-black ${
                  lucroSobreInvestimentoPct === null
                    ? 'text-slate-400'
                    : lucroSobreInvestimentoPct >= 100
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : lucroSobreInvestimentoPct >= 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600'
                }`}
              >
                {lucroSobreInvestimentoPct !== null
                  ? `${lucroSobreInvestimentoPct.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            {/* Exibição da previsão do Payback 1 ou do próximo payback */}
            {p1 && (
              <div className="text-[11px] text-muted-foreground text-left sm:text-right mt-0.5">
                {p1.atingido ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center sm:justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Payback 1 atingido em {p1.dataExibicao || '—'}
                  </span>
                ) : (
                  <span>
                    Payback 1 previsto:{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {p1.dataExibicao || '—'}
                    </strong>
                    {mesesFaltantesProximo !== null && (
                      <span className="text-primary font-medium ml-1">
                        (~{formatMesesAnos(mesesFaltantesProximo)})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-5 pt-0 space-y-4">
        {/* Painel Financeiro Compacto da Moto */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Valor de Compra:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {temValorCompra && valorCompra !== null
                ? `R$ ${valorCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : 'Não informado'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Lucro Acumulado:</span>
            <span
              className={`font-bold ${lucroAcumulado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              R${' '}
              {lucroAcumulado.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Ritmo Mensal:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {ritmoMensal > 0
                ? `+ R$ ${ritmoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
                : 'Em apuração'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">
              {contratoConquistaAtivo ? 'Fim do Contrato:' : 'Total Entradas / Saídas:'}
            </span>
            {contratoConquistaAtivo ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5" />
                {fimContratoData ? formatDateDisplay(fimContratoData) : 'A definir'}
              </span>
            ) : (
              <span className="font-medium text-slate-600 dark:text-slate-300">
                +R$ {totalEntradas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / -R${' '}
                {totalSaidas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        {/* Informação destacada do Plano Conquista, se aplicável */}
        {contratoConquistaAtivo && fimContratoData && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Contrato Plano Conquista ativo:</strong> locatário{' '}
                <em>{contratoConquistaAtivo.locatario_nome}</em> • Término previsto em{' '}
                <strong>{formatDateDisplay(fimContratoData)}</strong>
              </span>
            </div>
            {fimContratoMeses !== undefined && (
              <span className="font-semibold text-amber-700 dark:text-amber-300 text-[11px]">
                (~{formatMesesAnos(fimContratoMeses)} de duração total)
              </span>
            )}
          </div>
        )}

        {/* SEÇÃO DA BARRA DE PAYBACK */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Linha do Tempo de Paybacks (Meses & Anos)
            </span>
            <span className="text-[11px] text-muted-foreground">
              Tempo decorrido:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatMesesAnos(mesesDecorridos)}
              </strong>
            </span>
          </div>

          {semDadosSuficientes ? (
            /* Estado discreto sem quebrar a tela */
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Sem dados suficientes para projetar a régua</span>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                {motivoSemDados ||
                  'Aguardando mais lançamentos no Livro Caixa para consolidar o ritmo mensal.'}
              </p>
            </div>
          ) : (
            /* Régua com Escala em Meses e Anos */
            <div className="relative pt-6 pb-6 px-2 sm:px-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Barra base (trilho) */}
              <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible">
                {/* Preenchimento do tempo decorrido até hoje */}
                <div
                  className="h-full bg-blue-500/30 rounded-l-full transition-all"
                  style={{ width: `${progressoAtualPct}%` }}
                />

                {/* Marcador "Hoje" (tempo decorrido) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group"
                  style={{ left: `${progressoAtualPct}%` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-sm animate-pulse" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    Hoje ({formatMesesAnos(mesesDecorridos)})
                  </div>
                </div>

                {/* Marcadores de Payback (1, 2, 3...) */}
                {paybacks.map((pb) => {
                  const pct = toPercent(pb.meses)
                  // Não desenhar se extrapolou muito a barra
                  if (pct > 100) return null

                  const isP1 = pb.multiplicador === 1
                  const isAtingido = pb.atingido

                  return (
                    <div
                      key={pb.multiplicador}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group"
                      style={{ left: `${pct}%` }}
                    >
                      {/* Ponto / Ícone */}
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 shadow-sm transition-transform group-hover:scale-125 ${
                          isAtingido
                            ? 'bg-emerald-600 border-white dark:border-slate-900 text-white'
                            : isP1
                              ? 'bg-amber-500 border-white dark:border-slate-900 text-white'
                              : 'bg-purple-600 border-white dark:border-slate-900 text-white'
                        }`}
                        title={`${pb.label}: ${pb.dataExibicao ? pb.dataExibicao : ''} (${
                          isAtingido ? 'Atingido!' : 'Previsto'
                        })`}
                      >
                        {isAtingido ? '✓' : pb.multiplicador}
                      </div>

                      {/* Tag do Payback abaixo da barra */}
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center whitespace-nowrap pointer-events-none">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs ${
                            isAtingido
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300/60 dark:border-emerald-800'
                              : 'text-slate-800 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isAtingido && '✓ '}
                          {pb.label}
                        </span>
                        {pb.dataExibicao && (
                          <span
                            className={`text-[8.5px] font-bold ${
                              isAtingido
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-primary dark:text-blue-400'
                            }`}
                          >
                            {pb.dataExibicao}
                          </span>
                        )}
                        <span className="text-[7.5px] text-muted-foreground">
                          {formatMesesAnos(pb.meses)}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Marcador de Fim de Contrato (Plano Conquista) */}
                {contratoConquistaAtivo && fimContratoMeses !== undefined && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 group"
                    style={{ left: `${toPercent(fimContratoMeses)}%` }}
                  >
                    {/* Bandeira / Marcador de Fim */}
                    <div
                      className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md group-hover:scale-125 transition-transform"
                      title={`Fim do Contrato: ${
                        fimContratoData ? formatDateDisplay(fimContratoData) : ''
                      } (~${formatMesesAnos(fimContratoMeses)})`}
                    >
                      <Flag className="w-2.5 h-2.5" />
                    </div>

                    {/* Tag acima da barra */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <Flag className="w-2.5 h-2.5" />
                      <span>FIM ({formatMesesAnos(fimContratoMeses)})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Escala em Meses e Anos no Rodapé da Barra */}
              <div className="relative w-full h-8 mt-10 border-t border-slate-200 dark:border-slate-800">
                {markersEscala.map((mk) => {
                  const pct = toPercent(mk.meses)
                  // No início (0%), não deslocar -50% para não cortar à esquerda; no fim (100%), alinhar à direita
                  const alignClass =
                    pct === 0
                      ? 'left-0 translate-x-0 items-start'
                      : pct >= 98
                        ? 'right-0 -translate-x-0 items-end'
                        : '-translate-x-1/2 items-center'

                  return (
                    <div
                      key={mk.meses}
                      className={`absolute top-0 flex flex-col ${alignClass}`}
                      style={pct > 0 && pct < 98 ? { left: `${pct}%` } : undefined}
                    >
                      <div
                        className={`w-0.5 h-1.5 bg-slate-300 dark:bg-slate-700 ${
                          pct === 0 ? 'ml-0.5' : pct >= 98 ? 'mr-0.5' : ''
                        }`}
                      />
                      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                        {mk.meses === 0 ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {mk.rotuloSub ? `Início · ${mk.rotuloSub}` : 'Início'}
                          </span>
                        ) : mk.rotuloSub ? (
                          <span>
                            {mk.rotuloPrincipal}{' '}
                            <strong className="text-slate-700 dark:text-slate-300 font-bold">
                              — {mk.rotuloSub}
                            </strong>
                          </span>
                        ) : (
                          <span>{mk.rotuloPrincipal}</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PaybackTab
