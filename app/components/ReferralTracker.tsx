"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      localStorage.setItem("referral_code", ref);
    }
  }, [searchParams]);

  return null;
}