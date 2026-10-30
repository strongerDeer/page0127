'use client';

import { useState, useSyncExternalStore } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';
import {
  Copy,
  Download,
  EllipsisVertical,
  Link2,
  MonitorDown,
  Share,
  SquarePlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { useInstallPrompt } from '@/shared/lib/pwa/installPrompt';

import {
  detectInstallPlatform,
  type InstallPlatform,
} from '../model/installPlatform';

const readPlatform = (): InstallPlatform =>
  detectInstallPlatform({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isStandalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS 사파리 전용 플래그 — 옛 버전은 display-mode 미디어쿼리에 답하지 않는다
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  });

// 기기는 페이지가 떠 있는 동안 바뀌지 않는다
const subscribeNothing = () => () => {};

type InstallGuideLinkProps = {
  className?: string;
};

/**
 * "설치 방법" 작은 링크 — 누르면 **지금 기기에 맞는 방법 하나만** 보여 준다.
 *
 * page0127. 은 스토어 앱이 아니라 PWA 라서 기기마다 설치하는 길이 다르다.
 * 아이폰은 사파리 공유 메뉴(그림 2단계), 안드로이드·PC 크롬은 브라우저가 주는
 * 설치 창을 버튼으로 바로 띄운다. 다른 기기 방법까지 늘어놓으면 내 것을 찾다 지친다.
 */
export const InstallGuideLink = ({ className = '' }: InstallGuideLinkProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type='button'
          className={`font-medium text-primary underline underline-offset-4 hover:no-underline ${className}`}
        >
          설치 방법
        </button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm break-keep'>
        <InstallGuideBody onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

const InstallGuideBody = ({ onDone }: { onDone: () => void }) => {
  // 서버 렌더에선 null — 창은 누른 뒤에만 열리므로 실제로는 늘 브라우저 값이다
  const platform = useSyncExternalStore(
    subscribeNothing,
    readPlatform,
    () => null
  );
  const promptInstall = useInstallPrompt();

  if (!platform) return null;

  const handleInstall = async () => {
    if (!promptInstall) return;
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.success('홈 화면에 추가했어요. 이제 앱처럼 열 수 있어요 🎉');
      onDone();
    }
  };

  switch (platform) {
    case 'installed':
      return (
        <Guide
          title='이미 홈 화면에서 열었어요 🎉'
          description='설정 → 푸시 알림을 켜면 새 알림과 주간 회상을 이 기기로 받아요.'
        />
      );

    case 'ios':
      return (
        <Guide
          title='아이폰 홈 화면에 추가하기'
          description='사파리에서 두 번만 누르면 앱처럼 열려요.'
          footnote='공유 버튼이 안 보이면 오른쪽 아래 ⋯ 를 먼저 눌러 주세요.'
        >
          <ol className='grid grid-cols-2 gap-3'>
            <Step n={1} caption='아래쪽 공유 버튼을 눌러요'>
              <IosShareBar />
            </Step>
            <Step n={2} caption='"홈 화면에 추가"를 골라요'>
              <IosShareSheet />
            </Step>
          </ol>
        </Guide>
      );

    case 'android':
      return promptInstall ? (
        <Guide
          title='안드로이드에 설치하기'
          description='버튼 하나면 홈 화면에 아이콘이 생겨요.'
        >
          <InstallButton onClick={handleInstall} />
        </Guide>
      ) : (
        // 설치 창 이벤트가 안 온 경우 — 삼성 인터넷·이미 설치함·조건 미충족 등
        <Guide
          title='안드로이드에 설치하기'
          description='브라우저 메뉴에서 바로 추가할 수 있어요.'
        >
          <MenuPath
            icon={<EllipsisVertical aria-hidden className='size-4' />}
            steps={['오른쪽 위 ⋮ 메뉴', '홈 화면에 추가 (또는 앱 설치)']}
          />
        </Guide>
      );

    case 'desktop-chromium':
      return promptInstall ? (
        <Guide
          title='PC에 설치하기'
          description='버튼을 누르면 독립된 창으로 열리는 앱이 생겨요.'
          footnote='주소창 오른쪽 끝 설치 아이콘으로도 설치할 수 있어요.'
        >
          <InstallButton onClick={handleInstall} />
        </Guide>
      ) : (
        <Guide
          title='PC에 설치하기'
          description='주소창 오른쪽 끝의 설치 아이콘을 눌러 주세요.'
          footnote='아이콘이 안 보이면 ⋮ 메뉴 → 전송, 저장, 공유 → "페이지를 앱으로 설치"에 있어요.'
        >
          <DesktopAddressBar />
        </Guide>
      );

    case 'desktop-safari':
      return (
        <Guide
          title='맥에 설치하기'
          description='사파리 메뉴 막대에서 Dock에 추가하면 앱처럼 열려요.'
        >
          <MenuPath steps={['파일', 'Dock에 추가']} />
        </Guide>
      );

    case 'in-app':
      return (
        <Guide
          title='여기서는 설치할 수 없어요'
          description='앱 안 브라우저라서 홈 화면에 추가가 막혀 있어요. 링크를 복사해 사파리(아이폰)나 크롬(안드로이드)에서 열어 주세요.'
        >
          <CopyLinkButton />
        </Guide>
      );

    case 'unsupported':
      return (
        <Guide
          title='이 브라우저는 설치를 지원하지 않아요'
          description='크롬이나 엣지에서 열면 설치할 수 있어요.'
        >
          <CopyLinkButton />
        </Guide>
      );
  }
};

type GuideProps = {
  title: string;
  description: string;
  footnote?: string;
  children?: React.ReactNode;
};

const Guide = ({ title, description, footnote, children }: GuideProps) => (
  <div className='space-y-4'>
    <div className='space-y-1 pr-6'>
      <DialogTitle className='text-lg font-bold text-text-strong'>
        {title}
      </DialogTitle>
      <DialogDescription className='text-sm text-text-subtle'>
        {description}
      </DialogDescription>
    </div>
    {children}
    {footnote && <p className='text-xs text-text-subtle'>{footnote}</p>}
  </div>
);

const Step = ({
  n,
  caption,
  children,
}: {
  n: number;
  caption: string;
  children: React.ReactNode;
}) => (
  <li className='flex flex-col gap-2'>
    {children}
    <p className='flex items-start gap-1.5 text-sm text-text-strong'>
      <span className='grid size-5 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
        {n}
      </span>
      {caption}
    </p>
  </li>
);

const InstallButton = ({ onClick }: { onClick: () => void }) => (
  <Button type='button' className='w-full' onClick={onClick}>
    <Download aria-hidden className='size-4' />
    설치하기
  </Button>
);

const CopyLinkButton = () => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크를 복사했어요. 다른 브라우저에 붙여 넣어 주세요.');
    } catch {
      toast.error(
        '복사하지 못했어요. 주소창의 링크를 길게 눌러 복사해 주세요.'
      );
    }
  };
  return (
    <Button
      type='button'
      variant='outline'
      className='w-full'
      onClick={handleCopy}
    >
      <Link2 aria-hidden className='size-4' />
      링크 복사
    </Button>
  );
};

