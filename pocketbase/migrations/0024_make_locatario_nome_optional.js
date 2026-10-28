migrate(
  (app) => {
    // 1. Tornar locatario_nome opcional em contratos
    const contratosCol = app.findCollectionByNameOrId('contratos')
    const locatarioContrato = contratosCol.fields.getByName('locatario_nome')
    if (locatarioContrato) {
      locatarioContrato.required = false
      app.save(contratosCol)
    }

    // 2. Tornar locatario_nome opcional em recebimentos
    const recebimentosCol = app.findCollectionByNameOrId('recebimentos')
    const locatarioRecebimento = recebimentosCol.fields.getByName('locatario_nome')
    if (locatarioRecebimento) {
      locatarioRecebimento.required = false
      app.save(recebimentosCol)
    }
  },
  (app) => {
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos')
      const locatarioContrato = contratosCol.fields.getByName('locatario_nome')
      if (locatarioContrato) {
        locatarioContrato.required = true
        app.save(contratosCol)
      }
    } catch (_) {}

    try {
      const recebimentosCol = app.findCollectionByNameOrId('recebimentos')
      const locatarioRecebimento = recebimentosCol.fields.getByName('locatario_nome')
      if (locatarioRecebimento) {
        locatarioRecebimento.required = true
        app.save(recebimentosCol)
      }
    } catch (_) {}
  },
)
