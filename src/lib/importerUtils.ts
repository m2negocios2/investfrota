/**
 * Utilitários e analisadores para importação de planilhas Excel (.xlsx)
 * CONTROLE Motos e CONTROLE INFRAÇÕES.
 *
 * REGRA ABSOLUTA: Nenhum dado de linha estático. O parser roda 100% em runtime no cliente.
 */

import * as XLSX from 'xlsx'
import { toLocalDateString } from '@/lib/dateUtils'
import { Moto, Contrato, Infracao, CaixaLancamento, CategoriaGasto } from '@/types/database'

export interface ParsedMotoItem {
  key: string
  sheetName: string
  nome: string
  placa: string
  modelo: string
  ano: number
  cor: string
  data_compra?: string
  valor_compra?: number
  km_atual?: number
  valor_semanal?: number
  status: 'NOVO' | 'JÁ EXISTE — será atualizado apenas campos vazios'
  existingId?: string
}

export interface ParsedContratoItem {
  key: string
  sheetName: string
  motoIdentificador: string
  locatario_nome: string
  tipo: 'normal' | 'plano_conquista'
  valor_semanal: number
  valor_diario: number
  data_inicio?: string
  prazo_meses?: number
  data_entrega?: string
  dia_pagamento_semana?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  status: 'NOVO' | 'JÁ EXISTE — será pulado'
  existingId?: string
}

export interface ParsedCaixaItem {
  key: string
  sheetName: string
  motoIdentificador: string
  tipo: 'entrada' | 'saida'
  descricao: string
  categoria: string
  valor: number
  data: string
  observacoes?: string
  status: 'NOVO' | 'JÁ EXISTE — será pulado'
}

export interface ParsedInfracaoItem {
  key: string
  sheetName: string
  motoIdentificador: string // ex: placa ou sufixo
  numero?: number
  data?: string
  codigo_multa?: string
  valor: number
  cliente?: string
  status_pagamento: 'pendente' | 'paga'
  data_pagamento?: string
  deu_entrada_detran?: boolean
  prazo?: string
  observacao?: string
  status: 'NOVO' | 'JÁ EXISTE — será pulado'
  existingId?: string
}

export interface MotosPreviewResult {
  motos: ParsedMotoItem[]
  contratos: ParsedContratoItem[]
  caixaLancamentos: ParsedCaixaItem[]
  avisos: string[]
  stats: {
    totalMotosNovas: number
    totalMotosExistentes: number
    totalContratosNovos: number
    totalContratosPulados: number
    totalCaixaNovos: number
    totalCaixaPulados: number
  }
}

export interface InfracoesPreviewResult {
  infracoes: ParsedInfracaoItem[]
  avisos: string[]
  stats: {
    totalNovas: number
    totalPuladas: number
    totalPagas: number
    totalPendentes: number
  }
}

/**
 * Normaliza placa veicular removendo espaços, traços e convertendo em maiúsculas
 * Ex: "TOV9 F81" -> "TOV9F81", "rqd-1g78" -> "RQD1G78"
 */
export function normalizePlaca(raw?: string | null): string {
  if (!raw) return ''
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').trim()
}

/**
 * Normaliza nome/apelido da moto para comparação
 * Remove prefixos comuns como "ver ", "Sheet ", trim e maiúsculas
 */
export function normalizeMotoName(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  s = s.replace(/^Sheet\s+/i, '')
  s = s.replace(/^ver\s+/i, '')
  s = s.trim().toUpperCase()
  return s
}

/**
 * Converte valor de célula Excel para número float seguro
 */
export function parseExcelNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val
  }
  let str = String(val).trim()
  // Trata formato brasileiro R$ 1.250,50
  str = str.replace(/[R$\s]/g, '')
  if (str.includes(',') && str.includes('.')) {
    // Ex: 1.250,50 -> 1250.50
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    // Ex: 1250,50 -> 1250.50
    str = str.replace(',', '.')
  }
  const parsed = parseFloat(str)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Converte data de célula Excel (serial numérico ou string ou Date) em YYYY-MM-DD local seguro
 */
