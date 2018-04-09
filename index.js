'use strick'
const debug = require('debug')('micro-fe')
const convert = require('koa-convert')
const compose = require('koa-compose')
const { join } = require('path')
const isGeneratorFunction = require('is-generator-function')
const Koa = require('./lib/application')
const pathToRegexp = require('path-to-regexp')
const methods = require('methods')
const assert = require('assert')
const deprecate = require('depd')('koa');
const app = new Koa()

class MF {
  /**
   * 构造函数
   * @param {*} app koa实例
   * 常用属性：
   * app:koa实例
   * prefix: path前缀
   * prefix: path前缀
   * parent: 父级实例
   * root: 父级实例
   * parent: 父级实例
   * parent: 父级实例
   * middleware: 中间件列表
   * middlewareName: 中间件名儿列表
   * children: 子组件
   */
  constructor(app) {
    this.app = app
    this.prefix = ''
    this._controls = (() => {
      const re = {}
      methods.forEach(function(method) {
        re[method.toUpperCase()] = {}
      })
      return re
    })()
    this._controlList = (() => {
      const re = {}
      methods.forEach(function(method) {
        re[method.toUpperCase()] = []
      })
      return re
    })()
    this.middleware = [] // 中间件列表
    this.middlewareName = [] // 中间件名儿列表
    this.children = [] // 子组件
    this.ctxDecorateList = [] // ctx扩展方法列表
  }
  /**
   * 插入中间件
   * @param {*} index 插入排序，第几位
   * @param {*} param1 (name:中间件名，middleware:中间件方法)
   */
  insert(index, { name, middleware }) {
    if (typeof index !== 'number')
      throw new TypeError('index must be a number!')
    if (typeof name !== 'string') throw new TypeError('name must be a string!')
    if (typeof middleware !== 'function')
      throw new TypeError('middleware must be a function!')
    if (isGeneratorFunction(middleware)) {
      deprecate(
        'Support for generators will be removed in v3. ' +
          'See the documentation for examples of how to convert old middleware ' +
          'https://github.com/koajs/koa/blob/master/docs/migration.md'
      )
      middleware = convert(middleware)
    }
    if (this.middlewareName.indexOf(name) >= 0) {
      throw new TypeError(`middleware name [${name}] was used!`)
    }
    this.middlewareName.splice(index, 0, name)
    this.middleware.splice(index, 0, middleware)
  }
  /**
   * 末尾插入中间件
   * @param {*} param0 (name:中间件名，middleware:中间件方法)
   */
  use({ name, middleware }) {
    const index = this.middleware.length
    this.insert(index, { name, middleware })
  }
  decorateCTX(name, fn) {
    if (typeof name !== 'string')
      throw new TypeError('prefix must be a string!')
    if (typeof fn !== 'function') throw new TypeError('fn must be a function!')
    this.ctxDecorateList.forEach(item => {
      if (item.name === name) {
        throw new TypeError(
          ` ctxDecorate named [${name}] has been used`
        )
      }
    })
    this.ctxDecorateList.push({
      name,
      fn
    })
  }
  /**
   * 注册子服务
   * @param {*} prefix
   * @param {*} fn
   */
  register(prefix, fn) {
    if (typeof prefix !== 'string')
      throw new TypeError('prefix must be a string!')
    if (typeof fn !== 'function') throw new TypeError('fn must be a function!')
    this.children.forEach(child => {
      if (child.prefix === prefix) {
        throw new TypeError(
          ` child Server prefix [${prefix}] has been registed`
        )
      }
    })
    const submfvm = new MF(this.app)
    submfvm.parent = this
    submfvm.root = this.root || this
    submfvm.prefix = join(this.prefix, prefix)
    submfvm.regexp = pathToRegexp(submfvm.prefix)
    this.children.push(submfvm)
    Promise.resolve(fn(mfvm))
      .then(() => {})
      .catch(err => {
        this.app.emit('error', err, this)
      })
  }
  /**
   * 获取指定中间件名的位置
   * @param {*} name
   */
  indexOfMiddleware(name) {
    if (typeof name !== 'string') throw new TypeError('name must be a string!')
    return this.middlewareName.indexOf(name)
  }
  /**
   * 获取路由
   */
  routes() {
    methods.forEach(method => {
      this._controlList[method.toUpperCase()] = Object.values(
        this._controls[method.toUpperCase()]
      )
    })
    const fnMiddleware = compose(this.middleware)

    this.businessFun = async (ctx, next) => {
      // decorateCTX
      const ctxDecorateList = this.ctxDecorateList;
      for (let i = 0; i < ctxDecorateList.length; i++) {
        const ctxDecorate = ctxDecorateList[i].fn
        await Promise.resolve(ctxDecorate(ctx))
      }

      // controls run
      const controls = this._controlList[ctx.method]
      for (let i = 0; i < controls.length; i++) {
        const control = controls[i]
        const regResoult = ctx.path.match(control.regexp)
        if (regResoult) {
          return await fnMiddleware(ctx, () => {
            const param = {}
            const vals = regResoult.slice(1)
            control.paramNames.forEach((item, ind) => {
              param[item.name] = vals[ind]
            })
            ctx.param = param
            return Promise.resolve(control.fn(ctx, next))
          })
        }
      }
      // children Run
      const children = this.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (child.regexp.test(ctx.path)) {
          // 先运行中间件
          return await fnMiddleware(ctx, async () => {
            // 存在businessFun就直接运行
            if (child.businessFun) {
              return await child.businessFun(ctx, next)
            }
            // 不存在就初始化后运行，为什么有等到现在才初始化，因为register里的fn可能是异步的
            return await child.routes()(ctx, next)
          })
        }
      }
    }
    return this.businessFun
  }
}

/**
 * 挂载methods
 */
methods.forEach(function(method) {
  MF.prototype[method] = function(path, middleware) {
    assert(typeof path === 'string', 'args[0] need be string')
    assert(typeof middleware === 'function', 'args[a] need be function')
    const paramNames = []
    const regexp = pathToRegexp(join(this.prefix, path), paramNames)
    if (this._controls[method.toUpperCase()][path]) {
      throw `[${method}:${path}]has been used!!`
    }
    this._controls[method.toUpperCase()][path] = {
      regexp,
      paramNames,
      fn: middleware
    }
    return this
  }
})

export default MF
