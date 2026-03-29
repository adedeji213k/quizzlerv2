"use client";

import Link from "next/link";
import { Share2, CreditCard, Coins } from "lucide-react";

export default function PartnerPromo() {
  return (
    <section className="relative py-28 px-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-30" />

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Turn Your <span className="text-primary">Classmates</span> Into{" "}
          <span className="text-primary">Income</span>
        </h2>

        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Share Quizzler with friends. When they buy credits or subscriptions,
          you earn real money. Simple.
        </p>

        {/* Earnings tease */}
        <div className="mb-14">
          <p className="text-sm text-muted-foreground">
            Some students are already earning
          </p>
          <p className="text-3xl font-bold text-primary">₦10,000+ / month</p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition" />

            <div className="relative bg-background/80 backdrop-blur p-6 rounded-2xl shadow-xl border border-border">
              <Share2 className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-lg">Share</h3>
              <p className="text-sm text-muted-foreground">
                Get your unique referral link and send it to friends
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition" />

            <div className="relative bg-background/80 backdrop-blur p-6 rounded-2xl shadow-xl border border-border">
              <CreditCard className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-lg">They Buy</h3>
              <p className="text-sm text-muted-foreground">
                Your referrals purchase credits or subscriptions
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition" />

            <div className="relative bg-background/80 backdrop-blur p-6 rounded-2xl shadow-xl border border-border">
              <Coins className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-semibold mb-2 text-lg">You Earn</h3>
              <p className="text-sm text-muted-foreground">
                Get paid for every successful referral
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/partner-program"
            className="px-8 py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:scale-105 transition"
          >
            Start Earning Now
          </Link>

          <p className="text-xs text-muted-foreground">
            No upfront cost • Takes 2 minutes to join
          </p>
        </div>
      </div>
    </section>
  );
}
