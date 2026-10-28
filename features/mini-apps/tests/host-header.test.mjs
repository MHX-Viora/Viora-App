import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),React=require('react'),native=require('react-native-web'),ts=require('typescript');
const {renderToStaticMarkup}=require('react-dom/server');
function fixture(canGoBack=true){
  const controls=[],views=[],events=[];
  const state={phase:'running',status:'bridge.connected',attempt:1,detail:{app:{name:'Nghệ Thuật Số',logoUrl:null}}};
  class Controller{subscribe=()=>()=>{};snapshot=()=>state;close=()=>events.push('close');open=async()=>events.push('open');hostStatus=()=>{};}
  const overrides={
    '@react-navigation/native':{useFocusEffect(){}},'expo-router':{router:{canGoBack:()=>canGoBack,back:()=>events.push('back'),replace:path=>events.push(path),push:path=>events.push(path)}},
    'react-native':{...native,View:props=>{views.push(props);return React.createElement(native.View,props);},Pressable:props=>{controls.push(props);return React.createElement(native.Pressable,props);}},
    'react-native-safe-area-context':{SafeAreaView:native.View},'@/services/mini-app.service':{miniAppCatalog:{}},'./lib/catalog-cache':{miniAppCatalogCache:{invalidate(){}}},
    './lib/host-controller':{MiniAppHostController:Controller,miniAppsEnabled:true},'./adapters/host':{__esModule:true,default:()=>null},
    '@expo/vector-icons/Ionicons':{__esModule:true,default:props=>React.createElement('span',{'data-icon':props.name,'aria-hidden':true})},
    '@/theme':{spacing:{sm:8,md:12,lg:16},useTheme:()=>({theme:{colors:{background:'#fff',primary:'#087f8c',primarySoft:'#eaf7f8',text:'#123',textMuted:'#678',borderSubtle:'#ddd'}}})},
  };
  const filename=fileURLToPath(new URL('../mini-app-host-screen.tsx',import.meta.url));
  const mod=new Module(filename);mod.require=name=>Object.hasOwn(overrides,name)?overrides[name]:require(name);
  mod._compile(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  const html=renderToStaticMarkup(React.createElement(mod.exports.MiniAppHostScreen,{appId:'app_'+'a'.repeat(43)}));
  return {html,controls,views,events};
}
test('compact icon toolbar keeps app name, accessible back/support and no reopen control',()=>{
  const f=fixture();assert.match(f.html,/Nghệ Thuật Số/);assert.match(f.html,/aria-label="Quay về ANKT"/);assert.match(f.html,/aria-label="Hỗ trợ Mini App"/);
  assert.doesNotMatch(f.html,/>Đóng Mini App<|>Mở lại</);
  const header=f.views.find(view=>view.testID==='mini-app-toolbar');assert.ok(header);assert.equal(header.style[0].height,40);
  f.controls.find(control=>control.accessibilityLabel==='Quay về ANKT').onPress();assert.deepEqual(f.events,['close','back']);
});
test('support routes to ANKT help and direct-launch back falls back to Utilities',()=>{
  const f=fixture(false);f.controls.find(control=>control.accessibilityLabel==='Hỗ trợ Mini App').onPress();assert.deepEqual(f.events,['/support']);
  f.controls.find(control=>control.accessibilityLabel==='Quay về ANKT').onPress();assert.deepEqual(f.events,['/support','close','/(tabs)/utilities']);
});
