import { parseIsbn } from './parseIsbn';

// 책 바코드는 EAN-13(978/979 로 시작)이다
const BOOK_FORMATS = ['ean_13'] as const;

type DetectSource = ImageBitmapSource;

type Detector = {
  detect: (source: DetectSource) => Promise<Array<{ rawValue: string }>>;
};

type NativeBarcodeDetector = {
  new (options: { formats: readonly string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};

/**
 * 바코드 인식기를 만든다. 브라우저 기본 BarcodeDetector 가 책 바코드를 읽을 수 있으면
 * 그걸 쓰고(안드로이드·맥 크롬), 아니면 ZXing WebAssembly 판(barcode-detector)을 쓴다.
 * 아이폰 사파리·윈도우 크롬은 기본 기능이 없어 후자로 간다.
 *
 * WASM 판은 1MB 가까이 되므로 바코드 버튼을 눌렀을 때만 불러온다(동적 import).
 * WASM 파일은 jsDelivr 에서 받는다 — CSP connect-src 에 이미 열린 출처라 따로
 * 열 곳이 없고, 버전은 라이브러리가 아는 값으로 고정한다.
 */
export const createIsbnDetector = async () => {
  const detector = await loadDetector();

  /** 화면(영상 프레임·사진)에서 ISBN 을 찾는다. 없으면 `null`. */
  return async (source: DetectSource): Promise<string | null> => {
    const results = await detector.detect(source);
    for (const { rawValue } of results) {
      const isbn = parseIsbn(rawValue);
      if (isbn) return isbn;
    }
    return null;
  };
};

const loadDetector = async (): Promise<Detector> => {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetector })
    .BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(
      (): string[] => []
    );
    if (supported.includes('ean_13')) {
      return new Native({ formats: BOOK_FORMATS });
    }
  }

  const { BarcodeDetector, setZXingModuleOverrides, ZXING_WASM_VERSION } =
    await import('barcode-detector/ponyfill');
  // 기본값은 fastly.jsdelivr.net 인데 CSP 에는 cdn.jsdelivr.net 만 열려 있다
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm')
        ? `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}/dist/reader/${path}`
        : prefix + path,
  });
  return new BarcodeDetector({ formats: [...BOOK_FORMATS] });
};
