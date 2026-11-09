'use client';

// 그림백업 작성창 — 공용 폼 사용
import React, { Suspense } from 'react';
import { BackupForm } from '@/components/backup/BackupForm';

function BackupWritePageInner() {
  return <BackupForm initial={null} />;
}

export default function BackupWritePage() {
  return (
    <Suspense fallback={<section className="page" />}>
      <BackupWritePageInner />
    </Suspense>
  );
}
