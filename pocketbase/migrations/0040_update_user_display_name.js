migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const user = app.findFirstRecordByData('_pb_users_auth_', 'email', 'm2.negocios2@gmail.com')
      if (
        user &&
        (user.getString('name') === 'Proprietário M2' ||
          user.getString('name').toLowerCase().includes('proprietário') ||
          user.getString('name').toLowerCase().includes('proprietario'))
      ) {
        user.set('name', 'INVEST FROTA')
        app.save(user)
      }
    } catch (err) {
      console.log('Migration 0040 update user name note:', err)
    }
  },
  (app) => {
    try {
      const user = app.findFirstRecordByData('_pb_users_auth_', 'email', 'm2.negocios2@gmail.com')
      if (user && user.getString('name') === 'INVEST FROTA') {
        user.set('name', 'M2 Gestão de Motos')
        app.save(user)
      }
    } catch (_) {}
  },
)
