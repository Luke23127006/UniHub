import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Workshop } from '../types';

interface WorkshopContextType {
  selectedWorkshop: Workshop | null;
  selectWorkshop: (workshop: Workshop | null) => void;
}

const WorkshopContext = createContext<WorkshopContextType | undefined>(undefined);

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  const selectWorkshop = (workshop: Workshop | null) => {
    setSelectedWorkshop(workshop);
  };

  return (
    <WorkshopContext.Provider value={{ selectedWorkshop, selectWorkshop }}>
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}
