import pb from '@/lib/pocketbase/client'
import { CaixaLancamento } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const caixaService = {
  async getAll(): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      sort: '-data,-created',
      expand: 'moto,socio,conta_a_pagar',
    })
  },

  async getByMoto(motoId: string): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      filter: `moto = "${motoId}"`,
      sort: '-data,-created',
      expand: 'moto,socio,conta_a_pagar',
    })
  },

  async getByEntidade(entidade: string): Promise<CaixaLancamento[]> {
    return await pb.collection('caixa_lancamentos').getFullList<CaixaLancamento>({
      filter: `entidade = "${entidade}"`,
      sort: '-data,-created',
      expand: 'moto,socio,conta_a_pagar',
    })
  },

  async create(
    data: Omit<CaixaLancamento, 'id' | 'created' | 'updated'>,
  ): Promise<CaixaLancamento> {
    const payload = {
      ...data,
      data: dateToApiMidday(data.data),
    }
    return await pb.collection('caixa_lancamentos').create<CaixaLancamento>(payload)
  },

  /**
   * Registra despesa automática de comissão se o contrato possuir comissão definida (> 0).
   * Evita duplicações verificando o identificador do recebimento.
   */
  async registrarComissaoSeAplicavel(params: {
    contratoId?: string
    recebimentoId?: string
    motoId: string
    valorReceita: number
    dataReceita: string
    locatarioNome?: string
    motoIdentificacao?: string
    formaPagamento?: CaixaLancamento['forma_pagamento']
  }): Promise<CaixaLancamento | null> {
    const {
      contratoId,
      recebimentoId,
      motoId,
      valorReceita,
      dataReceita,
      locatarioNome,
      motoIdentificacao,
      formaPagamento = 'pix',
    } = params

    if (!contratoId || !valorReceita || valorReceita <= 0) {
      return null
    }

    try {
      // 1. Buscar o contrato para obter o percentual de comissão
      const contrato = await pb.collection('contratos').getOne<any>(contratoId)
      const percentual = Number(contrato.comissao_percentual ?? contrato.percentual_comissao ?? 0)

      if (!percentual || percentual <= 0) {
        return null
      }

      // 2. Calcular valor da comissão: receita * (percentual / 100)
      const valorComissao = Number(((valorReceita * percentual) / 100).toFixed(2))
      if (valorComissao <= 0) {
        return null
      }

      const safeDate = dateToApiMidday(dataReceita)

      // 3. Montar descrição clara
      // Descrição exata solicitada: "Comissão — {locatário} ({moto})"
      const locatarioRaw = (locatarioNome || contrato.locatario_nome || '').trim()
      const nomeFinal = locatarioRaw || ''
      let identificadorMoto = motoIdentificacao?.trim()
      if (!identificadorMoto && motoId) {
        try {
          const motoRecord = await pb.collection('motos').getOne<any>(motoId)
          identificadorMoto = motoRecord.nome || motoRecord.modelo || motoRecord.placa || 'Moto'
        } catch (_) {
          identificadorMoto = 'Moto'
        }
      }
      const descricaoComissao = nomeFinal
        ? `Comissão — ${nomeFinal}${identificadorMoto ? ` (${identificadorMoto})` : ''}`
        : `Comissão — ${identificadorMoto || 'Moto'}`

      // 4. Verificação de idempotência estrita por ID do recebimento
      // NUNCA descartar por data/valor aproximado, pois contratos recebem valores idênticos em datas próximas
      if (recebimentoId) {
        try {
          const existingByRec = await pb
            .collection('caixa_lancamentos')
            .getList<CaixaLancamento>(1, 1, {
              filter: `recebimento = "${recebimentoId}" && tipo = "saida" && categoria = "Comissão"`,
            })
          if (existingByRec.totalItems > 0) {
            return existingByRec.items[0]
          }
        } catch (errCheck) {
          console.warn('Aviso ao checar comissão existente por recebimento:', errCheck)
        }
      }

      // 5. Criar lançamento de despesa de comissão no Caixa
      const payload: any = {
        moto: motoId,
        tipo: 'saida',
        descricao: descricaoComissao,
        categoria: 'Comissão',
        valor: valorComissao,
        data: safeDate,
        forma_pagamento: formaPagamento,
        comissao_de: contratoId,
        recebimento: recebimentoId || '',
        observacoes: `Comissão automática de ${percentual}% sobre receita de R$ ${valorReceita.toFixed(2)}`,
      }

      const created = await pb.collection('caixa_lancamentos').create<CaixaLancamento>(payload)
      return created
    } catch (err) {
      console.error('Erro ao registrar despesa de comissão automática:', err)
      return null
    }
  },

  async update(
    id: string,
    data: Partial<Omit<CaixaLancamento, 'id' | 'created' | 'updated'>>,
  ): Promise<CaixaLancamento> {
    const payload = {
      ...data,
      ...(data.data !== undefined ? { data: dateToApiMidday(data.data) } : {}),
    }
    return await pb.collection('caixa_lancamentos').update<CaixaLancamento>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('caixa_lancamentos').delete(id)
  },

  async clearDemo(): Promise<void> {
    const list = await pb.collection('caixa_lancamentos').getFullList()
    for (const item of list) {
      await pb.collection('caixa_lancamentos').delete(item.id)
    }
  },
}
