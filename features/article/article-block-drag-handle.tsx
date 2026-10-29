import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Platform, Pressable } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  blockKey: string;
  drag: () => void;
  onMoveTo: (key: string) => void;
  onMoveBy: (direction: number) => void;
};

export function ArticleBlockDragHandle({ blockKey, drag, onMoveTo, onMoveBy }: Props) {
  const { theme } = useTheme();
  const [dragging, setDragging] = useState(false);
  const move = useRef(onMoveTo);
  move.current = onMoveTo;
  const cleanup = useRef<((settle?: boolean) => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const label = 'Giữ và kéo để đổi vị trí block';
  const icon = <Ionicons color={theme.colors.textMuted} name="reorder-three-outline" size={24} />;

  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    cleanup.current?.();
    const pointerId = event.pointerId;
    const originY = event.clientY;
    const source = document.getElementById(`article-block-${blockKey}`);
    if (!source) return;
    const sourceBounds = source.getBoundingClientRect();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lifted = source.cloneNode(true) as HTMLElement;
    lifted.removeAttribute('id');
    lifted.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    lifted.setAttribute('aria-hidden', 'true');
    lifted.inert = true;
    source.querySelectorAll('textarea').forEach((element, index) => { lifted.querySelectorAll('textarea')[index].value = element.value; });
    Object.assign(lifted.style, {
      position: 'fixed', top: `${sourceBounds.top}px`, left: `${sourceBounds.left}px`,
      width: `${sourceBounds.width}px`, height: `${sourceBounds.height}px`, margin: '0',
      pointerEvents: 'none', zIndex: '9999', opacity: '0.96', transformOrigin: 'center center',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.16)', borderColor: theme.colors.primary,
      willChange: 'transform',
    });
    const previousOpacity = source.style.opacity;
    const previousBorder = source.style.borderColor;
    source.style.opacity = '0.32';
    source.style.borderColor = theme.colors.primary;
    source.setAttribute('data-article-dragging', 'true');
    document.body.appendChild(lifted);
    let x = event.clientX, y = originY, frame = 0;
    let scroller: HTMLElement | null = event.currentTarget.parentElement;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
    setDragging(true);
    const tick = () => {
      lifted.style.transform = `translate3d(0, ${y - originY}px, 0) scale(${reduceMotion ? 1 : 1.012})`;
      if (Math.abs(y - originY) >= 4) {
        if (scroller) {
          const bounds = scroller.getBoundingClientRect();
          if (y < bounds.top + 48) scroller.scrollTop -= 8;
          else if (y > bounds.bottom - 48) scroller.scrollTop += 8;
        }
        for (const element of Array.from(document.querySelectorAll<HTMLElement>('[id^="article-block-"]'))) {
          const bounds = element.parentElement!.getBoundingClientRect();
          if (y >= bounds.top && y <= bounds.bottom && x >= bounds.left && x <= bounds.right) {
            const key = element.id.slice('article-block-'.length);
            const own = source.parentElement?.getBoundingClientRect();
            if (key !== blockKey && own && (bounds.top > own.top ? y > bounds.top + bounds.height / 2 : y < bounds.top + bounds.height / 2)) move.current(key);
            break;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const pointerMove = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      next.preventDefault();
      x = next.clientX; y = next.clientY;
    };
    const stop = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      cleanup.current?.(next.type === 'pointerup');
      setDragging(false);
    };
    cleanup.current = (settle = false) => {
      cancelAnimationFrame(frame);
      source.style.opacity = previousOpacity;
      source.style.borderColor = previousBorder;
      source.removeAttribute('data-article-dragging');
      if (settle && !reduceMotion && source.isConnected) {
        const target = source.getBoundingClientRect();
        const animation = lifted.animate([
          { transform: lifted.style.transform },
          { transform: `translate3d(0, ${target.top - sourceBounds.top}px, 0) scale(1)` },
        ], { duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
        void animation.finished.then(() => lifted.remove(), () => lifted.remove());
      } else lifted.remove();
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', blur);
      cleanup.current = null;
    };
    const blur = () => { cleanup.current?.(); setDragging(false); };
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', blur);
    frame = requestAnimationFrame(tick);
  };

  if (Platform.OS !== 'web') return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityHint="Giữ nút rồi kéo lên hoặc xuống" delayLongPress={200} onLongPress={drag} style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 40 }}>{icon}</Pressable>;
  return createElement('div', {
    role: 'button', tabIndex: 0, 'aria-label': label, 'aria-pressed': dragging,
    title: 'Kéo để đổi vị trí; dùng phím mũi tên lên/xuống để di chuyển',
    onPointerDown: begin,
    onKeyDown: event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMoveBy(event.key === 'ArrowUp' ? -1 : 1); }
    },
    style: { alignItems: 'center', justifyContent: 'center', display: 'flex', width: 36, height: 40, flexShrink: 0, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' },
  }, icon);
}
