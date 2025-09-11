import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';

export default function SupervisorDashboard({ navigation }) {
  const { user } = useUser();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch supervisor tasks and summary
  const fetchSupervisorData = async () => {
    try {
      const supervisorId = user?.id || user?.userId;
      console.log('Fetching data for supervisor:', supervisorId);
      console.log('User object:', user);
      
      if (!supervisorId) {
        console.error('No supervisor ID found');
        return;
      }

      // Fetch assigned tasks
      const tasksUrl = `http://192.168.1.4:3000/api/supervisor/tasks/${supervisorId}`;
      console.log('Fetching tasks from:', tasksUrl);
      
      const tasksResponse = await fetch(tasksUrl);
      const tasksData = await tasksResponse.json();
      
      console.log('Tasks API response:', tasksData);
      
      if (tasksData.success) {
        // Sort tasks by priority and created date
        const sortedTasks = (tasksData.tasks || []).sort((a, b) => {
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setAssignedTasks(sortedTasks);

        // Calculate task summary with better status matching
        const summary = {
          total: sortedTasks.length,
          pending: sortedTasks.filter(task => {
            const status = (task.status || '').toLowerCase();
            return !task.status || status === 'pending' || status === 'open';
          }).length,
          ongoing: sortedTasks.filter(task => {
            const status = (task.status || '').toLowerCase();
            return status === 'ongoing' || status === 'in-progress' || status === 'assigned';
          }).length,
          resolved: sortedTasks.filter(task => {
            const status = (task.status || '').toLowerCase();
            return status === 'resolved' || status === 'completed' || status === 'closed';
          }).length,
        };
        
        console.log('Task summary calculated:', summary);
        console.log('Task statuses:', sortedTasks.map(t => ({ id: t.id, status: t.status })));
        setTaskSummary(summary);
      } else {
        console.error('Tasks API error:', tasksData.message);
        Alert.alert('Error', tasksData.message || 'Failed to load tasks');
      }
    } catch (error) {
      console.error('Error fetching supervisor data:', error);
      Alert.alert('Error', 'Failed to load supervisor dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSupervisorData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupervisorData();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FF9500';
      case 'ongoing': return '#007AFF';
      case 'resolved': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const TaskCard = ({ task }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => navigation.navigate('SupervisorTaskDetail', { taskId: task.id })}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.issueType || task.title || 'Task'}
          </Text>
          <View style={styles.taskBadges}>
            <View style={[styles.badge, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={styles.badgeText}>{(task.priority || 'medium').toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.badgeText}>{(task.status || 'pending').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.taskDetails}>
        <Text style={styles.taskLocation}>📍 {task.userLocation || task.location || 'Location not specified'}</Text>
        <Text style={styles.taskDate}>🕐 Reported: {formatDate(task.createdAt)}</Text>
        {task.department && (
          <Text style={styles.taskDepartment}>🏛️ {task.department}</Text>
        )}
        {task.instructions && (
          <Text style={styles.taskDescription} numberOfLines={2}>📝 {task.instructions}</Text>
        )}
        
        {/* Show first image if available */}
        {((task.report_images && task.report_images.length > 0) || (task.pictureIds && task.pictureIds.length > 0)) && (
          <View style={styles.taskImagePreview}>
            <Image 
              source={{ uri: `http://192.168.1.4:3000/api/images/${(task.report_images || task.pictureIds)[0]}` }}
              style={styles.previewThumbnail}
              resizeMode="cover"
            />
            <Text style={styles.imageCount}>
              📸 {(task.report_images || task.pictureIds || []).length} image{(task.report_images || task.pictureIds || []).length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.taskFooter}>
        <Text style={styles.taskId}>ID: {task.id}</Text>
        <Text style={styles.viewDetails}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );

  const SummaryCard = ({ title, value, color, icon }) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryIcon}>{icon}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading supervisor dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, Supervisor</Text>
          <Text style={styles.nameText}>{user?.name || 'Supervisor'}</Text>
          <Text style={styles.departmentText}>
            {user?.municipality ? `${user.municipality} Municipality` : 'Municipal Services'}
            {user?.department && ` - ${user.department} Department`}
          </Text>
        </View>

        {/* Task Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Total Tasks"
              value={taskSummary.total || 0}
              color="#007AFF"
              icon="📋"
            />
            <SummaryCard
              title="Pending"
              value={taskSummary.pending || 0}
              color="#FF9500"
              icon="⏳"
            />
            <SummaryCard
              title="Ongoing"
              value={taskSummary.ongoing || 0}
              color="#007AFF"
              icon="🔄"
            />
            <SummaryCard
              title="Resolved"
              value={taskSummary.resolved || 0}
              color="#34C759"
              icon="✅"
            />
          </View>
        </View>

        {/* Recent Tasks */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Tasks</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('SupervisorTaskList')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {assignedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={styles.emptyStateTitle}>No Tasks Assigned</Text>
              <Text style={styles.emptyStateText}>You don't have any tasks assigned at the moment.</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {assignedTasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorTaskList', { filter: 'pending' })}
            >
              <Text style={styles.actionIcon}>⏳</Text>
              <Text style={styles.actionText}>Pending Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorTaskList', { filter: 'ongoing' })}
            >
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={styles.actionText}>Ongoing Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorProfile')}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SupervisorReports')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Reports</Text>
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
    color: colors.gray,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  welcomeText: {
    fontSize: typography.sizes.md,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  nameText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  departmentText: {
    fontSize: typography.sizes.md,
    color: colors.darkGray,
  },
  summarySection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  summaryTitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
    fontWeight: typography.weights.medium,
  },
  tasksSection: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  tasksList: {
    gap: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    marginBottom: spacing.sm,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    flex: 1,
    marginRight: spacing.sm,
  },
  taskBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  taskDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  taskLocation: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
  taskDate: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
  taskDepartment: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
  taskDescription: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontStyle: 'italic',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskId: {
    fontSize: typography.sizes.xs,
    color: colors.gray,
  },
  viewDetails: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
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
  taskImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  previewThumbnail: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  imageCount: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
  },
});
