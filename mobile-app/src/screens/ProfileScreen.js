import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import { useUser } from '../contexts/UserContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout: logoutUser } = useUser();
  
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            // Clear user data from context
            logoutUser();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User Name'}</Text>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        
        {/* User ID Display */}
        <View style={styles.userIdContainer}>
          <Text style={styles.userIdLabel}>User ID:</Text>
          <Text style={styles.userIdValue}>{user?.userId || 'N/A'}</Text>
        </View>
        
        {/* Role Display */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleText}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Role'}
          </Text>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Issues Reported</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    marginBottom: spacing.lg,
  },
  userIdContainer: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  userIdLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.darkGray,
    marginRight: spacing.xs,
  },
  userIdValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.black,
    fontFamily: 'monospace',
  },
  roleContainer: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: 8,
    minWidth: 100,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.black,
  },
});
