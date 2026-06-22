import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// 큐넷(Q-net) "연도별 회별 국가기술자격 합격률" API 서비스 URL
const QNET_BASE_URL =
  "http://openapi.q-net.or.kr/api/service/rest/InquiryQualPassRateSVC/getList";

export type PassRateItem = {
  jmFldNm: string; // 종목명
  grdNm: string; // 등급명
  implYy: string; // 시행년도
  implSeq: string; // 시행회차
  examTypCcd: string; // 필/실기 구분
  recptNoCnt: number; // 응시자수
  examPassCnt: number; // 합격자수
  passRate: string; // 합격률 (예: "10.5%")
};

/**
 * 브라우저 -> (이 API 라우트) -> 큐넷 OpenAPI
 *
 * 인증키(QNET_SERVICE_KEY)는 서버 환경변수에만 저장되어 있고,
 * 이 함수 안에서만 사용됩니다. 브라우저로 내려가는 응답에는 키가 포함되지 않습니다.
 */
export async function GET(request: NextRequest) {
  const serviceKey = process.env.QNET_SERVICE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "서버에 QNET_SERVICE_KEY 환경변수가 설정되어 있지 않습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.",
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const grdCd = searchParams.get("grdCd"); // 등급코드 (필수)
  const baseYY = searchParams.get("baseYY"); // 기준년도 (필수)
  const pageNo = searchParams.get("pageNo") ?? "1";
  const numOfRows = searchParams.get("numOfRows") ?? "100";

  if (!grdCd || !baseYY) {
    return NextResponse.json(
      { error: "grdCd(등급코드)와 baseYY(기준년도)는 필수 값입니다." },
      { status: 400 }
    );
  }

  // 큐넷 API에 보낼 요청 URL 구성
  // 주의: serviceKey는 공공데이터포털에서 발급 시 이미 URL 인코딩된 값을 주는 경우가 많아
  // 그대로 붙이고, 나머지 파라미터만 encodeURIComponent로 인코딩합니다.
  const qnetUrl =
    `${QNET_BASE_URL}` +
    `?serviceKey=${serviceKey}` +
    `&grdCd=${encodeURIComponent(grdCd)}` +
    `&baseYY=${encodeURIComponent(baseYY)}` +
    `&pageNo=${encodeURIComponent(pageNo)}` +
    `&numOfRows=${encodeURIComponent(numOfRows)}`;

  let xmlText: string;

  try {
    const qnetResponse = await fetch(qnetUrl, {
      // 공공데이터 API는 응답이 빠르지 않을 수 있어 넉넉히 대기
      cache: "no-store",
    });

    if (!qnetResponse.ok) {
      return NextResponse.json(
        { error: `큐넷 API 호출 실패 (status: ${qnetResponse.status})` },
        { status: 502 }
      );
    }

    xmlText = await qnetResponse.text();
  } catch (err) {
    console.error("큐넷 API 요청 중 오류:", err);
    return NextResponse.json(
      { error: "큐넷 API에 연결할 수 없습니다." },
      { status: 502 }
    );
  }

  // 큐넷 API는 XML로 응답하므로 JSON으로 변환
  const parser = new XMLParser();
  let parsed;
  try {
    parsed = parser.parse(xmlText);
  } catch (err) {
    console.error("XML 파싱 오류:", err, xmlText);
    return NextResponse.json(
      { error: "큐넷 API 응답을 해석할 수 없습니다." },
      { status: 502 }
    );
  }

  const header = parsed?.response?.header;
  const body = parsed?.response?.body;

  const resultCode = header?.resultCode;
  const resultMsg = header?.resultMsg;

  // 결과코드가 정상(00)이 아니면 에러 메시지 전달
  if (resultCode && resultCode !== "00") {
    return NextResponse.json(
      { error: `큐넷 API 오류: [${resultCode}] ${resultMsg}` },
      { status: 502 }
    );
  }

  // item이 1건이면 객체로, 여러 건이면 배열로 내려오는 XML 특성을 보정
  let rawItems = body?.items?.item ?? [];
  if (!Array.isArray(rawItems)) {
    rawItems = [rawItems];
  }

  const items: PassRateItem[] = rawItems
    .filter((item: Record<string, unknown>) => item && item.jmFldNm)
    .map((item: Record<string, unknown>) => ({
      jmFldNm: String(item.jmFldNm ?? ""),
      grdNm: String(item.grdNm ?? ""),
      implYy: String(item.implYy ?? ""),
      implSeq: String(item.implSeq ?? ""),
      examTypCcd: String(item.examTypCcd ?? ""),
      recptNoCnt: Number(item.recptNoCnt ?? 0),
      examPassCnt: Number(item.examPassCnt ?? 0),
      passRate: String(item.passRate ?? ""),
    }));

  return NextResponse.json({
    items,
    totalCount: Number(body?.totalCount ?? 0),
    pageNo: Number(body?.pageNo ?? 1),
    numOfRows: Number(body?.numOfRows ?? items.length),
  });
}
