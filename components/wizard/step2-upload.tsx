'use client';
import { useStepMarker } from '@/lib/wizard/useStepMarker';
import Uploader from '@/components/upload/uploader';
import UploadGrid from '@/components/upload/upload-grid';
import Step2Actions from './step2-actions';
import PostProgressInline from './PostProgressInline';

export default function Step2Upload() {
  useStepMarker(2);
  return (
    <section id="step-2" className="space-y-4">
      <Uploader />
      <UploadGrid />
      <Step2Actions />
      <PostProgressInline />
    </section>
  );
}