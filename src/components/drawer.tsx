import { useSpring, animated, config } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { useCallback, useEffect, useState, PropsWithChildren, useRef } from "react";
import { usePreventScroll } from "./use-prevent-scroll";

const VELOCITY_THRESHOLD = 0.4;
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

  const getSnapPoint = useCallback(
    (point: number) => {
      return containerHeight * (1 - point);
    },
    [containerHeight]
  );

  usePreventScroll({
    isDisabled: !isOpen || isDragging,
  });

  const closeDrawer = useCallback(() => {
    api.start({
      y: containerHeight,
      immediate: false,
      config: { ...config.stiff },
    });

    onOpenChange(false);

    if (snapPoints) {
      setActiveSnapPoint(snapPoints[0]);
    }
  }, [api, containerHeight, onOpenChange, snapPoints]);

  const findNextSnapPoint = useCallback(
    ({
      currentY,
      velocity,
      direction,
    }: {
      currentY: number;
      velocity: number;
      direction: number;
    }) => {
      const dragDirection = direction > 0 ? "down" : "up";

      if (velocity > 2 && dragDirection === "down") {
        return null;
      }

      if (velocity > 2 && dragDirection === "up" && snapPoints) {
        return snapPoints[snapPoints.length - 1];
      }

      const closestSnapPoint = normalizedSnapPoints.reduce((prevSnapPoint, currentSnapPoint) => {
        return Math.abs(currentSnapPoint - currentY) < Math.abs(prevSnapPoint - currentY)
          ? currentSnapPoint
          : prevSnapPoint;
      });

      const closestSnapPointIndex = normalizedSnapPoints.indexOf(closestSnapPoint);

      const threshold = Math.abs(activeSnapPointPixel - closestSnapPoint) * 0.4;
      const deltaY = Math.abs(activeSnapPointPixel - currentY);
      const isFirst = activeSnapPointIndex === 0;
      const isLast = activeSnapPointIndex === snapPoints.length - 1;

      if (dragDirection === "up" && isLast) {
        return snapPoints[snapPoints.length - 1];
      }

      if (dragDirection === "down" && isFirst) {
        return null;
      }

      if (deltaY > threshold) {
        return snapPoints[closestSnapPointIndex];
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

  const onDrag = (y: number) => {
    setIsDragging(true);
    api.start({ y, immediate: true });
  };

  const bind = useDrag(
    ({ offset: [, offsetY], movement: [, movementY], velocity: [, velocityY], last }) => {
      if (last) {
        setIsDragging(false);

        const direction = movementY > 0 ? 1 : -1;

        if (snapPoints) {
          const nextSnapPoint = findNextSnapPoint({
            currentY: offsetY,
            velocity: velocityY,
            direction,
          });

          if (nextSnapPoint === null) {
            closeDrawer();
          } else {
            onOpenChange(true);
            snapToPoint(nextSnapPoint);
          }
          return;
        }

        if (direction > 0 && velocityY > VELOCITY_THRESHOLD) {
          closeDrawer();
          return;
        }

        const visibleDrawerHeight = Math.min(
          drawerRef.current?.getBoundingClientRect().height ?? 0,
          window.innerHeight
        );

        if (movementY >= visibleDrawerHeight * 0.25) {
          closeDrawer();
          return;
        }
      } else {
        onDrag(offsetY);
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
