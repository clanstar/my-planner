import { useState, FormEvent } from 'react';
import { User, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileUpdateFormData } from '../../types/auth';

export default function UserProfile() {
  const { currentUser, updateProfile, error, resetError } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProfileUpdateFormData>({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // 오류 및 성공 메시지 초기화
    if (formError) setFormError(null);
    if (successMessage) setSuccessMessage(null);
    if (error) resetError();
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (formData.newPassword && !formData.currentPassword) {
      setFormError('비밀번호를 변경하려면 현재 비밀번호를 입력해주세요.');
      return;
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      setFormError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    
    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      setFormError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (formData.email !== currentUser?.email && !formData.currentPassword) {
      setFormError('이메일을 변경하려면 현재 비밀번호를 입력해주세요.');
      return;
    }
    
    // 불필요한 필드 제거 및 빈 값 필터링
    const dataToSubmit: ProfileUpdateFormData = {};
    
    if (formData.displayName && formData.displayName !== currentUser?.displayName) {
      dataToSubmit.displayName = formData.displayName;
    }
    
    if (formData.email && formData.email !== currentUser?.email) {
      dataToSubmit.email = formData.email;
      dataToSubmit.currentPassword = formData.currentPassword;
    }
    
    if (formData.newPassword) {
      dataToSubmit.newPassword = formData.newPassword;
      dataToSubmit.currentPassword = formData.currentPassword;
    }
    
    // 변경사항이 없는 경우
    if (Object.keys(dataToSubmit).length === 0 && !formData.currentPassword) {
      setFormError('변경된 내용이 없습니다.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateProfile(dataToSubmit);
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.');
      
      // 비밀번호 필드 초기화
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (err) {
      console.error('프로필 업데이트 오류:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현재 사용자가 없는 경우
  if (!currentUser) {
    return (
      <div className="text-center p-4">
        <p>사용자 정보를 불러올 수 없습니다. 로그인 상태를 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-center mb-6">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || '사용자'}
              className="w-24 h-24 rounded-full border-4 border-blue-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-12 h-12 text-blue-500" />
            </div>
          )}
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
          {/* 이름 입력 */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이름
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* 이메일 입력 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              이메일을 변경하려면 현재 비밀번호를 입력해주세요
            </p>
          </div>

          {/* 현재 비밀번호 입력 */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              현재 비밀번호
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* 새 비밀번호 입력 */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              새 비밀번호
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* 새 비밀번호 확인 입력 */}
          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              새 비밀번호 확인
            </label>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              value={formData.confirmNewPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
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
              <>
                <Save className="w-5 h-5" />
                <span>프로필 업데이트</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}