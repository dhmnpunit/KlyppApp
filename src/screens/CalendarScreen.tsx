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
  StatusBar,
  Platform
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
import { CalendarGrid } from '../components/CalendarGrid';

type CalendarScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Calendar'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type ViewType = 'month' | 'week' | 'day' | 'agenda';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DETAILS_PANEL_HEIGHT = SCREEN_HEIGHT * 0.5;

const THEME = {
  primary: '#4D7FFF',
  primaryLight: 'rgba(77, 127, 255, 0.15)',
  primaryDark: '#3D66CC',
  text: {
    primary: '#000000',
    secondary: '#444444',
    tertiary: '#888888'
  },
  background: '#F2F3F5',
  card: '#FFFFFF',
  border: '#F0F0F0'
};

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
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={navigatePrevious}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthTodayButton}
            onPress={navigateToday}
          >
            <Text style={styles.monthTodayButtonText}>Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={navigateNext}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarWrapper}>
          <CalendarGrid
            selectedDate={selectedDate}
            onDateSelect={(date: Date) => {
              setSelectedDate(date);
              
              // Animate the details panel to show
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
              }).start();
              
              lastGestureDy.current = 0;
            }}
            subscriptions={subscriptions}
          />
        </View>
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
      
      {/* Financial summary */}
      <View style={styles.financialSummary}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Monthly Overview</Text>
            <Text style={styles.summaryDate}>{format(selectedDate, 'MMMM yyyy')}</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="wallet-outline" size={20} color={THEME.primary} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Total Cost</Text>
                <Text style={styles.statValue}>${totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="refresh" size={20} color={THEME.primary} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Renewals</Text>
                <Text style={styles.statValue}>{renewalsCount}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={20} color={THEME.primary} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Shared</Text>
                <Text style={styles.statValue}>{subscriptions.filter(sub => sub.is_shared).length}</Text>
              </View>
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
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  financialSummary: {
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryContent: {
    padding: 16,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: fontStyles.semiBold,
    color: THEME.text.primary,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 14,
    fontFamily: fontStyles.regular,
    color: THEME.text.tertiary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 8,
    padding: 12,
    backgroundColor: THEME.background,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statInfo: {
    width: '100%',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fontStyles.medium,
    color: THEME.text.tertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: fontStyles.bold,
    color: THEME.text.primary,
  },
  calendarContent: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
  },
  calendarWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
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
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTodayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  monthTodayButtonText: {
    color: colors.card,
    fontFamily: fontStyles.semiBold,
    fontSize: 14,
  },
});

export default CalendarScreen; 