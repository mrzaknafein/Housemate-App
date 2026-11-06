import React, { Suspense } from "react";
import { OnboardingView } from "@/components/OnboardingView";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f5]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eecbad] border-t-[#cd853f]" />
        </div>
      }
    >
      <OnboardingView />
    </Suspense>
  );
}
