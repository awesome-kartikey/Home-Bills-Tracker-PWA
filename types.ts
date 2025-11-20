import { Timestamp } from 'firebase/firestore';

export interface Tenant {
  id: string;
  name: string;
  rent: number;
  lastReading: number;
  lastReadingDate: Timestamp;
  createdAt: Timestamp;
}

export interface Bill {
  id: string;
  tenantId: string;
  tenantName: string;
  rentIncluded: boolean;
  lastReading: number;
  lastReadingDate: Timestamp;
  latestReading: number;
  latestReadingDate: Timestamp;
  unitsUsed: number;
  rate: number;
  electricityAmount: number;
  rentAmount: number;
  totalAmount: number;
  createdAt: Timestamp;
}

export interface MilkData {
  // Key is date string YYYY-MM-DD, value is array of quantities
  [date: string]: number[]; 
}

export interface MilkDoc {
  days: MilkData;
}

export interface GlobalSettings {
  electricityRate: number;
  milkRate: number;
}

export type Tab = 'tenants' | 'history' | 'milk' | 'settings' | 'generate';