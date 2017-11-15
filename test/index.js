require('./compile')
require('./staticServer')
require('./multi-project')
describe('clear',()=>{
  it('close file watch',()=>{
    require('./compile').compiler.unwatch()
  })
})