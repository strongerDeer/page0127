'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export default function Portal({
  children,
  containerId = 'root-portal',
}: PortalProps) {
  const [portalElement, setPortalElement] = useState<Element | null>(null);

  useEffect(() => {
    let element = document.getElementById(containerId);
    if (!element) {
      element = document.createElement('div');
      element.id = containerId;
      document.body.appendChild(element);
    }
    setPortalElement(element);

    return () => {
      if (
        element &&
        element.parentNode === document.body &&
        !element.hasChildNodes()
      ) {
        document.body.removeChild(element);
      }
    };
  }, [containerId]);

  if (!portalElement) return null;
  return createPortal(children, portalElement);
}
