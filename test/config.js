const { Compile } = require('..')
const assert = require('assert')
/**@param {number} t */
const sleep = (t)=>new Promise(rl=>setTimeout(rl,t))
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
  it('reset compilerOptions when the config file has change',async()=>{
    const sys = require('typescript').sys
    let compiler = new Compile(__dirname+'/configWatch')
    let configFilePath = sys.resolvePath(__dirname+'/configWatch/tsconfig.json')
    let config1 = sys.readFile(__dirname+'/configWatch/tsconfig.1.json')
    let config2 = sys.readFile(__dirname+'/configWatch/tsconfig.2.json')

    let lastConfig
    for(let order of Array.from(' '.repeat(4)).map((x,i)=>i)){
      sys.writeFile(configFilePath,order)
      await sleep(200)
      if(lastConfig){
        assert.equal(
          lastConfig,
          compiler.compilerOptions,
          `the compiler compilerOptions is unchange when file change`
        )
      }
      lastConfig = compiler.compilerOptions
    }
    
  })
})