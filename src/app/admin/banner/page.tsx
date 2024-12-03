'use client';
import Button from '@components/shared/Button';
import { deleteBanner } from '@connect/banner/banner';
import useBanner from '@connect/banner/useBanner';
import { ROUTES } from '@constants';

import { ModalProps, useModalContext } from '@contexts/ModalContext';
import { toast } from 'react-toastify';

export default function BannerPage() {
  const { data: activeBanners } = useBanner('active');
  const { data: scheduledBanners } = useBanner('scheduled');
  const { data: expiredBanners } = useBanner('expired');

  const { open: modalOpen, close: modalClose } = useModalContext();

  return (
    <div className="max-width">
      <h2 className="title1">게시중인 배너</h2>

      {activeBanners && activeBanners.length > 0 && (
        <ul>
          {activeBanners.map((activeBanner) => (
            <li
              key={activeBanner.id}
              style={{ background: activeBanner.backgroundColor }}
            >
              <h3>{activeBanner.title}</h3>
              <p>{activeBanner.subTitle}</p>
              <p>{activeBanner.view}</p>

              <Button
                onClick={() => {
                  modalOpen({
                    title: `${activeBanner.title} 삭제`,
                    body: '배너를 삭제하시겠습니까?',
                    buttonLabel: '삭제',
                    closeButtonLabel: '취소',
                    onButtonClick: () => {
                      deleteBanner(activeBanner.id);
                      modalClose();
                      toast.success('배너가 삭제되었습니다');
                    },
                    closeModal: () => {
                      modalClose();
                    },
                  } as ModalProps);
                }}
              >
                삭제
              </Button>
              <Button href={`${ROUTES.ADMIN_BANNER}/edit/${activeBanner.id}`}>
                배너 수정
              </Button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="title1">게시 예정인 배너</h2>
      {scheduledBanners && scheduledBanners?.length > 0 && (
        <>
          {scheduledBanners.map((scheduledBanner) => (
            <div key={scheduledBanner.id}>{scheduledBanner.title}</div>
            // <BannerItem key={endBanner.id} data={endBanner} />
          ))}
        </>
      )}
      <h2 className="title1">게시 종료된 배너</h2>
      {expiredBanners && expiredBanners?.length > 0 && (
        <>
          {expiredBanners.map((expiredBanner) => (
            <div key={expiredBanner.id}>{expiredBanner.title}</div>
            // <BannerItem key={endBanner.id} data={endBanner} />
          ))}
        </>
      )}
      <Button href={`${ROUTES.ADMIN_BANNER}/create`}>배너 생성</Button>
    </div>
  );
}
