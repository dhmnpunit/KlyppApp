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

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.cost, 0);
  
  // Chart dimensions
  const width = screenWidth - 40;
  const height = 220;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 10;
  const innerRadius = radius * 0.6; // Size of the hole
  
  // Calculate segments
  let startAngle = 0;
  const segments = data.map((item, index) => {
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
      endAngle
    };
    
    startAngle = endAngle;
    return segment;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by Category</Text>
      
      <View style={styles.chartContainer}>
        <Svg width={width} height={height}>
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
      
      {/* Custom Legend */}
      <View style={styles.legendContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
}); 