import { IconName, icons } from './icons';

export default function Icon({
  name,
  color,
  className,
  style,
  size = '2.4rem',
}: {
  name: IconName;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: string;
}) {
  const colorCheck = color?.includes('#') ? color : `var(--${color})`;
  const iconData = icons[name];

  return (
    <svg
      fillRule="evenodd"
      clipRule="evenodd"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${iconData.width} ${iconData.height}`}
      fill={color ? colorCheck : '#000'}
      style={{ width: size, height: size, ...style }}
      className={className ? className : ''}
    >
      {typeof iconData?.path === 'string' ? (
        <path d={iconData?.path} />
      ) : (
        iconData?.path.map((path, index) => <path key={index} d={path} />)
      )}
    </svg>
  );
}
