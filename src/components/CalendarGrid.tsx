import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions
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
  const [cellSize, setCellSize] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate cell size based on screen width
  useEffect(() => {
    // Calculate the available width for the grid (accounting for horizontal margins)
    const horizontalMargins = 32; // 16px on each side
    const availableWidth = screenWidth - horizontalMargins;
    // Divide by 7 for 7 days of the week and ensure it's an integer
    const calculatedCellSize = Math.floor(availableWidth / 7);
    setCellSize(calculatedCellSize);
  }, [screenWidth]);

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

  const renderDay = (date: Date, isLastRow: boolean, isLastColumn: boolean, dayIndex: number) => {
    const isEmpty = date.getTime() === 0;
    const isSelected = isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isDayToday = isToday(date);

    if (isEmpty) {
      return (
        <View 
          key={`empty-${dayIndex}`}
          style={[
            styles.emptyDay,
            { width: cellSize, height: cellSize },
            isLastColumn ? styles.lastColumn : null,
            isLastRow ? styles.lastRow : null
          ]} 
        />
      );
    }

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.day,
          { width: cellSize, height: cellSize },
          isSelected && styles.selectedDay,
          isDayToday && styles.today,
          isLastColumn ? styles.lastColumn : null,
          isLastRow ? styles.lastRow : null
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
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <View style={styles.calendarContent}>
          <View style={styles.weekdayHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <Text 
                key={index} 
                style={[
                  styles.weekdayText,
                  { width: cellSize },
                  index === 6 ? styles.lastWeekdayText : null
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <View 
                key={`week-${weekIndex}`} 
                style={[
                  styles.week,
                  weekIndex === weeks.length - 1 ? styles.lastWeek : null
                ]}
              >
                {week.map((day, dayIndex) => (
                  renderDay(
                    day, 
                    weekIndex === weeks.length - 1, 
                    dayIndex === 6,
                    dayIndex
                  )
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
  },
  container: {
    backgroundColor: colors.card,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
  },
  calendarContent: {
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    borderRadius: 16,
  },
  weekdayHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  weekdayText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fontStyles.medium,
    color: colors.text.tertiary,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  lastWeekdayText: {
    borderRightWidth: 0,
  },
  grid: {
    flexDirection: 'column',
  },
  week: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastWeek: {
    borderBottomWidth: 0,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.card,
  },
  lastColumn: {
    borderRightWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  emptyDay: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  selectedDay: {
    backgroundColor: colors.primaryLight,
  },
  today: {
    backgroundColor: colors.card,
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
    color: colors.text.primary,
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