/** "메뉴 → 항목" 길을 칩으로 보여 준다 — 글로만 쓰면 어디를 누르는지 눈에 안 들어온다 */
const MenuPath = ({
  icon,
  steps,
}: {
  icon?: React.ReactNode;
  steps: string[];
}) => (
  <p className='flex flex-wrap items-center gap-2 rounded-xl bg-sunken p-3 text-sm'>
    {steps.map((step, i) => (
      <span key={step} className='flex items-center gap-2'>
        {i > 0 && (
          <span aria-hidden className='text-text-subtle'>
            →
          </span>
        )}
        <span className='flex items-center gap-1 rounded-lg bg-card px-2.5 py-1.5 font-medium text-text-strong shadow-sm'>
          {i === 0 && icon}
          {step}
        </span>
      </span>
    ))}
  </p>
);

/* ── 그림 — 실제 화면을 단순하게 줄인 것. 누를 곳만 파랗게 칠한다 ── */

/** 1단계: 사파리 아래 주소 막대 + 공유 버튼 */
const IosShareBar = () => (
  <div
    aria-hidden
    className='flex h-28 flex-col justify-end rounded-xl bg-sunken p-2'
  >
    <div className='flex items-center gap-1.5 rounded-full bg-card py-1.5 pr-1.5 pl-3 shadow-sm'>
      <span className='flex-1 truncate text-[11px] text-text-subtle'>
        page0127.com
      </span>
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-primary/20'>
        <Share className='size-3.5' />
      </span>
    </div>
  </div>
);

/** 2단계: 공유 시트 목록에서 "홈 화면에 추가" */
const IosShareSheet = () => (
  <div
    aria-hidden
    className='flex h-28 flex-col justify-end gap-1 rounded-xl bg-sunken p-2 text-[11px]'
  >
    <span className='flex items-center justify-between rounded-lg bg-card px-2.5 py-1.5 text-text-subtle'>
      복사
      <Copy className='size-3.5' />
    </span>
    <span className='flex items-center justify-between rounded-lg bg-primary px-2.5 py-1.5 font-bold text-primary-foreground ring-4 ring-primary/20'>
      홈 화면에 추가
      <SquarePlus className='size-3.5' />
    </span>
  </div>
);

/** PC 크롬 주소창 오른쪽 끝의 설치 아이콘 */
const DesktopAddressBar = () => (
  <div aria-hidden className='rounded-xl bg-sunken p-3'>
    <div className='flex items-center gap-2 rounded-full bg-card py-1.5 pr-1.5 pl-4 shadow-sm'>
      <span className='flex-1 truncate text-xs text-text-subtle'>
        page0127.com
      </span>
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-primary/20'>
        <MonitorDown className='size-3.5' />
      </span>
    </div>
  </div>
);
