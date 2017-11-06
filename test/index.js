require('./compile')
require('./staticServer')
describe('clear',()=>{
  it('close file watch',()=>{
    require('./compile').compiler.unwatch()
  })
})