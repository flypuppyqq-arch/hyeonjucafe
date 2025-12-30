// Google Apps Script Web App URL (여기에 배포된 웹 앱 URL을 입력하세요)
// 예: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuE9gMDQpNae2hIO76dGLMeLOgS7cKSkMLFSWGnoCA_5hLL372Vl2CeA8lP1Jx_m6R/exec';

// DOM 요소
const reservationForm = document.getElementById('reservationForm');
const messageContainer = document.getElementById('message-container');
const submitBtn = reservationForm.querySelector('.submit-btn');

// 날짜 입력 필드에 최소 날짜 설정 (오늘 이후로만 예약 가능)
const dateInput = document.getElementById('date');
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
dateInput.min = tomorrow.toISOString().split('T')[0];

// 최대 날짜 설정 (3개월 후까지만 예약 가능)
const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 3);
dateInput.max = maxDate.toISOString().split('T')[0];

// 주말 선택 방지
dateInput.addEventListener('change', function() {
    const selectedDate = new Date(this.value);
    const dayOfWeek = selectedDate.getDay();

    // 0 = 일요일, 6 = 토요일
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        showMessage('주말은 휴무일입니다. 평일을 선택해주세요.', 'error');
        this.value = '';
    }
});

// 폼 제출 이벤트 리스너
reservationForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 폼 데이터 수집
    const formData = {
        name: document.getElementById('name').value.trim(),
        department: document.getElementById('department').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        people: document.getElementById('people').value,
        message: document.getElementById('message').value.trim(),
        timestamp: new Date().toLocaleString('ko-KR')
    };

    // 유효성 검사
    if (!validateForm(formData)) {
        return;
    }

    // 예약 제출
    await submitReservation(formData);
});

// 폼 유효성 검사
function validateForm(data) {
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        return false;
    }

    // 전화번호 형식 검사 (기본적인 검사)
    const phoneRegex = /^[0-9-]+$/;
    if (!phoneRegex.test(data.phone)) {
        showMessage('올바른 전화번호 형식을 입력해주세요. (숫자와 - 만 사용)', 'error');
        return false;
    }

    // 날짜가 선택되었는지 확인
    if (!data.date) {
        showMessage('예약 날짜를 선택해주세요.', 'error');
        return false;
    }

    // 시간이 선택되었는지 확인
    if (!data.time) {
        showMessage('예약 시간을 선택해주세요.', 'error');
        return false;
    }

    // 인원이 선택되었는지 확인
    if (!data.people) {
        showMessage('인원을 선택해주세요.', 'error');
        return false;
    }

    return true;
}

// Google Sheets에 예약 제출
async function submitReservation(data) {
    // 버튼 비활성화 및 로딩 표시
    submitBtn.disabled = true;
    submitBtn.textContent = '예약 중...';

    try {
        // Apps Script URL이 설정되지 않은 경우
        if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
            // 개발 모드: 콘솔에 데이터 출력
            console.log('예약 데이터:', data);

            // 시뮬레이션: 성공 메시지 표시
            setTimeout(() => {
                showMessage(
                    `예약이 완료되었습니다!<br>
                    <strong>${data.name}</strong>님의 예약 정보:<br>
                    날짜: ${data.date}<br>
                    시간: ${data.time}<br>
                    인원: ${data.people}명`,
                    'success'
                );
                reservationForm.reset();
                submitBtn.disabled = false;
                submitBtn.textContent = '예약하기';
            }, 1000);

            return;
        }

        // 실제 Google Apps Script로 데이터 전송
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script는 CORS를 지원하지 않으므로 no-cors 모드 사용
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        // no-cors 모드에서는 응답을 확인할 수 없으므로 성공으로 간주
        showMessage(
            `예약이 완료되었습니다!<br>
            <strong>${data.name}</strong>님의 예약 정보:<br>
            날짜: ${data.date}<br>
            시간: ${data.time}<br>
            인원: ${data.people}명<br><br>
            예약 확인은 이메일로 발송됩니다.`,
            'success'
        );

        // 폼 초기화
        reservationForm.reset();

    } catch (error) {
        console.error('예약 오류:', error);
        showMessage('예약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
        // 버튼 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = '예약하기';
    }
}

// 메시지 표시 함수
function showMessage(message, type) {
    messageContainer.innerHTML = message;
    messageContainer.className = `message-container ${type}`;
    messageContainer.style.display = 'block';

    // 스크롤하여 메시지 보이기
    messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 5초 후 메시지 숨김 (에러 메시지는 제외)
    if (type === 'success') {
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('현주카페 예약 시스템이 로드되었습니다.');

    // Apps Script URL이 설정되지 않은 경우 경고
    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
        console.warn('⚠️ Google Apps Script URL이 설정되지 않았습니다. 개발 모드로 실행됩니다.');
        console.warn('배포 후 script.js 파일의 APPS_SCRIPT_URL 변수를 업데이트해주세요.');
    }
});
