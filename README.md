# micro-fe
基于koa的 服务模块化

koa 可以理解为这样

![洋葱圈](./img/yangcong.jpg)

或者

![中间件](./img/shuiping.jpeg)

micro-fe 可以理解位 多个koa的组合

![模块化](./img/duoduoduo.jpeg)

## 安装 install

```
npm install micro-fe --save
```

## 使用 usage

```javascript
const Koa = require('Koa')
const MicroFe = require('../index')
const app = new Koa()
const mfvm = new MicroFe(app)

//  有序插入中间件
// 可以通过 mfvm.middlewareName来查看中间件情况，调整插入位置，
// 也可以通过 mfvm.use({name, middleware}) , 默认添加到最后边
mfvm.insert(0, {
  name: 'test',
  middleware: async (ctx, next) => {
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

// 还有mfvm.post,... 支持方法参见https://github.com/jshttp/methods， node支持的都支持
mfvm.get('/api/:id', async function(ctx) {
  ctx.body = ctx.params.id
})
mfvm.get('/', async function(ctx) {
  ctx.body = {
    hello: 'world',
    name: ctx.testparam
  }
})

// 注册自服务
mfvm.register('/sub', async function(mfvm) {
  // 中间件
  mfvm.use({
    name: 'subtest',
    middleware: async (ctx, next) => {
      await await (() =>
        new Promise((resolve, reject) => {
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

app.use(mf.routes())

app.listen(3000)

```

