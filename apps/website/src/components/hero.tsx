"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@midday/ui/button";
import { HeroImage } from "./hero-image";
import { WordAnimation } from "./word-animation";

/**
 * Modern + Classic Hero
 * - "use client" ensures imports from @midday/ui and framer-motion work
 * - accessible, responsive, two-column layout
 */

export function Hero() {
  return (
    <section className="relative pt-20 pb-24 lg:pt-28 lg:pb-28">
      {/* subtle background orb */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#efe9e1] to-[#f7f5f3] opacity-60 blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Link href="/updates/midday-v1-1" className="inline-block">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm bg-white shadow-sm">
                <span className="font-mono text-xs">Midday v1.1</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-80">
                  <path fill="currentColor" d="M8.783 6.667H.667V5.333h8.116L5.05 1.6 6 .667 11.333 6 6 11.333l-.95-.933 3.733-3.733Z" />
                </svg>
              </span>
            </Link>

            <h1 className="mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              A modern financial OS for founders & teams.
              <span className="text-slate-500 font-medium"> powered by <WordAnimation /></span>
            </h1>

            <p className="mt-4 max-w-xl mx-auto lg:mx-0 text-slate-600">
              Invoicing, time tracking, smart reconciliation and a single source of truth for your finances — simple, fast, and beautiful.
            </p>

            <div className="mt-6 flex justify-center lg:justify-start gap-3">
              <a href="https://app.er0s.co">
                <Button className="h-12 px-6 rounded-lg">Start free trial</Button>
              </a>

              <Link href="https://cal.com/pontus-midday/15min" target="_blank" rel="noreferrer">
                <Button variant="outline" className="h-12 px-5 rounded-lg border">
                  Talk to founders
                </Button>
              </Link>
            </div>

            <p className="mt-3 text-xs text-slate-500 font-mono">No credit card required.</p>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full"
          >
            <div className="mx-auto max-w-[720px]">
              {/* HeroImage should be a client-safe component that renders the visual */}
              <HeroImage />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
// Test