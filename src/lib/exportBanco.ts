import pb from '@/lib/pocketbase/client'

// Exportação de leitura pura do banco: nenhuma função aqui cria, altera ou apaga registros.

export interface CampoEstrutura {
  nome: string
  tipo: string
  obrigatorio: boolean
  opcoes?: string[]
  relacao?: string
}

export interface ColecaoEstrutura {
  nome: string
  tipo: string
  campos: CampoEstrutura[]
}

export interface ColecaoPulada {
  colecao: string
  motivo: string
}

export interface ResultadoExportacao {
  arquivo: string
  totalRegistros: number
  totalColecoes: number
  puladas: ColecaoPulada[]
}

interface FieldRaw {
  name: string
  type: string
  required?: boolean
  system?: boolean
  values?: string[]
  selectValues?: string[]
  collectionId?: string
  collectionRef?: string
}

interface CollectionRaw {
  id?: string
  name: string
  type: string
  fields?: FieldRaw[]
}

interface MirrorSchema {
  collections: CollectionRaw[]
}

// Espelho do schema do projeto, usado só se a lista de coleções não puder ser lida ao vivo.
const espelhoModules = import.meta.glob('./pocketbase/schema.json', {
  eager: true,
  import: 'default',
}) as Record<string, MirrorSchema>

const CAMPOS_OCULTOS = ['password', 'tokenKey']

function motivoErro(err: unknown): string {
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return 'sem permissão para ler esta coleção'
  const message = (err as { message?: string })?.message
  return message ? `erro: ${message}` : 'erro desconhecido'
}

function normalizarColecoes(raws: CollectionRaw[]): ColecaoEstrutura[] {
  const nomePorId: Record<string, string> = {}
  raws.forEach((c) => {
    if (c.id) nomePorId[c.id] = c.name
  })

  return raws.map((c) => ({
    nome: c.name,
    tipo: c.type,
    campos: (c.fields ?? [])
      .filter((f) => !CAMPOS_OCULTOS.includes(f.name))
      .map((f) => {
        const campo: CampoEstrutura = {
          nome: f.name,
          tipo: f.type,
          obrigatorio: !!f.required,
        }
        const opcoes = f.values ?? f.selectValues
        if (opcoes && opcoes.length > 0) campo.opcoes = opcoes
        if (f.type === 'relation') {
          const alvo = f.collectionRef ?? (f.collectionId ? nomePorId[f.collectionId] : undefined)
          if (alvo) campo.relacao = alvo
        }
        return campo
      }),
  }))
}

/** Lê a estrutura ao vivo; se o usuário não puder listar coleções, usa o espelho do projeto. */
async function carregarEstrutura(): Promise<{
  colecoes: ColecaoEstrutura[]
  fonte: 'banco' | 'espelho'
}> {
  try {
    const raws = await pb.collections.getFullList<CollectionRaw>({ batch: 200 })
    return { colecoes: normalizarColecoes(raws), fonte: 'banco' }
  } catch {
    const espelho = Object.values(espelhoModules)[0]
    return { colecoes: normalizarColecoes(espelho?.collections ?? []), fonte: 'espelho' }
  }
}

/** Nomes das coleções disponíveis para exportação em CSV. */
export async function listarNomesColecoes(): Promise<string[]> {
  const { colecoes } = await carregarEstrutura()
  return colecoes.map((c) => c.nome)
}

function dataLocalAAAAMMDD(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function baixarArquivo(conteudo: BlobPart, nomeArquivo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Busca todos os registros de uma coleção (getFullList pagina em lotes até esgotar). */
async function buscarTodos(nome: string): Promise<Record<string, unknown>[]> {
  return await pb.collection(nome).getFullList<Record<string, unknown>>({ batch: 500 })
}

/** Gera o backup JSON completo (estrutura + dados) e dispara o download. */
export async function exportarBancoJson(
  onProgresso?: (colecaoAtual: string, indice: number, total: number) => void,
): Promise<ResultadoExportacao> {
  const { colecoes, fonte } = await carregarEstrutura()
  const dados: Record<string, Record<string, unknown>[]> = {}
  const puladas: ColecaoPulada[] = []
  let totalRegistros = 0

  for (let i = 0; i < colecoes.length; i++) {
    const colecao = colecoes[i]
    onProgresso?.(colecao.nome, i + 1, colecoes.length)
    try {
      const registros = await buscarTodos(colecao.nome)
      dados[colecao.nome] = registros
      totalRegistros += registros.length
    } catch (err) {
      puladas.push({ colecao: colecao.nome, motivo: motivoErro(err) })
    }
  }

  const exportadoEm = new Date().toISOString()
  const arquivo = `invest-frota-backup-${dataLocalAAAAMMDD()}.json`
  const conteudo = {
    exportadoEm,
    estrutura: {
      fonte,
      colecoes,
    },
    dados,
    totalRegistros,
    colecoesPuladas: puladas,
  }

  baixarArquivo(JSON.stringify(conteudo, null, 2), arquivo, 'application/json;charset=utf-8')

  return { arquivo, totalRegistros, totalColecoes: Object.keys(dados).length, puladas }
}

function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Baixa uma coleção como CSV (separador ";", BOM UTF-8 para o Excel brasileiro). */
export async function exportarColecaoCsv(nome: string): Promise<number> {
  const registros = await buscarTodos(nome)

  const colunas: string[] = []
  const vistas = new Set<string>()
  registros.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (!vistas.has(k)) {
        vistas.add(k)
        colunas.push(k)
      }
    })
  })

  const linhas = [colunas.map(celulaCsv).join(';')]
  registros.forEach((r) => {
    linhas.push(colunas.map((c) => celulaCsv(r[c])).join(';'))
  })

  const conteudo = '\uFEFF' + linhas.join('\r\n')
  baixarArquivo(
    conteudo,
    `invest-frota-${nome}-${dataLocalAAAAMMDD()}.csv`,
    'text/csv;charset=utf-8',
  )
  return registros.length
}
