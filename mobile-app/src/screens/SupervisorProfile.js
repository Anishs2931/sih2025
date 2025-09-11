import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';

export default function SupervisorProfile({ navigation }) {
  const { user, logout } = useUser();
  const [profileData, setProfileData] = useState(null);
  const [workStats, setWorkStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch supervisor profile and work statistics
  const fetchProfileData = async () => {
    try {
      if (!user?.userId) return;

      // Fetch profile details
      const profileResponse = await fetch(`http://192.168.1.4:3000/api/supervisor/profile/${user.userId}`);
      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        setProfileData(profileData.supervisor);
      }

      // Fetch work statistics
      const statsResponse = await fetch(`http://192.168.1.4:3000/api/supervisor/stats/${user.userId}`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setWorkStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

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
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, subtitle, color = colors.black, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const InfoRow = ({ label, value, icon }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supervisor Profile</Text>
        <TouchableOpacity 
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Supervisor'}</Text>
          <Text style={styles.profileRole}>Municipal Supervisor</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        {/* Work Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Work Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Tasks"
              value={workStats.totalTasks || 0}
              color="#007AFF"
              icon="📋"
            />
            <StatCard
              title="Completed"
              value={workStats.completedTasks || 0}
              subtitle={`${workStats.completionRate || 0}% completion rate`}
              color="#34C759"
              icon="✅"
            />
            <StatCard
              title="Pending"
              value={workStats.pendingTasks || 0}
              color="#FF9500"
              icon="⏳"
            />
            <StatCard
              title="This Month"
              value={workStats.monthlyTasks || 0}
              subtitle="Tasks this month"
              color="#FF3B30"
              icon="📅"
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <InfoRow
            label="Email"
            value={profileData?.email || user?.email}
            icon="📧"
          />
          <InfoRow
            label="Phone"
            value={profileData?.phoneNumber || user?.phone}
            icon="📞"
          />
          <InfoRow
            label="Employee ID"
            value={profileData?.employeeId || user?.userId}
            icon="🆔"
          />
        </View>

        {/* Department Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Department Details</Text>
          <InfoRow
            label="Department"
            value={profileData?.department || user?.department || 'General'}
            icon="🏛️"
          />
          <InfoRow
            label="Municipality"
            value={profileData?.municipality || user?.municipality || 'Not specified'}
            icon="🏙️"
          />
          <InfoRow
            label="Joined Date"
            value={profileData?.joinedAt ? new Date(profileData.joinedAt).toLocaleDateString() : 'Not available'}
            icon="📅"
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {workStats.recentActivity && workStats.recentActivity.length > 0 ? (
            workStats.recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityDate}>{activity.date}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noActivityText}>No recent activity</Text>
          )}
        </View>

        {/* Performance Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{workStats.averageResolutionTime || 'N/A'}</Text>
              <Text style={styles.metricLabel}>Avg. Resolution Time</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{workStats.teamRating || 'N/A'}</Text>
              <Text style={styles.metricLabel}>Team Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{workStats.tasksThisWeek || '0'}</Text>
              <Text style={styles.metricLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorTaskList')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>View All Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorReports')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Settings feature will be available soon')}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Help feature will be available soon')}
            >
              <Text style={styles.actionIcon}>❓</Text>
              <Text style={styles.actionText}>Help & Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.gray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.black,
  },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  profileRole: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  statusBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  statsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  statTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.darkGray,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontWeight: typography.weights.medium,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.black,
    marginTop: spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityAction: {
    fontSize: typography.sizes.md,
    color: colors.black,
    flex: 1,
  },
  activityDate: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
  },
  noActivityText: {
    fontSize: typography.sizes.md,
    color: colors.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    textAlign: 'center',
  },
  actionsSection: {
    padding: spacing.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});
