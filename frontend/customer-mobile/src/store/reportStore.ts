import { create } from 'zustand';

export interface Report {
  id: string;
  medicineName: string;
  description: string;
  date: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  qrToken?: string;
  location?: string;
  photoUrl?: string;
}

interface ReportState {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'date' | 'status'> & { id?: string; status?: 'Pending' | 'Reviewed' | 'Resolved'; date?: string }) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  addReport: (report) => set((state) => ({
    reports: [
      {
        id: report.id || `RPT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        medicineName: report.medicineName,
        description: report.description,
        date: report.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
        status: report.status || 'Pending',
        qrToken: report.qrToken,
        location: report.location,
        photoUrl: report.photoUrl,
      },
      ...state.reports,
    ],
  })),
}));
