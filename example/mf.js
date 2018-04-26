const Koa = require('Koa')
const MicroFe = require('../index')
const app = new Koa()
const mfvm = new MicroFe(app)

mfvm.insert(0, {
  name: 'test',
  middleware: async function(ctx, next) {
    await await (() =>
      new Promise((resolve, reject) => {
        // 自运行返回Promise
        setTimeout(() => {
          ctx.testparam = 1
          console.log('test123')
          resolve()
        }, 500)
      }))()
    await next()
  }
})

mfvm.get('/api/:id', async function(ctx) {
  ctx.body = ctx.params.id
})
mfvm.get('/', async function(ctx) {
  ctx.body = {
    hello: 'world',
    name: ctx.testparam
  }
})

mfvm.register('/sub', async function(mfvm) {
  mfvm.use({
    name: 'subtest',
    middleware: async function(ctx, next) {
      await await (() =>
        new Promise((resolve, reject) => {
          // 自运行返回Promise
          setTimeout(() => {
            ctx.testparam = 2
            console.log('subtest123')
            resolve()
          }, 500)
        }))()
      await next()
    }
  })

  mfvm.get('/api', async function(ctx) {
    ctx.body = {
      sub: 'api',
      name: ctx.testparam
    }
  })
})

module.exports = mfvm
