// @ts-check
process.chdir(__dirname)
const ts = require('typescript')
const fs = require('fs')
const path = require('path')
const readFile = (file)=>fs.readFileSync(file,'utf8')
const getConfig = (file)=>{
  let config = ts.parseJsonSourceFileConfigFileContent(
    ts.parseJsonText(file,ts.sys.readFile(file)),
    {
      useCaseSensitiveFileNames:true,
      readDirectory:ts.sys.readDirectory,
      fileExists:fs.existsSync,
      readFile:ts.sys.readFile
    },
    path.dirname(file),
  )
  return config
}
let a = getConfig(__dirname+'/project1/tsconfig.json')
console.log(a)
debugger