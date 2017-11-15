const { Compile } = require('..')
const assert = require('assert')
describe('Multi-project',()=>{
  it('Multi-project',async()=>{
    let compiler_base = new Compile()
      , compiler1 = new Compile(__dirname+'/project1')
      , compiler2 = new Compile(__dirname+'/project2')
    ;[ compiler_base, compiler1, compiler2 ].forEach((item)=>item.unwatch())
    assert(
      compiler1.compilerOptions != compiler2.compilerOptions
      && Object.keys(compiler1.compilerOptions).length - Object.keys(compiler_base).length > 1
      ,
      `parse \`tsconfig.json\`  has error, now compiler1.config is \`${JSON.stringify(compiler1.compilerOptions)} \` `
    )
  })
})