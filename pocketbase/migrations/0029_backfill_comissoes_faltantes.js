migrate(
  (app) => {
    // 1. Carregar coleção de caixa_lancamentos
    let caixaCol
    try {
      caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    } catch (_) {
      return
    }

    // 2. Buscar todos os lançamentos de entrada com categoria 'Aluguel'
    const receitasAluguel = app.findRecordsByFilter(
      'caixa_lancamentos',
      'tipo = "entrada" && categoria = "Aluguel"',
      'data',
      10000,
      0,
    )

    // 3. Buscar contratos de motos para poder encontrar o contrato vigente ou comissão cadastrada
    const todosContratos = app.findRecordsByFilter('contratos', '', 'data_inicio', 10000, 0)

    // 4. Buscar saídas de comissão já existentes para checagem estrita de deduplicação
    const todasComissoes = app.findRecordsByFilter(
      'caixa_lancamentos',
      'tipo = "saida" && categoria = "Comissão"',
      'data',
      10000,
      0,
    )

    for (const receita of receitasAluguel) {
      const motoId = receita.getString('moto')
      if (!motoId) continue

      const valorReceita = receita.getFloat('valor')
      if (!valorReceita || valorReceita <= 0) continue

      const dataReceita = receita.getString('data') // e.g. "2026-05-13 12:00:00.000Z"
      const dataReceitaDatePart = dataReceita.substring(0, 10) // "YYYY-MM-DD"
      const obsReceita = receita.getString('observacoes') || ''

      // Extrair ID de contrato mencionado nas observações caso exista (ex: "Contrato: gfflg9y1zyvp16m")
      let contratoIdFromObs = ''
      const matchObs = obsReceita.match(/Contrato:\s*([a-zA-Z0-9]+)/)
      if (matchObs && matchObs[1]) {
        contratoIdFromObs = matchObs[1]
      }

      // Encontrar contratos desta moto ordenados
      const contratosDaMoto = todosContratos.filter((c) => c.getString('moto') === motoId)
      if (contratosDaMoto.length === 0) continue

      // Tentar encontrar o contrato vigente naquela data:
      // Um contrato cobre a data se:
      // (c.data_inicio <= dataReceitaDatePart) E (c.data_entrega vazia OU c.data_entrega >= dataReceitaDatePart)
      let contratoVigente = null

      // Se temos contratos da moto, procuramos o vigente pela data
      for (const c of contratosDaMoto) {
        const dInicio = (c.getString('data_inicio') || '').substring(0, 10)
        const dFim = (c.getString('data_entrega') || '').substring(0, 10)

        if (dInicio && dInicio <= dataReceitaDatePart) {
          if (!dFim || dFim >= dataReceitaDatePart) {
            contratoVigente = c
            break
          }
        }
      }

      // Se não encontrou pela janela de datas estrita, tenta o contrato referenciado na obs
      if (!contratoVigente && contratoIdFromObs) {
        contratoVigente = contratosDaMoto.find((c) => c.id === contratoIdFromObs)
      }

      // Se ainda não encontrou e houver contrato ativo na moto, usa o ativo
      if (!contratoVigente) {
        contratoVigente = contratosDaMoto.find((c) => c.getString('status') === 'ativo')
      }

      // Se ainda não encontrou, pega o contrato mais recente da moto que tenha comissão > 0
      if (!contratoVigente) {
        contratoVigente = contratosDaMoto.find((c) => {
          const pct = c.getFloat('comissao_percentual') || c.getFloat('percentual_comissao')
          return pct > 0
        })
      }

      if (!contratoVigente) continue

      const pct =
        contratoVigente.getFloat('comissao_percentual') ||
        contratoVigente.getFloat('percentual_comissao') ||
        0

      if (pct <= 0) continue

      const valorComissaoEsperado = Number(((valorReceita * pct) / 100).toFixed(2))
      if (valorComissaoEsperado <= 0) continue

      // Verificar se já existe comissão para esta receita no caixa:
      // 1) Pelo recebimento se houver
      const recId = receita.getString('recebimento')
      // 2) Pelo contratoId + motoId + mesma data (YYYY-MM-DD) + valor correspondente
      const jaExiste = todasComissoes.some((com) => {
        if (com.getString('moto') !== motoId) return false

        if (recId && com.getString('recebimento') === recId) return true

        const comDataPart = (com.getString('data') || '').substring(0, 10)
        if (comDataPart === dataReceitaDatePart) {
          const comValor = com.getFloat('valor')
          // Se o valor for muito próximo do esperado (margem de R$ 0.10)
          if (Math.abs(comValor - valorComissaoEsperado) < 0.1) {
            return true
          }
        }

        return false
      })

      if (jaExiste) continue

      // Criar a comissão faltante
      const novaComissao = new Record(caixaCol)
      novaComissao.set('moto', motoId)
      novaComissao.set('tipo', 'saida')
      novaComissao.set('descricao', 'Comissão')
      novaComissao.set('categoria', 'Comissão')
      novaComissao.set('valor', valorComissaoEsperado)
      novaComissao.set('data', dataReceita)
      novaComissao.set('forma_pagamento', receita.getString('forma_pagamento') || 'pix')
      novaComissao.set('comissao_de', contratoVigente.id)
      novaComissao.set('recebimento', recId || '')
      novaComissao.set(
        'observacoes',
        `Backfill automático de comissão de ${pct}% sobre receita de R$ ${valorReceita.toFixed(2)} (Ref: ${receita.id})`,
      )
      app.save(novaComissao)

      // Adiciona na memória local do loop para evitar duplicações internas
      todasComissoes.push(novaComissao)
    }
  },
  (app) => {
    // Reverter comissões criadas por esta migração
    try {
      app
        .db()
        .newQuery(`
        DELETE FROM caixa_lancamentos
        WHERE categoria = 'Comissão'
          AND observacoes LIKE 'Backfill automático de comissão%'
      `)
        .execute()
    } catch (_) {}
  },
)
