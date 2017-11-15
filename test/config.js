const { Compile } = require('..')
const assert = require('assert')
describe('config',()=>{
  it('parse project config with extend',async()=>{
    let compilers = [ new Compile(), new Compile(__dirname+'/project1') ]
    compilers.forEach((item)=>item.unwatch())
    let [ compiler_base, compiler1 ] = compilers
    const getAttrLength = o=>Object.keys(o).length
    let result = getAttrLength(compiler1.compilerOptions) - getAttrLength(compiler_base.compilerOptions)
    assert(
      result > 1,
      `parse \`tsconfig.json\`  has error, but now result is \`${result} \` `
    )
  })
})