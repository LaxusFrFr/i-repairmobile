import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabBarContextType {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const useTabBar = () => {
  const context = useContext(TabBarContext);
  if (!context) {
    // Return a fallback object instead of throwing an error
    return {
      isTabBarVisible: true,
      setTabBarVisible: () => {}, // No-op function
    };
  }
  return context;
};

interface TabBarProviderProps {
  children: ReactNode;
}

export const TabBarProvider: React.FC<TabBarProviderProps> = ({ children }) => {
  const [isTabBarVisible, setTabBarVisible] = useState(true);

  const handleSetTabBarVisible = (visible: boolean) => {
    console.log('🔍 TabBarContext - setTabBarVisible called with:', visible);
    setTabBarVisible(visible);
  };

  return (
    <TabBarContext.Provider value={{ isTabBarVisible, setTabBarVisible: handleSetTabBarVisible }}>
      {children}
    </TabBarContext.Provider>
  );
};
