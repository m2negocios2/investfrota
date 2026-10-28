import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  Bike,
  CreditCard,
  Edit3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { recebimentosService } from '@/services/recebimentos'
import { Moto, Contrato, Recebimento, DiaSemana } from '@/types/database'
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'
import { getMotoColorStyle } from '@/components/MotoSelectorGrid'

import {
  NOMES_MESES,
  DIAS_SEMANA_CONFIG as DIAS_SEMANA,
  getWeekForDate,
  getWeekDatesFromSunday,
  getMonthWeeks,
} from '@/lib/semanaCalendar'

export default function Semana() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)

  // Referência do dia de hoje para identificar semana atual (domingo a sábado) e mês atual
  const today = useMemo(() => new Date(), [])
  const todayWeek = useMemo(() => getWeekForDate(today), [today])
  const currentMonth = today.getMonth() // 0-11
  const currentYear = today.getFullYear()

  // Ao entrar na tela aparece sempre o mês atual
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  // Configurable percent (default 70% matching owner's spreadsheet)
  const [percentualLiquido, setPercentualLiquido] = useState<number>(70)
  const [showConfigPercentual, setShowConfigPercentual] = useState(false)

  // Payment Confirmation Dialog (when clicking neutral or overdue cell)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [cellTarget, setCellTarget] = useState<{
    moto: Moto
    contrato: Contrato
    dia: DiaSemana
    dateStr: string
    valor: number
    recebimento?: Recebimento
    weekCode: string
  } | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  >('pix')

  // Change Day Modal
  const [changeDayModalOpen, setChangeDayModalOpen] = useState(false)
  const [changeDayTarget, setChangeDayTarget] = useState<Contrato | null>(null)
  const [newDay, setNewDay] = useState<DiaSemana>('SEG')
  const [savingDay, setSavingDay] = useState(false)

  const loadData = async () => {
    try {
      const [mList, cList, rList] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        recebimentosService.getAll(),
      ])

      // IDs de contratos válidos existentes no banco
      const validContractIds = new Set(cList.map((c) => c.id))

      // Filtrar recebimentos órfãos: se o recebimento aponta para um contrato que foi excluído/apagado,
      // ele não deve influenciar o status do painel Semana
      const filteredRecebimentos = rList.filter((r) => {
        if (!r.contrato) return true
        return validContractIds.has(r.contrato)
      })

      setMotos(mList)
      setContratos(cList)
      setRecebimentos(filteredRecebimentos)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados da semana')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Regra de atribuição de semanas ao mês (definida pela usuária):
  // Semanas de DOMINGO a SÁBADO.
  // A semana pertence ao mês do seu domingo de início;
  // EXCETO quando restam no máximo 2 dias desse mês a partir do domingo
  // (domingo no penúltimo ou último dia do mês), caso em que pertence ao mês seguinte.
  //
  // Ordem de exibição solicitada pela usuária:
  // "no painel semana mostrar da última semana até a primeira"
  // - Se houver semana atual (mês corrente), a semana atual fica no topo com selo verde,
  //   seguida das anteriores em ordem decrescente.
  // - Para outros meses (ou se a atual não estiver no mês), os blocos aparecem em ordem decrescente
  //   (da última semana até a primeira semana do mês).
  // Os rótulos ("MÊS: SEMANA X"), semanas do ano, cálculos e numeração original permanecem intactos.
  const monthWeeks = useMemo(() => {
    const weeks = getMonthWeeks(selectedYear, selectedMonth, todayWeek.code)
    const hasCurrent = weeks.some((item) => item.isCurrent)

    if (hasCurrent) {
      return [...weeks].sort((a, b) => {
        if (a.isCurrent) return -1
        if (b.isCurrent) return 1
        return b.weekOfMonth - a.weekOfMonth
      })
    }

    return [...weeks].sort((a, b) => b.weekOfMonth - a.weekOfMonth)
  }, [selectedYear, selectedMonth, todayWeek.code])

  // Helper para extrair YYYY-MM-DD com segurança sem problema de fuso
  const parseDateStr = (raw?: string | null): string => {
    if (!raw) return ''
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : ''
  }

  // Função auxiliar para filtrar contratos válidos para uma semana específica (DOM a SAB).
  // Regra da usuária:
  // "NA PLANILHA SEMANA. DEIXAR APENAS O CONTRATO ATIVO NAS RESPECTIVAS SEMANAS.
  // E DEIXAR OS CONTRATOS ENCERRADOS MOSTRANDO DURANTE O PERIODO que eram ativos. Não sempre"
  // 1. Contrato ENCERRADO (finalizado):
  //    - Aparece SOMENTE nas semanas que intersectam seu período ativo: data_inicio até data_entrega (data de encerramento).
  //    - Se a semana for posterior ao encerramento (weekStartStr > fim), NÃO aparece.
  //    - Se a semana for anterior ao início (weekEndStr < inicio), NÃO aparece.
  // 2. Contrato ATIVO:
  //    - Aparece a partir da semana de início (weekEndStr >= inicio).
  //    - Se a semana for anterior ao início (weekEndStr < inicio), NÃO aparece.
  //    - Nota sobre data_entrega em contratos ativos: alguns contratos ativos (ex.: plano conquista de 28 meses)
  //      possuem data_entrega preenchida com a previsão de encerramento/quitação no futuro (ex.: 2028, 2029).
  //      Por isso, para contratos com status 'ativo', a data_entrega futura NÃO deve escondê-lo hoje ou nas semanas seguintes,
  //      mas caso um contrato ativo tenha uma data de entrega definida e a semana esteja depois dela, respeita a vigência.
  // 3. Contratos CANCELADOS ou excluídos: NÃO aparecem.
  // 4. Blindagem: A moto vinculada deve existir no cadastro de motos.
  const getActiveContratosForWeek = (weekStartStr: string, weekEndStr: string) => {
    return contratos.filter((c) => {
      if (c.status !== 'ativo' && c.status !== 'finalizado') return false

      const motoExists = motos.some((m) => m.id === c.moto)
      if (!motoExists) return false

      const inicio = parseDateStr(c.data_inicio)
      // Se a semana inteira terminar antes do início do contrato, ele ainda não existia nesta semana
      if (inicio && inicio > weekEndStr) return false

      if (c.status === 'finalizado') {
        // Contrato encerrado: vigência termina obrigatoriamente na data_entrega
        const fim = parseDateStr(c.data_entrega)
        if (fim && fim < weekStartStr) {
          // A semana começou depois do contrato ter sido encerrado -> NÃO aparece nesta semana
          return false
        }
      } else if (c.status === 'ativo') {
        // Contrato ativo: se houver data_entrega e ela já passou antes do início desta semana
        const fim = parseDateStr(c.data_entrega)
        if (fim && fim < weekStartStr) {
          return false
        }
      }

      return true
    })
  }

  // Verifica se o contrato estava vigente em um dia específico (YYYY-MM-DD).
  // Regra 4 da usuária: "A célula do dia só é exibida/actionável quando o contrato estava vigente NAQUELE dia específico".
  // Para contratos encerrados: dias após a data_entrega não estavam vigentes.
  // Para qualquer contrato: dias antes de data_inicio não estavam vigentes.
  // Exceção preservada: se já houver um recebimento 'pago' ou 'apenas_colorido' registrado para este contrato nesta célula,
  // mantemos visível para não apagar histórico financeiro preexistente.
  const isContractActiveOnDate = (contrato: Contrato, cellDateStr: string): boolean => {
    const inicio = parseDateStr(contrato.data_inicio)
    if (inicio && cellDateStr < inicio) {
      return false
    }

    if (contrato.status === 'finalizado') {
      const fim = parseDateStr(contrato.data_entrega)
      if (fim && cellDateStr > fim) {
        return false
      }
    } else if (contrato.status === 'ativo') {
      const fim = parseDateStr(contrato.data_entrega)
      if (fim && cellDateStr > fim) {
        return false
      }
    }

    return true
  }

  // Helper to get contract's weekly payment day
  const getContractDay = (contrato: Contrato): DiaSemana => {
    if (contrato.dia_pagamento_semana) return contrato.dia_pagamento_semana
    if (contrato.data_inicio) {
      const clean = parseDateStr(contrato.data_inicio)
      if (clean) {
        const parts = clean.split('-').map(Number)
        // Date UTC para obter o dia da semana correto
        const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
        const map: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
        return map[dt.getUTCDay()] || 'SEG'
      }
    }
    return 'SEG'
  }

  // Helper to calculate cell status for a contract in a given week
  const getCellStatus = (
    contrato: Contrato,
    weekCode: string,
    cellDateStr: string,
  ): {
    status: 'pago' | 'pendente' | 'atraso'
    recebimento?: Recebimento
  } => {
    // Look for a payment registered for this specific contract (or matching moto only if contract matches or is unset)
    // Blindagem contra recibos órfãos de contratos apagados: se o recibo tiver 'contrato', deve bater com o contrato atual
    const found = recebimentos.find(
      (r) =>
        r.moto === contrato.moto &&
        (!r.contrato || r.contrato === contrato.id) &&
        (r.semana_ano === weekCode ||
          (r.data_vencimento && r.data_vencimento.startsWith(cellDateStr))),
    )

    if (found) {
      if (found.status === 'pago') {
        return { status: 'pago', recebimento: found }
      }
      if (found.status === 'em_atraso') {
        return { status: 'atraso', recebimento: found }
      }
      // em_dia: check if overdue compared to today
      const todayStr = getTodayLocalDate()
      if (cellDateStr < todayStr) {
        return { status: 'atraso', recebimento: found }
      }
      return { status: 'pendente', recebimento: found }
    }

    // No recebimento record: if cell date is in the past, consider overdue; otherwise neutral/pending
    const todayStr = getTodayLocalDate()
    if (cellDateStr < todayStr) {
      return { status: 'atraso' }
    }
    return { status: 'pendente' }
  }

  // Handle cell click (Toggle or confirm payment)
  const handleCellClick = async (
    contrato: Contrato,
    moto: Moto,
    dia: DiaSemana,
    weekCode: string,
    cellDateStr: string,
    valor: number,
  ) => {
    const cellState = getCellStatus(contrato, weekCode, cellDateStr)

    if (cellState.status === 'pago' && cellState.recebimento) {
      const rec = cellState.recebimento
      const isApenasColorido =
        rec.observacoes === 'apenas_colorido' ||
        Boolean(rec.observacoes && rec.observacoes.includes('apenas_colorido'))

      // Estornar / Desmarcar pagamento
      const msg = isApenasColorido
        ? `A moto ${moto.nome || moto.modelo} está apenas marcada como COLORIDA nesta semana (sem lançamentos no caixa).\n\nDeseja desmarcar e voltar para pendente?`
        : `A moto ${moto.nome || moto.modelo} já consta como PAGA nesta semana.\n\nDeseja estornar o pagamento? O lançamento de aluguel e a comissão correspondente serão retirados do Caixa.`

      const confirmed = window.confirm(msg)
      if (confirmed) {
        try {
          await recebimentosService.estornarPagamento(rec.id, 'em_dia')
          toast.success(
            isApenasColorido
              ? 'Marcação removida com sucesso!'
              : 'Pagamento estornado com sucesso! Lançamentos retirados do Caixa.',
          )
          await loadData()
        } catch (err) {
          console.error('Erro ao estornar pagamento no painel Semana:', err)
          toast.error('Erro ao estornar pagamento')
        }
      }
      return
    }

    // Open confirm payment modal
    setCellTarget({
      moto,
      contrato,
      dia,
      dateStr: cellDateStr,
      valor,
      recebimento: cellState.recebimento,
      weekCode,
    })
    setPaymentModalOpen(true)
  }

  // Opção 1: APENAS COLORIR (pinta de verde sem lançar nada no caixa)
  const handleApenasColorir = async () => {
    if (!cellTarget || submittingAction) return
    setSubmittingAction(true)
    try {
      const todayStr = getTodayLocalDate()
      const weekCode = cellTarget.weekCode

      let recebimentoId = cellTarget.recebimento?.id

      if (!recebimentoId) {
        await recebimentosService.create({
          moto: cellTarget.moto.id,
          contrato: cellTarget.contrato.id,
          locatario_nome: cellTarget.contrato.locatario_nome || '',
          data_vencimento: cellTarget.dateStr,
          data_pagamento: todayStr,
          valor: cellTarget.valor,
          status: 'pago',
          forma_pagamento: formaPagamento,
          semana_ano: weekCode,
          observacoes: 'apenas_colorido',
        })
      } else {
        await recebimentosService.update(recebimentoId, {
          status: 'pago',
          data_pagamento: todayStr,
          forma_pagamento: formaPagamento,
          observacoes: 'apenas_colorido',
        })
      }

      toast.success('Célula colorida com sucesso (sem lançamentos no Caixa)!')
      setPaymentModalOpen(false)
      setCellTarget(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao apenas colorir célula no painel Semana:', err)
      toast.error('Erro ao marcar como colorida')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Opção 2: COLORIR E LANÇAR PAGAMENTO (comportamento completo: colore + Caixa + Comissão)
  const handleColorirELancarPagamento = async () => {
    if (!cellTarget || submittingAction) return
    setSubmittingAction(true)
    try {
      const todayStr = getTodayLocalDate()
      const weekCode = cellTarget.weekCode

      let recebimentoId = cellTarget.recebimento?.id

      if (!recebimentoId) {
        // Criar novo registro de recebimento com semana_ano e vincular ao contrato
        const newRec = await recebimentosService.create({
          moto: cellTarget.moto.id,
          contrato: cellTarget.contrato.id,
          locatario_nome: cellTarget.contrato.locatario_nome || '',
          data_vencimento: cellTarget.dateStr,
          data_pagamento: todayStr,
          valor: cellTarget.valor,
          status: 'em_dia',
          forma_pagamento: formaPagamento,
          semana_ano: weekCode,
        })
        recebimentoId = newRec.id
      }

      // Se tinha observação de 'apenas_colorido', limpa para virar lançamento regular
      if (cellTarget.recebimento?.observacoes === 'apenas_colorido') {
        await recebimentosService.update(recebimentoId, { observacoes: '' })
      }

      // Marcar como pago, gerar receita no caixa e comissão automática se configurada
      await recebimentosService.marcarComoPago(
        recebimentoId,
        cellTarget.moto.id,
        cellTarget.valor,
        cellTarget.contrato.locatario_nome || '',
        formaPagamento,
        todayStr,
        cellTarget.contrato.id,
      )

      toast.success(
        `Pagamento de R$ ${cellTarget.valor.toFixed(2)} registrado e lançado no Caixa com sucesso!`,
      )
      setPaymentModalOpen(false)
      setCellTarget(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao registrar pagamento no painel Semana:', err)
      toast.error('Erro ao registrar pagamento e lançar no caixa')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Save adjusted day of week
  const handleSaveNewDay = async () => {
    if (!changeDayTarget) return
    setSavingDay(true)
    try {
      await contratosService.updateDiaSemana(changeDayTarget.id, newDay)
      toast.success(`Dia de pagamento alterado para ${newDay}!`)
      setChangeDayModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar dia da semana')
    } finally {
      setSavingDay(false)
    }
  }

  // Navigation handlers: MUDAR APENAS O MÊS
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleGoToCurrentMonth = () => {
    setSelectedMonth(currentMonth)
    setSelectedYear(currentYear)
  }

  const isCurrentMonthSelected = selectedMonth === currentMonth && selectedYear === currentYear

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel SEMANA
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs"
            >
              {NOMES_MESES[selectedMonth]} {selectedYear}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grade operacional semanal: veja os dias de pagamento de cada moto, dê baixa e ajuste
            datas.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToCurrentMonth}
            disabled={isCurrentMonthSelected}
            className="text-xs font-semibold gap-1 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mês Atual ({NOMES_MESES[currentMonth].slice(0, 3)}/{currentYear})
          </Button>

          <div className="flex items-center border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-none border-r"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-bold font-mono uppercase">
              {NOMES_MESES[selectedMonth]} / {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-none border-l"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigPercentual(!showConfigPercentual)}
            className="text-xs gap-1.5 h-8"
          >
            <Percent className="w-3.5 h-3.5 text-blue-600" />
            Líquido ({percentualLiquido}%)
          </Button>
        </div>
      </div>
      {/* Editable Percentage Bar (if toggled) */}
      {showConfigPercentual && (
        <Card className="bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-sm animate-in fade-in-50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <span className="font-bold block">Configuração da Linha de Líquido:</span>
              <span className="text-blue-700 dark:text-blue-300">
                A segunda linha de totais aplica este percentual sobre a receita bruta semanal (na
                sua planilha: 70% de 11.342 = 7.939,40).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold whitespace-nowrap">
                Percentual Líquido (%):
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={percentualLiquido}
                onChange={(e) => setPercentualLiquido(Number(e.target.value) || 70)}
                className="w-20 h-8 text-xs font-bold"
              />
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowConfigPercentual(false)}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Cores:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Verde: Já Pagou
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Neutro: Pendente
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 border border-rose-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Vermelho: Em Atraso
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>💡 Toque no valor para dar baixa/estornar; toque no nome para ajustar o dia.</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {monthWeeks.length} semanas em {NOMES_MESES[selectedMonth]}
          </span>
        </div>
      </div>

      {/* TODAS AS SEMANAS DO MÊS */}
      <div className="space-y-4">
        {monthWeeks.map((weekInfo) => {
          const isCurrentBlock = weekInfo.isCurrent
          const weekDates = getWeekDatesFromSunday(weekInfo.sundayDate)
          const weekStartStr = weekDates['DOM'].dateStr
          const weekEndStr = weekDates['SAB'].dateStr

          // Contratos ativos específicos desta semana
          const activeContratosThisWeek = getActiveContratosForWeek(weekStartStr, weekEndStr)

          // Totais diários e totais gerais da semana (DOM a SAB)
          // Somente contratos com vigência no respectivo dia (ou com recebimento pago registrado na célula)
          // devem compor o total diário daquele dia.
          const dailyTotals: { [key in DiaSemana]: number } = {
            DOM: 0,
            SEG: 0,
            TER: 0,
            QUA: 0,
            QUI: 0,
            SEX: 0,
            SAB: 0,
          }

          activeContratosThisWeek.forEach((contrato) => {
            const dia = getContractDay(contrato)
            const cellDateStr = weekDates[dia].dateStr
            const isVigenteNoDia = isContractActiveOnDate(contrato, cellDateStr)
            const cellState = getCellStatus(contrato, weekInfo.code, cellDateStr)
            const hasPagoRecord = cellState.status === 'pago'

            if (isVigenteNoDia || hasPagoRecord) {
              const valor =
                contrato.valor_semanal || (contrato.valor_diario ? contrato.valor_diario * 7 : 0)
              dailyTotals[dia] += valor
            }
          })

          const totalBrutoSemana = Object.values(dailyTotals).reduce((a, b) => a + b, 0)
          const totalLiquidoSemana = totalBrutoSemana * (percentualLiquido / 100)

          return (
            <Card
              key={weekInfo.code}
              className={`shadow-sm overflow-hidden border transition-all ${
                isCurrentBlock
                  ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Week Block Header:
                  1. "MES: SEMANA 1 A 5" (ex.: MAIO: SEMANA 3)
                  2. Em letra pequena a semana do ano (ex.: Semana 21 do ano)
                  3. Semana atual com selo "SEMANA ATUAL"
                  4. Totais bruto/líquido apenas no rodapé
              */}
              <div
                className={`px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b ${
                  isCurrentBlock
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {/* MES: SEMANA 1 A 5 */}
                  <span
                    className={`font-black text-xs tracking-wide px-2 py-0.5 rounded shadow-sm ${
                      isCurrentBlock
                        ? 'bg-blue-900/60 text-white border border-blue-400/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {weekInfo.monthName}: SEMANA {weekInfo.weekOfMonth}
                  </span>

                  {/* Badge da semana atual */}
                  {isCurrentBlock && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] px-1.5 py-0 uppercase tracking-wider"
                    >
                      Semana Atual
                    </Badge>
                  )}
                </div>

                {/* Em letra pequena a semana do ano */}
                <div
                  className={`text-[10px] sm:text-[11px] font-medium ${
                    isCurrentBlock ? 'text-blue-100' : 'text-muted-foreground dark:text-slate-400'
                  }`}
                >
                  Semana {weekInfo.week} do ano ({weekInfo.year}) •{' '}
                  {weekDates['DOM'].dateStr.split('-').slice(1).reverse().join('/')} a{' '}
                  {weekDates['SAB'].dateStr.split('-').slice(1).reverse().join('/')}
                </div>
              </div>

              {/* TABLE CONTAINER: Compacto para caber na tela sem scroll horizontal */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-[11px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px]">
                      <th className="p-1 sm:p-1.5 text-left font-bold text-slate-700 dark:text-slate-200 w-[24%] sm:w-[22%] border-r border-slate-200 dark:border-slate-700">
                        <div className="truncate font-mono">
                          <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] mr-1">
                            S{weekInfo.week}
                          </span>
                          <span>MOTO</span>
                        </div>
                      </th>
                      {DIAS_SEMANA.map((d) => {
                        const diaNumero = weekDates[d.key].dateStr.split('-')[2]
                        return (
                          <th
                            key={d.key}
                            className="p-0.5 sm:p-1 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 w-[9%] sm:w-[9.5%]"
                          >
                            <div className="text-[10px] sm:text-[11px] font-black text-blue-700 dark:text-blue-300 font-mono leading-none tracking-tight">
                              {diaNumero}
                            </div>
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 uppercase text-[9px] sm:text-[10px] leading-tight mt-0.5">
                              {d.short}
                            </div>
                          </th>
                        )
                      })}
                      <th className="p-1 text-right font-bold text-slate-700 dark:text-slate-200 w-[13%] sm:w-[11.5%] bg-slate-100/60 dark:bg-slate-800/40 text-[10px]">
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {activeContratosThisWeek.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">
                          Nenhuma moto com contrato vigente nesta semana.
                        </td>
                      </tr>
                    ) : (
                      activeContratosThisWeek.map((contrato) => {
                        const moto = motos.find((m) => m.id === contrato.moto) || {
                          id: contrato.moto,
                          nome: 'Moto',
                          placa: '---',
                          modelo: 'Moto',
                          ano: 2023,
                          cor: '',
                          valor_diario: 35,
                          tipo_locacao_padrao: 'normal',
                          status: 'locada',
                          created: '',
                          updated: '',
                        }
                        const diaPgto = getContractDay(contrato)
                        const valorSemanal =
                          contrato.valor_semanal ||
                          (contrato.valor_diario ? contrato.valor_diario * 7 : 0)

                        return (
                          <tr
                            key={contrato.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            {/* Moto Column (Left) */}
                            <td className="p-1 sm:p-1.5 font-bold border-r border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangeDayTarget(contrato)
                                    setNewDay(diaPgto)
                                    setChangeDayModalOpen(true)
                                  }}
                                  className="text-left font-bold text-blue-700 dark:text-blue-300 hover:underline truncate text-[11px] flex items-center gap-0.5 group"
                                  title="Clique para ajustar o dia da semana desta moto"
                                >
                                  <span className="truncate">{moto.nome || moto.modelo}</span>
                                  <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-60 flex-shrink-0" />
                                </button>
                                <span className="font-mono text-[9px] text-muted-foreground px-1 py-0 bg-slate-100 dark:bg-slate-800 rounded flex-shrink-0">
                                  {diaPgto}
                                </span>
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate font-normal leading-tight flex items-center gap-1">
                                <span className="truncate">
                                  {contrato.locatario_nome?.trim() || '—'}
                                </span>
                                {contrato.status === 'finalizado' && (
                                  <span className="text-[8px] px-1 py-0 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold uppercase shrink-0">
                                    Encerrado
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 7 Days Columns (DOM..SAB) */}
                            {DIAS_SEMANA.map((d) => {
                              const isPayDay = diaPgto === d.key
                              if (!isPayDay) {
                                return (
                                  <td
                                    key={d.key}
                                    className="p-0.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-700 bg-slate-50/20 text-[10px]"
                                  >
                                    —
                                  </td>
                                )
                              }

                              const cellDateStr = weekDates[d.key].dateStr
                              const cellState = getCellStatus(contrato, weekInfo.code, cellDateStr)
                              const isVigenteNoDia = isContractActiveOnDate(contrato, cellDateStr)

                              // Regra 4: "A célula do dia só é exibida/actionável quando o contrato estava vigente NAQUELE dia específico".
                              // Preservação: Se já existe um recebimento 'pago' ou 'apenas_colorido' registrado para este contrato,
                              // exibimos como pago (histórico). Se não estava vigente e não foi pago, a célula fica desativada (traço).
                              if (!isVigenteNoDia && cellState.status !== 'pago') {
                                return (
                                  <td
                                    key={d.key}
                                    className="p-0.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 bg-slate-100/40 dark:bg-slate-900/40 text-[10px]"
                                    title={`Contrato ${contrato.status === 'finalizado' ? 'encerrado' : 'não vigente'} em ${formatDateDisplay(cellDateStr)}`}
                                  >
                                    —
                                  </td>
                                )
                              }

                              // Cores compactas e legíveis
                              let cellClasses =
                                'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:border-blue-400'
                              let titleText = 'Pendente (Clique para registrar pagamento)'

                              if (cellState.status === 'pago') {
                                cellClasses =
                                  'bg-emerald-500 hover:bg-emerald-600 text-white font-black border border-emerald-600 shadow-sm'
                                titleText = 'Pago! (Clique para estornar se necessário)'
                              } else if (cellState.status === 'atraso') {
                                cellClasses =
                                  'bg-rose-500 hover:bg-rose-600 text-white font-black border border-rose-600 shadow-sm animate-pulse'
                                titleText = 'Em atraso! (Clique para registrar recebimento)'
                              }

                              return (
                                <td
                                  key={d.key}
                                  className="p-0.5 text-center border-r border-slate-200 dark:border-slate-700"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCellClick(
                                        contrato,
                                        moto as Moto,
                                        d.key,
                                        weekInfo.code,
                                        cellDateStr,
                                        valorSemanal,
                                      )
                                    }
                                    title={titleText}
                                    className={`w-full py-1 px-0.5 rounded text-[11px] transition-all flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 leading-none ${cellClasses}`}
                                  >
                                    <span className="font-extrabold text-[11px] sm:text-xs leading-none">
                                      {valorSemanal.toFixed(0)}
                                    </span>
                                    <span className="text-[8px] opacity-90 leading-tight tracking-tighter">
                                      {cellState.status === 'pago'
                                        ? 'PAGO'
                                        : cellState.status === 'atraso'
                                          ? 'ATRASO'
                                          : 'PEND'}
                                    </span>
                                  </button>
                                </td>
                              )
                            })}

                            {/* Total Weekly Contract Value */}
                            <td className="p-1 sm:p-1.5 text-right font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/20 font-mono text-[11px]">
                              {valorSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>

                  {/* FOOTER: TOTALS BRUTO & LÍQUIDO */}
                  <tfoot>
                    {/* First Line: Valor Bruto a Receber por Dia */}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                      <td className="p-1 sm:p-1.5 text-left border-r border-slate-300 dark:border-slate-600 font-extrabold text-[10px] sm:text-[11px] truncate">
                        TOTAL (BRUTO)
                      </td>
                      {DIAS_SEMANA.map((d) => (
                        <td
                          key={d.key}
                          className="p-0.5 sm:p-1 text-center border-r border-slate-300 dark:border-slate-600 font-extrabold text-[10px] sm:text-[11px] text-slate-900 dark:text-white font-mono"
                        >
                          {dailyTotals[d.key] > 0
                            ? dailyTotals[d.key].toLocaleString('pt-BR', {
                                minimumFractionDigits: 0,
                              })
                            : '—'}
                        </td>
                      ))}
                      <td className="p-1 sm:p-1.5 text-right font-black text-[11px] sm:text-xs text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-700/60">
                        R$ {totalBrutoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>

                    {/* Second Line: Valor Líquido (70% ou configurado) */}
                    <tr className="bg-blue-50/70 dark:bg-blue-950/40 font-bold border-t border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
                      <td className="p-1 sm:p-1.5 text-left border-r border-blue-200 dark:border-blue-800 font-extrabold text-[10px] sm:text-[11px] truncate flex items-center justify-between">
                        <span className="truncate">LÍQUIDO ({percentualLiquido}%)</span>
                        <TrendingUp className="w-2.5 h-2.5 text-blue-600 flex-shrink-0 ml-0.5" />
                      </td>
                      {DIAS_SEMANA.map((d) => {
                        const liqVal = dailyTotals[d.key] * (percentualLiquido / 100)
                        return (
                          <td
                            key={d.key}
                            className="p-0.5 sm:p-1 text-center border-r border-blue-200 dark:border-blue-800 font-extrabold text-[9px] sm:text-[10px] font-mono"
                          >
                            {liqVal > 0
                              ? liqVal.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : '—'}
                          </td>
                        )
                      })}
                      <td className="p-1 sm:p-1.5 text-right font-black text-[11px] sm:text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/60">
                        R${' '}
                        {totalLiquidoSemana.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Modal: Confirm Payment ou Apenas Colorir */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          {(() => {
            const motoColor = cellTarget ? getMotoColorStyle(cellTarget.moto.cor) : null
            const comissaoPercent =
              cellTarget?.contrato.comissao_percentual ??
              cellTarget?.contrato.percentual_comissao ??
              0
            const valorSemanal = cellTarget?.valor ?? 0
            const valorComissao = comissaoPercent > 0 ? (valorSemanal * comissaoPercent) / 100 : 0

            return (
              <>
                {/* 1) CABEÇALHO COM A MOTO (nome/ícone na cor, descrição) */}
                <DialogHeader className="space-y-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        motoColor ? `${motoColor.bgSoft} ${motoColor.borderSoft}` : 'bg-slate-100'
                      }`}
                    >
                      <Bike
                        className="w-5 h-5"
                        style={{ color: motoColor?.color || '#2563eb' }}
                        strokeWidth={2.4}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {cellTarget?.moto.nome || cellTarget?.moto.modelo || 'Moto'}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground truncate">
                        {cellTarget?.moto.modelo}
                        {cellTarget?.moto.placa ? ` • Placa ${cellTarget.moto.placa}` : ''}
                        {cellTarget?.moto.cor ? ` • Cor ${cellTarget.moto.cor}` : ''}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3 pt-2 text-xs">
                  {/* 2) LOGO ABAIXO, A PERGUNTA 1 COM SEU BOTÃO */}
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
                          1) APENAS COLORIR?
                        </span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                          Pinta a célula de verde como paga, <strong>SEM</strong> lançar nada no
                          Fluxo de Caixa (sem receita nem comissão).
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleApenasColorir}
                        disabled={submittingAction}
                        className="h-8 text-xs font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 shrink-0"
                      >
                        Colorir
                      </Button>
                    </div>
                  </div>

                  {/* 3) A PERGUNTA 2 COM SEU BOTÃO */}
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs block">
                          2) Colorir e Lançar pagamento?
                        </span>
                        <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 block mt-0.5 leading-snug">
                          Colore a célula de verde <strong>E LANÇA</strong> a receita no Fluxo de
                          Caixa mais a comissão automática do contrato.
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleColorirELancarPagamento}
                        disabled={submittingAction}
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        Colorir e Lançar
                      </Button>
                    </div>

                    {/* Forma de Pagamento (usada ao Lançar) */}
                    <div className="pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                      <Label className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                        Forma de Pagamento (ao lançar no Caixa):
                      </Label>
                      <Select
                        value={formaPagamento}
                        onValueChange={(val: any) => setFormaPagamento(val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX (Instantâneo)</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                          <SelectItem value="cartao">Cartão de Débito / Crédito</SelectItem>
                          <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 4) ABAIXO DA PERGUNTA 2, BLOCO COM OS DADOS DE PAGAMENTO DA CÉLULA */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Dados de Pagamento da Célula
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {cellTarget?.weekCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Data / Dia:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {cellTarget?.dia} •{' '}
                          {cellTarget?.dateStr ? formatDateDisplay(cellTarget.dateStr) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Locatário:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                          {cellTarget?.contrato.locatario_nome?.trim() || 'Sem locatário'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Valor Semanal do Contrato:
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          R$ {valorSemanal.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Comissão do Contrato:
                        </span>
                        {comissaoPercent > 0 ? (
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {comissaoPercent}%{' '}
                            <span className="text-muted-foreground font-normal">
                              (R$ {valorComissao.toFixed(2)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Sem comissão</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPaymentModalOpen(false)
                      setCellTarget(null)
                    }}
                    disabled={submittingAction}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal: Adjust Payment Day */}
      <Dialog open={changeDayModalOpen} onOpenChange={setChangeDayModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Dia de Pagamento</DialogTitle>
            <DialogDescription>
              Mude o dia da semana em que este cliente realiza os pagamentos semanais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              Locatário:{' '}
              <strong>{changeDayTarget?.locatario_nome?.trim() || 'Sem locatário'}</strong>
            </div>

            <div className="space-y-2">
              <Label>Novo Dia da Semana de Pagamento</Label>
              <Select value={newDay} onValueChange={(val: DiaSemana) => setNewDay(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.short} — {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A partir de agora, o valor semanal desta moto aparecerá na coluna selecionada na
              grade.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeDayModalOpen(false)}
              disabled={savingDay}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNewDay}
              disabled={savingDay}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingDay ? 'Salvando...' : 'Salvar Novo Dia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
