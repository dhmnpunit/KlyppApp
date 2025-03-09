// Define a simplified type for our FinalizationRegistry polyfill
interface SimpleFinalizationRegistry<T> {
  register(target: object, heldValue: T, unregisterToken?: object): void;
  unregister(unregisterToken: object): void;
}

// Polyfill for FinalizationRegistry if it doesn't exist
if (typeof global.FinalizationRegistry === 'undefined') {
  // @ts-ignore - We're intentionally creating a simplified version
  global.FinalizationRegistry = class FinalizationRegistry<T> implements SimpleFinalizationRegistry<T> {
    private callback: (heldValue: T) => void;
    private registry: Map<object, { target: object; heldValue: T }>;
    
    constructor(callback: (heldValue: T) => void) {
      this.callback = callback;
      this.registry = new Map();
    }
    
    register(target: object, heldValue: T, unregisterToken?: object): void {
      this.registry.set(unregisterToken || target, { target, heldValue });
    }
    
    unregister(unregisterToken: object): void {
      this.registry.delete(unregisterToken);
    }
    
    // This is a simplified implementation that doesn't actually finalize
    // In a real implementation, we would need to detect when objects are garbage collected
  };
}

// Add other polyfills as needed 