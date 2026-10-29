migrate(
  (app) => {
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    const sociosCol = app.findCollectionByNameOrId('socios')
    const contasCol = app.findCollectionByNameOrId('contas_a_pagar')
    let changed = false

    // 1. Adicionar campo socio (relation -> socios, maxSelect 1, opcional)
    if (!caixaCol.fields.getByName('socio')) {
      caixaCol.fields.add(
        new RelationField({
          name: 'socio',
          collectionId: sociosCol.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      changed = true
    }

    // 2. Adicionar campo conta_a_pagar (relation -> contas_a_pagar, maxSelect 1, opcional)
    if (!caixaCol.fields.getByName('conta_a_pagar')) {
      caixaCol.fields.add(
        new RelationField({
          name: 'conta_a_pagar',
          collectionId: contasCol.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      changed = true
    }

    if (changed) {
      app.save(caixaCol)
    }

    // 3. Adicionar índices para performance
    try {
      caixaCol.addIndex('idx_caixa_socio', false, 'socio', '')
      app.save(caixaCol)
    } catch (_) {}

    try {
      caixaCol.addIndex('idx_caixa_conta_a_pagar', false, 'conta_a_pagar', '')
      app.save(caixaCol)
    } catch (_) {}
  },
  (app) => {
    try {
      const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
      try {
        caixaCol.removeIndex('idx_caixa_socio')
      } catch (_) {}
      try {
        caixaCol.removeIndex('idx_caixa_conta_a_pagar')
      } catch (_) {}
      caixaCol.fields.removeByName('socio')
      caixaCol.fields.removeByName('conta_a_pagar')
      app.save(caixaCol)
    } catch (_) {}
  },
)
