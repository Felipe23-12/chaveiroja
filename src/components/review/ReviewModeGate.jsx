import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import AppleReviewClient from '@/components/review/AppleReviewClient';
import AppleReviewLocksmith from '@/components/review/AppleReviewLocksmith';
export default function ReviewModeGate({ children }) {
  const { appleReview } = useAuth();
  if (!appleReview?.enabled) return children;
  return appleReview.role === 'cliente' ? <AppleReviewClient /> : <AppleReviewLocksmith />;
}