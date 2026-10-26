migrate(
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')

    // 1. Campo valor_semanal (number)
    if (!motosCol.fields.getByName('valor_semanal')) {
      motosCol.fields.add(
        new NumberField({
          name: 'valor_semanal',
          min: 0,
        }),
      )
    }

    // 2. Campo data_compra (date) - Data da compra ou recebimento pela Honda
    if (!motosCol.fields.getByName('data_compra')) {
      motosCol.fields.add(
        new DateField({
          name: 'data_compra',
        }),
      )
    }

    // 3. Campo valor_compra (number) - Valor de compra (dinheiro)
    if (!motosCol.fields.getByName('valor_compra')) {
      motosCol.fields.add(
        new NumberField({
          name: 'valor_compra',
          min: 0,
        }),
      )
    }

    // 4. Atualizar campo status para incluir 'em_loja_detran'
    const statusField = motosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['disponivel', 'locada', 'manutencao', 'em_loja_detran']
    }

    // 5. O campo valor_diario deixa de ser obrigatório para novas motos se era required
    const valorDiarioField = motosCol.fields.getByName('valor_diario')
    if (valorDiarioField) {
      valorDiarioField.required = false
    }

    app.save(motosCol)

    // 6. Backfill: preencher valor_semanal = valor_diario * 7 onde valor_semanal ainda não estiver preenchido
    try {
      app
        .db()
        .newQuery(`
        UPDATE motos
        SET valor_semanal = ROUND(valor_diario * 7, 2)
        WHERE (valor_semanal IS NULL OR valor_semanal = 0) AND valor_diario > 0
      `)
        .execute()
    } catch (e) {
      console.log('Erro ao fazer backfill de valor_semanal:', e)
    }
  },
  (app) => {
    const motosCol = app.findCollectionByNameOrId('motos')
    if (motosCol.fields.getByName('valor_semanal')) {
      motosCol.fields.removeByName('valor_semanal')
    }
    if (motosCol.fields.getByName('data_compra')) {
      motosCol.fields.removeByName('data_compra')
    }
    if (motosCol.fields.getByName('valor_compra')) {
      motosCol.fields.removeByName('valor_compra')
    }
    const statusField = motosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['disponivel', 'locada', 'manutencao']
    }
    app.save(motosCol)
  },
)
