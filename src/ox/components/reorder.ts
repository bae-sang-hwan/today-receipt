import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { haptic } from '../haptics';

type Slot = { pos: number; size: number };

// 꾹 눌러서 끌어 순서 바꾸기. 칸마다 크기가 달라도(가로 태그) 되도록 각 칸의 위치·크기를 재서 쓴다.
// 끄는 동안 사이의 칸들은 끄는 칸 크기만큼 비켜 주고, 놓으면 빈자리로 미끄러져 들어간 뒤
// 바뀐 순서로 먼저 그리고 저장(onReorder)은 그다음에 한다. 그래야 놓는 순간 튀지 않는다.
export const useDragReorder = <T extends { id: string }>({
  items,
  axis,
  gap = 0,
  onReorder,
}: {
  items: T[];
  axis: 'x' | 'y';
  gap?: number;
  onReorder: (ids: string[]) => void;
}) => {
  // 놓은 직후에는 저장을 기다리지 않고 바뀐 순서로 그린다. 새 items가 들어오면 비운다.
  const [order, setOrder] = useState<string[] | null>(null);
  useLayoutEffect(() => setOrder(null), [items]);
  const list = useMemo(
    () => (order ? order.map((id) => items.find((it) => it.id === id)).filter((it) => it !== undefined) : items),
    [order, items],
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const drag = useRef(new Animated.Value(0)).current;
  const shifts = useRef(new Map<string, Animated.Value>()).current;
  const slots = useRef(new Map<string, Slot>()).current;
  const hover = useRef(-1);

  const shiftOf = (id: string) => {
    let v = shifts.get(id);
    if (!v) shifts.set(id, (v = new Animated.Value(0)));
    return v;
  };

  // 새 순서로 그려진 뒤, 화면에 보이기 전에 비켜 둔 위치를 되돌린다.
  useLayoutEffect(() => {
    drag.setValue(0);
    shifts.forEach((v) => v.setValue(0));
  }, [list, drag, shifts]);

  const commit = (from: number, to: number) => {
    if (to < 0 || to >= list.length || to === from) return;
    const ids = list.map((it) => it.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    setOrder(ids);
    setTimeout(() => onReorder(ids), 0);
  };

  const drop = (from: number, to: number) => {
    const a = slots.get(list[from].id);
    const b = slots.get(list[to].id);
    // 놓일 자리: 뒤로 가면 끝을 맞추고, 앞으로 가면 시작을 맞춘다.
    const target = !a || !b || to === from ? 0 : to > from ? b.pos + b.size - (a.pos + a.size) : b.pos - a.pos;
    Animated.timing(drag, { toValue: target, duration: 120, useNativeDriver: true }).start(() => {
      commit(from, to);
      setDragId(null);
    });
  };

  const gesture = (index: number) =>
    Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(300)
      .onStart(() => {
        haptic.longPress();
        hover.current = index;
        setDragId(list[index].id);
      })
      .onUpdate((e) => {
        const me = slots.get(list[index].id);
        const first = slots.get(list[0].id);
        const last = slots.get(list[list.length - 1].id);
        if (!me || !first || !last) return;
        const raw = axis === 'x' ? e.translationX : e.translationY;
        const d = Math.max(first.pos - me.pos, Math.min(last.pos + last.size - (me.pos + me.size), raw));
        drag.setValue(d);

        // 끄는 칸의 가운데보다 앞에 있는 다른 칸 수 = 놓일 자리
        const center = me.pos + me.size / 2 + d;
        const to = list.filter((it, j) => {
          const s = slots.get(it.id);
          return j !== index && s && s.pos + s.size / 2 < center;
        }).length;
        if (to === hover.current) return;
        hover.current = to;
        haptic.tap();
        const step = me.size + gap;
        list.forEach((it, j) => {
          if (j === index) return;
          const offset = index < j && j <= to ? -step : to <= j && j < index ? step : 0;
          Animated.timing(shiftOf(it.id), { toValue: offset, duration: 150, useNativeDriver: true }).start();
        });
      })
      .onFinalize(() => {
        // 길게 누르기 전에 손을 떼면 시작도 안 한 것이라 할 일이 없다.
        if (hover.current < 0) return;
        drop(index, hover.current);
        hover.current = -1;
      });

  const bind = (index: number) => {
    const id = list[index].id;
    const dragging = dragId === id;
    const value = dragging ? drag : shiftOf(id);
    return {
      dragging,
      gesture: gesture(index),
      onLayout: (e: LayoutChangeEvent) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        slots.set(id, axis === 'x' ? { pos: x, size: width } : { pos: y, size: height });
      },
      transform: [axis === 'x' ? { translateX: value } : { translateY: value }],
    };
  };

  // 스크린리더용: 한 칸씩 옮기기
  const move = (index: number, delta: number) => commit(index, index + delta);

  return { list, bind, move };
};
