'use client';

// 그림백업 수정 — 작성자 또는 관리자만
import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { BackupPost, BACKUP_SEED } from '@/lib/galleryStore';
import { BackupForm } from '@/components/backup/BackupForm';
import { PageTitle } from '@/components/ui/PageText';

function BackupEditPageInner() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();

  const [posts, , loaded] = useLocalList<BackupPost>(
    'ohome.backup.v1',
    BACKUP_SEED,
  );

  const post = posts.find(item => item.id === id);

  if (!loaded) {
    return <section className="page" />;
  }

  const canEdit =
    isAdmin ||
    (
      !!post?.authorId &&
      post.authorId === user?.id
    );

  if (!post || !canEdit) {
    return (
      <section className="page">
        <div className="page-head">
          <PageTitle>EDIT</PageTitle>
          <p>게시물을 찾을 수 없거나 수정 권한이 없습니다</p>
        </div>
      </section>
    );
  }

  return <BackupForm initial={post} />;
}

export default function BackupEditPage() {
  return (
    <Suspense fallback={<section className="page" />}>
      <BackupEditPageInner />
    </Suspense>
  );
}
