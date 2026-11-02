/**
 * Utilitários para tratamento e formatação segura de datas sem deslocamento de fuso horário.
 *
 * Evita o bug típico onde 'YYYY-MM-DD' ou 'YYYY-MM-DD 00:00:00.000Z' é interpretado
 * como meia-noite UTC, que em fusos horários do Brasil (UTC-3) resulta no dia anterior (21:00 do dia anterior).
 */

/**
 * Retorna a data atual local no formato YYYY-MM-DD (sem passar por UTC midnight)
 */
export function getTodayLocalDate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normaliza um valor de data para o formato de input HTML (YYYY-MM-DD)
 */
export function normalizeDateInput(val?: string | null): string {
  if (!val) return getTodayLocalDate()
  const match = val.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : getTodayLocalDate()
}

/**
 * Converte uma data em string (YYYY-MM-DD) para persistência segura no PocketBase (horário fixo 12:00:00.000Z).
 * Dessa forma, em qualquer fuso horário brasileiro (UTC-2 a UTC-5) ou internacional, a data permanece no mesmo dia
 * e nunca sofre retrocesso de 1 dia na gravação ou leitura.
 */
export function dateToApiMidday(dateStr?: string | null): string {
  if (!dateStr) return `${getTodayLocalDate()} 12:00:00.000Z`
  const clean = dateStr.split('T')[0].split(' ')[0].trim()
  if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${getTodayLocalDate()} 12:00:00.000Z`
  }
  return `${clean} 12:00:00.000Z`
}

/**
 * Converte qualquer valor de data (string ISO, Date, YYYY-MM-DD, timestamp) em string segura YYYY-MM-DD local
 */
export function toLocalDateString(val?: string | Date | null): string {
  if (!val) return getTodayLocalDate()
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return getTodayLocalDate()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata com segurança uma string de data para exibição no padrão brasileiro DD/MM/YYYY.
 * Não converte meia-noite UTC para fuso local, garantindo que "2026-11-20" ou "2026-11-20 00:00:00.000Z"
 * seja sempre exibido como "20/11/2026".
 */
export function formatDateDisplay(dateVal?: string | Date | null): string {
  if (!dateVal) return '-'
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return `${d}/${m}/${y}`
    }
  }
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export interface YearMonthDay {
  year: number
  month: number // 1-12
  day: number // 1-31
}

/**
 * Extrai ano, mês e dia com segurança sem sofrer deslocamento de fuso horário UTC.
 */
export function parseYearMonthDay(val?: string | Date | null): YearMonthDay | null {
  if (!val) return null
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      }
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      }
    }
    return null
  }
  if (!isNaN(val.getTime())) {
    return {
      year: val.getFullYear(),
      month: val.getMonth() + 1,
      day: val.getDate(),
    }
  }
  return null
}

/**
 * Calcula a quantidade de MESES COMPLETOS decorridos entre a data inicial e a data final.
 * Regra:
 * Cada mês só completa quando atinge ou supera a mesma data-do-mês (dia).
 * Se a data de fim for anterior à data de início, retorna 0.
 *
 * Exemplos:
 * - 29/12/2025 até 02/11/2026 -> 10 meses completos
 * - 15/01/2026 até 14/02/2026 -> 0 meses completos
 * - 15/01/2026 até 15/02/2026 -> 1 mês completo
 * - 15/01/2026 até 14/03/2026 -> 1 mês completo
 * - 15/01/2026 até 15/03/2026 -> 2 meses completos
 * - 31/01/2026 até 28/02/2026 (fevereiro não tem dia 31, fim de mês atinge 28) -> 1 mês completo
 */
export function calcularMesesCompletos(
  inicioVal?: string | Date | null,
  fimVal?: string | Date | null,
): number {
  const inicio = parseYearMonthDay(inicioVal)
  const fim = parseYearMonthDay(fimVal)

  if (!inicio || !fim) return 0

  // Se fim < inicio, retorna 0
  if (
    fim.year < inicio.year ||
    (fim.year === inicio.year && fim.month < inicio.month) ||
    (fim.year === inicio.year && fim.month === inicio.month && fim.day < inicio.day)
  ) {
    return 0
  }

  // Diferença bruta de meses do calendário
  let meses = (fim.year - inicio.year) * 12 + (fim.month - inicio.month)

  // Verifica se no mês final o dia já foi atingido
  // Caso de fim de mês: se o dia inicial era 31 e o mês final só tem 28/29/30 dias,
  // estar no último dia do mês final também completa o mês.
  const ultimoDiaMesFim = new Date(fim.year, fim.month, 0).getDate()
  const diaNecessario = Math.min(inicio.day, ultimoDiaMesFim)

  if (fim.day < diaNecessario) {
    meses -= 1
  }

  return Math.max(0, meses)
}
