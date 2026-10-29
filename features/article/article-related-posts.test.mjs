import assert from 'node:assert/strict';
import test from 'node:test';
import {compile} from './article-access.test.mjs';
const post=(id,extra={})=>({id,postType:2,article:{title:id,readingTimeMinutes:3},...extra});

test('related articles search unique hashtags and rank shared topics while excluding self, ads and non-articles',async()=>{
 const requests=[];
 const {getRelatedArticles}=compile('features/article/article-related-posts.ts',{
  '@/services/feed.service':{getPosts:async input=>{requests.push(input);return {posts:input.keyword==='#âmnhạc'?[post('self'),post('one'),post('shared'),post('ad',{advertisement:{id:'paid'}}),post('ordinary',{postType:0})]:[post('two'),post('shared'),post('shared')],totalPages:1};}},
 });
 const result=await getRelatedArticles({id:'self',hashtags:[{name:'#ÂmNhạc'},{name:'âmnhạc'},{name:'Kpop'}]});
 assert.deepEqual(requests.map(r=>r.keyword),['#âmnhạc','#kpop']);
 assert.ok(requests.every(r=>r.postType===2&&r.page===1&&r.pageSize===6&&r.sort==='latest'));
 assert.deepEqual(result.map(item=>item.post.id),['shared','one','two']);
 assert.deepEqual(result[0].topics,['âmnhạc','kpop']);
});

test('related articles tolerate partial failures, cap results and skip missing hashtags',async()=>{
 let calls=0;
 const {getRelatedArticles}=compile('features/article/article-related-posts.ts',{
  '@/services/feed.service':{getPosts:async input=>{calls++;if(input.keyword==='#failed')throw Error('Offline');return {posts:Array.from({length:6},(_,i)=>post('result-'+i)),totalPages:1};}},
 });
 assert.deepEqual(await getRelatedArticles({id:'self'}),[]);assert.equal(calls,0);
 const result=await getRelatedArticles({id:'self',hashtags:[{name:'failed'},{name:'works'}]});
 assert.equal(result.length,4);assert.equal(result[0].topics[0],'works');
 await assert.rejects(getRelatedArticles({id:'self',hashtags:[{name:'failed'}]}),/Không thể tải bài viết liên quan/);
});

test('related article queries include all topics with at most three active requests',async()=>{
 let active=0,peak=0,calls=0;
 const {getRelatedArticles}=compile('features/article/article-related-posts.ts',{
  '@/services/feed.service':{getPosts:async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setImmediate(r));active--;return {posts:[],totalPages:1};}},
 });
 await getRelatedArticles({id:'self',hashtags:Array.from({length:8},(_,i)=>({name:'topic'+i}))});
 assert.equal(calls,8);assert.equal(peak,3);
});
