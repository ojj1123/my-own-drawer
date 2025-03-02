import { useSpring, animated, config } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { useCallback, useEffect, useState, PropsWithChildren, useRef } from "react";
import { usePreventScroll } from "./use-prevent-scroll";

interface DrawerProps extends PropsWithChildren {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeSnapPoint?: number;
  snapPoints?: number[];
  onSnapPointChange?: (snapPoint: number) => void;
  initialHeight?: number;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onOpenChange,
  snapPoints = [0.3, 0.7, 1],
  children,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // FIXME
  const containerHeight = window.innerHeight;

  // states related to snap points
  const [activeSnapPoint, setActiveSnapPoint] = useState(snapPoints[0]);
  const normalizedSnapPoints = snapPoints.map((point: number) => {
    return containerHeight * (1 - point);
  });
  const activeSnapPointIndex = snapPoints.indexOf(activeSnapPoint);
  const activeSnapPointPixel = normalizedSnapPoints[activeSnapPointIndex];

  const [{ y }, api] = useSpring(() => ({ y: window.innerHeight }));
  const [isDragging, setIsDragging] = useState(false);

  // Convert snap points from percentage to pixels
  const getSnapPoint = useCallback(
    (point: number) => {
      return containerHeight * (1 - point);
    },
    [containerHeight]
  );

  usePreventScroll({
    isDisabled: !isOpen || isDragging,
  });

  // Find the nearest snap point and handle thresholds
  const findNextSnapPoint = useCallback(
    (currentY: number, velocity: number, direction: number) => {
      const nextSnapPointPixel = normalizedSnapPoints.reduce((prevSnapPoint, currentSnapPoint) => {
        return Math.abs(currentSnapPoint - currentY) < Math.abs(prevSnapPoint - currentY)
          ? currentSnapPoint
          : prevSnapPoint;
      });

      // 현재 스냅 포인트와 가장 가까운 스냅 포인트를 찾는다
      const nextSnapPointIndex = normalizedSnapPoints.indexOf(nextSnapPointPixel);
      const nextSnapPoint = snapPoints[nextSnapPointIndex];

      const threshold = Math.abs(activeSnapPointPixel - nextSnapPointPixel) * 0.4;
      const deltaY = Math.abs(activeSnapPointPixel - currentY);

      if (direction > 0 && activeSnapPointIndex === 0) {
        return null;
      }

      if (deltaY > threshold) {
        return nextSnapPoint;
      }

      return activeSnapPoint;
    },
    [normalizedSnapPoints, snapPoints, activeSnapPointPixel, activeSnapPointIndex, activeSnapPoint]
  );

  const snapToPoint = useCallback(
    (snapPoint: number) => {
      setActiveSnapPoint(snapPoint);
      api.start({
        y: getSnapPoint(snapPoint),
        immediate: false,
        config: { tension: 200, friction: 25 },
      });
    },
    [api, getSnapPoint]
  );

  const onRelease = useCallback(() => {
    const visibleDrawerHeight = Math.min(
      drawerRef.current?.getBoundingClientRect().height ?? 0,
      window.innerHeight
    );
    const visibleDrawerWidth = Math.min(
      drawerRef.current?.getBoundingClientRect().width ?? 0,
      window.innerWidth
    );
  }, []);

  const close = useCallback(
    (velocity = 0) => {
      onOpenChange(false);
      api.start({
        y: containerHeight,
        immediate: false,
        config: { ...config.stiff, velocity },
      });
    },
    [api, containerHeight, onOpenChange]
  );

  const onDrag = (y: number) => {
    setIsDragging(true);
    api.start({ y, immediate: true });
  };

  const bind = useDrag(
    ({ offset: [, oy], movement: [, my], velocity: [, vy], last }) => {
      if (last) {
        const direction = my > 0 ? 1 : -1;
        const nextSnapPoint = findNextSnapPoint(oy, vy, direction);

        if (nextSnapPoint === null) {
          close();
        } else {
          onOpenChange(true);
          snapToPoint(nextSnapPoint);
        }
        setIsDragging(false);
      } else {
        onDrag(oy);
      }
    },
    {
      from: () => [0, y.get()],
      bounds: { top: 0 },
      rubberband: true,
    }
  );

  // Handle open/close state
  useEffect(() => {
    if (isOpen) {
      snapToPoint(activeSnapPoint);
    }
  }, [isOpen, snapToPoint, activeSnapPoint]);

  return (
    <animated.div
      {...bind()}
      ref={drawerRef}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "fit-content",
        background: "white",
        borderTopLeftRadius: "1rem",
        borderTopRightRadius: "1rem",
        // overflowY: "auto",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
        touchAction: "none",
        transform: y.to((y) => `translateY(${y}px)`),
      }}
    >
      <div
        style={{
          width: "2rem",
          height: "0.25rem",
          background: "#CBD5E0",
          borderRadius: "2px",
          margin: "0.5rem auto",
        }}
      />
      <div style={{ padding: "0 1rem" }}>{children}</div>
    </animated.div>
  );
};

export default Drawer;
