import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';
import { issueAPI } from '../utils/api';
import IssueCard from '../components/IssueCard';

const HistoryScreen = ({ navigation }) => {
  const { user } = useUser();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserIssues();
  }, [user]);

  const fetchUserIssues = async () => {
    if (!user?.email && !user?.uniqueUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userEmail = user.email || user.uniqueUserId;
      const response = await issueAPI.getUserIssues(userEmail);
      
      if (response.data.success) {
        setIssues(response.data.issues);
      } else {
        Alert.alert('Error', 'Failed to fetch your issues');
      }
    } catch (error) {
      console.error('Error fetching user issues:', error);
      Alert.alert('Error', 'Failed to load your issues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserIssues();
    setRefreshing(false);
  }, [user]);

  const navigateToIssueDetail = (issueId) => {
    navigation.navigate('IssueDetail', { issueId });
  };

  const getIssueStats = () => {
    const stats = {
      total: issues.length,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
    };

    issues.forEach(issue => {
      const status = issue.status?.toLowerCase() || 'pending';
      if (status.includes('pending')) stats.pending++;
      else if (status.includes('assign')) stats.assigned++;
      else if (status.includes('progress') || status.includes('ongoing')) stats.inProgress++;
      else if (status.includes('complet')) stats.completed++;
    });

    return stats;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your issues...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getIssueStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Issue History</Text>
          <Text style={styles.subtitle}>
            Track all your reported issues and their progress
          </Text>
        </View>

        {/* Statistics */}
        {issues.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <StatCard 
                title="Total" 
                value={stats.total} 
                color="#2196F3" 
                icon="📊"
              />
              <StatCard 
                title="Pending" 
                value={stats.pending} 
                color="#757575" 
                icon="⏳"
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard 
                title="Assigned" 
                value={stats.assigned} 
                color="#FFA500" 
                icon="👷"
              />
              <StatCard 
                title="Completed" 
                value={stats.completed} 
                color="#4CAF50" 
                icon="✅"
              />
            </View>
          </View>
        )}

        {/* Issues List */}
        {issues.length > 0 ? (
          <View style={styles.issuesContainer}>
            <Text style={styles.sectionTitle}>Your Issues</Text>
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onPress={() => navigateToIssueDetail(issue.id)}
                showDate={true}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📱</Text>
            <Text style={styles.emptyStateText}>No Issues Reported Yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by reporting your first issue using the camera feature
            </Text>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={styles.reportButtonIcon}>📷</Text>
              <Text style={styles.reportButtonText}>Report First Issue</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({ title, value, color, icon }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    lineHeight: 22,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
  },
  statTitle: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontWeight: typography.weights.medium,
  },
  issuesContainer: {
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButtonIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  reportButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default HistoryScreen;
