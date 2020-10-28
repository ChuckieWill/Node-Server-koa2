# node.js服务端开发项目模板(koa2)

##  一、项目简介

> 关于本模板框架各模块详细讲解，可查看[本人博客-koa学习笔记](https://chuckiewill.github.io/2020/03/02/node/koa/koa/)

###  1.1 项目核心内容

* 基于第三方库`Lin-validator`可自定义封装参数校验器-validator.js
* 基于第三方库`Sequelize`，可更方便的实现对数据库的操作，并封装了连接MySQL数据库-db.js
* 实现了用户注册、用户登录、token校验等接口
  * 且用户登录方式具有可扩展性，可自定义添加更多登录方式
* 封装了全局异常处理中间件-exception.js
* 封装了用户访问权限校验中间件-auth.js
* 封装了http错误类，且可自定义扩展-http-exceptions.js
* 封装了项目初始化文件-init.js
* 使用`jsonwebtoken`生成token
* 使用`bcryptjs`加密密码

###  1.2 目录文件说明

* app

  * api
    * v1  api版本1的路由
      * classic.js   测试路由，使用了用户访问权限验证
      * user.js      用户注册路由（邮箱注册方式）
      * token.js    用户登录（包括小程序、web等多种登录方式，本质是身份验证并返回token）
    * v2  api版本2的路由
  * models
    * user.js  相关用户的操作数据库的数据模型
  * validators
    * validator.js  继承LinValidator类，自定义具体业务的参数校验类
  * lib
    * enum.js 枚举，定义一些常量（用户类型、用户权限）
  * services
    * wx.js   相关微信小程序登录的业务逻辑（app/models/user.js用户模型的上一层）
* middlewares
  * exception.js    全局异常处理中间件
  * auth.js   用户访问权限验证、token令牌验证
* core
  * db.js   建立数据库连接
  * lin-validator.js      封装的LinValidator类
  * utils.js         utils.js 封装生成token的函数
  * http-exception.js   封装的http错误类
  * init.js  项目初始化
* config
  * config.js   配置信息-环境变量的配置   配置信息-数据库基本信息
* app.js        注册全局异常处理中间件
* package.js  依赖配置文件



##  二、使用手册

###  2.1 启动项目

1. 克隆到本地

2. 安装所有第三方库，终端切到根目录下，执行`npm install`,安装`package.js`中的所有依赖

3. 设置配置文件信息：`config.js`

   ```js
   //配置文件  开发环境与生产环境
   module.exports = {
     //配置开发环境
     environment : 'dev',   //prod生产环境、dev是开发环境
     //数据库配置信息
     database : {
       dbName:'',//数据库名称
       user: 'root',//数据库用户名
       password: '123456',//数据库用户密码
       host: 'localhost',//数据库主机名 
       port:3306,//数据库端口
     },
     //令牌配置信息
     security:{
       secretKey:"abcdefg",//需要特别长且无规律，一旦拿到该密码，则可以破解jsonwebtoken的所有令牌
       expiresIn:60*60*24*30,//令牌过期时间，单位：秒
     },
     //wx登录验证配置信息
     wx:{
       appId: '',//小程序 appId
       appSecret: '',//小程序 appSecret
       loginUrl: 'https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code'//获取微信openid请求地址，可直接使用这里的地址
     }
   }
   ```

4. 终端根目录下启动项目：`node app.js`



###  2.2 已有接口说明

#### 2.2.1 用户注册

> 这个注册接口只针对邮箱注册的方式

**URL:**

```js
POST  /v1/user/register
```

**Parameters**:

* nickname :用户昵称
* password : 用户密码
* email :用户邮箱，唯一标识，不可重复

**Response Status** 201:

```js
{
        "error_code": 0,
        "msg": "ok",
        "request": "POST  /like/add"
}
```

####  2.2.2 用户登录

> **用户邮箱登录：**（需要先调用上面的注册接口注册）
>
> * account: 账户即为邮箱
> * secret: 用户密码
>
> **小程序登录：**（不需要注册，直接在小程序端发来js_code即可）
>
> * account: 账户即为js_code
> * secret: 不用传

**URL:**

```js
POST  /v1/token/
```

**Parameters**:

* account: 账户  
* secret: 密码
* type： 登录方式
  * 100,//小程序方式登录
  * 101,//用户邮箱登录
  * 102,//用户手机登录
  * 200,//管理员邮箱登录
  * 可自定义type，*参考下文的可扩展性  / 扩展用户登录方式*



####  2.2.3 token校验

> 校验token合法性，只有合法才返回true，否则返回false

**URL:**

```js
POST  /v1/token/verify
```

**Parameters**:

* token



###  2.3 编写API

> * 在`app/api/v1`下新建文件，用于编写API
>
> * 如果API有版本迭代，
>   * 可以通过在`app/api`下新建v1、v2、v3、、、、、文件，表示不同版本的路由
>   * URL也通过`/v1/,,,`、`/v2/,,,,`来区分不同版本
> * 关于用户访问接口权限校验，*可以查看下文的可扩展性 /  扩展登录角色*

**源码：**

```js
const Router = require('koa-router')
const {Auth} = require('../../../middlewares/auth')//用户访问权限校验类
const {LoginAuth} = require('../../lib/enum')//用户权限枚举
const router = new Router({
  prefix: '/v1/classic'//设置路由的基地址 
})

// 普通用户及以上权限可访问该接口
router.get('/new', new Auth().m, async (ctx, next) => {
	//路由具体业务一般流程
    // 1 参数校验 利用validator参数校验类
    // 2 数据库操作（增删改查） 利用sequelize的模型
    // 3 操作结果返回前端
})
// 管理员及以上权限可访问该接口
router.get('/new1', new Auth(LoginAuth.ADMIN).m, async (ctx, next) => {
	//路由具体业务
})
// 超级管理员及以上权限可访问该接口
router.get('/new2', new Auth(LoginAuth.SUPER_ADMIN).m, async (ctx, next) => {
	//路由具体业务
})

module.exports = router
```

###  2.4  自定义参数校验器

> 参数校验器使用的是**Lin-Validator库**
>
> **Lin-Validator库**也是对**validator.js库**的再封装

* Lin-Validator的使用可查看
  * [LinValidator官方使用教程](https://doc.cms.talelin.com/server/koa/validator.html)
  * [个人博客本项目详解-校验器](https://chuckiewill.github.io/2020/03/02/node/koa/koa/)

* 编码位置：`app/validators/validator.js`

###  2.5 自定义sequelize模型

> 使用`sequelize`连接数据库，利用模型实现对数据库的增删改查

* 本项目数据库使用的是MySQL，如果用其他数据库需要安装其他依赖相应依赖

  ```js
  $ npm install --save pg pg-hstore # Postgres
  $ npm install --save mysql2    //使用mysql时安装  本项目已安装
  $ npm install --save mariadb
  $ npm install --save sqlite3
  $ npm install --save tedious # Microsoft SQL Server
  ```

* `sequelize`的使用可查看

  * [Sequelize官方文档](https://www.sequelize.com.cn/)
  * [个人博客本项目详解-Sequelize的使用(集合数据库MySQL)](https://chuckiewill.github.io/2020/03/02/node/koa/koa/)

* 编码位置：`app/models`文件夹下新建文件，一般一个数据库中的表单对应一个文件即一个数据模型



###  2.6 自定义http-exception错误类

> **应用场景：**
>
> * 每次有异常或错误抛出时，直接实例化http错误类即可，更加方便，**抛出的错误和异常也更加规范**

* 根据具体业务的要求可以继续添加特定的错误类
* 使用时，导入并实例化错误类，然后抛出错误即可
* 统一定义了错误信息（http状态码、错误描述、自定义错误码）
* 编码位置：`core/http-exception.js`



###  2.7 生成token令牌

> 依赖第三方库：`jsonwebtoken`
>
> 使用教程：[jsonwebtoken官网](https://www.npmjs.com/package/jsonwebtoken)

**使用：**

1. 导入`const jwt = require('jsonwebtoken')//第三方库 ，需要安装`
2. 根据官方文档进行token的生成和校验等

**结合用户登录、token生成、token校验**

* 本项目在用户登录时会生成token，生成token时需要将用户信息（用户id: uid，用户角色：scope）携带在token上，便于以后进行用户角色、访问权限的校验
* generateToken是封装的生成token的函数
  * 用户角色在下文*可扩展性 / 扩展登录角色*中有介绍

```js
const {generateToken} = require('../../../core/utils') //生成token令牌
const {User} = require('../../models/user') //用户模型，操作数据库
//参数：传入用户id、用户角色
const token = generateToken(user.id, Auth.USER)
```





###  2.8 可扩展性

#### 2.8.1 扩展用户登录方式

1. `app/lib/enum.js`中添加用户登录方式

   ```js
   //登录用户类型
   const LoginType = {
     USER_MINI_PROGRAM: 100,//小程序方式登录
     USER_EMAIL: 101,//用户邮箱登录
     USER_MOBILE: 102,//用户手机登录
     ADMIN_EMAIL: 200,//管理员邮箱登录
     //自定义其他登录方式
     isTheType
   }
   ```

2. `app/api/v1/token.js 登录获取token接口`中添加用户登录的处理函数

   * 根据前端传来的`type`swith-case到自定义的用户登录的处理函数中
   * 自定义用户登录处理函数要求：
     * 前端传入的参数只有：`account: 账户  secret: 密码 type：登录类型`，如果需要其它参数需要在`app/validators/validator.js-TokenValidator校验类`中添加参数校验
     * 在数据库中查找用户，密码对比等，身份验证通过则执行下一步
     * 生成token并返回前端 ---*生成token令牌教程在上文有*



####  2.8.2 扩展项目初始化内容

> 需要在项目一启动就初始化的内容可以在下面的文件中编写

* 编码位置：`core/init.js`
* 目前已实现的初始化
  * 将所有路由添加为中间件
  * 将http错误类添加到global全局变量上
  * 将配置文件config添加到global全局变量上



#### 2.8.3 扩展登录角色(用户访问接口权限校验机制)

> 校验包括： 
>
> * token合法性校验
> * 用户角色是否可访问校验

**使用：**

* 在路由的**具体业务中间件**前加上**接口访问权限校验的中间件**，若通过校验则执行具体业务，否则抛出异常，返回前端
* `new Auth().m`即为**接口访问权限校验的中间件**， 传入的参数即为该接口可访问权限的下限，*参数下文有讲解*

* 使用时需要导入`Auth`类，`LoginAuth`类

**自定义用户角色：**

* `middlewares/auth.js`中定义

  ```js
  constructor(level){
      this.level = level || 1//设置实例化的api权限要求
      //类变量-scope角色定义
      Auth.USER = 8 //普通用户
      Auth.ADMIN = 16 //管理员
      Auth.SUPER_ADMIN = 32 //超级管理员
      //自定义更高权限用户类型
    }
  ```

* 在用户登录，获取token时需要将用户类型保存到token中，这样在用户访问接口时，才能在token中获取用户类型用于权限判断---- *可查看上文生成token令牌教程*

**自定义访问权限级别：**

> 以下定义的级别即为传入`new Auth().m`的参数

* `app/lib/enum.js`中定义

  ```js
  //用户权限
  const LoginAuth = {
    CAN_ADMIN : 9, //管理员和超级管理可访问
    CAN_SUPER_ADMIN : 17, //超级管理可访问
    //自定义更高级别访问权限
  }
  ```

**用户角色传递流程：**

1. 用户登录，生成token，将用户角色scope字段携带在token中发给前端
2. 前端请求接口时发来token，在token中取出scope字段
3. 比较scope与传入设定的可访问级别LoginAuth
   * `scope> LoginAuth.CAN_ADMIN`时，管理员及以上权限可访问该接口
   * `scope> LoginAuth.CAN_SUPER_ADMIN`时，超级管理员及以上权限可访问该接口
   * 依次类推自定义的情况

