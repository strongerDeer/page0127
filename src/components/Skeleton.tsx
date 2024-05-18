export const Skeleton = ({
  width,
  height,
  className,
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) => {
  return (
    <div
      style={{ width: width, height: height }}
      className={`bg-gray-200 animate-pulse ${className} rounded-lg`}
    ></div>
  );
};
