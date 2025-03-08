import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Circle, Path, Text as SvgText } from 'react-native-svg';

interface ChartData {
  name: string;
  cost: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface DonutChartProps {
  data: ChartData[];
}

const screenWidth = Dimensions.get('window').width;

export const DonutChart = ({ data }: DonutChartProps) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Limit to top 4 categories + "Other" if there are more
  let chartData = [...data];
  if (chartData.length > 4) {
    const topCategories = chartData.slice(0, 3);
    const otherCategories = chartData.slice(3);
    
    const otherTotal = otherCategories.reduce((sum, item) => sum + item.cost, 0);
    const otherCategory = {
      name: 'Other',
      cost: otherTotal,
      color: '#95A5A6', // Gray color for "Other"
      legendFontColor: '#333',
      legendFontSize: 12
    };
    
    chartData = [...topCategories, otherCategory];
  }

  // Calculate total for percentages
  const total = chartData.reduce((sum, item) => sum + item.cost, 0);
  
  // Chart dimensions
  const width = screenWidth - 40;
  const height = 140; // Reduced height
  
  // Calculate chart dimensions
  const chartSize = Math.min(width * 0.4, height); // Use the smaller dimension
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = Math.min(centerX, centerY) - 10; // Smaller radius
  const innerRadius = radius * 0.6; // Size of the hole
  
  // Calculate segments
  let startAngle = 0;
  const segments = chartData.map((item, index) => {
    const percentage = item.cost / total;
    const endAngle = startAngle + percentage * 2 * Math.PI;
    
    // Calculate path
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const innerX1 = centerX + innerRadius * Math.cos(endAngle);
    const innerY1 = centerY + innerRadius * Math.sin(endAngle);
    const innerX2 = centerX + innerRadius * Math.cos(startAngle);
    const innerY2 = centerY + innerRadius * Math.sin(startAngle);
    
    const largeArcFlag = percentage > 0.5 ? 1 : 0;
    
    // Path for the segment
    const path = [
      `M ${x1} ${y1}`, // Move to start point
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Outer arc
      `L ${innerX1} ${innerY1}`, // Line to inner radius
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX2} ${innerY2}`, // Inner arc
      'Z' // Close path
    ].join(' ');
    
    const segment = {
      path,
      color: item.color,
      startAngle,
      endAngle,
      percentage
    };
    
    startAngle = endAngle;
    return segment;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by Category</Text>
      
      <View style={styles.chartAndLegendContainer}>
        <View style={styles.chartContainer}>
          <Svg width={chartSize} height={chartSize}>
            <G>
              {segments.map((segment, index) => (
                <Path
                  key={index}
                  d={segment.path}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
              {/* Inner circle (hole) */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={innerRadius}
                fill="white"
              />
            </G>
          </Svg>
        </View>
        
        {/* Legend - moved to the right with clear separation */}
        <View style={styles.legendContainer}>
          {chartData.map((item, index) => {
            // Calculate percentage
            const percentage = Math.round((item.cost / total) * 100);
            
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.legendText}>
                  {item.name}
                </Text>
                <Text style={styles.legendPercentage}>{percentage}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  chartAndLegendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%',
  },
  legendContainer: {
    width: '60%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  legendPercentage: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
}); 