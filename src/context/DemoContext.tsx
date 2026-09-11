import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Inspection, AuditLogEntry, Finding, Officer, EvidenceAsset, InspectionStatus } from '../types';
import { buildDemoInspection } from '../data/demoInspections';
import { seededInspections } from '../data/seededInspections';

const STORAGE_KEY = 'satyatag-demo-v2';

export type FinalDecision = 'Pending' | 'COMPLIANT' | 'MANUAL REVIEW' | 'NON-COMPLIANT';

interface DemoContextValue {
  inspection: Inspection;
  setInspection: React.Dispatch<React.SetStateAction<Inspection>>;
  /** All completed + active inspections (for dashboard/repository/analytics) */
  allInspections: Inspection[];
  addCompletedInspection: (insp: Inspection) => void;
  updateInspectionInAll: (id: string, updater: (i: Inspection) => Inspection) => void;
  officer: Officer;
  setOfficer: (officer: Officer) => void;
  updateStage: (stage: Inspection['stage']) => void;
  updateStatus: (status: Inspection['status']) => void;
  updateFinding: (findingId: string, decision: Finding['officerDecision'], notes: string) => void;
  setFinalDecision: (d: FinalDecision, notes: string) => void;
  setSurfaceImage: (surface: EvidenceAsset['surface'], imageUrl: string, fileName: string) => void;
  removeSurfaceImage: (surface: EvidenceAsset['surface']) => void;
  auditLog: AuditLogEntry[];
  addAudit: (action: string, entity: string, status: string) => void;
  resetDemo: () => void;
  reportGenerated: boolean;
  setReportGenerated: (v: boolean) => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be within DemoProvider');
  return ctx;
};

