import pb from '@/lib/pocketbase/client'
import { Recebimento } from '@/types/database'
import { getTodayLocalDate, dateToApiMidday } from '@/lib/dateUtils'
import { caixaService } from '@/services/caixa'

export const recebimentosService = {
  async getAll(): Promise<Recebimento[]> {
    return await pb.collection('recebimentos').getFullList<Recebimento>({
      sort: '-data_vencimento',
      expand: 'moto,contrato',
    })
  },

  async getByMoto(motoId: string): Promise<Recebimento[]> {
    return await pb.collection('recebimentos').getFullList<Recebimento>({
      filter: `moto = "${motoId}"`,
      sort: '-data_vencimento',
      expand: 'moto,contrato',
    })
  },

  async create(data: Omit<Recebimento, 'id' | 'created' | 'updated'>): Promise<Recebimento> {
    const payload = {
      ...data,
      data_vencimento: dateToApiMidday(data.data_vencimento),
      data_pagamento: data.data_pagamento ? dateToApiMidday(data.data_pagamento) : undefined,
    }
    return await pb.collection('recebimentos').create<Recebimento>(payload)
  },

  async update(id: string, data: Partial<Recebimento>): Promise<Recebimento> {
    const payload: Partial<Recebimento> = { ...data }
    if (data.data_vencimento !== undefined) {
      payload.data_vencimento = dateToApiMidday(data.data_vencimento)
    }
    if (data.data_pagamento !== undefined && data.data_pagamento) {
      payload.data_pagamento = dateToApiMidday(data.data_pagamento)
    }
    return await pb.collection('recebimentos').update<Recebimento>(id, payload)
  },

  async marcarComoPago(
    id: string,
    motoId: string,
    valor: number,
    locatarioNome: string,
    formaPagamento: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' = 'pix',
    dataPagamento?: string,
  ): Promise<Recebimento> {
    const today = dataPagamento || getTodayLocalDate()
    const cleanDate = today.split('T')[0].split(' ')[0]
    const safeApiDate = dateToApiMidday(cleanDate)

    const updated = await pb.collection('recebimentos').update<Recebimento>(id, {
      status: 'pago',
      data_pagamento: safeApiDate,
      forma_pagamento: formaPagamento,
    })

    // Also register in Caixa (com proteção contra duplicidade imediata)
    try {
      const existing = await pb.collection('caixa_lancamentos').getList(1, 1, {
        filter: `moto = "${motoId}" && tipo = "entrada" && data ~ "${cleanDate}" && valor >= ${valor - 0.01} && valor <= ${valor + 0.01} && recebimento = "${id}"`,
      })

      if (existing.totalItems === 0) {
        // Verificar também sem o filtro de recebimento por retrocompatibilidade
        const existingLegacy = await pb.collection('caixa_lancamentos').getList(1, 1, {
          filter: `moto = "${motoId}" && tipo = "entrada" && data ~ "${cleanDate}" && valor >= ${valor - 0.01} && valor <= ${valor + 0.01}`,
        })
        if (existingLegacy.totalItems === 0) {
          await pb.collection('caixa_lancamentos').create({
            moto: motoId,
            tipo: 'entrada',
            descricao: `Recebimento de aluguel - ${locatarioNome}`,
            categoria: 'aluguel',
            valor: valor,
            data: safeApiDate,
            forma_pagamento: formaPagamento,
            recebimento: id,
          })
        }
      }
    } catch (errCaixa) {
      console.warn('Aviso ao registrar no caixa:', errCaixa)
      try {
        await pb.collection('caixa_lancamentos').create({
          moto: motoId,
          tipo: 'entrada',
          descricao: `Recebimento de aluguel - ${locatarioNome}`,
          categoria: 'aluguel',
          valor: valor,
          data: safeApiDate,
          forma_pagamento: formaPagamento,
          recebimento: id,
        })
      } catch (errFallback) {
        console.warn('Falha no fallback de lançamento no caixa:', errFallback)
      }
    }

    // Registrar comissão automática caso o contrato deste recebimento possua comissão configurada
    try {
      let contratoId = updated.contrato
      if (!contratoId) {
        // Se não estava no payload do update, busca no banco
        const fullRec = await pb.collection('recebimentos').getOne<Recebimento>(id)
        contratoId = fullRec.contrato
      }

      if (contratoId) {
        await caixaService.registrarComissaoSeAplicavel({
          contratoId,
          recebimentoId: id,
          motoId,
          valorReceita: valor,
          dataReceita: cleanDate,
          locatarioNome,
          formaPagamento,
        })
      }
    } catch (errComissao) {
      console.warn('Aviso ao disparar comissão automática do recebimento:', errComissao)
    }

    return updated
  },

  async estornarPagamento(
    id: string,
    novoStatus: 'em_dia' | 'em_atraso' = 'em_dia',
  ): Promise<Recebimento> {
    const updated = await pb.collection('recebimentos').update<Recebimento>(id, {
      status: novoStatus,
      data_pagamento: '',
      forma_pagamento: '' as any,
    })
    return updated
  },
}
