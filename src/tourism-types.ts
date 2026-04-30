/**
 * 한국관광공사 KorService2 TypeScript interfaces
 */

export interface TourismResult<T> {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: T[];
}

/** 지역코드 */
export interface AreaCodeItem {
  rnum: number;
  code: string;
  name: string;
}

/** 서비스분류코드 */
export interface CategoryCodeItem {
  code: string;
  name: string;
}

/** 지역기반 관광정보 (areaBasedList2) */
export interface AreaBasedItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  areacode: string;
  sigungucode?: string;
  cat1: string;
  cat2: string;
  cat3: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  zipcode?: string;
  createdtime?: string;
  modifiedtime?: string;
}

/** 키워드 검색 (searchKeyword2) */
export interface KeywordSearchItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  areacode: string;
  sigungucode?: string;
  cat1: string;
  cat2: string;
  cat3: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
}

/** 위치기반 관광정보 (locationBasedList2) */
export interface LocationBasedItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  areacode: string;
  dist: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
}

/** 축제·공연·행사 검색 (searchFestival2) */
export interface FestivalItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  areacode: string;
  sigungucode?: string;
  eventstartdate: string;
  eventenddate: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
}

/** 숙박 검색 (searchStay2) */
export interface StayItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  areacode: string;
  sigungucode?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  benikia?: string;
  goodstay?: string;
  hanok?: string;
}

/** 공통정보 (detailCommon2) */
export interface DetailCommonItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  createdtime: string;
  modifiedtime: string;
  tel?: string;
  telname?: string;
  homepage?: string;
  booktour?: string;
  firstimage?: string;
  firstimage2?: string;
  cpyrhtDivCd?: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  mapx?: string;
  mapy?: string;
  mlevel?: string;
  overview?: string;
}

/** 소개정보 (detailIntro2) */
export interface DetailIntroItem {
  contentid: string;
  contenttypeid: string;
  [key: string]: string | undefined;
}

/** 반복정보 (detailInfo2) */
export interface DetailInfoItem {
  contentid: string;
  contenttypeid: string;
  serialnum: string;
  infoname: string;
  infotext: string;
}

/** 이미지정보 (detailImage2) */
export interface DetailImageItem {
  contentid: string;
  imgname: string;
  originimgurl: string;
  smallimageurl: string;
  cpyrhtDivCd?: string;
  serialnum: string;
}

/** 지역기반 동기화 목록 (areaBasedSyncList2) */
export interface AreaBasedSyncItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  createdtime: string;
  modifiedtime: string;
  addr1?: string;
  areacode?: string;
}

/** 법정동코드 조회 (ldongCode2) */
export interface LdongCodeItem {
  code: string;
  name: string;
}

/** 관광타입ID별 소분류 코드 (lclsSystmCode2) */
export interface LclsSystmCodeItem {
  code: string;
  name: string;
}
