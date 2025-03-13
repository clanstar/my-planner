import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Key, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PasswordResetForm() {
  const { resetPassword, error, resetError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // 오류 및 성공 메시지 초기화
    if (formError) setFormError(null);
    if (successMessage) setSuccessMessage(null);
    if (error) resetError();
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // 폼 유효성 검사
    if (!email.trim()) {
      setFormError('이메일을 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await resetPassword(email);
      setSuccessMessage(`비밀번호 재설정 링크가 ${email}로 전송되었습니다. 이메일을 확인해주세요.`);
      setEmail(''); // 폼 초기화
    } catch (err) {
      console.error('비밀번호 재설정 오류:', err);
      // useAuth 훅에서 에러 처리하므로 추가 작업 필요 없음
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Key className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">비밀번호 재설정</h2>
          <p className="text-gray-600 mt-2">
            계정에 등록된 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 오류 메시지 */}
        {(formError || error) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 입력 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={handleChange}
                className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>처리 중...</span>
            ) : (
              <span>비밀번호 재설정 링크 전송</span>
            )}
          </button>
        </form>

        {/* 로그인 페이지 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              로그인 페이지로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}