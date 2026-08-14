import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { SelectionScreen } from './components/SelectionScreen';
import { UploadScreen } from './components/UploadScreen';
import { clearState, loadState, saveState } from './services/storage';
import type { AppScreen, Decision, ImportBatch, IntakeReview, TranscriptCase } from './types';

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [batch, setBatch] = useState<ImportBatch | null>(initial.batch);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptCase | null>(initial.selectedTranscript);
  const [review, setReview] = useState<IntakeReview | null>(initial.review);
  const [decision, setDecision] = useState<Decision | null>(initial.decision);
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (initial.review && initial.selectedTranscript) return 'review';
    if (initial.batch) return 'selection';
    return 'upload';
  });

  useEffect(() => {
    saveState({ batch, selectedTranscript, review, decision });
  }, [batch, selectedTranscript, review, decision]);

  const navigateHome = () => setScreen(batch ? 'selection' : 'upload');

  const handleImport = (nextBatch: ImportBatch) => {
    setBatch(nextBatch);
    setSelectedTranscript(null);
    setReview(null);
    setDecision(null);
    setScreen('selection');
  };

  const handleReplace = () => {
    clearState();
    setBatch(null);
    setSelectedTranscript(null);
    setReview(null);
    setDecision(null);
    setScreen('upload');
  };

  const handleAnalyze = () => {
    if (selectedTranscript) setScreen('processing');
  };

  const handleAnalysisComplete = useCallback((nextReview: IntakeReview) => {
    setReview(nextReview);
    setDecision(null);
    setScreen('review');
  }, []);

  return (
    <div className="site-shell">
      <AppHeader onNavigateHome={navigateHome} />
      {screen === 'upload' && <UploadScreen onImport={handleImport} />}
      {screen === 'selection' && batch && (
        <SelectionScreen
          batch={batch}
          selectedId={selectedTranscript?.id ?? null}
          onSelect={setSelectedTranscript}
          onAnalyze={handleAnalyze}
          onReplace={handleReplace}
        />
      )}
      {screen === 'processing' && selectedTranscript && (
        <ProcessingScreen transcript={selectedTranscript} onComplete={handleAnalysisComplete} />
      )}
      {screen === 'review' && selectedTranscript && review && (
        <ReviewScreen
          transcript={selectedTranscript}
          review={review}
          decision={decision}
          onDecision={setDecision}
          onBack={() => setScreen('selection')}
        />
      )}
    </div>
  );
}
