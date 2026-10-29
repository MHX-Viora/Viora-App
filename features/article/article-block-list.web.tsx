import { forwardRef, Fragment, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import { FlatList } from 'react-native';
import type NativeDraggableFlatList from 'react-native-draggable-flatlist';
import type { DraggableFlatListProps } from 'react-native-draggable-flatlist';

function ArticleBlockList<T>(props: DraggableFlatListProps<T>, ref: Ref<FlatList<T>>) {
  const { data, keyExtractor } = props;
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    data.forEach((item, index) => {
      const key = keyExtractor(item, index);
      const card = document.getElementById(`article-block-${key}`);
      if (!card) return;
      const top = card.parentElement!.getBoundingClientRect().top;
      const previous = positions.current.get(key);
      next.set(key, top);
      if (!reduceMotion && previous !== undefined && Math.abs(previous - top) > 1 && !card.hasAttribute('data-article-dragging')) {
        card.getAnimations().forEach(animation => animation.cancel());
        card.animate([{ transform: `translateY(${previous - top}px)` }, { transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
    });
    positions.current = next;
  }, [data, keyExtractor]);
  const { renderItem, onDragEnd: _onDragEnd, containerStyle: _containerStyle, ...listProps } = props;
  return <FlatList {...listProps} ref={ref} renderItem={({ item, index }) => <Fragment>{renderItem({ item, getIndex: () => index, drag: () => {}, isActive: false })}</Fragment>} />;
}

export const ScaleDecorator = ({ children }: { children: ReactNode; activeScale?: number }) => <Fragment>{children}</Fragment>;
export default forwardRef(ArticleBlockList) as typeof NativeDraggableFlatList;
