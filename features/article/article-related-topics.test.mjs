import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {compile} from './article-access.test.mjs';
const require=createRequire(import.meta.url),React=require('react'),native=require('react-native-web');
const theme=compile('theme/classic.ts').classicTheme;
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child,predicate);if(result)return result;}return null;}
function reader({width=375,tags=[{id:'topic',name:'ÂmNhạc'}],owner=false}={}){
 let cursor=0,focus;const state=[],routes=[];
 const {ArticleReaderScreen}=compile('features/article/article-reader-screen.tsx',{
  react:{...React,useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:()=>{},useRef:initial=>({current:initial}),useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];}},
  'react-native':{...native,useWindowDimensions:()=>({width,height:900})},
  '@react-navigation/native':{useFocusEffect:fn=>{focus=fn;}},
  'expo-router':{useLocalSearchParams:()=>({id:'report'}),router:{push:route=>routes.push(route)}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  '@expo/vector-icons/Ionicons':'Icon','@/components/article/article-renderer':{ArticleBlockView:'Block'},
  '@/components/common/user-avatar':{UserAvatar:'Avatar'},
  './article-related-posts-card':{ArticleRelatedPostsCard:'RelatedPosts'},
  './article-author-follow-button':{ArticleAuthorFollowButton:'Follow'},
  '@/hooks/use-responsive':{useResponsive:()=>({isDesktopWeb:width>=1024,width})},
  '@/theme':{spacing:{xs:4,sm:8,md:12,lg:16,xl:24},layout:{articleMaxWidth:760},useTheme:()=>({theme})},
  '@/services/article.service':{getArticle:async()=>({id:'report',title:'Report',isOwner:owner,author:{id:'reporter',displayName:'Kai'},blocks:[{id:'body',type:0,content:'Full report'}],hashtags:tags}),trackArticleInteraction:async()=>{}},
 });
 return {routes,render:()=>{cursor=0;return ArticleReaderScreen();},load:async()=>{cursor=0;ArticleReaderScreen();focus();await new Promise(resolve=>setImmediate(resolve));}};
}
test('compact reader puts saved related topics after article blocks and opens hashtag search',async()=>{
 const h=reader();await h.load();const tree=h.render();
 const list=find(tree,n=>n.props?.data?.[0]?.id==='body');
 assert.ok(list.props.ListFooterComponent);
 const chip=find(list.props.ListFooterComponent,n=>n.props?.accessibilityLabel==='Tìm bài báo theo chủ đề ÂmNhạc');
 assert.ok(chip);chip.props.onPress();
 assert.deepEqual(h.routes,[{pathname:'/article/search',params:{hashtag:'ÂmNhạc'}}]);
});
test('wide reader shows related topics beside the article, not in its footer',async()=>{
 const h=reader({width:1440});await h.load();const tree=h.render();
 assert.ok(find(tree,n=>n.props?.accessibilityLabel==='Chủ đề liên quan'));
 assert.equal(find(tree,n=>n.props?.data?.[0]?.id==='body').props.ListFooterComponent,null);
});
test('reader without hashtags omits related topics',async()=>{
 const h=reader({tags:[]});await h.load();
 assert.equal(find(h.render(),n=>n.props?.accessibilityLabel==='Chủ đề liên quan'),null);
 assert.equal(find(h.render(),n=>n.props?.data?.[0]?.id==='body').props.ListFooterComponent,null);
});
test('follow action shares the author name row and is hidden on own articles',async()=>{
 for(const owner of [false,true]){
  const h=reader({owner});await h.load();
  const header=find(h.render(),n=>n.props?.data?.[0]?.id==='body').props.ListHeaderComponent;
  const row=find(header,n=>React.Children.toArray(n.props?.children).some(child=>child.type==='Follow'));
  assert.equal(Boolean(row),!owner);
  if(!owner)assert.ok(find(row,n=>n.props?.children==='Kai'));
 }
});
test('article search initializes its editable query from the selected hashtag',()=>{
 const {FeedSearchModal}=compile('components/feed/feed-search-modal.tsx',{
  react:{...React,useState:v=>[v,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:v=>({current:v})},
  'react-native':native,'@expo/vector-icons/Ionicons':'Icon',
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  '@/components/feed/article-sort-tabs':{ArticleSortTabs:'Tabs'},'@/components/feed/post-card':{PostCard:'PostCard'},
  '@/hooks/use-responsive':{useResponsive:()=>({isDesktopWeb:false})},
  '@/services/feed.service':{},
  '@/theme':{spacing:{xs:4,sm:8,md:12,lg:16,xl:24},useTheme:()=>({theme})},
 });
 const tree=FeedSearchModal({visible:true,initialQuery:'#ÂmNhạc',category:'articles',articleSort:'recommended',onClose(){},onArticleSortChange(){}});
 assert.equal(find(tree,n=>n.props?.accessibilityLabel==='Tìm kiếm bài báo').props.value,'#ÂmNhạc');
});

test('search route uses article-only search and supports opening results and safe back navigation',()=>{
 const routes=[];
 const {ArticleSearchScreen}=compile('features/article/article-search-screen.tsx',{
  react:{...React,useState:value=>[value,()=>{}]},
  '@react-navigation/native':{useIsFocused:()=>true},
  'expo-router':{useLocalSearchParams:()=>({hashtag:'#ÂmNhạc'}),router:{canGoBack:()=>false,replace:route=>routes.push(route),push:route=>routes.push(route)}},
  '@/components/feed/feed-search-modal':{FeedSearchModal:'Search'},
 });
 const search=ArticleSearchScreen();
 assert.equal(search.props.initialQuery,'#ÂmNhạc');assert.equal(search.props.category,'articles');
 search.props.onOpenArticle('matching-article');search.props.onClose();
 assert.deepEqual(routes,[{pathname:'/article/[id]',params:{id:'matching-article'}},{pathname:'/',params:{category:'articles'}}]);
});
