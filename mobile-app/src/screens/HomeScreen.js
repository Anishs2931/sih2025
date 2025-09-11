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
import * as Location from 'expo-location';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';
import { useLocation } from '../contexts/LocationContext';
import { locationAPI, issueAPI } from '../utils/api';
import IssueCard from '../components/IssueCard';

export default function HomeScreen({ navigation }) {
  const { user } = useUser();
  const { 
    locationData, 
    isLocationLoading, 
    updateLocation, 
    setLocationLoading 
  } = useLocation();
  
  const [recentIssues, setRecentIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    fetchRecentIssues();
  }, []);

  const fetchRecentIssues = async () => {
    if (!user?.email && !user?.uniqueUserId) return;
    
    try {
      setIssuesLoading(true);
      const userEmail = user.email || user.uniqueUserId;
      console.log('🔍 HomeScreen fetchRecentIssues - User email:', userEmail);
      const response = await issueAPI.getUserIssues(userEmail);
      
      if (response.data.success) {
        // Get only the 2 most recent issues
        const recent = response.data.issues.slice(0, 2);
        console.log('✅ HomeScreen - Recent issues fetched:', recent.length);
        setRecentIssues(recent);
      }
    } catch (error) {
      console.error('Error fetching recent issues:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Show error if permission denied - no IP fallback
        console.log('Location permission denied');
        updateLocation({
          municipality: 'Permission Denied',
          state: 'Please enable location access',
          source: 'permission_error'
        });
        setLocationLoading(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Get municipality from backend using Google Maps API
      const response = await locationAPI.getMunicipality({
        latitude,
        longitude
      });

      if (response.data.success) {
        updateLocation({
          ...response.data.data,
          coordinates: { latitude, longitude },
          source: 'gps_maps'
        });
      } else {
        throw new Error('Failed to get location data from Google Maps');
      }

    } catch (error) {
      console.error('Location error:', error);
      // Show error instead of IP fallback
      updateLocation({
        municipality: 'Location Error',
        state: 'Unable to detect location',
        source: 'gps_error'
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };
  const StatCard = ({ title, value, subtitle }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.name || 'User'}! 👋
          </Text>
          <Text style={styles.subtitle}>AI-powered community management at your fingertips</Text>
        </View>

        {/* Location Display */}
        <View style={styles.locationContainer}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationTitle}>Current Location</Text>
            {!isLocationLoading && (
              <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isLocationLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={colors.black} />
              <Text style={styles.locationLoadingText}>Detecting location...</Text>
            </View>
          ) : (
            <View style={styles.locationInfo}>
              <Text style={styles.municipalityText}>
                {locationData?.municipality || 'Unknown'}
              </Text>
              <Text style={styles.stateText}>
                {locationData?.state || 'Unknown State'}
              </Text>
              {locationData?.source === 'gps_maps' && (
                <Text style={styles.locationSource}>� GPS + Google Maps</Text>
              )}
              {locationData?.source === 'fallback' && (
                <Text style={styles.locationSource}>⚙️ API Setup Required</Text>
              )}
              {locationData?.source === 'permission_error' && (
                <Text style={styles.locationError}>⚠️ Location permission denied</Text>
              )}
              {locationData?.source === 'gps_error' && (
                <Text style={styles.locationError}>⚠️ GPS unavailable</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <StatCard 
            title="Active Issues" 
            value={recentIssues.filter(issue => 
              !issue.status?.toLowerCase().includes('complet')
            ).length} 
            subtitle="In progress" 
          />
          <StatCard 
            title="Total Reported" 
            value={recentIssues.length > 0 ? `${recentIssues.length}+` : '0'} 
            subtitle="All time" 
          />
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={styles.actionButtonIcon}>📷</Text>
              <Text style={styles.actionButtonText}>Report Issue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.actionButtonIcon}>📋</Text>
              <Text style={styles.actionButtonText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Issues */}
        <View style={styles.recentIssuesContainer}>
          <View style={styles.recentIssuesHeader}>
            <Text style={styles.sectionTitle}>Recent Issues</Text>
            {recentIssues.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {issuesLoading ? (
            <View style={styles.issuesLoading}>
              <ActivityIndicator size="small" color={colors.black} />
              <Text style={styles.issuesLoadingText}>Loading issues...</Text>
            </View>
          ) : recentIssues.length > 0 ? (
            <View style={styles.issuesList}>
              {recentIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                  showDate={true}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📱</Text>
              <Text style={styles.emptyStateText}>No recent issues</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the camera tab to report your first issue
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  welcomeText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    lineHeight: 22,
  },
  locationContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  locationTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    flex: 1,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  refreshIcon: {
    fontSize: 14,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  locationLoadingText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginLeft: spacing.xs,
  },
  locationInfo: {
    paddingTop: spacing.xs,
  },
  municipalityText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs / 2,
  },
  stateText: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  locationSource: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontStyle: 'italic',
  },
  locationError: {
    fontSize: typography.sizes.sm,
    color: '#d32f2f',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.darkGray,
  },
  statSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  quickActions: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  actionButtonIcon: {
    fontSize: typography.sizes.xl,
    marginBottom: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.black,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    textAlign: 'center',
  },
  recentIssuesContainer: {
    marginBottom: spacing.lg,
  },
  recentIssuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  viewAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
    textDecorationLine: 'underline',
  },
  issuesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  issuesLoadingText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginLeft: spacing.xs,
  },
  issuesList: {
    paddingBottom: spacing.md,
  },
});
