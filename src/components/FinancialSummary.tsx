import React from 'react';
import { 
  Text, 
  StyleSheet 
} from 'react-native';
import { colors, fontStyles } from '../utils/globalStyles';
import { Subscription } from '../store/subscriptionStore';

interface FinancialSummaryProps {
  date: Date;
  subscriptions: Subscription[];
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  date,
  subscriptions
}) => {
  const totalAmount = subscriptions.reduce((sum, sub) => sum + sub.cost, 0);
  
  return (
    <Text style={styles.totalAmount}>
      ${totalAmount.toFixed(2)}
    </Text>
  );
};

const styles = StyleSheet.create({
  totalAmount: {
    fontSize: 38,
    fontFamily: fontStyles.semiBold,
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 16,
  }
}); 