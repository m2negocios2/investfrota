migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['proprietario', 'administrador'],
          maxSelect: 1,
        }),
      )
    }

    // Update collection rules so authenticated users can list and view users for assignment / audit
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.updateRule = 'id = @request.auth.id && @request.body.role:changed = false'

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
      app.save(users)
    }
  },
)
