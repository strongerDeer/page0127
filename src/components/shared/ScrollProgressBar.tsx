'use client';

import { useEffect, useRef, useState } from 'react';

export default function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const requestAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const scroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }

      requestAnimationFrameRef.current = requestAnimationFrame(() => {
        setProgress(scrollTop / height);
      });
    };

    window.addEventListener('scroll', scroll);

    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
      window.removeEventListener('scroll', scroll);
    };
  }, []);

  return (
    <div
      style={{
        zIndex: '20',
        position: 'sticky',
        top: '0',
        backgroundColor: 'var(--grayLv2)',
      }}
    >
      <div
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: 'left',
          backgroundColor: 'var(--primary)',
          height: 4,
        }}
      ></div>
    </div>
  );
}
