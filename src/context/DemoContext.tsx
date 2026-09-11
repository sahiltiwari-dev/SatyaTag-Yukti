import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode,
} from 'react';
import { Inspection, AuditLogEntry, Finding, Officer, EvidenceAsset, InspectionStatus } from '../types';
import { buildDemoInspection } from '../data/demoInspections';
import { seededInspections } from '../data/seededInspections';
import { userToOfficer } from '../services/auth';
import { useAuth } from './AuthContext';
import * as inspectionsApi from '../services/inspections';
import * as analysisApi from '../services/analysis';
import * as platformApi from '../services/platform';

export type FinalDecision = 'Pending' | 'COMPLIANT' | 'MANUAL REVIEW' | 'NON-COMPLIANT';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const demoOfficer: Officer = {
  id: 'OFF-001', name: 'A. Sharma', displayName: 'A. Sharma',
  role: 'Enforcement Officer', department: 'Department of Consumer Affairs',
  jurisdiction: 'Delhi (Central)', email: 'a.sharma@consumer.gov.in',
  status: 'Active', avatarInitials: 'AS',
};

interface DemoContextValue {
  inspection: Inspection;
  setInspection: React.Dispatch<React.SetStateAction<Inspection>>;
  allInspections: Inspection[];
  addCompletedInspection: (insp: Inspection) => void;
  updateInspectionInAll: (id: string, updater: (i: Inspection) => Inspection) => void;
  officer: Officer;
  setOfficer: (officer: Officer) => void;
  updateStage: (stage: Inspection['stage']) => void;
  updateStatus: (status: Inspection['status']) => void;
  updateFinding: (findingId: string, decision: Finding['officerDecision'], notes: string) => void;
  setFinalDecision: (d: FinalDecision, notes: string) => void;
  setSurfaceImage: (surface: EvidenceAsset['surface'], imageUrl: string, fileName: string) => Promise<void>;
  removeSurfaceImage: (surface: EvidenceAsset['surface']) => Promise<void>;
  auditLog: AuditLogEntry[];
  addAudit: (action: string, entity: string, status: string) => void;
  resetDemo: () => void;
  reportGenerated: boolean;
  setReportGenerated: (v: boolean) => void;
  isRepoLoading: boolean;
  repositoryOrigin: 'backend' | 'demo';
  refreshInspections: () => Promise<void>;
  createRealInspection: (type: Inspection['type'], mode: Inspection['mode'], location: string) => Promise<Inspection>;
  loadInspection: (id: string) => Promise<Inspection>;
  persistInspection: (insp: Inspection) => Promise<Inspection>;
  runBackendAnalysis: (inspectionId: string) => Promise<analysisApi.AnalysisRunResult | null>;
  generateInspectionReport: (inspectionId: string) => Promise<platformApi.GenerateReportResult | null>;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be within DemoProvider');
  return ctx;
};

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [inspection, setInspection] = useState<Inspection>(() => buildDemoInspection());
  const [allInspections, setAllInspections] = useState<Inspection[]>(() => [...seededInspections]);
  const [repositoryOrigin, setRepositoryOrigin] = useState<'backend' | 'demo'>('demo');
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([
    { time: '09:41', action: 'Inspection created', entity: 'INSP-DEMO-2025-03-12-0017', status: 'Success' },
  ]);
  const [reportGenerated, setReportGenerated] = useState(false);

  const [currentOfficer, setCurrentOfficer] = useState<Officer>(() =>
    user ? userToOfficer(user) : demoOfficer,
  );

  const inspectionRef = useRef(inspection);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);
  const authedRef = useRef(isAuthenticated);
  useEffect(() => { authedRef.current = isAuthenticated; }, [isAuthenticated]);

  useEffect(() => {
    if (user) setCurrentOfficer(userToOfficer(user));
  }, [user]);

  // Load the real inspection repository from PostgreSQL on login.
  const refreshInspections = useCallback(async () => {
    if (!authedRef.current) return;
    setIsRepoLoading(true);
    try {
      const items = await inspectionsApi.listInspections();
      setAllInspections(items);
      setRepositoryOrigin('backend');
    } catch (e) {
      console.warn('Repository unavailable; keeping demo data.', e);
      setRepositoryOrigin('demo');
    } finally {
      setIsRepoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshInspections();
  }, [isAuthenticated, refreshInspections]);

  const createRealInspection = useCallback(
    async (type: Inspection['type'], mode: Inspection['mode'], location: string): Promise<Inspection> => {
      const created = await inspectionsApi.createInspection({
        inspection_type: type, mode, location,
        status: 'In Progress', stage: 'SETUP',
      });
      setInspection(created);
      setAllInspections((prev) => [
        created, ...prev.filter((i) => i.inspectionId !== created.inspectionId),
      ]);
      return created;
    },
    [],
  );

  const loadInspection = useCallback(async (id: string): Promise<Inspection> => {
    const loaded = await inspectionsApi.getInspection(id);
    setInspection(loaded);
    return loaded;
  }, []);

  const updateStage = useCallback((stage: Inspection['stage']) => {
    setInspection((prev) => {
      const updated = { ...prev, stage };
      if (authedRef.current && prev.inspectionId) {
        inspectionsApi.updateInspection(prev.inspectionId, { stage }).catch(
          (e) => console.error('Could not persist stage.', e),
        );
      }
      return updated;
    });
  }, []);

  const updateStatus = useCallback((status: Inspection['status']) => {
    setInspection((prev) => {
      const updated = { ...prev, status };
      if (authedRef.current && prev.inspectionId) {
        inspectionsApi.updateInspection(prev.inspectionId, { status }).catch(
          (e) => console.error('Could not persist status.', e),
        );
      }
      return updated;
    });
  }, []);

  const updateFinding = useCallback(
    (findingId: string, decision: Finding['officerDecision'], notes: string) => {
      setInspection((prev) => ({
        ...prev,
        findings: prev.findings.map((f) =>
          f.id === findingId ? { ...f, officerDecision: decision, officerNotes: notes } : f,
        ),
      }));
    },
    [],
  );

  const setFinalDecision = useCallback((decision: FinalDecision, notes: string) => {
    const now = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const cur = inspectionRef.current;
    const updated: Inspection = {
      ...cur,
      officerDecision: decision as Inspection['officerDecision'],
      finalNotes: notes,
      decisionDate: now,
      status: (decision === 'COMPLIANT' ? 'Compliant' : decision === 'NON-COMPLIANT' ? 'Non-Compliant' : 'Manual Review') as InspectionStatus,
    };
    setInspection(updated);
    setAllInspections((prev) => prev.map((i) => (i.inspectionId === cur.inspectionId ? updated : i)));
    setReportGenerated(false);
    if (authedRef.current && cur.inspectionId) {
      inspectionsApi.setOfficerDecision(cur.inspectionId, decision, notes)
        .then((saved) => {
          setInspection(saved);
          setAllInspections((prev) => prev.map((i) => (i.inspectionId === saved.inspectionId ? saved : i)));
        })
        .catch((e) => console.error('Could not persist officer decision.', e));
    }
  }, []);

  const setSurfaceImage = useCallback(async (surface: EvidenceAsset['surface'], imageUrl: string, fileName: string) => {
    // If authenticated and inspection has a real backend ID, upload to the backend
    if (authedRef.current && inspectionRef.current.inspectionId) {
      try {
        // Convert data URL / object URL to a File for upload
        const resp = await fetch(imageUrl);
        const blob = await resp.blob();
        const ext = fileName.split('.').pop() || 'png';
        const file = new File([blob], `${surface.toLowerCase().replace(/\s+/g, '_')}.${ext}`, { type: blob.type || 'image/png' });
        const uploadResult = await inspectionsApi.uploadEvidence(
          inspectionRef.current.inspectionId, file, surface,
        );

        const newAsset: EvidenceAsset = {
          id: uploadResult.id,
          surface,
          capturedAt: uploadResult.captured_at,
          qualityStatus: (uploadResult.quality_status as EvidenceAsset['qualityStatus']) || 'Acceptable',
          qualityScore: uploadResult.quality_score || 85,
          thumbnailColor: surface === 'Front' ? '#F7C948' : surface === 'Back' ? '#4CAF50' : '#2196F3',
          label: `${surface} — package surface`,
          imageUrl: uploadResult.url,
          fileName,
          isPlaceholder: false,
        };

        setInspection((prev) => {
          let evidence = prev.evidence.filter((e) => e.surface !== surface);
          evidence = [...evidence, newAsset];
          return { ...prev, evidence };
        });
        return;
      } catch (e) {
        console.error('Backend upload failed, falling back to local state:', e);
        // Fall through to local-only storage
      }
    }

    // Fallback: local-only (demo mode or backend failure)
    const now = new Date().toISOString();
    setInspection((prev) => {
      const existing = prev.evidence.find((e) => e.surface === surface);
      let evidence: EvidenceAsset[];
      if (existing) {
        evidence = prev.evidence.map((e) =>
          e.surface === surface ? { ...e, imageUrl, fileName, isPlaceholder: false, capturedAt: now } : e,
        );
      } else {
        const newAsset: EvidenceAsset = {
          id: `EVD-${String(prev.evidence.length + 1).padStart(3, '0')}`,
          surface, capturedAt: now, qualityStatus: 'Good', qualityScore: 92,
          thumbnailColor: surface === 'Front' ? '#F7C948' : surface === 'Back' ? '#4CAF50' : '#2196F3',
          label: `${surface} — package surface`, imageUrl, fileName, isPlaceholder: false,
        };
        evidence = [...prev.evidence, newAsset];
      }
      return { ...prev, evidence };
    });
  }, []);

  const removeSurfaceImage = useCallback(async (surface: EvidenceAsset['surface']) => {
    // If authenticated and this evidence was uploaded to the backend, delete it
    if (authedRef.current) {
      const current = inspectionRef.current;
      const ev = current.evidence.find((e) => e.surface === surface);
      // Backend evidence IDs are UUIDs (not the local "EVD-001" format)
      if (ev && ev.id && !ev.id.startsWith('EVD-') && !ev.id.startsWith('ev-')) {
        try {
          await inspectionsApi.deleteEvidence(ev.id);
        } catch (e) {
          console.error('Backend delete failed:', e);
        }
      }
    }
    // Always remove from local state
    setInspection((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((e) => e.surface !== surface),
    }));
  }, []);

  const addAudit = useCallback((action: string, entity: string, status: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setAuditLog((prev) => [...prev, { time, action, entity, status }]);
  }, []);

  const setOfficer = useCallback((officer: Officer) => setCurrentOfficer(officer), []);

  const resetDemo = useCallback(() => {
    const fresh = buildDemoInspection();
    setInspection(fresh);
    if (authedRef.current) {
      refreshInspections();
    } else {
      setAllInspections([...seededInspections]);
      setRepositoryOrigin('demo');
    }
    setAuditLog([{ time: '09:41', action: 'Inspection created', entity: 'INSP-DEMO-2025-03-12-0017', status: 'Success' }]);
    setReportGenerated(false);
  }, [refreshInspections]);

  const persistInspection = useCallback(async (insp: Inspection): Promise<Inspection> => {
    if (!authedRef.current || !insp.inspectionId) return insp;
    try {
      const saved = await inspectionsApi.updateInspection(insp.inspectionId, {
        stage: insp.stage,
        status: insp.status,
        location: insp.location,
        product_name: insp.product.name,
        product_brand: insp.product.brand,
        manufacturer: insp.product.manufacturer,
        category: insp.product.category,
      });
      setInspection((prev) => (prev.inspectionId === saved.inspectionId ? saved : prev));
      setAllInspections((prev) => prev.map((i) => (i.inspectionId === saved.inspectionId ? saved : i)));
      return saved;
    } catch (e) {
      console.error('Could not persist inspection to backend.', e);
      throw e;
    }
  }, []);

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

  const runBackendAnalysis = useCallback(async (inspectionId: string): Promise<analysisApi.AnalysisRunResult | null> => {
    if (!authedRef.current) return null;
    try {
      const result = await analysisApi.runAnalysis(inspectionId);
      // Refresh the inspection so mapped fields mirror the backend state.
      const fresh = await inspectionsApi.getInspection(inspectionId);
      setInspection(fresh);
      setAllInspections((prev) => prev.map((i) => (i.inspectionId === inspectionId ? fresh : i)));
      return result;
    } catch (e) {
      console.error('Backend analysis failed.', e);
      throw e;
    }
  }, []);

  const generateInspectionReport = useCallback(async (inspectionId: string): Promise<platformApi.GenerateReportResult | null> => {
    if (!authedRef.current) return null;
    try {
      return await platformApi.generateReport(inspectionId);
    } catch (e) {
      console.error('Report generation failed.', e);
      throw e;
    }
  }, []);

  const updateInspectionInAll = useCallback(
    (id: string, updater: (i: Inspection) => Inspection) => {
      setAllInspections((prev) => prev.map((i) => (i.inspectionId === id ? updater(i) : i)));
    },
    [],
  );

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
        isRepoLoading,
        repositoryOrigin,
        refreshInspections,
        createRealInspection,
        loadInspection,
        persistInspection,
        runBackendAnalysis,
        generateInspectionReport,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};