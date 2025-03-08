import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { fontStyles, textStyles, colors } from '../utils/globalStyles';

export const CustomAlert = () => {
  const { currentAlert, hideAlert } = useAlert();
  const [showButtons, setShowButtons] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  console.log('CustomAlert rendering, currentAlert:', currentAlert?.id);

  // Handle visibility changes
  useEffect(() => {
    if (currentAlert) {
      setIsVisible(true);
      // Delay showing buttons to prevent accidental taps
      const timer = setTimeout(() => {
        setShowButtons(true);
        console.log('CustomAlert: Showing buttons after delay');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // When alert is dismissed, first hide buttons, then hide the modal
      setShowButtons(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentAlert]);

  const handleConfirm = () => {
    console.log('Confirm button pressed');
    // First hide the alert
    hideAlert();
    
    // Then execute the confirm action after a delay
    if (currentAlert?.confirmAction) {
      const action = currentAlert.confirmAction;
      setTimeout(() => {
        action();
      }, 300);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.customAlertOverlay}>
        <View style={styles.customAlertBox}>
          <Text style={styles.customAlertTitle}>{currentAlert?.title || 'Alert'}</Text>
          <Text style={styles.customAlertMessage}>{currentAlert?.message || ''}</Text>
          
          {showButtons && (
            <View style={styles.customAlertButtonsContainer}>
              {currentAlert?.type === 'confirm' ? (
                <>
                  <TouchableOpacity
                    style={[styles.customAlertButton, styles.customAlertCancelButton]}
                    onPress={hideAlert}
                  >
                    <Text style={styles.customAlertCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.customAlertButton, styles.customAlertConfirmButton]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.customAlertButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.customAlertButton}
                  onPress={hideAlert}
                >
                  <Text style={styles.customAlertButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  customAlertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  customAlertBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  customAlertTitle: {
    ...textStyles.h3,
    marginBottom: 16,
    textAlign: 'center',
  },
  customAlertMessage: {
    ...textStyles.body,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  customAlertButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  customAlertButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    elevation: 2,
    backgroundColor: colors.primary,
  },
  customAlertCancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  customAlertConfirmButton: {
    backgroundColor: colors.success,
    marginLeft: 8,
  },
  customAlertCancelButtonText: {
    ...textStyles.button,
    color: colors.text.tertiary,
  },
  customAlertButtonText: {
    ...textStyles.button,
    color: '#fff',
  },
}); 