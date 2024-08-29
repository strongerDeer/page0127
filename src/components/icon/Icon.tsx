import { IconName, icons } from './icons';

export default function Icon({
  name,
  color,
  className,
  style,
}: {
  name: IconName;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
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
      style={{ width: '2.4rem', height: '2.4rem', ...style }}
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
