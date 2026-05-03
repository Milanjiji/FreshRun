import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import axios from 'axios';
import { storage } from '../utils/storage';
import { PageTitle, PageSubtitle } from '../components/Typography';
import { PrimaryButton } from '../components/Button';

// Replace with your actual backend URL
const BACKEND_URL = "https://freshrun-backend.onrender.com";
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

const getAuthErrorMessage = (error: any, fallbackMessage: string) => {
  const errorCode = error?.code;
  const errorMessage = error?.message;

  if (errorCode === 'auth/invalid-phone-number') {
    return 'Please enter a valid phone number.';
  }

  if (errorCode === 'auth/too-many-requests') {
    return 'Too many OTP attempts. Please wait a bit and try again.';
  }

  if (errorCode === 'auth/network-request-failed') {
    return 'Network error while contacting Firebase. Please check your internet and try again.';
  }

  if (errorCode === 'auth/invalid-verification-code') {
    return 'The OTP you entered is invalid. Please try again.';
  }

  if (errorCode === 'auth/code-expired') {
    return 'This OTP has expired. Please request a new one.';
  }

  return errorMessage || fallbackMessage;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, role }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // STEP 1: Send OTP
  const signInWithPhoneNumber = async () => {
    try {
      const sanitizedPhone = phoneNumber.replace(/\D/g, '');
      if (!sanitizedPhone || sanitizedPhone.length < 10) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      const formattedNumber = `+91${sanitizedPhone}`;
      console.log('Attempting to send OTP to:', formattedNumber);
      
      setLoading(true);
      const confirmation = await withTimeout(
        auth().signInWithPhoneNumber(formattedNumber),
        OTP_REQUEST_TIMEOUT_MS,
        'OTP request timed out. Please try again.',
      );
      
      console.log('OTP Sent successfully to:', formattedNumber);
      setConfirm(confirmation);
    } catch (error: any) {
      console.error('Send OTP Error details:', error);
      Alert.alert('Login Failed', getAuthErrorMessage(error, 'Could not send OTP'));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and Call Backend
  const confirmCode = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      if (!confirm) {
        console.error('Confirm object is null');
        return;
      }
      
      console.log('Verifying code:', code);
      // Verify OTP with Firebase
      const credential = await confirm.confirm(code);
      
      if (credential?.user) {
        // Get ID Token
        const idToken = await withTimeout(
          credential.user.getIdToken(),
          BACKEND_REQUEST_TIMEOUT_MS,
          'Timed out while fetching the Firebase token. Please try again.',
        );
        console.log('Firebase verified. Exchanging for JWT...');

        // Call Backend
        const response = await axios.post(
          `${BACKEND_URL}/auth/login`,
          {
            idToken,
            role,
          },
          {
            timeout: BACKEND_REQUEST_TIMEOUT_MS,
          },
        );

        if (response.data.success) {
          const { token, user } = response.data;
          console.log('Backend login success');
          
          // Store JWT
          storage.setItem('userToken', token);
          storage.setItem('userData', user);
          
          onLoginSuccess(token, user);
        } else {
          throw new Error(response.data.error || 'Backend authentication failed');
        }
      }
    } catch (error: any) {
      console.error('Verification Error details:', error);
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message || 'Backend authentication failed'
        : getAuthErrorMessage(error, 'Invalid OTP');
      Alert.alert('Verification Failed', message);
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
        <View style={styles.content}>
          <View style={styles.topContainer}>
            <View style={styles.header}>
              <PageTitle>Welcome Back!</PageTitle>
              <PageSubtitle>Sign in to access your account.</PageSubtitle>
            </View>

            <View style={styles.inputSection}>
              {!confirm ? (
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
              title={!confirm ? "Sign in" : "Verify OTP"}
              onPress={!confirm ? signInWithPhoneNumber : confirmCode}
              loading={loading}
            />
          </View>

          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/login_page.png')} 
              style={styles.loginImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign up now</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topContainer: {
    flex: 1,
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
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#5D3FD3',
    textDecorationLine: 'underline',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loginImage: {
    width: '100%',
    height: '100%',
  },
});

export default LoginScreen;
