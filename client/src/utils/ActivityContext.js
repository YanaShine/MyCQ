import React, { createContext, useContext, useState } from 'react';

const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children, value }) => {
  const [friendsActivities, setFriendsActivities] = useState([]);
  
  const updateFriendsActivities = (activities) => {
    setFriendsActivities(activities);
  };
  
  return (
    <ActivityContext.Provider value={{ 
      ...value,
      friendsActivities,
      updateFriendsActivities 
    }}>
      {children}
    </ActivityContext.Provider>
  );
};