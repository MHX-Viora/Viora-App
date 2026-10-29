import assert from 'node:assert/strict';import test from 'node:test';import {compile} from '../article/article-access.test.mjs';

test('gift banners preserve SVGA metadata without changing price or combo quantities',()=>{
 const {addLiveGiftOverlayEvent,initialLiveGiftOverlayState}=compile('features/live/live-gift-overlay-model.ts');
 const gift={id:'one',senderUserId:'sender',senderName:'Kai',giftId:'lion',giftName:'Sư tử',imageUrl:'https://example.test/image.png',animationUrl:'/api/live-gifts/gift/animation.svga',animationDurationMs:6467,quantity:1,totalAmount:5000};
 let state=addLiveGiftOverlayEvent(initialLiveGiftOverlayState,gift,1000);
 assert.equal(state.visible[0].animationUrl,gift.animationUrl);assert.equal(state.visible[0].animationDurationMs,6467);
 state=addLiveGiftOverlayEvent(state,{...gift,id:'two'},1100);assert.equal(state.visible[0].quantity,2);assert.equal(state.visible.length,1);
 assert.equal(addLiveGiftOverlayEvent(state,{...gift,id:'two'},1200),state);
});
test('SVGA sources reject executable URLs and HTML embeds escaped animation URLs',()=>{
 const previous=process.env.EXPO_PUBLIC_API_URL;process.env.EXPO_PUBLIC_API_URL='https://api.example.test';
 const {svgaSource,svgaHtml}=compile('features/live/svga-source.ts');
 if(previous===undefined)delete process.env.EXPO_PUBLIC_API_URL;else process.env.EXPO_PUBLIC_API_URL=previous;
 assert.throws(()=>svgaSource('javascript:alert(1)'));assert.throws(()=>svgaSource('https://user:password@example.test/file'));
 const html=svgaHtml('https://example.test/effect.svga?q=</script><script>alert(1)</script>');
 assert.equal(html.includes('</script><script>alert(1)'),false);assert.ok(html.includes('player.loops=1'));
});
