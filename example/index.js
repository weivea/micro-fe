const mf = require('./mf')
const { app } = mf
app.use(mf.routes())

app.listen(3000)
console.log('visite http://localhost:3000')