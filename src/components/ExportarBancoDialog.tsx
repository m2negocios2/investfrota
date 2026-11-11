import React, { useState } from 'react'
import { AlertTriangle, Database, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  exportarBancoJson,
  exportarColecaoCsv,
  listarNomesColecoes,
  type ResultadoExportacao,
} from '@/lib/exportBanco'

export function ExportarBancoDialog() {
  const [open, setOpen] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [mensagem, setMensagem] = useState('Gerando arquivo...')
  const [colecoes, setColecoes] = useState<string[]>([])
  const [csvAtual, setCsvAtual] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoExportacao | null>(null)

  const handleOpenChange = async (value: boolean) => {
    setOpen(value)
    if (value && colecoes.length === 0) {
      try {
        setColecoes(await listarNomesColecoes())
      } catch (err) {
        console.error('Erro ao listar coleções:', err)
        toast.error('Não foi possível listar as coleções')
      }
    }
  }

  const handleExportarJson = async () => {
    if (exportando) return
    setExportando(true)
    setMensagem('Gerando arquivo...')
    try {
      const res = await exportarBancoJson((nome, indice, total) => {
        setMensagem(`Buscando registros... (${indice}/${total}: ${nome})`)
      })
      setResultado(res)

      if (res.puladas.length > 0) {
        // Falhas ficam visíveis no diálogo (painel de resumo), não apenas neste aviso.
        toast.warning(
          `ATENÇÃO: ${res.puladas.length} coleção(ões) ficaram SEM registros no backup: ${res.puladas
            .map((p) => p.colecao)
            .join(', ')}. Veja o resumo na janela de exportação.`,
        )
      } else if (res.totalRegistros === 0) {
        toast.error(
          'O arquivo foi gerado SEM nenhum registro — a sessão provavelmente expirou. Faça login novamente e tente de novo.',
        )
      } else {
        toast.success(
          `Backup exportado: ${res.totalRegistros} registros em ${res.totalColecoes} coleções.`,
        )
      }
    } catch (err) {
      console.error('Erro ao exportar banco:', err)
      const msg = (err as { message?: string })?.message
      toast.error(
        msg ? `Erro ao exportar o banco de dados: ${msg}` : 'Erro ao exportar o banco de dados',
      )
    } finally {
      setExportando(false)
    }
  }

  const handleExportarCsv = async (nome: string) => {
    if (csvAtual || exportando) return
    setCsvAtual(nome)
    try {
      const total = await exportarColecaoCsv(nome)
      toast.success(`CSV de "${nome}" exportado: ${total} registros.`)
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
      toast.error(`Erro ao exportar a coleção "${nome}"`)
    } finally {
      setCsvAtual(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Database className="w-4 h-4" />
          Exportar Banco de Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Banco de Dados</DialogTitle>
          <DialogDescription>
            Baixa um arquivo JSON com a estrutura e TODOS os registros do sistema. Também é possível
            baixar cada coleção separadamente em CSV. A operação é somente leitura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button className="w-full gap-2" onClick={handleExportarJson} disabled={exportando}>
            {exportando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mensagem}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar backup completo (.json)
              </>
            )}
          </Button>

          {resultado && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-semibold">
                Resumo do backup: {resultado.totalRegistros} registros em {resultado.totalColecoes}{' '}
                coleções
              </p>
              {resultado.fonte === 'espelho' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  A estrutura foi lida da cópia local do projeto (não do banco ao vivo).
                </p>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {resultado.resumo.map((r) => (
                  <div key={r.nome} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{r.nome}</span>
                    {r.falhou ? (
                      <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        FALHOU — sem registros
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {r.registros} {r.registros === 1 ? 'registro' : 'registros'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {resultado.puladas.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-2 text-xs text-red-700 dark:text-red-300">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    O arquivo NÃO está completo
                  </p>
                  {resultado.puladas.map((p) => (
                    <p key={p.colecao}>
                      <span className="font-mono">{p.colecao}</span>: {p.motivo}
                    </p>
                  ))}
                  <p className="mt-1">
                    Faça login novamente e gere o backup de novo para incluir estas coleções.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Baixar coleção em CSV
            </p>
            {colecoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Carregando coleções...</p>
            ) : (
              <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-1">
                {colecoes.map((nome) => (
                  <Button
                    key={nome}
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2 font-mono text-xs"
                    disabled={exportando || csvAtual !== null}
                    onClick={() => handleExportarCsv(nome)}
                  >
                    {csvAtual === nome ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    {nome}.csv
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ExportarBancoDialog
