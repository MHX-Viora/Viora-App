import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { SvgaPlayerProps } from './svga-player';
import { svgaPlayerScript, svgaSource } from './svga-source';
import { svgaArtworkFrame } from './svga-player-layout';

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
export function SvgaPlayer({ url, onFinished, style, fillWidth = false }: SvgaPlayerProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null); const done = useRef(onFinished); done.current = onFinished;
  const latestFillWidth = useRef(fillWidth); latestFillWidth.current = fillWidth;
  const resize = useRef(() => {});
  useEffect(() => { resize.current(); }, [fillWidth]);
  useEffect(() => {
    const element = host.current, stage = viewport.current; if (!element || !stage) return;
    let disposed = false; let player: Player | undefined;
    let movie: { width: number; height: number } | undefined;
    const layout = () => {
      if (!movie || disposed) return;
      const rect = svgaArtworkFrame({ width: stage.clientWidth, height: stage.clientHeight }, movie, latestFillWidth.current);
      Object.assign(element.style, { left: `${rect.left}px`, bottom: '0px', width: `${rect.width}px`, height: `${rect.height}px` });
      player?.setContentMode('AspectFit');
    };
    resize.current = layout;
    const observer = new ResizeObserver(layout); observer.observe(stage);
    const finish = () => { if (!disposed) done.current(); };
    void load().then(library => {
      if (disposed) return;
      player = new library.Player(element); player.loops = 1; player.setContentMode('AspectFit'); player.onFinished(finish);
      new library.Parser(element).load(svgaSource(url), item => {
        if (disposed) return;
        const size = (item as { videoSize?: { width: number; height: number } })?.videoSize;
        if (!size || ![size.width, size.height].every(value => Number.isFinite(value) && value > 0)) { finish(); return; }
        movie = size; layout(); player!.setVideoItem(item); player!.startAnimation();
      }, finish);
    }).catch(finish);
    return () => { disposed = true; observer.disconnect(); resize.current = () => {}; player?.stopAnimation(); player?.clear(); element.replaceChildren(); };
  }, [url]);
  // SVGA computes transforms from the canvas's intrinsic size. A flex container
  // stretches/shrinks that canvas before the transform, scaling it twice.
  return <View pointerEvents="none" style={style}><div ref={viewport} style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'hidden' }}><div ref={host} style={{ position: 'absolute', bottom: 0, display: 'block' }} /></div></View>;
}
