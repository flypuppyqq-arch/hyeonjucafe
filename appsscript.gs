/**
 * 현주카페 예약 시스템 - Google Apps Script
 *
 * 이 스크립트는 Google Sheets와 연동되어 예약 데이터를 저장합니다.
 *
 * 설정 방법:
 * 1. Google Sheets를 열고 확장 프로그램 > Apps Script 메뉴를 선택합니다.
 * 2. 이 코드를 복사하여 붙여넣습니다.
 * 3. SHEET_NAME 변수를 본인의 시트 이름으로 변경합니다.
 * 4. 배포 > 새 배포 > 유형 선택: 웹 앱을 선택합니다.
 * 5. "액세스 권한"을 "모든 사용자"로 설정합니다.
 * 6. 배포 후 제공되는 웹 앱 URL을 script.js 파일의 APPS_SCRIPT_URL에 입력합니다.
 */

// ========== 설정 ==========
// 예약 데이터를 저장할 시트 이름 (본인의 시트 이름으로 변경하세요)
const SHEET_NAME = '예약목록';

// 스프레드시트 ID (현재 스프레드시트를 사용하려면 이 설정 그대로 두세요)
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ========== 메인 함수 ==========

/**
 * POST 요청을 처리하는 함수
 * 웹 페이지에서 예약 데이터를 받아 Google Sheets에 저장합니다.
 */
function doPost(e) {
  try {
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);

    // 스프레드시트 열기
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // 시트가 없으면 생성
    if (!sheet) {
      sheet = createReservationSheet(spreadsheet);
    }

    // 예약 데이터 추가
    addReservation(sheet, data);

    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'message': '예약이 완료되었습니다.',
        'data': data
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 에러 응답
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'error',
        'message': error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET 요청을 처리하는 함수 (테스트용)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('현주카페 예약 시스템이 정상적으로 작동 중입니다.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 예약 시트 생성 및 헤더 설정
 */
function createReservationSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEET_NAME);

  // 헤더 행 설정
  const headers = [
    '예약번호',
    '예약일시',
    '이름',
    '부서',
    '이메일',
    '연락처',
    '예약날짜',
    '예약시간',
    '인원',
    '요청사항',
    '상태'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 헤더 스타일 적용
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#667eea');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 열 너비 자동 조정
  sheet.autoResizeColumns(1, headers.length);

  // 첫 행 고정
  sheet.setFrozenRows(1);

  return sheet;
}

/**
 * 예약 데이터를 시트에 추가
 */
function addReservation(sheet, data) {
  // 예약 번호 생성 (날짜 + 시퀀스)
  const lastRow = sheet.getLastRow();
  const reservationNumber = generateReservationNumber(lastRow);

  // 새 행에 추가할 데이터
  const newRow = [
    reservationNumber,              // 예약번호
    data.timestamp,                 // 예약일시
    data.name,                      // 이름
    data.department,                // 부서
    data.email,                     // 이메일
    data.phone,                     // 연락처
    data.date,                      // 예약날짜
    data.time,                      // 예약시간
    data.people,                    // 인원
    data.message || '-',            // 요청사항
    '예약완료'                       // 상태
  ];

  // 시트에 데이터 추가
  sheet.appendRow(newRow);

  // 추가된 행의 범위
  const lastRowIndex = sheet.getLastRow();
  const range = sheet.getRange(lastRowIndex, 1, 1, newRow.length);

  // 데이터 행 스타일 적용
  range.setHorizontalAlignment('center');
  range.setVerticalAlignment('middle');

  // 짝수 행 배경색
  if (lastRowIndex % 2 === 0) {
    range.setBackground('#f8f9fa');
  }

  // 상태 열에 색상 적용
  const statusCell = sheet.getRange(lastRowIndex, 11);
  statusCell.setBackground('#d4edda');
  statusCell.setFontColor('#155724');

  // 알림 전송 (선택사항)
  sendNotification(data);

  return reservationNumber;
}

/**
 * 예약 번호 생성
 * 형식: YYYYMMDD-001
 */
function generateReservationNumber(lastRow) {
  const today = new Date();
  const datePrefix = Utilities.formatDate(today, 'Asia/Seoul', 'yyyyMMdd');

  // 오늘 날짜의 예약 개수 확인
  const sequence = lastRow > 1 ? lastRow : 1;
  const sequenceNumber = String(sequence).padStart(3, '0');

  return `${datePrefix}-${sequenceNumber}`;
}

/**
 * 예약 확인 알림 전송 (선택사항)
 * Gmail을 통해 예약자에게 확인 이메일을 보냅니다.
 */
function sendNotification(data) {
  try {
    const subject = '[현주카페] 예약이 완료되었습니다';
    const body = `
안녕하세요, ${data.name}님!

현주카페 예약이 완료되었습니다.

[예약 정보]
- 예약자: ${data.name} (${data.department})
- 날짜: ${data.date}
- 시간: ${data.time}
- 인원: ${data.people}명
- 요청사항: ${data.message || '없음'}

예약 시간 10분 전까지 현주카페로 방문해주시기 바랍니다.
예약 변경이나 취소가 필요하신 경우 내선 1234로 연락주세요.

감사합니다.

현주카페 드림
    `;

    // 이메일 전송 (Gmail 서비스 사용)
    // 참고: Gmail 일일 전송 제한이 있으니 주의하세요
    GmailApp.sendEmail(data.email, subject, body);

    Logger.log(`알림 이메일 전송 완료: ${data.email}`);
  } catch (error) {
    Logger.log(`이메일 전송 실패: ${error.toString()}`);
    // 이메일 전송 실패해도 예약은 정상 처리
  }
}

/**
 * 예약 목록 조회 (관리자용)
 * 특정 날짜의 예약 목록을 반환합니다.
 */
function getReservations(date) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const reservations = [];

    // 헤더를 제외한 데이터 행 처리
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const reservationDate = row[6]; // 예약날짜 열

      if (reservationDate === date || !date) {
        const reservation = {};
        headers.forEach((header, index) => {
          reservation[header] = row[index];
        });
        reservations.push(reservation);
      }
    }

    return reservations;
  } catch (error) {
    Logger.log(`예약 조회 오류: ${error.toString()}`);
    return [];
  }
}

/**
 * 예약 취소 (관리자용)
 * 예약 번호로 예약을 취소합니다.
 */
function cancelReservation(reservationNumber) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return false;
    }

    const data = sheet.getDataRange().getValues();

    // 예약 번호로 행 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reservationNumber) {
        // 상태를 '취소됨'으로 변경
        const statusCell = sheet.getRange(i + 1, 11);
        statusCell.setValue('취소됨');
        statusCell.setBackground('#f8d7da');
        statusCell.setFontColor('#721c24');

        Logger.log(`예약 취소 완료: ${reservationNumber}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    Logger.log(`예약 취소 오류: ${error.toString()}`);
    return false;
  }
}

/**
 * 테스트 함수
 * Apps Script 편집기에서 직접 실행하여 테스트할 수 있습니다.
 */
function testReservation() {
  const testData = {
    name: '홍길동',
    department: '개발팀',
    email: 'test@company.com',
    phone: '010-1234-5678',
    date: '2024-12-30',
    time: '14:00',
    people: '2',
    message: '테스트 예약입니다.',
    timestamp: new Date().toLocaleString('ko-KR')
  };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = createReservationSheet(spreadsheet);
  }

  const reservationNumber = addReservation(sheet, testData);
  Logger.log(`테스트 예약 번호: ${reservationNumber}`);

  return reservationNumber;
}
