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
          title: 'About FreshRun',
          icon: 'information-circle',
          sections: [
            {
              heading: 'Who We Are',
              content: 'FreshRun is Alappuzha\'s own hyper-local delivery platform. We connect you with your favorite local stores for groceries, food, and essentials.',
            },
            {
              heading: 'Our Mission',
              content: 'To provide the fastest and most reliable delivery service while supporting local vendors and building a stronger community.',
            },
            {
              heading: 'Quality & Trust',
              content: 'Every store on FreshRun is manually verified and approved to ensure you get only the best quality products.',
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
              content: 'By using FreshRun, you agree to our terms of service, including payment and delivery policies.',
            },
            {
              heading: 'User Conduct',
              content: 'Users must provide accurate information and not misuse the platform for any illegal activities.',
            },
            {
              heading: 'Liability',
              content: 'FreshRun acts as a facilitator between vendors and customers. We are not liable for the quality of items prepared by vendors.',
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
              content: 'We currently deliver within Alappuzha (Punnapra) and Calicut within a 5-7km radius of partner stores.',
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
              content: 'Email: support@freshrun.com\nPhone: +91 98765 43210',
            },
            {
              heading: 'Office Address',
              content: 'FreshRun HQ, Beach Road, Punnapra, Alappuzha, Kerala - 688005',
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
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{data.title}</Text>
        <View style={styles.headerRight}>
          <Icon name={data.icon} size={24} color={Colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
           <View style={styles.iconCircle}>
              <Icon name={data.icon} size={40} color={Colors.primary} />
           </View>
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
           <Text style={styles.footerText}>© 2026 FreshRun Technologies. All rights reserved.</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#333',
  },
  headerRight: {
    width: 34,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: Colors.background,
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
    fontSize: 22,
    fontFamily: Fonts.black,
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
