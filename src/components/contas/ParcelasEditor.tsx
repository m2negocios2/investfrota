import React from 'react'
import { AlertCircle, CheckCircle2, RotateCcw, ListOrdered } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ItemParcela } from '@/types/database'
import { round2, somarParcelas } from '@/lib/parcelasUtils'

interface ParcelasEditorProps {
  parcelas: ItemParcela[]
  valorTotal: number
  onChangeParcelas: (novas: ItemParcela[]) => void
  onRedefinirIguais: () => void
}

export const ParcelasEditor: React.FC<ParcelasEditorProps> = ({
  parcelas,
  valorTotal,
  onChangeParcelas,
  onRedefinirIguais,
}) => {
  const somaAtual = somarParcelas(parcelas)
  const diferenca = round2(somaAtual - valorTotal)
  const somaBate = Math.abs(diferenca) < 0.01

  const handleValorChange = (index: number, valStr: string) => {
    const updated = [...parcelas]
    const numVal = parseFloat(valStr.replace(',', '.'))
    updated[index] = {
      ...updated[index],
      valor: isNaN(numVal) ? 0 : numVal,
    }
    onChangeParcelas(updated)
  }

  const handleVencimentoChange = (index: number, valDate: string) => {
    const updated = [...parcelas]
    updated[index] = {
      ...updated[index],
      data_vencimento: valDate,
    }
    onChangeParcelas(updated)
  }

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-4 h-4 text-rose-600" />
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Detalhamento das Parcelas ({parcelas.length})
          </Label>
          <Badge variant="outline" className="text-[10px] py-0">
            Editável
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRedefinirIguais}
          className="h-7 text-[11px] gap-1 text-slate-600 dark:text-slate-300"
          title="Recalcula todas as parcelas com valores iguais e ajusta centavos na última"
        >
          <RotateCcw className="w-3 h-3" />
          Dividir Igualmente
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Você pode ajustar o valor e o vencimento de cada parcela individualmente. O sistema calcula
        a divisão igual automaticamente por padrão.
      </p>

      {/* Caixa de Somatório e Aviso de Divergência */}
      <div
        className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors ${
          somaBate
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {somaBate ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-semibold">
              Soma das Parcelas: R${' '}
              {somaAtual.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-muted-foreground ml-1.5">
              (Total da Dívida: R${' '}
              {valorTotal.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              )
            </span>
          </div>
        </div>

        {!somaBate && (
          <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
            {diferenca > 0
              ? `A soma excede o total em R$ ${Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `Faltam R$ ${Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para fechar o total`}
          </div>
        )}
      </div>

      {/* Lista de Parcelas em Grid com scroll */}
      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border rounded-md p-2 bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
        {parcelas.map((p, idx) => (
          <div
            key={p.numero || idx + 1}
            className="flex items-center gap-2 p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60"
          >
            <div className="w-16 shrink-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {p.numero}ª Parcela
              </span>
            </div>

            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1.5 text-[11px] text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  className="h-7 text-xs pl-7 pr-2"
                  value={p.valor === 0 ? '' : p.valor}
                  placeholder="0,00"
                  onChange={(e) => handleValorChange(idx, e.target.value)}
                />
              </div>

              <div className="w-32 sm:w-36 shrink-0">
                <Input
                  type="date"
                  className="h-7 text-xs px-2"
                  value={p.data_vencimento || ''}
                  onChange={(e) => handleVencimentoChange(idx, e.target.value)}
                  title="Data de vencimento desta parcela"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
