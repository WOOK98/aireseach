"use client";

import { MotionConfig } from "motion/react";
import { memo } from "react";

interface MotionProviderProps {
  readonly children: React.ReactNode;
}

export const MotionProvider = memo<MotionProviderProps>(({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
));

MotionProvider.displayName = "MotionProvider";