// Injectable deterministic delay helpers
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inspection, setInspection] = useState<Inspection>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-inspection`);
      if (saved) return JSON.parse(saved) as Inspection;
    } catch (e) { /* ignore */ }
    return buildDemoInspection();
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-audit`);
      if (saved) return JSON.parse(saved) as AuditLogEntry[];
    } catch (e) { /* ignore */ }
    return [
      { time: '09:41', action: 'Inspection created', entity: 'INSP-DEMO-2025-03-12-0017', status: 'Success' },
    ];
  });

  const [reportGenerated, setReportGenerated] = useState(false);

  // Persist inspection state on refresh
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-inspection`, JSON.stringify(inspection));
    } catch (e) {
      console.warn('Could not persist inspection state locally (storage quota likely):', e);
    }
  }, [inspection]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-audit`, JSON.stringify(auditLog));
    } catch (e) {
      console.warn('Could not persist audit log locally:', e);
    }
  }, [auditLog]);

  const [currentOfficer, setCurrentOfficer] = useState<Officer>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-officer`);
      if (saved) return JSON.parse(saved) as Officer;
    } catch (e) { /* ignore */ }
    return { id: 'OFF-001', name: 'A. Sharma', displayName: 'A. Sharma', role: 'Enforcement Officer', department: 'Department of Consumer Affairs', jurisdiction: 'Delhi (Central)', email: 'a.sharma@consumer.gov.in', status: 'Active' as const, avatarInitials: 'AS' };
  });

  // Persist authenticated officer identity (gov.in name shown in topbar)
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-officer`, JSON.stringify(currentOfficer));
    } catch (e) {
      console.warn('Could not persist officer locally:', e);
    }
  }, [currentOfficer]);

  // Multi-inspection list: seeded + user-created
  const [allInspections, setAllInspections] = useState<Inspection[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-allInspections`);
      if (saved) return JSON.parse(saved) as Inspection[];
    } catch (e) { /* ignore */ }
    return [...seededInspections];
  });

  const addCompletedInspection = useCallback((insp: Inspection) => {
    setAllInspections((prev) => {
      const idx = prev.findIndex((p) => p.inspectionId === insp.inspectionId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = insp;
        return copy;
      }
      return [insp, ...prev];
    });
  }, []);

  const updateInspectionInAll = useCallback((id: string, updater: (i: Inspection) => Inspection) => {
    setAllInspections((prev) => prev.map((i) => (i.inspectionId === id ? updater(i) : i)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-allInspections`, JSON.stringify(allInspections));
    } catch (e) {
      console.warn('Could not persist all inspections locally:', e);
    }
  }, [allInspections]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-officer`, JSON.stringify(currentOfficer));
    } catch (e) { /* ignore */ }
  }, [currentOfficer]);

  const updateStage = (stage: Inspection['stage']) => {
    setInspection((prev) => ({ ...prev, stage }));
  };

  const updateStatus = (status: Inspection['status']) => {
    setInspection((prev) => ({ ...prev, status }));
  };

  const updateFinding = (findingId: string, decision: Finding['officerDecision'], notes: string) => {
    setInspection((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === findingId ? { ...f, officerDecision: decision, officerNotes: notes } : f
      ),
    }));
  };

  const setFinalDecision = (decision: FinalDecision, notes: string) => {
    const now = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const update = (prev: Inspection) => ({
      ...prev,
      officerDecision: decision as Inspection['officerDecision'],
      finalNotes: notes,
      decisionDate: now,
      status: (decision === 'COMPLIANT' ? 'Compliant' : decision === 'NON-COMPLIANT' ? 'Non-Compliant' : 'Manual Review') as InspectionStatus,
    });
    setInspection((prev) => update(prev));
    setAllInspections((prev) => prev.map((i) => (i.inspectionId === inspection.inspectionId ? update(i) : i)));
    setReportGenerated(false);
  };

  const setSurfaceImage = (surface: EvidenceAsset['surface'], imageUrl: string, fileName: string) => {
    setInspection((prev) => {
      const now = new Date().toISOString();
      const existing = prev.evidence.find((e) => e.surface === surface);
      let evidence: EvidenceAsset[];
      if (existing) {
        evidence = prev.evidence.map((e) =>
          e.surface === surface ? { ...e, imageUrl, fileName, isPlaceholder: false, capturedAt: now } : e
        );
      } else {
        const newAsset: EvidenceAsset = {
          id: `EVD-${String(prev.evidence.length + 1).padStart(3, '0')}`,
          surface,
          capturedAt: now,
          qualityStatus: 'Good',
          qualityScore: 92,
          thumbnailColor: surface === 'Front' ? '#F7C948' : surface === 'Back' ? '#4CAF50' : '#2196F3',
          label: `${surface} — package surface`,
          imageUrl,
          fileName,
          isPlaceholder: false,
        };
        evidence = [...prev.evidence, newAsset];
      }
      return { ...prev, evidence };
    });
  };

  const removeSurfaceImage = (surface: EvidenceAsset['surface']) => {
    setInspection((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((e) => e.surface !== surface),
    }));
  };

  const addAudit = (action: string, entity: string, status: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setAuditLog((prev) => [...prev, { time, action, entity, status }]);
  };

  const setOfficer = (officer: Officer) => {
    setCurrentOfficer(officer);
  };

  const resetDemo = () => {
    const fresh = buildDemoInspection();
    setInspection(fresh);
    setAllInspections([...seededInspections]);
    setAuditLog([{ time: '09:41', action: 'Inspection created', entity: 'INSP-DEMO-2025-03-12-0017', status: 'Success' }]);
    setReportGenerated(false);
    localStorage.removeItem(`${STORAGE_KEY}-inspection`);
    localStorage.removeItem(`${STORAGE_KEY}-audit`);
    localStorage.removeItem(`${STORAGE_KEY}-allInspections`);
    localStorage.removeItem(`${STORAGE_KEY}-officer`);
  };

  return (
    <DemoContext.Provider
      value={{
        inspection,
        setInspection,
        allInspections,
        addCompletedInspection,
        updateInspectionInAll,
        officer: currentOfficer,
        setOfficer,
        updateStage,
        updateStatus,
        updateFinding,
        setFinalDecision,
        setSurfaceImage,
        removeSurfaceImage,
        auditLog,
        addAudit,
        resetDemo,
        reportGenerated,
        setReportGenerated,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};
