const server = require('express')()
const compiler = require('./compile').compiler
const request = require('supertest')
const path = require('path')
server.use(compiler.staticServer)
describe('compiler static server test',()=>{
  let file = path.resolve('test/views/index.tsx')
    , filepath = '\\'+file
  before(async()=>{
    compiler.compilerOptions.sourceMap = true
  })
  it('get compiled code',async()=>{
    let code = compiler.getCompiledCode(file)
    return request(server).get(filepath+'?v=hash')
    .expect('Content-Type', /javascript/)
    .expect(200,code)
  })
  it('get source code',async()=>{
    return request(server).get(filepath)
    .expect('Content-Type', /typescript/)
    .expect(200)
  })
  it('get map file',async()=>{
    return request(server).get(filepath.replace(/\.ts(|x)$/,'.js.map'))
    .expect('Content-Type', /json/)
    .expect(200)
  })
})