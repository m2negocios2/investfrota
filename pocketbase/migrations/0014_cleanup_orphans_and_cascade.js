migrate(
  (app) => {
    // 1. Clean up orphaned recebimentos that have no valid contrato
    try {
      app
        .db()
        .newQuery("DELETE FROM recebimentos WHERE contrato IS NULL OR contrato = ''")
        .execute()
    } catch (err) {
      console.log('Aviso ao limpar recebimentos orfaos:', err)
    }

    // 2. Enable cascadeDelete on contrato field in recebimentos collection
    try {
      const col = app.findCollectionByNameOrId('recebimentos')
      const field = col.fields.getByName('contrato')
      if (field) {
        field.cascadeDelete = true
        app.save(col)
      }
    } catch (err) {
      console.log('Aviso ao configurar cascadeDelete em recebimentos:', err)
    }
  },
  (app) => {
    // Revert cascadeDelete
    try {
      const col = app.findCollectionByNameOrId('recebimentos')
      const field = col.fields.getByName('contrato')
      if (field) {
        field.cascadeDelete = false
        app.save(col)
      }
    } catch (_) {}
  },
)
