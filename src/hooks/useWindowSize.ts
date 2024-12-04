'use client';
import { useEffect, useState } from 'react';

interface WindowsSize {
  width: number;
  height: number;
}

export default function useWindowSize() {
  const [windowsSize, setWindowSize] = useState<WindowsSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 1200,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowsSize;
}
