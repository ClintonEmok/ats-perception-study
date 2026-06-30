"use client";

export interface PracticeScreenProps {
  onFinish: () => void;
}

export function PracticeScreen({ onFinish }: PracticeScreenProps) {
  void onFinish;
  return null;
}
