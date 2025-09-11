import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { authAPI } from '../utils/api';
import { useUser } from '../contexts/UserContext';

export default function LoginScreen({ navigation }) {
  const { login: loginUser } = useUser();
  const [email, setEmail] = useState('citizen@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('citizen');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { value: 'citizen', label: 'Citizen', description: 'Report issues and track progress (Default login provided)' },
    { value: 'supervisor', label: 'Supervisor', description: 'Manage issues and oversee work (Default login provided)' },
    { value: 'admin', label: 'Admin', description: 'Full system access and management (Default login provided)' },
  ];

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && (!name || !phone)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // For login, role is required
    if (isLogin && !role) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Login logic
        const response = await authAPI.login({ email, password, role });
        if (response.data.success) {
          // Store user data in context
          const userData = response.data.user;
          loginUser(userData);
          
          Alert.alert('Success', `Welcome back, ${userData.name}! User ID: ${userData.userId}`, [
            {
              text: 'OK',
              onPress: () => navigation.navigate('MainTabs'),
            },
          ]);
        }
      } else {
        // Register logic - only citizens can register
        const response = await authAPI.register({ 
          name, 
          email, 
          password, 
          phone, 
          address
          // No role needed - backend will set as 'citizen'
        });
        if (response.data.success) {
          Alert.alert('Success', 'Citizen account created successfully! Please login.', [
            {
              text: 'OK',
              onPress: () => {
                setIsLogin(true);
                setRole('citizen'); // Set role to citizen for login
              },
            },
          ]);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Authentication failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const RoleSelector = () => (
    <TouchableOpacity 
      style={styles.roleSelector} 
      onPress={() => setShowRoleModal(true)}
    >
      <View style={styles.roleSelectorContent}>
        <View>
          <Text style={styles.roleSelectorLabel}>Role</Text>
          <Text style={styles.roleSelectorValue}>
            {roles.find(r => r.value === role)?.label || 'Select Role'}
          </Text>
        </View>
        <Text style={styles.dropdownArrow}>▼</Text>
      </View>
    </TouchableOpacity>
  );

  const RoleModal = () => (
    <Modal
      visible={showRoleModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRoleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Role</Text>
            <TouchableOpacity 
              onPress={() => setShowRoleModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.roleList}>
            {roles.map((roleOption) => (
              <TouchableOpacity
                key={roleOption.value}
                style={[
                  styles.roleOption,
                  role === roleOption.value && styles.selectedRoleOption
                ]}
                onPress={() => {
                  setRole(roleOption.value);
                  
                  // Set default credentials for supervisor role
                  if (roleOption.value === 'supervisor') {
                    setEmail('rajesh.electrical@hyderabad.gov.in');
                    setPassword('password123');
                  } else if (roleOption.value === 'citizen') {
                    setEmail('citizen@gmail.com');
                    setPassword('12345678');
                  } else if (roleOption.value === 'admin') {
                    setEmail('admin@quadratech.gov.in');
                    setPassword('admin123');
                  }
                  
                  setShowRoleModal(false);
                }}
              >
                <View style={styles.roleOptionContent}>
                  <Text style={[
                    styles.roleOptionLabel,
                    role === roleOption.value && styles.selectedRoleOptionLabel
                  ]}>
                    {roleOption.label}
                  </Text>
                  <Text style={[
                    styles.roleOptionDescription,
                    role === roleOption.value && styles.selectedRoleOptionDescription
                  ]}>
                    {roleOption.description}
                  </Text>
                </View>
                {role === roleOption.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>QuadraTech</Text>
            <View style={styles.tagline}>
              <Text style={styles.taglineText}>🏠 AI-Powered Community Management</Text>
            </View>
            <Text style={styles.subtitle}>Smart Solutions for Better Communities</Text>
            <Text style={styles.description}>
              AI-powered maintenance management that makes community living better for everyone.
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.gray}
                value={name}
                onChangeText={setName}
              />
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.gray}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Address (Optional)"
                  placeholderTextColor={colors.gray}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
                
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ Only citizen accounts can be created through the app. 
                    Supervisor and admin accounts are created by administrators.
                  </Text>
                </View>
              </>
            )}

            {/* Only show role selector for login */}
            {isLogin && <RoleSelector />}

            {/* Show default credentials info for selected role */}
            {isLogin && role && (
              <View style={styles.credentialsInfoBox}>
                <Text style={styles.credentialsInfoTitle}>Default Credentials:</Text>
                {role === 'citizen' && (
                  <Text style={styles.credentialsInfoText}>
                    Email: citizen@gmail.com{'\n'}Password: 12345678
                  </Text>
                )}
                {role === 'supervisor' && (
                  <Text style={styles.credentialsInfoText}>
                    Email: rajesh.electrical@hyderabad.gov.in{'\n'}Password: password123
                  </Text>
                )}
                {role === 'admin' && (
                  <Text style={styles.credentialsInfoText}>
                    Email: admin@quadratech.gov.in{'\n'}Password: admin123
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={styles.switchTextBold}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <RoleModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  tagline: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  taglineText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontWeight: typography.weights.medium,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  form: {
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.tertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.black,
    marginBottom: spacing.md,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.black,
  },
  eyeButton: {
    padding: spacing.md,
    paddingLeft: spacing.sm,
  },
  eyeIcon: {
    fontSize: typography.sizes.lg,
  },
  infoBox: {
    backgroundColor: colors.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
  },
  roleSelector: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.tertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  roleSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleSelectorLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
    marginBottom: 2,
  },
  roleSelectorValue: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  dropdownArrow: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
  },
  button: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.gray,
  },
  buttonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
  switchTextBold: {
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.tertiary,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.gray,
  },
  roleList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  selectedRoleOption: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  roleOptionContent: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  selectedRoleOptionLabel: {
    color: colors.primary,
  },
  roleOptionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
  },
  selectedRoleOptionDescription: {
    color: colors.secondary,
  },
  checkmark: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  credentialsInfoBox: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  credentialsInfoTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  credentialsInfoText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
