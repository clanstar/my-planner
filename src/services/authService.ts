import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile as firebaseUpdateProfile,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    User,
    UserCredential
  } from 'firebase/auth';
  import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
  import { auth, db } from '../config/firebase';
  import { RegisterFormData, ProfileUpdateFormData } from '../types/auth';
  
  /**
   * 이메일과 비밀번호로 사용자 등록
   */
  export const registerUser = async (userData: RegisterFormData): Promise<User> => {
    try {
      // Firebase Authentication에 사용자 등록
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
  
      const user = userCredential.user;
  
      // 사용자 프로필 업데이트
      await firebaseUpdateProfile(user, {
        displayName: userData.displayName
      });
  
      // Firestore에 사용자 데이터 저장
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: userData.email,
        displayName: userData.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
  
      return user;
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      throw error;
    }
  };
  
  /**
   * 이메일과 비밀번호로 로그인
   */
  export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      throw error;
    }
  };
  
  /**
   * 로그아웃
   */
  export const logoutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      throw error;
    }
  };
  
  /**
   * 비밀번호 재설정 이메일 전송
   */
  export const resetUserPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('비밀번호 재설정 이메일 전송 중 오류 발생:', error);
      throw error;
    }
  };
  
  /**
   * 사용자 프로필 업데이트
   */
  export const updateUserProfile = async (user: User, data: ProfileUpdateFormData): Promise<void> => {
    try {
      const updates: any = {};
      
      // 프로필 이름 업데이트
      if (data.displayName) {
        await firebaseUpdateProfile(user, {
          displayName: data.displayName
        });
        updates.displayName = data.displayName;
      }
  
      // 프로필 사진 업데이트
      if (data.photoURL) {
        await firebaseUpdateProfile(user, {
          photoURL: data.photoURL
        });
        updates.photoURL = data.photoURL;
      }
  
      // 이메일 변경
      if (data.email && data.email !== user.email) {
        // 이메일 변경 시 재인증 필요
        if (data.currentPassword) {
          const credential = EmailAuthProvider.credential(
            user.email as string,
            data.currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          await updateEmail(user, data.email);
          updates.email = data.email;
        } else {
          throw new Error('이메일을 변경하려면 현재 비밀번호가 필요합니다.');
        }
      }
  
      // 비밀번호 변경
      if (data.newPassword && data.currentPassword) {
        // 비밀번호 변경 시 재인증 필요
        const credential = EmailAuthProvider.credential(
          user.email as string,
          data.currentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
      }
  
      // Firestore 사용자 문서 업데이트
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, updates);
      }
    } catch (error) {
      console.error('프로필 업데이트 중 오류 발생:', error);
      throw error;
    }
  };
  
  /**
   * 사용자 정보 가져오기
   */
  export const getUserData = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        console.log('사용자 데이터가 없습니다.');
        return null;
      }
    } catch (error) {
      console.error('사용자 데이터 조회 중 오류 발생:', error);
      throw error;
    }
  };