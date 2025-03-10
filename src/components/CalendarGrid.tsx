import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { colors, fontStyles } from '../utils/globalStyles';
import { Subscription } from '../store/subscriptionStore';

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  subscriptions: Subscription[];
}

interface DayIndicatorsProps {
  date: Date;
  subscriptions: Subscription[];
}

const DayIndicators: React.FC<DayIndicatorsProps> = ({ date, subscriptions }) => {
  const daySubscriptions = subscriptions.filter(sub => {
    const renewalDate = new Date(sub.next_renewal_date);
    return isSameDay(renewalDate, date);
  });

  if (daySubscriptions.length === 0) return null;

  return (
    <View style={styles.indicators}>
      {daySubscriptions.slice(0, 3).map((sub, index) => (
        <View 
          key={index} 
          style={[
            styles.indicator,
            { backgroundColor: sub.is_shared ? colors.info : colors.primary }
          ]} 
        />
      ))}
      {daySubscriptions.length > 3 && (
        <Text style={styles.moreIndicator}>+{daySubscriptions.length - 3}</Text>
      )}
    </View>
  );
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedDate,
  onDateSelect,
  subscriptions
}) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create week rows
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day: Date) => {
    if (currentWeek.length === 0 && day.getDay() !== 0) {
      // Fill in empty days at the start of the month
      for (let i = 0; i < day.getDay(); i++) {
        currentWeek.push(new Date(0));
      }
    }
    
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(0));
    }
    weeks.push(currentWeek);
  }

  const renderDay = (date: Date) => {
    const isEmpty = date.getTime() === 0;
    const isSelected = isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isDayToday = isToday(date);

    if (isEmpty) {
      return <View style={styles.emptyDay} />;
    }

    return (
      <TouchableOpacity
        style={[
          styles.day,
          isSelected && styles.selectedDay,
          isDayToday && styles.today
        ]}
        onPress={() => onDateSelect(date)}
      >
        <Text style={[
          styles.dayText,
          !isCurrentMonth && styles.otherMonthDay,
          isSelected && styles.selectedDayText,
          isDayToday && styles.todayText
        ]}>
          {format(date, 'd')}
        </Text>
        <DayIndicators 
          date={date}
          subscriptions={subscriptions}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.weekdayHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <Text key={index} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayContainer}>
                {renderDay(day)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'column',
  },
  week: {
    flexDirection: 'row',
    height: 68,
  },
  dayContainer: {
    flex: 1,
    padding: 2,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  emptyDay: {
    flex: 1,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  today: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontFamily: fontStyles.medium,
    color: colors.text.primary,
  },
  todayText: {
    fontFamily: fontStyles.semiBold,
    color: colors.primary,
  },
  otherMonthDay: {
    color: colors.text.tertiary,
  },
  selectedDayText: {
    color: colors.card,
    fontFamily: fontStyles.semiBold,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreIndicator: {
    fontSize: 8,
    fontFamily: fontStyles.regular,
    color: colors.text.tertiary,
    marginLeft: 2,
  },
}); 