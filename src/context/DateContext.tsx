import React, { createContext, useState, useContext, ReactNode } from 'react';
import { LocalDate } from '@js-joda/core';

// 1. 컨텍스트 타입 정의
interface DateContextType {
  selectedDate: LocalDate;
  setSelectedDate: (date: LocalDate) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

// 2. 프로바이더 컴포넌트
export const DateProvider = ({ children }: { children: ReactNode }) => {

  const [selectedDate, setSelectedDate] = useState<LocalDate>(LocalDate.now());

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {

  const context = useContext(DateContext);

  if (!context) throw new Error('useDate must be used within a DateProvider');

  return context;
};