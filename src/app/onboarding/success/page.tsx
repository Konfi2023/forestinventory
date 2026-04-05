"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const t = useTranslations("Onboarding.success");

  useEffect(() => {
    // Fire confetti from both sides
    const end = Date.now() + 1500;
    const colors = ["#16a34a", "#4ade80", "#22c55e", "#a3e635"];

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    }
    frame();

    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="mb-12">
        <Logo variant="dark" height={28} />
      </div>

      <div className="text-center space-y-6 max-w-md">
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <CheckCircle2 className="text-green-500" size={80} strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-slate-900"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {t("title")}
        </motion.h1>

        <motion.p
          className="text-slate-600 text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {t("subtitle")}
        </motion.p>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3.5, ease: "linear", delay: 0.5 }}
            />
          </div>
        </motion.div>
      </div>

      <motion.button
        onClick={() => router.push("/dashboard")}
        className="mt-10 px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {t("toDashboard")}
      </motion.button>
    </div>
  );
}
