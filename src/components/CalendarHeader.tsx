import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontStyles } from '../utils/globalStyles';

interface CalendarHeaderProps {
  date: Date;
  viewType: 'month' | 'week' | 'agenda';
  onViewChange: (viewType: 'month' | 'week' | 'agenda') => void;
  onFilterPress: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  date,
  viewType,
  onViewChange,
  onFilterPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.monthYear}>
          {format(date, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <Ionicons name="filter" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.viewToggle}>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            viewType === 'month' && styles.toggleButtonActive
          ]}
          onPress={() => onViewChange('month')}
        >
          <Text style={[
            styles.toggleText,
            viewType === 'month' && styles.toggleTextActive
          ]}>
            Month
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            viewType === 'week' && styles.toggleButtonActive
          ]}
          onPress={() => onViewChange('week')}
        >
          <Text style={[
            styles.toggleText,
            viewType === 'week' && styles.toggleTextActive
          ]}>
            Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            viewType === 'agenda' && styles.toggleButtonActive
          ]}
          onPress={() => onViewChange('agenda')}
        >
          <Text style={[
            styles.toggleText,
            viewType === 'agenda' && styles.toggleTextActive
          ]}>
            Agenda
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 24,
    fontFamily: fontStyles.semiBold,
    color: colors.text.primary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: fontStyles.medium,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.card,
    fontFamily: fontStyles.semiBold,
  },
}); 