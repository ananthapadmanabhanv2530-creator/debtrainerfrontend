import { useState, useEffect, useRef, useCallback } from 'react';

const AnimatedCounter = ({
  target = 0,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  style = {},
}) => {
  const [count, setCount] = useState(0);
  const startTime = useRef(null);
  const frameRef = useRef(null);
  const hasAnimated = useRef(false);
  const elementRef = useRef(null);

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const animate = useCallback(
    (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setCount(easedProgress * target);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    },
    [target, duration]
  );

  useEffect(() => {
    if (!elementRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          startTime.current = null;
          frameRef.current = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [animate]);

  // Re-animate when target changes
  useEffect(() => {
    if (hasAnimated.current) {
      startTime.current = null;
      frameRef.current = requestAnimationFrame(animate);
    }
  }, [target, animate]);

  const formattedValue = decimals > 0 ? count.toFixed(decimals) : Math.round(count);

  return (
    <span ref={elementRef} className={className} style={style}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
