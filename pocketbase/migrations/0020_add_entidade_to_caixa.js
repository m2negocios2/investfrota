migrate(
  (app) => {
    const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
    let changed = false

    // 1. Tornar campo moto opcional (required: false) para permitir lançamentos de entidades gerais
    const motoField = caixaCol.fields.getByName('moto')
    if (motoField && motoField.required) {
      motoField.required = false
      changed = true
    }

    // 2. Adicionar campo entidade select: 'empresa', 'socia', 'terceiros'
    if (!caixaCol.fields.getByName('entidade')) {
      caixaCol.fields.add(
        new SelectField({
          name: 'entidade',
          required: false,
          values: ['empresa', 'socia', 'terceiros'],
          maxSelect: 1,
        }),
      )
      changed = true
    }

    if (changed) {
      app.save(caixaCol)
    }

    // 3. Adicionar índice em entidade
    try {
      caixaCol.addIndex('idx_caixa_entidade', false, 'entidade', '')
      app.save(caixaCol)
    } catch (_) {}
  },
  (app) => {
    try {
      const caixaCol = app.findCollectionByNameOrId('caixa_lancamentos')
      caixaCol.removeIndex('idx_caixa_entidade')
      caixaCol.fields.removeByName('entidade')
      const motoField = caixaCol.fields.getByName('moto')
      if (motoField) {
        motoField.required = true
      }
      app.save(caixaCol)
    } catch (_) {}
  },
)
