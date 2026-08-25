/**
 * 프로필 사진을 업로드 전에 줄인다. **브라우저 전용**(canvas 를 쓴다).
 *
 * 왜 필요한가:
 * 프로필 사진은 화면에서 가장 크게 나올 때가 96px 다(레티나 2배로 쳐도 192px).
 * 그런데 지금까지는 사용자가 고른 원본이 최대 4MB 그대로 저장됐다. 예전에는
 * Vercel 이미지 최적화가 이걸 가려 줬지만, 2026-08-25 부터 프로필 사진도
 * 최적화를 태우지 않기로 했다(한도가 소진되면 사진이 아예 안 보인다).
 * 그래서 **원본 크기를 줄이는 일이 업로드 시점으로 옮겨왔다.**
 *
 * 한 번 줄여서 저장하면 그 뒤로는 볼 때마다 이득이다 — 변환 한도도, 사용자
 * 데이터도 쓰지 않는다.
 */

/** 저장할 프로필 사진의 최대 변 길이(px). 화면 최대 96px 의 5배 이상 여유. */
export const AVATAR_MAX_EDGE = 512;

/** 변환 품질. 사진에서 눈에 띄는 손실 없이 용량이 크게 준다. */
const AVATAR_QUALITY = 0.85;

/** 이미 이 정도면 줄여서 얻는 게 없다 — 다시 인코딩하는 손해만 남는다. */
const SKIP_RESIZE_BYTES = 300 * 1024;

/**
 * 비율을 유지한 채 최대 변이 `maxEdge` 를 넘지 않는 크기를 구한다.
 *
 * 원본이 이미 작으면 **키우지 않는다** — 없는 화질이 생기지는 않고 용량만 는다.
 */
export const calcResizedSize = (
  width: number,
  height: number,
  maxEdge: number = AVATAR_MAX_EDGE
): { width: number; height: number } => {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxEdge) return { width, height };

  const ratio = maxEdge / longestEdge;

  // 반올림 뒤 0 이 되지 않게 최소 1px 을 보장한다(극단적인 가로/세로 비율).
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

/**
 * 줄일 필요가 없는 파일인지 판정한다.
 *
 * GIF 를 건너뛰는 이유: canvas 로 다시 그리면 **첫 프레임만 남는다.** 움직이는
 * 프로필 사진을 올린 사람에게는 그게 "줄었다"가 아니라 "망가졌다"이다.
 */
export const shouldSkipResize = (file: File): boolean =>
  file.type === 'image/gif' || file.size <= SKIP_RESIZE_BYTES;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };

    image.src = objectUrl;
  });

const toWebpBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', AVATAR_QUALITY);
  });

/**
 * 프로필 사진을 최대 512px WebP 로 줄인다.
 *
 * **어떤 이유로든 실패하면 원본을 그대로 돌려준다.** 리사이즈는 최적화지
 * 검증이 아니다 — 여기서 막으면 사용자는 이유를 알 수 없는 채로 프로필 사진을
 * 못 바꾸게 된다. 크기 상한은 서버가 따로 확인한다.
 *
 * 줄인 결과가 원본보다 크면(작고 잘 압축된 PNG 등) 원본을 쓴다.
 */
export const resizeAvatarFile = async (file: File): Promise<File> => {
  if (shouldSkipResize(file)) return file;

  try {
    const image = await loadImage(file);
    const { width, height } = calcResizedSize(
      image.naturalWidth,
      image.naturalHeight
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await toWebpBlob(canvas);
    if (!blob || blob.size >= file.size) return file;

    // 확장자는 서버가 MIME 으로 정한다(updateProfileAction). 이름만 맞춰 둔다.
    return new File([blob], 'avatar.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};
