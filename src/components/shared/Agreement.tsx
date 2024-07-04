import Icon from '@components/icon/Icon';
import Link from 'next/link';

export default function Agreement({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>;
}

function AgreementTitle({
  children,
  checked,
  onChange,
}: {
  children: React.ReactNode;
  checked: boolean;
  onChange: (e: React.MouseEvent<HTMLElement>, checked: boolean) => void;
}) {
  return (
    <li onClick={(e) => onChange(e, !checked)}>
      <Icon
        name={checked ? 'circleCheckFill' : 'circleCheck'}
        color={checked ? 'primary' : 'grayLv2'}
      />
      {children}
    </li>
  );
}
function AgreementDescription({
  children,
  checked,
  link,
  onChange,
}: {
  children: React.ReactNode;
  checked: boolean;
  link?: string;
  onChange: (e: React.MouseEvent<HTMLElement>, checked: boolean) => void;
}) {
  return (
    <div>
      <div onClick={(e) => onChange(e, !checked)}>
        <Icon name="check" color={checked ? 'primary' : 'grayLv2'} />
        {children}
      </div>
      {link && <Link href={link}>링크</Link>}
    </div>
  );
}

Agreement.Title = AgreementTitle;
Agreement.Description = AgreementDescription;
