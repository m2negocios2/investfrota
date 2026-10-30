import React from 'react'
import { Building2, User, Users, CheckCircle2 } from 'lucide-react'
import { Socio, ContaAPagarComProgresso, EntidadeTipo } from '@/types/database'

export interface SelectedParticipant {
  tipo: EntidadeTipo
  socioId?: string
  contaAPagarId?: string
}

interface ParticipantSelectorGridProps {
  nomeEmpresa: string
  socios: Socio[]
  contasAPagar: ContaAPagarComProgresso[]
  selectedParticipant: SelectedParticipant | null
  onSelectParticipant: (participant: SelectedParticipant) => void
  disabled?: boolean
}

export function ParticipantSelectorGrid({
  nomeEmpresa,
  socios,
  contasAPagar,
  selectedParticipant,
  onSelectParticipant,
  disabled = false,
}: ParticipantSelectorGridProps) {
  const isEmpresaSelected = selectedParticipant?.tipo === 'empresa'
  const isSocioSelected = selectedParticipant?.tipo === 'socia'
  const isTerceiroSelected = selectedParticipant?.tipo === 'terceiros'

  const currentSocioId = isSocioSelected ? selectedParticipant?.socioId : undefined
  const currentContaId = isTerceiroSelected ? selectedParticipant?.contaAPagarId : undefined

  return (
    <div className="space-y-3">
      {/* 3 Botões Principais: EMPRESA, SÓCIOS, TERCEIROS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* EMPRESA */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectParticipant({ tipo: 'empresa' })}
          className={`relative min-h-[58px] sm:min-h-[64px] p-2.5 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 cursor-pointer select-none active:scale-[0.98] ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isEmpresaSelected
              ? 'border-amber-600 dark:border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 ring-2 ring-amber-600/30 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
          }`}
        >
          <div
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
              isEmpresaSelected
                ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-600 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-600'
            }`}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-black text-xs sm:text-sm leading-tight truncate ${
                isEmpresaSelected
                  ? 'text-amber-950 dark:text-amber-100'
                  : 'text-slate-900 dark:text-white'
              }`}
              title={nomeEmpresa}
            >
              🏢 {nomeEmpresa.toUpperCase()}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
              Custos / Receitas Gerais
            </p>
          </div>
          {isEmpresaSelected && (
            <div className="absolute top-1.5 right-1.5 bg-amber-600 text-white rounded-full p-0.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </button>

        {/* SÓCIOS */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            // Se já tiver sócios, seleciona o primeiro por default ou sem_especificar se não houver
            onSelectParticipant({
              tipo: 'socia',
              socioId: currentSocioId || (socios[0]?.id ?? ''),
            })
          }}
          className={`relative min-h-[58px] sm:min-h-[64px] p-2.5 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 cursor-pointer select-none active:scale-[0.98] ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isSocioSelected
              ? 'border-purple-600 dark:border-purple-500 bg-purple-50/90 dark:bg-purple-950/60 ring-2 ring-purple-600/30 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
          }`}
        >
          <div
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
              isSocioSelected
                ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-600 shadow-sm'
                : 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900 text-purple-600'
            }`}
          >
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-black text-xs sm:text-sm leading-tight truncate ${
                isSocioSelected
                  ? 'text-purple-950 dark:text-purple-100'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              👤 SÓCIOS
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
              {socios.length > 0
                ? `${socios.length} sócio(s) cadastrado(s)`
                : 'Retiradas / Pró-labore'}
            </p>
          </div>
          {isSocioSelected && (
            <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white rounded-full p-0.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </button>

        {/* TERCEIROS */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onSelectParticipant({
              tipo: 'terceiros',
              contaAPagarId: currentContaId || (contasAPagar[0]?.id ?? ''),
            })
          }}
          className={`relative min-h-[58px] sm:min-h-[64px] p-2.5 rounded-2xl border-2 transition-all text-left flex items-center gap-2.5 cursor-pointer select-none active:scale-[0.98] ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isTerceiroSelected
              ? 'border-rose-600 dark:border-rose-500 bg-rose-50/90 dark:bg-rose-950/60 ring-2 ring-rose-600/30 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
          }`}
        >
          <div
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
              isTerceiroSelected
                ? 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 text-rose-600 shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-600'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-black text-xs sm:text-sm leading-tight truncate ${
                isTerceiroSelected
                  ? 'text-rose-950 dark:text-rose-100'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              🤝 TERCEIROS
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
              {contasAPagar.length > 0
                ? `${contasAPagar.length} conta(s) a pagar`
                : 'Contas a Pagar / Dívidas'}
            </p>
          </div>
          {isTerceiroSelected && (
            <div className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </button>
      </div>

      {/* SUB-SELEÇÃO QUANDO SÓCIOS ESTÁ SELECIONADO */}
      {isSocioSelected && (
        <div className="p-3 bg-purple-50/80 dark:bg-purple-950/50 rounded-xl border border-purple-200 dark:border-purple-900 space-y-2 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              Escolha o Sócio:
            </span>
            <span className="text-[10px] text-muted-foreground">
              {socios.length > 0 ? `${socios.length} cadastrado(s)` : 'Nenhum cadastrado'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectParticipant({ tipo: 'socia', socioId: '' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !currentSocioId
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100/50'
              }`}
            >
              👤 EU / SÓCIA (Geral)
            </button>

            {socios.map((s) => {
              const isSelected = currentSocioId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectParticipant({ tipo: 'socia', socioId: s.id })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100/50'
                  }`}
                >
                  <span>👤 {s.nome}</span>
                  {s.participacao_percentual !== undefined && s.participacao_percentual > 0 && (
                    <span className="opacity-75 font-normal text-[10px]">
                      ({s.participacao_percentual}%)
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* SUB-SELEÇÃO QUANDO TERCEIROS ESTÁ SELECIONADO */}
      {isTerceiroSelected && (
        <div className="p-3 bg-rose-50/80 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              Escolha a Conta / Dívida com Terceiro:
            </span>
            <span className="text-[10px] text-muted-foreground">
              {contasAPagar.length > 0 ? `${contasAPagar.length} conta(s)` : 'Nenhuma conta'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectParticipant({ tipo: 'terceiros', contaAPagarId: '' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !currentContaId
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 hover:bg-rose-100/50'
              }`}
            >
              🤝 TERCEIROS (Geral)
            </button>

            {contasAPagar.map((c) => {
              const isSelected = currentContaId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectParticipant({ tipo: 'terceiros', contaAPagarId: c.id })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 hover:bg-rose-100/50'
                  }`}
                >
                  <span>🤝 {c.credor}</span>
                  {c.descricao && (
                    <span className="opacity-75 font-normal text-[10px]">— {c.descricao}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
