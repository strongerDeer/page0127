import { Icon as IconifyIcon } from "@iconify/react";
import { memo } from "react";

// tabler icons 매핑 객체
// 자주 사용하는 아이콘을 미리 정의해서 사용 (별칭)
const iconMapping = {
  google: "tabler:brand-google-filled",
} as const;

// IconType: iconMapping의 key들 또는 tabler 아이콘 이름 (string)
export type IconType = keyof typeof iconMapping | (string & {});

interface IconsProps {
  name: IconType;
  color?: string;
  size?: number | string;
  className?: string;
}

/**
 * Icons 컴포넌트
 *
 * @example
 * <Icons name="google" size={24} /> // iconMapping에 정의된 별칭 사용
 * <Icons name="home" size={24} /> // tabler:home으로 자동 변환
 * <Icons name="search" color="#000" className="my-icon" />
 */
const Icons = ({ name, color, size = 24, className, ...props }: IconsProps) => {
  // iconMapping에서 아이콘 이름 찾기
  // 없으면 tabler: prefix를 붙여서 사용
  const iconName = name in iconMapping
    ? iconMapping[name as keyof typeof iconMapping]
    : `tabler:${name}`;

  return (
    <IconifyIcon
      icon={iconName}
      color={color}
      width={size}
      height={size}
      className={className}
      {...props}
    />
  );
};

// memo: props가 변경되지 않으면 리렌더링 방지
export default memo(Icons);
