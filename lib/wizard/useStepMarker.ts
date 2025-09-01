'use client';
import { useEffect } from 'react';
import { useWizardStore } from './store';
import type { Step } from './store';

/**
 * Step işaretleyici.
 * - stickyUp=true: mevcut step > hedef step ise DEĞİŞTİRME (demote etme).
 * - stickyUp=false: her zaman hedef step'e ayarla (varsa geri alma).
 */
export function useStepMarker(step: Step, opts: { stickyUp?: boolean } = { stickyUp: true }) {
  const current = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);

  useEffect(() => {
    // 3'e çıktıysa ve stickyUp true ise 2'ye geri çekme
    if (opts.stickyUp && current > step) return;
    if (current !== step) setStep(step);
  }, [step, current, setStep, opts.stickyUp]);
}