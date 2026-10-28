migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contas_a_pagar')
    if (!col.fields.getByName('parcelas_customizadas')) {
      col.fields.add(
        new JSONField({
          name: 'parcelas_customizadas',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('contas_a_pagar')
      const field = col.fields.getByName('parcelas_customizadas')
      if (field) {
        col.fields.removeByName('parcelas_customizadas')
        app.save(col)
      }
    } catch (_) {}
  },
)
