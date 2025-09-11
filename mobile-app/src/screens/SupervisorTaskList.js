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
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useUser } from '../contexts/UserContext';

export default function SupervisorTaskList({ navigation, route }) {
  const { user } = useUser();
  const initialFilter = route?.params?.filter || 'all';
  
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, priority, status

  const statusOptions = [
    { value: 'all', label: 'All Tasks', color: '#8E8E93' },
    { value: 'pending', label: 'Pending', color: '#FF9500' },
    { value: 'ongoing', label: 'Ongoing', color: '#007AFF' },
    { value: 'resolved', label: 'Resolved', color: '#34C759' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Date (Newest First)' },
    { value: 'priority', label: 'Priority (High First)' },
    { value: 'status', label: 'Status' },
  ];

  // Fetch supervisor tasks
  const fetchTasks = async () => {
    try {
      const supervisorId = user?.id || user?.userId;
      if (!supervisorId) return;

      const response = await fetch(`http://192.168.1.4:3000/api/supervisor/tasks/${supervisorId}`);
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        Alert.alert('Error', 'Failed to load tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter and sort tasks
  useEffect(() => {
    let filtered = tasks;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => {
        const taskStatus = (task.status || '').toLowerCase();
        
        switch (statusFilter) {
          case 'pending':
            return !task.status || taskStatus === 'pending' || taskStatus === 'open';
          case 'ongoing':
            return taskStatus === 'ongoing' || taskStatus === 'in-progress' || taskStatus === 'assigned';
          case 'resolved':
            return taskStatus === 'resolved' || taskStatus === 'completed' || taskStatus === 'closed';
          default:
            return taskStatus === statusFilter.toLowerCase();
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        (task.issueType || '').toLowerCase().includes(query) ||
        (task.userLocation || task.location || '').toLowerCase().includes(query) ||
        (task.department || '').toLowerCase().includes(query) ||
        (task.instructions || '').toLowerCase().includes(query) ||
        (task.id || '').toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'status':
          const statusOrder = { 'pending': 3, 'ongoing': 2, 'resolved': 1 };
          const statusDiff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'date':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || '#8E8E93';
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
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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
        <Text style={styles.taskDate}>🕐 {formatDate(task.createdAt)}</Text>
        {task.department && (
          <Text style={styles.taskDepartment}>🏛️ {task.department}</Text>
        )}
        {task.instructions && (
          <Text style={styles.taskDescription} numberOfLines={2}>📝 {task.instructions}</Text>
        )}
      </View>

      {/* Task Images */}
      {((task.report_images && task.report_images.length > 0) || (task.pictureIds && task.pictureIds.length > 0)) && (
        <View style={styles.taskImagesContainer}>
          <Text style={styles.imagesLabel}>📸 Images ({(task.report_images || task.pictureIds || []).length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
            {(task.report_images || task.pictureIds || []).slice(0, 3).map((imageId, index) => (
              <Image 
                key={index}
                source={{ uri: `http://192.168.1.4:3000/api/images/${imageId}` }}
                style={styles.taskThumbnail}
                resizeMode="cover"
              />
            ))}
            {(task.report_images || task.pictureIds || []).length > 3 && (
              <View style={styles.moreImagesIndicator}>
                <Text style={styles.moreImagesText}>+{(task.report_images || task.pictureIds || []).length - 3}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.taskFooter}>
        <Text style={styles.taskId}>ID: {task.id}</Text>
        <Text style={styles.viewDetails}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort Tasks</Text>
            <TouchableOpacity 
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterOptions}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    statusFilter === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                  <Text style={[
                    styles.filterOptionText,
                    statusFilter === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterOptions}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    sortBy === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
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
        <Text style={styles.headerTitle}>Task Management</Text>
        <TouchableOpacity 
          onPress={() => setShowFilterModal(true)}
          style={styles.filterButton}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks by type, location, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.gray}
        />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </Text>
        <Text style={styles.filterText}>
          {statusFilter !== 'all' && `Filtered by: ${statusOptions.find(opt => opt.value === statusFilter)?.label}`}
        </Text>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateTitle}>No Tasks Found</Text>
            <Text style={styles.emptyStateText}>
              {statusFilter !== 'all' 
                ? `No ${statusFilter} tasks found. Try changing the filter.`
                : 'You don\'t have any tasks assigned at the moment.'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </View>
        )}
      </ScrollView>

      <FilterModal />
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
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.black,
    fontWeight: typography.weights.medium,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontWeight: typography.weights.medium,
  },
  filterText: {
    fontSize: typography.sizes.sm,
    color: colors.gray,
  },
  tasksList: {
    flex: 1,
  },
  tasksContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    marginTop: spacing.xl,
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
    lineHeight: 22,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.black,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.sizes.md,
    color: colors.black,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  filterOptions: {
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  filterOptionSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.black,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  filterOptionText: {
    fontSize: typography.sizes.md,
    color: colors.black,
  },
  filterOptionTextSelected: {
    fontWeight: typography.weights.semibold,
  },
  applyButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  applyButtonText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  taskImagesContainer: {
    marginTop: spacing.sm,
  },
  imagesLabel: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  imagesList: {
    flexDirection: 'row',
  },
  taskThumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  moreImagesIndicator: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  moreImagesText: {
    fontSize: typography.sizes.sm,
    color: colors.darkGray,
    fontWeight: typography.weights.semibold,
  },
});
