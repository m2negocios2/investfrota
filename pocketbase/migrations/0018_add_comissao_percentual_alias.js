migrate(
  (app) => {
    const contratosCol = app.findCollectionByNameOrId('contratos')
    let changedContratos = false

    // Se comissao_percentual não existir, adiciona como campo numérico opcional (aceita decimais)
    if (!contratosCol.fields.getByName('comissao_percentual')) {
      contratosCol.fields.add(
        new NumberField({
          name: 'comissao_percentual',
          min: 0,
          max: 100,
        }),
      )
      changedContratos = true
    }

    if (changedContratos) {
      app.save(contratosCol)
    }

    // Se percentual_comissao existir de migração anterior, sincroniza valores para comissao_percentual
    try {
      app
        .db()
        .newQuery(`
      UPDATE contratos
      SET comissao_percentual = percentual_comissao
      WHERE (comissao_percentual IS NULL OR comissao_percentual = 0)
        AND percentual_comissao IS NOT NULL
        AND percentual_comissao > 0
    `)
        .execute()
    } catch (_) {}

    // Garantir campos em caixa_lancamentos
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

    // Garantir categoria "Comissão" em categorias_gastos
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
      contratosCol.fields.removeByName('comissao_percentual')
      app.save(contratosCol)
    } catch (_) {}
  },
)
