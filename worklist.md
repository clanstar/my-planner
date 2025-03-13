## 로그인 시스템 구현 우선순위 및 작업 내용

### 1단계: 기본 설정 및 인증 기반 구축
1. **package.json**
   - Firebase 패키지 추가: `npm install firebase`

2. **config/firebase.ts**
   - Firebase 앱 초기화
   - 인증(Authentication) 및 Firestore 서비스 설정
   - 코드 예: 
     ```typescript
     import { initializeApp } from 'firebase/app';
     import { getAuth } from 'firebase/auth';
     import { getFirestore } from 'firebase/firestore';
     
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     
     const app = initializeApp(firebaseConfig);
     export const auth = getAuth(app);
     export const db = getFirestore(app);
     ```

3. **types/auth.ts**
   - 인증 관련 타입 정의
   - 사용자, 로그인 폼, 회원가입 폼 등의 인터페이스 정의

### 2단계: 인증 서비스 및 컨텍스트 구현
4. **services/authService.ts**
   - 로그인, 로그아웃, 회원가입, 비밀번호 재설정 등 기능 구현
   - Firebase Auth API를 활용한 인증 서비스 함수 작성

5. **store/AuthContext.tsx**
   - 사용자 인증 상태 관리
   - 로그인 상태, 사용자 정보 등을 애플리케이션 전체에서 사용 가능하게 구현
   - useReducer 또는 useState를 사용하여 상태 관리

6. **hooks/useAuth.ts**
   - AuthContext를 쉽게 사용할 수 있는 커스텀 훅 구현
   - 사용자 상태 및 인증 함수를 제공

### 3단계: 인증 컴포넌트 구현
7. **components/auth/LoginForm.tsx**
   - 이메일/비밀번호 로그인 폼 구현
   - 로그인 상태 및 오류 처리

8. **components/auth/RegisterForm.tsx**
   - 새 사용자 등록 폼 구현
   - 이메일, 비밀번호, 이름 등 정보 입력 및 유효성 검사

9. **components/auth/PasswordResetForm.tsx**
   - 비밀번호 재설정 이메일 발송 폼 구현

10. **components/auth/ProtectedRoute.tsx**
    - 인증되지 않은 사용자의 접근 제한
    - 로그인 페이지로 리디렉션 로직

### 4단계: 인증 페이지 구현
11. **pages/LoginPage.tsx**
    - LoginForm 컴포넌트 사용
    - 로그인 페이지 레이아웃 및 디자인

12. **pages/RegisterPage.tsx**
    - RegisterForm 컴포넌트 사용
    - 회원가입 페이지 레이아웃 및 디자인

13. **pages/PasswordResetPage.tsx**
    - PasswordResetForm 컴포넌트 사용
    - 비밀번호 재설정 페이지 구현

### 5단계: 라우팅 및 레이아웃 업데이트
14. **App.tsx**
    - 인증 관련 라우트 추가 (로그인, 회원가입, 비밀번호 재설정)
    - ProtectedRoute로 인증 필요 페이지 보호

15. **layouts/MainLayout.tsx**
    - 로그인/로그아웃 상태에 따른 UI 표시
    - 인증 상태 확인 및 네비게이션 변경

### 6단계: 데이터 연동 구현
16. **services/firestoreService.ts**
    - Firestore CRUD 작업 함수 구현
    - 사용자별 데이터 관리 로직

17. **hooks/useFirestore.ts**
    - Firestore 데이터를 쉽게 사용할 수 있는 커스텀 훅
    - 컬렉션 및 문서 데이터 관리

18. **store/PlannerContext.tsx**
    - 기존 컨텍스트에 Firebase 데이터 연동 로직 추가
    - 사용자별 데이터 저장 및 로드 기능

### 7단계: 사용자 프로필 관리
19. **components/auth/UserProfile.tsx**
    - 사용자 프로필 표시 및 수정 컴포넌트
    - 프로필 사진, 이름 등 관리

20. **pages/ProfilePage.tsx**
    - UserProfile 컴포넌트 사용
    - 사용자 설정 및 계정 관리 기능

### 8단계: 유틸리티 및 보안 강화
21. **utils/authUtils.ts**
    - 토큰 관리, 세션 유지 등 유틸리티 함수
    - 보안 관련 헬퍼 함수