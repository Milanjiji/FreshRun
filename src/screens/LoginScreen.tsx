import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  } from 'react-native';
import { Alertt } from '../components/Alertt';
  import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import api from '../utils/api';
import { storage } from '../utils/storage';
import { PageTitle, PageSubtitle } from '../components/Typography';
import { PrimaryButton } from '../components/Button';
import { Fonts } from '../theme/typography';



const OTP_REQUEST_TIMEOUT_MS = 30000;
const BACKEND_REQUEST_TIMEOUT_MS = 15000;

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
  role: 'customer' | 'delivery';
}

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};



const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, role }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // STEP 1: Send OTP
  const signInWithPhoneNumber = async () => {
    if (loading) return;
    try {
      const sanitizedPhone = phoneNumber.replace(/\D/g, '');
      if (!sanitizedPhone || sanitizedPhone.length < 10) {
        Alertt.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      const formattedNumber = `+91${sanitizedPhone}`;
      console.log('Attempting to send OTP via backend to:', formattedNumber);
      
      setLoading(true);
      await withTimeout(
        api.post('/auth/send-otp', { phoneNumber: formattedNumber }),
        OTP_REQUEST_TIMEOUT_MS,
        'OTP request timed out. Please try again.',
      );
      
      console.log('OTP Sent successfully via backend to:', formattedNumber);
      setOtpSent(true);
    } catch (error: any) {
      console.error('Send OTP Error details:', error);
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message || 'Could not send OTP'
        : error.message || 'Could not send OTP';
      Alertt.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const confirmCode = async () => {
    if (!code || code.length < 6) {
      Alertt.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const sanitizedPhone = phoneNumber.replace(/\D/g, '');
      const formattedNumber = `+91${sanitizedPhone}`;
      
      console.log('Verifying code via backend:', code);
      const response = await withTimeout(
        api.post('/auth/verify-otp', {
          phoneNumber: formattedNumber,
          code,
          role,
        }),
        BACKEND_REQUEST_TIMEOUT_MS,
        'Timed out verifying OTP. Please try again.',
      );

      if (response.data.success) {
        const { customToken, user } = response.data;
        console.log('OTP verified. Signing in with custom token...');

        // Sign in to Firebase with the custom token
        const userCredential = await auth().signInWithCustomToken(customToken);
        const firebaseUser = userCredential.user;

        // Get standard ID Token
        const idToken = await withTimeout(
          firebaseUser.getIdToken(),
          BACKEND_REQUEST_TIMEOUT_MS,
          'Timed out while fetching the Firebase token. Please try again.',
        );

        console.log('Firebase session ready. Storing token...');
        storage.setItem('userToken', idToken);
        storage.setItem('userData', user);

        // Wait for onAuthStateChanged to sync state (similar to Google flow)
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('[LoginScreen] onAuthStateChanged did not fire within 3s — proceeding with token.');
            resolve();
          }, 3000);

          const unsubscribe = auth().onAuthStateChanged((authUser) => {
            if (authUser) {
              console.log('[LoginScreen] onAuthStateChanged confirmed.');
              clearTimeout(timeout);
              unsubscribe();
              resolve();
            }
          });
        });

        onLoginSuccess(idToken, user);
      } else {
        throw new Error(response.data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification Error details:', error);
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message || 'Invalid OTP'
        : error.message || 'Invalid OTP';
      Alertt.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topContainer}>
            <View style={styles.header}>
              {otpSent && (
                <TouchableOpacity onPress={() => {
                  setOtpSent(false);
                  setCode('');
                }} style={styles.backToGoogleLink}>
                  <Text style={styles.backToGoogleText}>← Change Phone Number</Text>
                </TouchableOpacity>
              )}
              <PageTitle>{isSignUp ? "Create Account" : "Welcome Back!"}</PageTitle>
              <PageSubtitle>
                {isSignUp ? "Sign up to start ordering delicious food!" : "Sign in to access your account."}
              </PageSubtitle>
            </View>

            <View style={styles.inputSection}>
              {!otpSent ? (
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <View style={styles.countryPicker}>
                      <Text style={styles.flag}>🇮🇳</Text>
                      <Text style={styles.countryCode}>(+91)</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter OTP Code"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholderTextColor="#999"
                      secureTextEntry={false}
                    />
                  </View>
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Resend Code?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <PrimaryButton 
              title={!otpSent ? (isSignUp ? "Sign up" : "Sign in") : "Verify OTP"}
              onPress={!otpSent ? signInWithPhoneNumber : confirmCode}
              loading={loading}
            />
          </View>

          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.loginImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.linkText}>
                {isSignUp ? "Sign in now" : "Sign up now"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topContainer: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 40,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 60,
    backgroundColor: '#fff',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  flag: {
    fontSize: 18,
    marginRight: 5,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: '#000',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: '#000',
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#000',
  },
  linkText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#5D3FD3',
    textDecorationLine: 'underline',
  },
  imageContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  loginImage: {
    width: '100%',
    height: '100%',
  },
  googleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    height: 56,
    width: '100%',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#000000',
    fontWeight: 'bold',
  },
  bottomLinkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  phoneLinkText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#5D3FD3',
    textDecorationLine: 'underline',
  },
  headerCentered: {
    marginBottom: 40,
    alignItems: 'center',
  },
  backToGoogleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backToGoogleText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#5D3FD3',
  },
  pageTitleCentered: {
    textAlign: 'center',
  },
  pageSubtitleCentered: {
    textAlign: 'center',
  },
});

export default LoginScreen;