export function parseExcelDate(val: unknown): string | undefined {
  if (val === null || val === undefined || val === '') return undefined

  // Se já for Date do JS
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined
    return toLocalDateString(val)
  }

  // Se for número serial do Excel (ex: 45000)
  if (typeof val === 'number') {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(val)
      if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
        const y = String(parsedDate.y).padStart(4, '0')
        const m = String(parsedDate.m).padStart(2, '0')
        const d = String(parsedDate.d).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
    } catch {
      // Fallback para conversão padrão
    }
  }

  // Se for string
  const str = String(val).trim()
  if (!str) return undefined

  // Verifica padrão ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  // Verifica padrão brasileiro DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0')
    const m = brMatch[2].padStart(2, '0')
    let y = brMatch[3]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m}-${d}`
  }

  // Tenta Date parse
  const dt = new Date(str)
  if (!isNaN(dt.getTime())) {
    return toLocalDateString(dt)
  }

  return undefined
}

/**
 * Lê o arquivo Excel em buffer
 */
export async function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer()
  return XLSX.read(data, {
    type: 'array',
    cellDates: true,
  })
}

/**
 * Analisa a planilha CONTROLE Motos
 */
export function parseControleMotosWorkbook(
  workbook: XLSX.WorkBook,
  existingMotos: Moto[],
  existingContratos: Contrato[],
  existingCaixa: CaixaLancamento[],
): MotosPreviewResult {
  const avisos: string[] = []
  const motosPreview: ParsedMotoItem[] = []
  const contratosPreview: ParsedContratoItem[] = []
  const caixaPreview: ParsedCaixaItem[] = []

  // Abas que não representam motos individuais
  const ignoredSheetNames = [
    'TOTAIS',
    'PAGAS',
    'SHEET M',
    'SHEET C',
    'SHEET SEG',
    'SHEET CC',
    'SHEET PLAN',
    'SHEET INTERPJ',
    'SHEET SEMANA',
    'SHEET MES',
    'SHEET GRAF',
    'SHEET ATRAS',
    'ATRAS',
    'GRAF',
    'MES',
    'SEMANA',
  ]

  for (const sheetName of workbook.SheetNames) {
    const normSheet = sheetName.trim().toUpperCase()
    if (ignoredSheetNames.includes(normSheet)) {
      continue
    }

    const ws = workbook.Sheets[sheetName]
    if (!ws) continue

    // Converte a aba em matriz de células (linhas x colunas)
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    })

    if (!rawData || rawData.length === 0) continue

    // Extrai nome / apelido da aba
    const cleanMotoName = normalizeMotoName(sheetName)

    // Tentar localizar cabeçalho com colunas Moto / PLACA / TIPO / COMPRA / PREÇO / ANO / KM
    let headerRowIdx = -1
    let colPlacaIdx = -1
    let colTipoIdx = -1
    let colCompraIdx = -1
    let colPrecoIdx = -1
    let colAnoIdx = -1
    let colKmIdx = -1
    let colNomeIdx = -1

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r]
      if (!Array.isArray(row)) continue

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toUpperCase()
        if (val.includes('PLACA')) colPlacaIdx = c
        if (val.includes('TIPO')) colTipoIdx = c
        if (val.includes('COMPRA') || val.includes('DT COMPRA')) colCompraIdx = c
        if (val.includes('PREÇO') || val.includes('PRECO') || val.includes('VALOR')) colPrecoIdx = c
        if (val.includes('ANO')) colAnoIdx = c
        if (val.includes('KM')) colKmIdx = c
        if (val.startsWith('MOTO')) colNomeIdx = c
      }

      if (colPlacaIdx !== -1) {
        headerRowIdx = r
        break
      }
    }

    let detectedPlaca = ''
    let detectedModelo = ''
    let detectedAno = new Date().getFullYear()
    let detectedPreco = 0
    let detectedCompraDate: string | undefined = undefined
    let detectedKm = 0
    let detectedNome = cleanMotoName

    // Se encontramos cabeçalho de moto, lê a linha de dados logo abaixo
    if (headerRowIdx !== -1 && rawData.length > headerRowIdx + 1) {
      const dataRow = rawData[headerRowIdx + 1]
      if (Array.isArray(dataRow)) {
        if (colPlacaIdx !== -1 && dataRow[colPlacaIdx]) {
          detectedPlaca = normalizePlaca(String(dataRow[colPlacaIdx]))
        }
        if (colTipoIdx !== -1 && dataRow[colTipoIdx]) {
          detectedModelo = String(dataRow[colTipoIdx]).trim()
        }
        if (colPrecoIdx !== -1 && dataRow[colPrecoIdx]) {
          detectedPreco = parseExcelNumber(dataRow[colPrecoIdx])
        }
        if (colAnoIdx !== -1 && dataRow[colAnoIdx]) {
          const anoNum = parseInt(String(dataRow[colAnoIdx]), 10)
          if (!isNaN(anoNum) && anoNum > 1990 && anoNum < 2050) {
            detectedAno = anoNum
          }
        }
        if (colKmIdx !== -1 && dataRow[colKmIdx]) {
          detectedKm = parseExcelNumber(dataRow[colKmIdx])
        }
        if (colCompraIdx !== -1 && dataRow[colCompraIdx]) {
          detectedCompraDate = parseExcelDate(dataRow[colCompraIdx])
        }
        if (colNomeIdx !== -1 && dataRow[colNomeIdx]) {
          const possibleName = String(dataRow[colNomeIdx]).trim()
          if (possibleName && !possibleName.toUpperCase().startsWith('CLIENTE') && !possibleName.toUpperCase().startsWith('MOTO')) {
            detectedNome = possibleName
          }
        }
      }
    }

    // Se a placa não foi achada na linha de dados, buscar em qualquer linha inicial
    if (!detectedPlaca) {
      for (let r = 0; r < Math.min(10, rawData.length); r++) {
        const row = rawData[r]
        if (!Array.isArray(row)) continue
        for (let c = 0; c < row.length; c++) {
          const cellStr = normalizePlaca(String(row[c] || ''))
          // Padrão placa brasileira mercosul ou antiga: 7 caracteres alfanuméricos
          if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(cellStr)) {
            detectedPlaca = cellStr
            break
          }
        }
        if (detectedPlaca) break
      }
    }

    // Identificar correspondência com moto existente no banco
    const normDetectedPlaca = normalizePlaca(detectedPlaca)
    const normDetectedNome = normalizeMotoName(detectedNome)

    const existingMoto = existingMotos.find((m) => {
      const dbPlaca = normalizePlaca(m.placa)
      const dbNome = normalizeMotoName(m.nome || m.modelo)
      if (normDetectedPlaca && dbPlaca && normDetectedPlaca === dbPlaca) return true
      if (normDetectedNome && dbNome && (normDetectedNome === dbNome || dbNome.includes(normDetectedNome) || normDetectedNome.includes(dbNome))) {
        return true
      }
      return false
    })

    const motoKey = existingMoto?.id || `new-moto-${sheetName}`
    const finalNome = detectedNome || existingMoto?.nome || sheetName.trim()
    const finalPlaca = detectedPlaca || existingMoto?.placa || ''

    if (finalPlaca || finalNome) {
      motosPreview.push({
        key: `moto-${sheetName}`,
        sheetName,
        nome: finalNome,
        placa: finalPlaca,
        modelo: detectedModelo || existingMoto?.modelo || finalNome,
        ano: detectedAno || existingMoto?.ano || 2026,
        cor: existingMoto?.cor || 'PRETA',
        data_compra: detectedCompraDate || existingMoto?.data_compra,
        valor_compra: detectedPreco || existingMoto?.valor_compra,
        km_atual: detectedKm || existingMoto?.km_atual || 0,
        status: existingMoto ? 'JÁ EXISTE — será atualizado apenas campos vazios' : 'NOVO',
        existingId: existingMoto?.id,
      })
    }

    // Agora varrer as linhas para capturar:
    // 1) Contratos de clientes (linhas com "CLIENTE 1", "Semanal", valor)
    // 2) Custos recorrentes (Seguro, Óleo, Adm)
    // 3) Extrato da moto (DATA, ENTRADA, SAÍDA, GRUPO, DESCRIÇÃO)
    let inExtrato = false
    let extratoColData = -1
    let extratoColEntrada = -1
    let extratoColSaida = -1
    let extratoColGrupo = -1
    let extratoColDesc = -1

    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r]
      if (!Array.isArray(row)) continue

      const rowJoined = row.map((c) => String(c || '').trim()).join(' ')
      const rowUpper = rowJoined.toUpperCase()

      // Detecta início do extrato
      if (rowUpper.includes('DATA') && (rowUpper.includes('ENTRADA') || rowUpper.includes('SAÍDA') || rowUpper.includes('SAIDA'))) {
        inExtrato = true
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim().toUpperCase()
          if (val === 'DATA') extratoColData = c
          if (val === 'ENTRADA') extratoColEntrada = c
          if (val === 'SAÍDA' || val === 'SAIDA') extratoColSaida = c
          if (val === 'GRUPO') extratoColGrupo = c
          if (val === 'DESCRIÇÃO' || val === 'DESCRICAO' || val === 'DESC') extratoColDesc = c
        }
        continue
      }

      // Se estamos no extrato
      if (inExtrato) {
        if (extratoColData !== -1) {
          const cellData = row[extratoColData]
          const parsedData = parseExcelDate(cellData)
          const valEntrada = extratoColEntrada !== -1 ? parseExcelNumber(row[extratoColEntrada]) : 0
          const valSaida = extratoColSaida !== -1 ? parseExcelNumber(row[extratoColSaida]) : 0
          const grupo = extratoColGrupo !== -1 ? String(row[extratoColGrupo] || '').trim() : ''
          const desc = extratoColDesc !== -1 ? String(row[extratoColDesc] || '').trim() : ''

          // Ignora linhas sem data válida ou sem valor
          if (parsedData && (valEntrada > 0 || valSaida > 0)) {
            const isEntrada = valEntrada > 0
            const valorFinal = isEntrada ? valEntrada : valSaida
            const descFinal = desc || grupo || (isEntrada ? 'Recebimento' : 'Despesa')
            const catFinal = grupo || (isEntrada ? 'Aluguel' : 'Outros')

            // Verifica duplicidade no caixa existente
            const isDup = existingCaixa.some((c) => {
              if (existingMoto && c.moto !== existingMoto.id) return false
              const cDate = c.data ? c.data.split('T')[0] : ''
              const matchDate = cDate === parsedData
              const matchVal = Math.abs(Number(c.valor) - valorFinal) < 0.01
              const matchTipo = c.tipo === (isEntrada ? 'entrada' : 'saida')
              return matchDate && matchVal && matchTipo
            })

            caixaPreview.push({
              key: `caixa-${sheetName}-${r}`,
              sheetName,
              motoIdentificador: finalPlaca || finalNome,
              tipo: isEntrada ? 'entrada' : 'saida',
              descricao: descFinal,
              categoria: catFinal,
              valor: valorFinal,
              data: parsedData,
              observacoes: `Importado da aba ${sheetName} (extrato)`,
              status: isDup ? 'JÁ EXISTE — será pulado' : 'NOVO',
            })
          }
        }
      }

      // Detecta linha de Cliente / Contrato
      if (rowUpper.includes('CLIENTE') && (rowUpper.includes('SEMANAL') || rowUpper.includes('CONQUISTA') || rowUpper.includes('PLANO'))) {
        let locatario = 'Locatário'
        let valorSemanal = 0

        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c] || '').trim()
          if (/^CLIENTE\s*\d*/i.test(cellStr)) {
            locatario = cellStr
          }
          const num = parseExcelNumber(row[c])
          if (num >= 150 && num <= 1000 && valorSemanal === 0) {
            valorSemanal = num
          }
        }

        if (valorSemanal > 0) {
          const valorDiario = Math.round((valorSemanal / 7) * 100) / 100
          const isConquista = rowUpper.includes('CONQUISTA')

          // Verificar duplicidade com contrato existente
          const isDupContrato = existingContratos.some((ct) => {
            if (existingMoto && ct.moto !== existingMoto.id) return false
            return ct.status === 'ativo' && Math.abs(Number(ct.valor_semanal || 0) - valorSemanal) < 1
          })

          contratosPreview.push({
            key: `contrato-${sheetName}-${r}`,
            sheetName,
            motoIdentificador: finalPlaca || finalNome,
            locatario_nome: `${locatario} (${finalNome})`,
            tipo: isConquista ? 'plano_conquista' : 'normal',
            valor_semanal: valorSemanal,
            valor_diario: valorDiario,
            data_inicio: detectedCompraDate || toLocalDateString(new Date()),
            dia_pagamento_semana: 'SEG',
            status: isDupContrato ? 'JÁ EXISTE — será pulado' : 'NOVO',
          })
        }
      }

      // Custos recorrentes fora do extrato (ex: Seguro, Óleo, Adm)
      if (!inExtrato && (rowUpper.includes('SEGURO') || rowUpper.includes('ÓLEO') || rowUpper.includes('OLEO') || rowUpper.includes('ADM'))) {
        for (let c = 0; c < row.length; c++) {
          const itemLabel = String(row[c] || '').trim().toUpperCase()
          let itemCost = 0
          let cat = 'Outros'

          if (itemLabel.includes('SEGURO')) {
            cat = 'Seguro'
            itemCost = parseExcelNumber(row[c + 1] || row[c + 2])
          } else if (itemLabel.includes('ÓLEO') || itemLabel.includes('OLEO')) {
            cat = 'Manutenção'
            itemCost = parseExcelNumber(row[c + 1] || row[c + 2])
          } else if (itemLabel.includes('ADM')) {
            cat = 'Outros'
            itemCost = parseExcelNumber(row[c + 1] || row[c + 2])
          }

          if (itemCost > 0) {
            const dataBase = detectedCompraDate || toLocalDateString(new Date())
            const desc = `Custo ${cat} (${finalNome})`

            const isDup = existingCaixa.some((cx) => {
              if (existingMoto && cx.moto !== existingMoto.id) return false
              return cx.tipo === 'saida' && Math.abs(Number(cx.valor) - itemCost) < 0.01 && cx.categoria === cat
            })

            caixaPreview.push({
              key: `custo-${sheetName}-${r}-${c}`,
              sheetName,
              motoIdentificador: finalPlaca || finalNome,
              tipo: 'saida',
              descricao: desc,
              categoria: cat,
              valor: itemCost,
              data: dataBase,
              observacoes: `Custo fixo inicial da aba ${sheetName}`,
              status: isDup ? 'JÁ EXISTE — será pulado' : 'NOVO',
            })
            break
          }
        }
      }
    }
  }

  const totalMotosNovas = motosPreview.filter((m) => m.status === 'NOVO').length
  const totalMotosExistentes = motosPreview.filter((m) => m.status.startsWith('JÁ EXISTE')).length
  const totalContratosNovos = contratosPreview.filter((c) => c.status === 'NOVO').length
  const totalContratosPulados = contratosPreview.filter((c) => c.status !== 'NOVO').length
  const totalCaixaNovos = caixaPreview.filter((c) => c.status === 'NOVO').length
  const totalCaixaPulados = caixaPreview.filter((c) => c.status !== 'NOVO').length

  return {
    motos: motosPreview,
    contratos: contratosPreview,
    caixaLancamentos: caixaPreview,
    avisos,
    stats: {
      totalMotosNovas,
      totalMotosExistentes,
      totalContratosNovos,
      totalContratosPulados,
      totalCaixaNovos,
      totalCaixaPulados,
    },
  }
}

/**
 * Analisa a planilha CONTROLE INFRAÇÕES
 */
export function parseControleInfracoesWorkbook(
  workbook: XLSX.WorkBook,
  existingMotos: Moto[],
  existingInfracoes: Infracao[],
): InfracoesPreviewResult {
  const avisos: string[] = []
  const infracoesPreview: ParsedInfracaoItem[] = []

  // Mapa da aba TOTAIS: placa -> identificador de moto
  const placaToMotoMap: Record<string, string> = {}
  const wsTotais = workbook.Sheets['TOTAIS'] || workbook.Sheets['totais']
  if (wsTotais) {
    const rawTotais = XLSX.utils.sheet_to_json<unknown[]>(wsTotais, { header: 1, defval: '' })
    for (const row of rawTotais) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        const p = normalizePlaca(String(cell || ''))
        if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)) {
          placaToMotoMap[p] = p
        }
      }
    }
  }

  // Mapa da aba PAGAS: placa/sufixo -> booleano ou valor
  const pagasMap = new Set<string>()
  const wsPagas = workbook.Sheets['PAGAS'] || workbook.Sheets['pagas']
  if (wsPagas) {
    const rawPagas = XLSX.utils.sheet_to_json<unknown[]>(wsPagas, { header: 1, defval: '' })
    for (const row of rawPagas) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        const val = normalizeMotoName(String(cell || ''))
        if (val) pagasMap.add(val)
      }
    }
  }

  for (const sheetName of workbook.SheetNames) {
    const normSheet = sheetName.trim().toUpperCase()
    if (normSheet === 'TOTAIS' || normSheet === 'PAGAS') {
      continue
    }

    const ws = workbook.Sheets[sheetName]
    if (!ws) continue

    const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    })
    if (!rawData || rawData.length === 0) continue

    const cleanSheet = normalizeMotoName(sheetName)

    // Achar a moto correspondente no sistema
    const matchedMoto = existingMotos.find((m) => {
      const dbNome = normalizeMotoName(m.nome || m.modelo)
      const dbPlaca = normalizePlaca(m.placa)
      if (dbPlaca.endsWith(cleanSheet) || dbPlaca === cleanSheet) return true
      if (dbNome === cleanSheet || dbNome.includes(cleanSheet) || cleanSheet.includes(dbNome)) return true
      return false
    })

    const motoLabel = matchedMoto?.placa || matchedMoto?.nome || cleanSheet

    // Achar linha de cabeçalho das multas (NUM, DATA, MULTA, VALOR, CLIENTE, PAGAMENTO)
    let headerRowIdx = -1
    let colNum = -1
    let colData = -1
    let colMulta = -1
    let colValor = -1
    let colCliente = -1
    let colPagamento = -1
    let colDetran = -1
    let colPrazo = -1

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r]
      if (!Array.isArray(row)) continue

      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] || '').trim().toUpperCase()
        if (cellText === 'NUM' || cellText.startsWith('NUM')) colNum = c
        if (cellText === 'DATA' || cellText.includes('DATA')) colData = c
        if (cellText === 'MULTA' || cellText.includes('MULTA')) colMulta = c
        if (cellText === 'VALOR' || cellText.includes('VALOR')) colValor = c
        if (cellText === 'CLIENTE' || cellText.includes('CLIENTE')) colCliente = c
        if (cellText === 'PAGAMENTO' || cellText.includes('PAG /') || cellText.includes('PAG')) colPagamento = c
        if (cellText.includes('DETRAN')) colDetran = c
        if (cellText.includes('PRAZO')) colPrazo = c
      }

      if (colValor !== -1 || colMulta !== -1) {
        headerRowIdx = r
        break
      }
    }

    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1

    for (let r = startRow; r < rawData.length; r++) {
      const row = rawData[r]
      if (!Array.isArray(row)) continue

      const numVal = colNum !== -1 ? parseInt(String(row[colNum]), 10) : undefined
      const dataVal = colData !== -1 ? parseExcelDate(row[colData]) : undefined
      const codigoMulta = colMulta !== -1 ? String(row[colMulta] || '').trim() : ''
      const valor = colValor !== -1 ? parseExcelNumber(row[colValor]) : 0
      const cliente = colCliente !== -1 ? String(row[colCliente] || '').trim() : ''
      const pagamentoStr = colPagamento !== -1 ? String(row[colPagamento] || '').trim() : ''
      const detranStr = colDetran !== -1 ? String(row[colDetran] || '').trim() : ''
      const prazoStr = colPrazo !== -1 ? String(row[colPrazo] || '').trim() : ''

      // Se linha não tem nem valor nem código nem data, ignorar
      if (!valor && !codigoMulta && !dataVal) continue

      // Se for linha de totalizadores (ex: soma final sem data nem código)
      if (!codigoMulta && !dataVal && !cliente && valor > 0) {
        continue
      }

      // Verificar status de pagamento:
      // se aba PAGAS contém o nome da aba, ou campo pagamento tem texto de quitação
      const isPagaNaAba = pagasMap.has(cleanSheet)
      const isPagaTexto =
        pagamentoStr.toUpperCase().includes('OK') ||
        pagamentoStr.toUpperCase().includes('PAGO') ||
        pagamentoStr.toUpperCase().includes('SIM')
      const statusPag: 'pendente' | 'paga' = isPagaTexto ? 'paga' : 'pendente'

      const deuEntrada =
        detranStr.toUpperCase().includes('SIM') ||
        detranStr.toUpperCase().includes('OK') ||
        detranStr.toUpperCase().includes('ENTRADA')

      // Verificar duplicidade com infrações existentes
      const isDup = existingInfracoes.some((inf) => {
        if (matchedMoto && inf.moto !== matchedMoto.id) return false
        if (codigoMulta && inf.codigo_multa && codigoMulta.toUpperCase() === inf.codigo_multa.toUpperCase()) {
          return true
        }
        const infData = inf.data ? inf.data.split('T')[0] : ''
        const matchData = dataVal && infData === dataVal
        const matchValor = Math.abs(Number(inf.valor || 0) - valor) < 0.01
        return matchData && matchValor
      })

      infracoesPreview.push({
        key: `inf-${sheetName}-${r}`,
        sheetName,
        motoIdentificador: motoLabel,
        numero: !isNaN(numVal as number) ? numVal : undefined,
        data: dataVal,
        codigo_multa: codigoMulta || undefined,
        valor,
        cliente: cliente || undefined,
        status_pagamento: statusPag,
        deu_entrada_detran: deuEntrada,
        prazo: prazoStr ? parseExcelDate(prazoStr) : undefined,
        observacao: pagamentoStr || prazoStr ? `Pagamento/Obs: ${pagamentoStr || prazoStr}` : undefined,
        status: isDup ? 'JÁ EXISTE — será pulado' : 'NOVO',
      })
    }
  }

  const totalNovas = infracoesPreview.filter((i) => i.status === 'NOVO').length
  const totalPuladas = infracoesPreview.filter((i) => i.status !== 'NOVO').length
  const totalPagas = infracoesPreview.filter((i) => i.status_pagamento === 'paga').length
  const totalPendentes = infracoesPreview.filter((i) => i.status_pagamento === 'pendente').length

  return {
    infracoes: infracoesPreview,
    avisos,
    stats: {
      totalNovas,
      totalPuladas,
      totalPagas,
      totalPendentes,
    },
  }
}
