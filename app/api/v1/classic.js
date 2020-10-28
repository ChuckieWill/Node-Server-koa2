const Router = require('koa-router')
const {Auth} = require('../../../middlewares/auth')
const {LoginAuth} = require('../../lib/enum')//用户权限枚举
const router = new Router({
  prefix: '/v1/classic'//设置路由的基地址 
})

// 注册中间件
router.get('/latest', new Auth(LoginAuth.ADMIN).m, async (ctx, next) => {

})

module.exports = router