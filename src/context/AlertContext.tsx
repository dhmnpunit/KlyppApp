import React, { createContext, useState, useContext, useCallback, ReactNode, useRef, useEffect } from 'react';

type AlertType = 'info' | 'confirm';

interface AlertItem {
  id: number;
  type: AlertType;
  message: string;
  title: string;
  confirmAction: (() => void) | null;
}

type AlertContextType = {
  showAlert: (message: string, title?: string, confirmAction?: () => void) => void;
  hideAlert: () => void;
  currentAlert: AlertItem | null;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Queue to store pending alerts
  const alertQueueRef = useRef<AlertItem[]>([]);
  
  // Counter for generating unique IDs
  const alertIdCounterRef = useRef(0);
  
  // Current visible alert
  const [currentAlert, setCurrentAlert] = useState<AlertItem | null>(null);
  
  // Flag to prevent processing the queue during render
  const isProcessingRef = useRef(false);

  // Process the next alert in the queue
  const processNextAlert = useCallback(() => {
    if (isProcessingRef.current) return;
    
    // If there's already an alert showing, don't process the queue
    if (currentAlert) return;
    
    // If the queue is empty, nothing to process
    if (alertQueueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    
    // Get the next alert from the queue
    const nextAlert = alertQueueRef.current.shift();
    console.log('AlertContext: Processing next alert:', nextAlert);
    
    // Show the alert
    setCurrentAlert(nextAlert || null);
    
    isProcessingRef.current = false;
  }, [currentAlert]);

  // Add a new alert to the queue
  const showAlert = useCallback((message: string, title: string = 'Alert', confirmAction: (() => void) | null = null) => {
    console.log('AlertContext: showAlert called with:', { message, title, hasConfirmAction: !!confirmAction });
    
    // Create a new alert item
    const newAlert: AlertItem = {
      id: ++alertIdCounterRef.current,
      type: confirmAction ? 'confirm' : 'info',
      message,
      title,
      confirmAction
    };
    
    // Add the alert to the queue
    alertQueueRef.current.push(newAlert);
    console.log('AlertContext: Added alert to queue. Queue length:', alertQueueRef.current.length);
    
    // Process the queue on the next tick to avoid state updates during render
    setTimeout(() => {
      processNextAlert();
    }, 0);
  }, [processNextAlert]);

  // Hide the current alert
  const hideAlert = useCallback(() => {
    console.log('AlertContext: hideAlert called');
    setCurrentAlert(null);
    
    // Process the next alert in the queue after a short delay
    setTimeout(() => {
      processNextAlert();
    }, 300);
  }, [processNextAlert]);

  // Process the queue whenever the current alert changes
  useEffect(() => {
    if (!currentAlert) {
      setTimeout(() => {
        processNextAlert();
      }, 0);
    }
  }, [currentAlert, processNextAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, currentAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}; 