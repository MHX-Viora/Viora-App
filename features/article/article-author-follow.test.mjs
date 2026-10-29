import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {compile} from './article-access.test.mjs';
const require=createRequire(import.meta.url),React=require('react'),native=require('react-native-web');
const theme=compile('theme/classic.ts').classicTheme;
function harness({following=false,fail=false,loadFail=false}={}){
 let cursor=0;const state=[],effects=[],calls=[],toasts=[];
 const {ArticleAuthorFollowButton}=compile('features/article/article-author-follow-button.tsx',{
  react:{...React,useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),useState:value=>{const i=cursor++;if(!(i in state))state[i]=value;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useRef:value=>{const i=cursor++;state[i]??={current:value};return state[i];}},
  'react-native':native,
  '@/theme':{spacing:{xs:4,sm:8,md:12,lg:16},useTheme:()=>({theme})},
  '@/components/common/app-toast':{showAppToast:value=>toasts.push(value)},
  '@/services/user.service':{getUserProfile:async id=>{calls.push(['load',id]);if(loadFail)throw Error('Offline');return {isFollowing:following};},followUser:async id=>{calls.push(['toggle',id]);if(fail)throw Error('Save failed');return {isFollowing:!following};}},
 });
 return {calls,toasts,effects,render:()=>{cursor=0;return ArticleAuthorFollowButton({authorId:'reporter'});},load:async()=>{cursor=0;ArticleAuthorFollowButton({authorId:'reporter'});effects[0]();await new Promise(r=>setImmediate(r));}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('author follow loads current relationship and guards repeated toggles',async()=>{
 const h=harness();assert.equal(h.render().props.disabled,true);await h.load();
 assert.equal(h.render().props.accessibilityLabel,'Theo dõi tác giả');
 const press=h.render().props.onPress;press();press();await tick();
 assert.deepEqual(h.calls,[['load','reporter'],['toggle','reporter']]);
 assert.equal(h.render().props.accessibilityLabel,'Bỏ theo dõi tác giả');
});
test('an existing follow can be removed and errors preserve the relationship',async()=>{
 const h=harness({following:true});await h.load();h.render().props.onPress();await tick();
 assert.equal(h.render().props.accessibilityLabel,'Theo dõi tác giả');
 const failed=harness({following:true,fail:true});await failed.load();failed.render().props.onPress();await tick();
 assert.equal(failed.render().props.accessibilityLabel,'Bỏ theo dõi tác giả');
 assert.equal(failed.toasts[0].type,'error');
});
test('failed relationship load offers retry instead of toggling an unknown state',async()=>{
 const h=harness({loadFail:true});await h.load();
 assert.equal(h.render().props.accessibilityLabel,'Thử tải trạng thái theo dõi');
 h.render().props.onPress();
 assert.equal(h.calls.some(c=>c[0]==='toggle'),false);
});
