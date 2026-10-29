import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { SvgaPlayerProps } from './svga-player';
import { svgaPlayerScript, svgaSource } from './svga-source';

type Player = { loops: number; setVideoItem: (item: unknown) => void; startAnimation: () => void; stopAnimation: () => void; clear: () => void; setContentMode: (mode: string) => void; onFinished: (callback: () => void) => void };
type Library = { Player: new (element: HTMLElement) => Player; Parser: new (element: HTMLElement) => { load: (url: string, done: (item: unknown) => void, failed: () => void) => void } };
let loading: Promise<Library> | undefined;
function load() {
  const global = window as unknown as { SVGA?: Library };
  if (global.SVGA) return Promise.resolve(global.SVGA);
  loading ??= new Promise<Library>((resolve, reject) => {
    const script = document.createElement('script'); script.src = svgaPlayerScript();
    script.onload = () => global.SVGA ? resolve(global.SVGA) : reject(new Error('SVGA player unavailable'));
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error('SVGA player unavailable')); };
    document.head.append(script);
  });
  return loading;
}
export function SvgaPlayer({ url, onFinished, style }: SvgaPlayerProps) {
  const host = useRef<View>(null); const done = useRef(onFinished); done.current = onFinished;
  useEffect(() => {
    const element = host.current as unknown as HTMLElement | null; if (!element) return;
    let disposed = false; let player: Player | undefined;
    const finish = () => { if (!disposed) done.current(); };
    void load().then(library => {
      if (disposed) return;
      player = new library.Player(element); player.loops = 1; player.setContentMode('AspectFit'); player.onFinished(finish);
      new library.Parser(element).load(svgaSource(url), item => { if (!disposed) { player!.setVideoItem(item); player!.startAnimation(); } }, finish);
    }).catch(finish);
    return () => { disposed = true; player?.stopAnimation(); player?.clear(); element.replaceChildren(); };
  }, [url]);
  return <View pointerEvents="none" ref={host} style={style} />;
}
