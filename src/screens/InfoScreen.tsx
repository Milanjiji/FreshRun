import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

export type InfoType = 'about' | 'privacy' | 'terms' | 'refund' | 'shipping' | 'contact';

interface InfoScreenProps {
  type: InfoType;
  onBack: () => void;
}

const InfoScreen: React.FC<InfoScreenProps> = ({ type, onBack }) => {
  const getContent = () => {
    switch (type) {
      case 'about':
        return {
          title: 'About Us',
          icon: 'information-circle',
          sections: [
            {
              heading: 'Who We Are',
              content: 'FreshRush was launched in Bauria, Howrah, West Bengal with a vision to connect local shops and local customers through technology. We connect you with your favorite nearby local stores for groceries, food, and essentials.',
            },
            {
              heading: 'Our Mission',
              content: 'To make every local shop digitally accessible and every customer\'s daily shopping experience faster, easier, and more convenient.',
            },
            {
              heading: 'Our Vision',
              content: 'To become the most trusted local commerce platform where customers, stores, and delivery partners grow together.',
            },
            {
              heading: 'Quality & Trust',
              content: 'Every store on FreshRush is manually verified and approved to ensure you get only the best quality products.',
            },
            {
              heading: 'Founder & CEO',
              content: 'Ashish Mishra\nAshish Mishra founded FreshRush with the vision of helping local businesses embrace digital technology and reach more customers in their communities.',
            },
            {
              heading: 'Developer Credit',
              content: 'Developed by Milan J (Kerala based developer)\nEmail: milanjiji7172@gmail.com',
            },
          ],
        };
      case 'privacy':
        return {
          title: 'Privacy Policy',
          icon: 'shield-checkmark',
          sections: [
            {
              heading: 'Data Collection',
              content: 'We collect your name, phone number, and location to provide delivery services. Your data is encrypted and never shared with unauthorized third parties.',
            },
            {
              heading: 'How We Use Data',
              content: 'Your location is used only when the app is active or in the background during an active order to provide real-time tracking.',
            },
            {
              heading: 'Your Rights',
              content: 'You can request to delete your account and all associated data at any time through the app settings.',
            },
          ],
        };
      case 'terms':
        return {
          title: 'Terms & Conditions',
          icon: 'document-text',
          sections: [
            {
              heading: 'Agreement',
              content: 'By using FreshRush, you agree to our terms of service, including payment and delivery policies.',
            },
            {
              heading: 'User Conduct',
              content: 'Users must provide accurate information and not misuse the platform for any illegal activities.',
            },
            {
              heading: 'Liability',
              content: 'FreshRush acts as a facilitator between vendors and customers. We are not liable for the quality of items prepared by vendors.',
            },
          ],
        };
      case 'refund':
        return {
          title: 'Refund & Cancellation',
          icon: 'refresh-circle',
          sections: [
            {
              heading: 'Cancellation',
              content: 'Orders can be cancelled before store acceptance. Once preparation starts, cancellation fees may apply.',
            },
            {
              heading: 'Refunds',
              content: 'Refunds for cancelled orders or missing items are processed within 5-7 business days to the original payment method.',
            },
          ],
        };
      case 'shipping':
        return {
          title: 'Shipping & Delivery',
          icon: 'truck',
          sections: [
            {
              heading: 'Delivery Area',
              content: 'We currently deliver within Bauria, Howrah, West Bengal within a 5-7km radius of partner stores.',
            },
            {
              heading: 'Delivery Time',
              content: 'Estimated delivery time is 30-45 minutes depending on traffic and preparation time.',
            },
          ],
        };
      case 'contact':
        return {
          title: 'Contact Us',
          icon: 'mail',
          sections: [
            {
              heading: 'Customer Support',
              content: 'Email: support@freshrush.com\nPhone: 9088568423\nWebsite: www.freshrush.in',
            },
            {
              heading: 'Office Address',
              content: 'FreshRush HQ, Bauria, Howrah, West Bengal, India',
            },
            {
              heading: 'Developer Contact',
              content: 'Developer: Milan J (Kerala based developer)\nEmail: milanjiji7172@gmail.com',
            },
          ],
        };
      default:
        return { title: 'Information', icon: 'help-circle', sections: [] };
    }
  };

  const data = getContent();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      <TouchableOpacity onPress={onBack} style={styles.backCircleButton}>
        <Icon name="chevron-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
           <Text style={styles.bannerTitle}>{data.title}</Text>
           <Text style={styles.bannerSubtitle}>Last updated: June 2026</Text>
        </View>

        {data.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.content}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 FreshRush Technologies. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backCircleButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: Colors.white,
  },
  banner: {
    alignItems: 'flex-start',
    paddingHorizontal: 25,
    paddingTop: 85,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 15,
  },
  bannerTitle: {
    fontSize: 28,
    fontFamily: Fonts.black,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#888',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 25,
    marginBottom: 25,
  },
  heading: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#444',
    lineHeight: 22,
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#bbb',
    textAlign: 'center',
  },
});

export default InfoScreen;
