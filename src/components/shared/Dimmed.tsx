export default function Dimmed({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed top-0 right-0 bottom-0 left-0 z-50 z"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      {children}
    </div>
  );
}
