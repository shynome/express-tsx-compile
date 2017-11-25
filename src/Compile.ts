import ts = require('typescript')
import Url = require('url')
import path = require('path')
import { RequestHandler } from "express";
import { sys, FileWatcher } from 'typescript'
import { EventEmitter } from "events";
export type Import = {
  module:string
  filename:string
}
export class Compile {
  development = ! /production/i.test(process.env.NODE_ENV)  
  server:ts.LanguageService
  private __compilerOptions:ts.CompilerOptions = {
    target: ts.ScriptTarget.ES5, 
    module:ts.ModuleKind.AMD, 
    jsx:ts.JsxEmit.React, 
    moduleResolution:ts.ModuleResolutionKind.NodeJs, 
    sourceMap:this.development
  }
  get compilerOptions(){ return this.__compilerOptions }
  set compilerOptions(val){
    Object.assign(this.__compilerOptions,val)
    this.compilerOptionsHash = sys.createHash(JSON.stringify(this.compilerOptions))
  }
  compilerOptionsHash:string = ''
  project:string = sys.getCurrentDirectory()
  hash:{[filename:string]:string} = {}
  resolveModuleNames=(moduleNames:string[],containingFile:string)=>{
    return moduleNames.map((module)=>{
      let resolvedModule = ts.resolveModuleName(module,containingFile,this.compilerOptions,sys).resolvedModule
      if(resolvedModule && resolvedModule.resolvedFileName){
        this.getScriptVersion(resolvedModule.resolvedFileName)
      }
      return resolvedModule
    })
  }
  resolveModule = (module:string,file='')=>{
    let resolvedModule = ts.resolveModuleName(module,file,this.compilerOptions,sys).resolvedModule
    return resolvedModule && resolvedModule.resolvedFileName
  }
  updateScriptVersion = (file)=>{
    let code = sys.readFile(file)
    return this.hash[file] = sys.createHash(code+this.compilerOptionsHash)
  }
  getScriptVersion = (file)=>{
    file = sys.resolvePath(file)
    let md5:string = this.hash[file]
    if(!md5){
      md5 = this.updateScriptVersion(file)
      this.development && this.watchers.push(sys.watchFile(file,this.watch))
    }
    return md5
  }
  static ParseConfigFile = (configfile:string)=>{
    return ts.parseJsonSourceFileConfigFileContent(
      ts.parseJsonText(configfile,ts.sys.readFile(configfile)),
      {
        useCaseSensitiveFileNames:false,
        readDirectory:ts.sys.readDirectory,
        fileExists:ts.sys.fileExists,
        readFile:ts.sys.readFile
      },
      path.dirname(configfile)
    )
  }
  init = (compilerOptionsOrProjectDirname:ts.CompilerOptions|string)=>{
    let config:any = {}, configfile:string, baseconfig = {}
    if(typeof compilerOptionsOrProjectDirname==='string'){
      let project = compilerOptionsOrProjectDirname
      switch(true){
        case ts.sys.fileExists(configfile=project):
        case ts.sys.fileExists(configfile=path.join(project,"./tsconfig.json")):
          config = Compile.ParseConfigFile(configfile).options
          break;
        default:
          config = {}
          console.warn(`in project dir can't find tsconfig.json `)
          break;
      }
    }else if(typeof compilerOptionsOrProjectDirname==='object'){
      config = compilerOptionsOrProjectDirname
    }else if( ts.sys.fileExists(configfile=path.join(process.cwd(),'./tsconfig.json')) ){
      baseconfig = Compile.ParseConfigFile(configfile)
    }
    this.compilerOptions = {
      ...baseconfig,
      ...this.compilerOptions,
      ...config,
    }
    return configfile
  }
  constructor(compilerOptionsOrProjectDirname?:ts.CompilerOptions|string,development=!(/production/i.test(process.env.NODE_ENV))){
    this.development = development
    this.server = ts.createLanguageService({
      getCompilationSettings:()=>this.compilerOptions,
      getScriptFileNames:()=>Object.keys(this.hash),
      getScriptVersion:(file)=>this.getScriptVersion(file),
      getScriptSnapshot:(file)=>sys.fileExists(file) ? ts.ScriptSnapshot.fromString(sys.readFile(file)) : undefined,
      getCurrentDirectory:()=>this.project,
      getDefaultLibFileName:(options)=>ts.getDefaultLibFileName(options),
      resolveModuleNames:(moduleNames,containingFile)=>this.resolveModuleNames(moduleNames,containingFile),
    })
    let configfile = this.init(compilerOptionsOrProjectDirname)    
    if(this.development && typeof configfile ==='string'){
      this.watchers.push(
        sys.watchFile(configfile,()=>this.init(compilerOptionsOrProjectDirname))
      )
    }
  }
  watcher = new EventEmitter()
  watchers:FileWatcher[] = []
  unwatch = ()=>this.watchers.map((watcher)=>watcher.close())
  watch = (file)=>{
    let lastScriptVersion = this.getScriptVersion(file)
    let nowScriptVersion = this.updateScriptVersion(file)
    if( nowScriptVersion === lastScriptVersion ){
      return
    }
    this.watcher.emit('update',file)
  }
  getFileImports = (file,program=this.server.getProgram())=>{
    let source = program.getSourceFile(file) as any
    let resolvedModules:string[] = []
    if(!( source && source.resolvedModules )){
      return resolvedModules
    }
    resolvedModules = Array.from((source.resolvedModules as Map<any,{resolvedFileName:string}>).values()).filter(v=>v).map(({resolvedFileName})=>resolvedFileName)
    return resolvedModules
  }
  getImports = (file:string,imports = [file],program=this.server.getProgram()):string[]=>{
    let newImports = [file].concat(this.getFileImports(file,program)).filter(m=>!imports.includes(m))
    return !newImports.length
      ? imports
      : newImports.reduce((all,p)=>this.getImports(p,all,program),imports.concat(newImports))
  }
  static ignore = (file)=>{
    let result:boolean
    if(0
      ||  /node_modules/.test(file)
      ||  /\.d\.ts$/.test(file)
    ){
      return true
    }
    return false
  }
  static normalize = (f:string)=>sys.resolvePath(f).replace(/\\/g,'/')
  getImportsWithoutTypes = (file:string)=>this.getImports(Compile.normalize(file)).filter((file)=>!Compile.ignore(file))
  getEmitOutput = (file)=>this.server.getEmitOutput(file)
  getSourceCode = (file)=>this.server.getProgram().getSourceFile(file).text
  getCompiledCode = (file)=>{
    let outputFiles = this.getEmitOutput(file).outputFiles.slice(0,2)
    return outputFiles.slice(-1)[0].text
  }
  getSourceMap = (file)=>{
    let outputFiles = this.getEmitOutput(file).outputFiles.slice(0,2)
    if(outputFiles.length===1){
      return 'no sourceMap'//false
    }
    return outputFiles.slice(0,1)[0].text
  }
  static regx = {
    sourceMap:/\.js\.map$/,
    exts:/\.(ts(x|)|js(x|))$/,
    isLinux:/^\/([^:]+)\//,
  }
  pathMapToFile = (module:string):string=>{
    let file:string = module
    switch(true){
    case !!(file = this.__pathMapToFile(module)):
    case !!(file = this.__pathMapToFile(module+'/index')):
      return file
    default:
      return undefined
    }
  }
  private __pathMapToFile = (module:string,tryExts:string[]=['tsx','ts','jsx','js','']):string|undefined=>{
    let file:string
    if( !tryExts[0] ){ return undefined }
    return Reflect.has(this.hash,file=module+'.'+tryExts[0])
      ? file
      : this.__pathMapToFile(module,tryExts.slice(1))
  }
  jsExpiredTime:number =15*1*24*60*60
  staticServer:RequestHandler = async(req,res)=>{
    let url = Url.parse(req.url)
    let regx = Compile.regx
    let { pathname, query={} } = url
    let path:string = pathname.slice(regx.isLinux.test(pathname)?0:1)
        path = sys.resolvePath(path)
    let isRequestSourceMap = regx.sourceMap.test(path)
    if( isRequestSourceMap ){ path = path.replace(regx.sourceMap,'') }
    let module = path.replace(Compile.regx.exts,'')
    let file:string
    if( !(file = this.pathMapToFile(module)) ){
      return res.status(404).end(`not found`)
    }
    let body:string = ''
    switch(true){
      case isRequestSourceMap:
        res.type('.json')
        body = this.getSourceMap(file)
        break
      case typeof req.query.v === 'string':
        res.type('.js').setHeader('Cache-Control',`max-age=${this.jsExpiredTime}`)
        body = this.getCompiledCode(file)
        break
      default:
        res.type('application/x-typescript')
        body = this.getSourceCode(file)
        break
    }
    res.send(body)
  }
  tourl = (baseurl:string)=>(m:string)=>(baseurl+m+`?v=${this.getScriptVersion(m)}`).replace(/\\/g,'/')
}