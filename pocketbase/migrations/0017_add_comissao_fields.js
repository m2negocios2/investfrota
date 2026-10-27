migrate(
  (app) => {
    // 1. Adicionar campo percentual_comissao na coleção contratos
    const contratosCol = app.findCollectionByNameOrId('contratos')
    if (!contratosCol.fields.getByName('percentual_comissao')) {
      contratosCol.fields.add(
        new NumberField({
          name: 'percentual_comissao',
          min: 0,
          max: 100,
        }),
      )
      app.save(contratosCol)
    }

    // 2. Adicionar comissao_de e recebimento na coleção caixa_lancamentos
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    let changedCaixa = false
    if (!caixaCol.fields.getByName('comissao_de')) {
      caixaCol.fields.add(
        new TextField({
          name: 'comissao_de',
        }),
      )
      changedCaixa = true
    }
    if (!caixaCol.fields.getByName('recebimento')) {
      caixaCol.fields.add(
        new TextField({
          name: 'recebimento',
        }),
      )
      changedCaixa = true
    }
    if (changedCaixa) {
      app.save(caixaCol)
    }

    // 3. Garantir categoria "Comissão" em categorias_gastos se não existir
    try {
      const catCol = app.findCollectionByNameOrId('categorias_gastos')
      try {
        app.findFirstRecordByData('categorias_gastos', 'nome', 'Comissão')
      } catch (_) {
        const rec = new Record(catCol)
        rec.set('nome', 'Comissão')
        rec.set('descricao', 'Comissões sobre recebimentos de aluguéis')
        rec.set('cor', '#8b5cf6')
        app.save(rec)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos')
      contratosCol.fields.removeByName('percentual_comissao')
      app.save(contratosCol)
    } catch (_) {}

    try {
      const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
      caixaCol.fields.removeByName('comissao_de')
      caixaCol.fields.removeByName('recebimento')
      app.save(caixaCol)
    } catch (_) {}
  },
)
