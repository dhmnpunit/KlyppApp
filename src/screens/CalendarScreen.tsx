import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday
} from 'date-fns';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { colors, fontStyles } from '../utils/globalStyles';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, MainStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type CalendarScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Calendar'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type ViewType = 'month' | 'week' | 'day' | 'agenda';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DETAILS_PANEL_HEIGHT = SCREEN_HEIGHT * 0.5;

export const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const { subscriptions, fetchSubscriptions, loading } = useSubscriptionStore();
  
  // Animation values
  const translateY = useRef(new Animated.Value(DETAILS_PANEL_HEIGHT)).current;
  const lastGestureDy = useRef(DETAILS_PANEL_HEIGHT);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Pan responder for the details panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newTranslateY = lastGestureDy.current + gestureState.dy;
        if (newTranslateY >= 0 && newTranslateY <= DETAILS_PANEL_HEIGHT) {
          translateY.setValue(newTranslateY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newTranslateY = lastGestureDy.current + gestureState.dy;
        let finalValue;
        
        if (gestureState.vy > 0.5) {
          finalValue = DETAILS_PANEL_HEIGHT;
        } else if (gestureState.vy < -0.5) {
          finalValue = 0;
        } else {
          finalValue = newTranslateY > DETAILS_PANEL_HEIGHT / 2 
            ? DETAILS_PANEL_HEIGHT 
            : 0;
        }
        
        lastGestureDy.current = finalValue;
        
        Animated.spring(translateY, {
          toValue: finalValue,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    lastGestureDy.current = 0;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const handleSubscriptionPress = (subscription: any) => {
    navigation.navigate('SubscriptionDetails', {
      subscriptionId: subscription.subscription_id
    });
  };

  const navigatePrevious = () => {
    if (viewType === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else if (viewType === 'week') {
      setCurrentMonth(subWeeks(currentMonth, 1));
    } else if (viewType === 'day') {
      setCurrentMonth(subDays(currentMonth, 1));
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewType === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (viewType === 'week') {
      setCurrentMonth(addWeeks(currentMonth, 1));
    } else if (viewType === 'day') {
      setCurrentMonth(addDays(currentMonth, 1));
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const navigateToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Calculate total amount for the month
  const totalAmount = subscriptions.reduce((sum, sub) => sum + sub.cost, 0);
  
  // Count renewals for the month
  const renewalsCount = subscriptions.filter(sub => 
    format(new Date(sub.next_renewal_date), 'MM yyyy') === format(selectedDate, 'MM yyyy')
  ).length;

  // Generate days for month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const dateFormat = 'd';
    const rows = [];
    
    let days = [];
    let day = startDate;
    let formattedDate = '';
    
    // Weekday headers
    const weekDays = [];
    const weekDayFormat = 'EEE';
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        <Text key={i} style={styles.weekDayText}>
          {format(addDays(startDate, i), weekDayFormat)}
        </Text>
      );
    }
    
    rows.push(
      <View key="weekdays" style={styles.weekDayRow}>
        {weekDays}
      </View>
    );
    
    // Calendar days
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelectedDay = isSameDay(day, selectedDate);
        const isDayToday = isToday(day);
        
        // Count subscriptions for this day
        const daySubscriptions = subscriptions.filter(sub => {
          const renewalDate = new Date(sub.next_renewal_date);
          return isSameDay(renewalDate, cloneDay);
        });
        
        days.push(
          <TouchableOpacity
            key={day.toString()}
            style={[
              styles.day,
              !isCurrentMonth && styles.disabledDay,
              isSelectedDay && styles.selectedDay,
              isDayToday && styles.today
            ]}
            onPress={() => handleDateSelect(cloneDay)}
          >
            <Text style={[
              styles.dayText,
              !isCurrentMonth && styles.disabledDayText,
              isSelectedDay && styles.selectedDayText,
              isDayToday && styles.todayText
            ]}>
              {formattedDate}
            </Text>
            
            {daySubscriptions.length > 0 && (
              <View style={[
                styles.subscriptionIndicator,
                isSelectedDay && styles.selectedDayIndicator
              ]}>
                <Text style={[
                  styles.subscriptionCount,
                  isSelectedDay && styles.selectedDayIndicatorText
                ]}>
                  {daySubscriptions.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
        day = addDays(day, 1);
      }
      
      rows.push(
        <View key={day.toString()} style={styles.week}>
          {days}
        </View>
      );
      days = [];
    }
    
    return (
      <View style={styles.monthContainer}>
        {rows}
      </View>
    );
  };

  // Generate days for week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth);
    const weekEnd = endOfWeek(currentMonth);
    
    const dateFormat = 'd';
    const days = [];
    
    let day = weekStart;
    
    while (day <= weekEnd) {
      const formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const isSelectedDay = isSameDay(day, selectedDate);
      const isDayToday = isToday(day);
      
      // Count subscriptions for this day
      const daySubscriptions = subscriptions.filter(sub => {
        const renewalDate = new Date(sub.next_renewal_date);
        return isSameDay(renewalDate, cloneDay);
      });
      
      days.push(
        <TouchableOpacity
          key={day.toString()}
          style={[
            styles.weekViewDay,
            isSelectedDay && styles.selectedDay,
            isDayToday && styles.today
          ]}
          onPress={() => handleDateSelect(cloneDay)}
        >
          <Text style={styles.weekDayName}>
            {format(day, 'EEE')}
          </Text>
          <Text style={[
            styles.weekDayNumber,
            isSelectedDay && styles.selectedDayText,
            isDayToday && styles.todayText
          ]}>
            {formattedDate}
          </Text>
          
          {daySubscriptions.length > 0 && (
            <View style={styles.weekSubscriptionIndicator}>
              <Text style={styles.subscriptionCount}>
                {daySubscriptions.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
      
      day = addDays(day, 1);
    }
    
    return (
      <View style={styles.weekContainer}>
        {days}
      </View>
    );
  };

  // Generate day view
  const renderDayView = () => {
    // Get subscriptions for selected day
    const daySubscriptions = subscriptions.filter(sub => {
      const renewalDate = new Date(sub.next_renewal_date);
      return isSameDay(renewalDate, selectedDate);
    });
    
    return (
      <View style={styles.dayViewContainer}>
        <Text style={styles.dayViewDate}>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Text>
        
        {daySubscriptions.length === 0 ? (
          <View style={styles.emptyDayView}>
            <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyDayText}>No subscriptions due today</Text>
          </View>
        ) : (
          <View style={styles.daySubscriptionsList}>
            <Text style={styles.dayViewSectionTitle}>
              Subscriptions Due Today
            </Text>
            
            <View style={styles.totalDueContainer}>
              <Text style={styles.totalDueLabel}>Total Due:</Text>
              <Text style={styles.totalDueAmount}>
                ${daySubscriptions.reduce((sum, sub) => sum + sub.cost, 0).toFixed(2)}
              </Text>
            </View>
            
            {daySubscriptions.map((subscription, index) => (
              <TouchableOpacity
                key={subscription.subscription_id}
                style={styles.daySubscriptionItem}
                onPress={() => handleSubscriptionPress(subscription)}
              >
                <View style={[
                  styles.subscriptionIcon,
                  subscription.is_shared && styles.sharedSubscriptionIcon
                ]}>
                  <Ionicons 
                    name={subscription.is_shared ? "people" : "card-outline"} 
                    size={24} 
                    color={subscription.is_shared ? colors.info : colors.primary} 
                  />
                </View>
                <View style={styles.subscriptionDetails}>
                  <Text style={styles.subscriptionName}>{subscription.name}</Text>
                  <Text style={styles.subscriptionFrequency}>
                    {subscription.renewal_frequency.charAt(0).toUpperCase() + 
                     subscription.renewal_frequency.slice(1)}
                  </Text>
                </View>
                <View style={styles.subscriptionCostContainer}>
                  <Text style={styles.subscriptionCost}>
                    ${subscription.cost.toFixed(2)}
                  </Text>
                  {subscription.is_shared && (
                    <View style={styles.sharedBadge}>
                      <Text style={styles.sharedBadgeText}>Shared</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Generate agenda view
  const renderAgendaView = () => {
    // Group subscriptions by month
    const monthlySubscriptions = subscriptions.reduce((acc: any, subscription) => {
      const renewalDate = new Date(subscription.next_renewal_date);
      const monthYear = format(renewalDate, 'MMMM yyyy');
      
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      
      acc[monthYear].push(subscription);
      return acc;
    }, {});
    
    return (
      <View style={styles.agendaContainer}>
        {Object.keys(monthlySubscriptions).length === 0 ? (
          <View style={styles.emptyAgendaView}>
            <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyDayText}>No upcoming subscriptions</Text>
          </View>
        ) : (
          Object.keys(monthlySubscriptions).map(monthYear => (
            <View key={monthYear} style={styles.agendaMonthSection}>
              <Text style={styles.agendaMonthTitle}>{monthYear}</Text>
              
              {monthlySubscriptions[monthYear].map((subscription: any) => (
                <TouchableOpacity
                  key={subscription.subscription_id}
                  style={styles.agendaSubscriptionItem}
                  onPress={() => handleSubscriptionPress(subscription)}
                >
                  <View style={styles.agendaDateBadge}>
                    <Text style={styles.agendaDateText}>
                      {format(new Date(subscription.next_renewal_date), 'd')}
                    </Text>
                  </View>
                  <View style={styles.subscriptionDetails}>
                    <Text style={styles.subscriptionName}>{subscription.name}</Text>
                    <Text style={styles.subscriptionFrequency}>
                      {subscription.renewal_frequency.charAt(0).toUpperCase() + 
                       subscription.renewal_frequency.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.subscriptionCost}>
                    ${subscription.cost.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerDate}>
              {format(selectedDate, 'EEEE')}
            </Text>
            <Text style={styles.headerTitle}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </Text>
          </View>
          
          <View style={styles.headerControls}>
            <TouchableOpacity 
              style={styles.todayButton}
              onPress={navigateToday}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={navigatePrevious}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={navigateNext}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* View type selector */}
        <View style={styles.viewSelector}>
          <TouchableOpacity 
            style={[styles.viewOption, viewType === 'month' && styles.activeViewOption]}
            onPress={() => setViewType('month')}
          >
            <Text style={[styles.viewOptionText, viewType === 'month' && styles.activeViewOptionText]}>
              Month
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.viewOption, viewType === 'week' && styles.activeViewOption]}
            onPress={() => setViewType('week')}
          >
            <Text style={[styles.viewOptionText, viewType === 'week' && styles.activeViewOptionText]}>
              Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.viewOption, viewType === 'day' && styles.activeViewOption]}
            onPress={() => setViewType('day')}
          >
            <Text style={[styles.viewOptionText, viewType === 'day' && styles.activeViewOptionText]}>
              Day
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.viewOption, viewType === 'agenda' && styles.activeViewOption]}
            onPress={() => setViewType('agenda')}
          >
            <Text style={[styles.viewOptionText, viewType === 'agenda' && styles.activeViewOptionText]}>
              Agenda
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Financial summary */}
      <View style={styles.financialSummary}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryTitle}>Total Subscriptions</Text>
          <Text style={styles.summaryAmount}>${totalAmount.toFixed(2)}</Text>
          <Text style={styles.summaryPeriod}>{format(selectedDate, 'MMMM yyyy')}</Text>
        </View>
        
        <View style={styles.summaryRight}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{renewalsCount}</Text>
              <Text style={styles.statLabel}>Renewals</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={16} color={colors.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{subscriptions.filter(sub => sub.is_shared).length}</Text>
              <Text style={styles.statLabel}>Shared</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Calendar content */}
      <ScrollView 
        style={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        {viewType === 'month' && renderMonthView()}
        {viewType === 'week' && renderWeekView()}
        {viewType === 'day' && renderDayView()}
        {viewType === 'agenda' && renderAgendaView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerDate: {
    fontSize: 16,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontStyles.bold,
    color: colors.text.primary,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    marginRight: 10,
  },
  todayButtonText: {
    fontSize: 14,
    fontFamily: fontStyles.medium,
    color: colors.primary,
  },
  navigationButtons: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  navButton: {
    padding: 8,
    backgroundColor: colors.card,
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
  },
  viewOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeViewOption: {
    backgroundColor: colors.primary,
  },
  viewOptionText: {
    fontSize: 14,
    fontFamily: fontStyles.medium,
    color: colors.text.secondary,
  },
  activeViewOptionText: {
    color: 'white',
    fontFamily: fontStyles.semiBold,
  },
  financialSummary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  summaryLeft: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: fontStyles.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontFamily: fontStyles.bold,
    color: 'white',
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 14,
    fontFamily: fontStyles.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryRight: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: fontStyles.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fontStyles.regular,
    color: colors.text.tertiary,
  },
  calendarContent: {
    flex: 1,
  },
  monthContainer: {
    padding: 12,
  },
  weekDayRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    paddingVertical: 8,
  },
  week: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    margin: 3,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledDay: {
    opacity: 0.4,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  today: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 16,
    fontFamily: fontStyles.medium,
    color: colors.text.primary,
  },
  disabledDayText: {
    color: colors.text.tertiary,
  },
  selectedDayText: {
    color: 'white',
    fontFamily: fontStyles.semiBold,
  },
  todayText: {
    fontFamily: fontStyles.semiBold,
    color: colors.primary,
  },
  subscriptionIndicator: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  selectedDayIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  subscriptionCount: {
    fontSize: 11,
    fontFamily: fontStyles.semiBold,
    color: colors.primary,
  },
  selectedDayIndicatorText: {
    color: 'white',
  },
  weekContainer: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 16,
  },
  weekViewDay: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    margin: 4,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weekDayName: {
    fontSize: 13,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    marginBottom: 10,
  },
  weekDayNumber: {
    fontSize: 18,
    fontFamily: fontStyles.semiBold,
    color: colors.text.primary,
    marginBottom: 10,
  },
  weekSubscriptionIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  dayViewContainer: {
    padding: 20,
  },
  dayViewDate: {
    fontSize: 22,
    fontFamily: fontStyles.bold,
    color: colors.text.primary,
    marginBottom: 20,
  },
  dayViewSectionTitle: {
    fontSize: 18,
    fontFamily: fontStyles.semiBold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  totalDueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalDueLabel: {
    fontSize: 16,
    fontFamily: fontStyles.medium,
    color: colors.text.primary,
    marginRight: 8,
  },
  totalDueAmount: {
    fontSize: 18,
    fontFamily: fontStyles.bold,
    color: colors.primary,
  },
  emptyDayView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyDayText: {
    fontSize: 16,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    marginTop: 16,
  },
  daySubscriptionsList: {
    marginTop: 12,
  },
  daySubscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sharedSubscriptionIcon: {
    backgroundColor: colors.info + '20', // 20% opacity
  },
  subscriptionDetails: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 17,
    fontFamily: fontStyles.semiBold,
    color: colors.text.primary,
    marginBottom: 6,
  },
  subscriptionFrequency: {
    fontSize: 14,
    fontFamily: fontStyles.regular,
    color: colors.text.tertiary,
  },
  subscriptionCostContainer: {
    alignItems: 'flex-end',
  },
  subscriptionCost: {
    fontSize: 18,
    fontFamily: fontStyles.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  sharedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.info + '20', // 20% opacity
  },
  sharedBadgeText: {
    fontSize: 11,
    fontFamily: fontStyles.medium,
    color: colors.info,
  },
  agendaContainer: {
    padding: 20,
  },
  emptyAgendaView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  agendaMonthSection: {
    marginBottom: 28,
  },
  agendaMonthTitle: {
    fontSize: 20,
    fontFamily: fontStyles.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  agendaSubscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  agendaDateBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  agendaDateText: {
    fontSize: 18,
    fontFamily: fontStyles.bold,
    color: colors.primary,
  },
});

export default CalendarScreen; 