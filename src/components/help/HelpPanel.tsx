"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { HelpCircle, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { getHelpContent } from "@/lib/help-content";

function useIsMapPage() {
  const pathname = usePathname();
  return /\/map(\/|$)/.test(pathname);
}

export function HelpPanel() {
  const pathname = usePathname();
  const isMap = useIsMapPage();
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const content = getHelpContent(pathname);
  if (!content) return null;

  // On the map page position the button to the left of the Leaflet ZoomControl (bottomright)
  // Leaflet default: bottom:20px, right:10px, each button ~26px wide, gap 1px → control right edge at ~36px
  const btnStyle = isMap
    ? { bottom: "30px", right: "52px" }  // vertically centered on the 2-button stack, left of it
    : { bottom: "24px", right: "24px" };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Hilfe"
        style={btnStyle}
        className={`no-print fixed z-40 flex items-center justify-center transition-colors ${
          isMap
            ? "w-[26px] h-[26px] rounded-sm bg-white hover:bg-slate-50 text-slate-700 shadow border border-slate-300 border-b-2 border-b-slate-400"
            : "w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-slate-700"
        }`}
      >
        <HelpCircle size={isMap ? 14 : 20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over panel */}
      <div className={`fixed top-0 right-0 h-full w-[380px] max-w-full z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-emerald-600" />
            <span className="font-semibold text-slate-800 text-sm">{content.title}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Description */}
          <div>
            <p className="text-sm text-slate-600 leading-relaxed">{content.description}</p>
          </div>

          {/* FAQs */}
          {content.faqs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Häufige Fragen
              </h3>
              <div className="space-y-2">
                {content.faqs.map((faq, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-800 pr-3">{faq.question}</span>
                      {expandedFaq === i
                        ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={15} className="text-slate-400 shrink-0" />
                      }
                    </button>
                    {expandedFaq === i && (
                      <div className="px-4 pb-4 pt-1">
                        <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Docs link */}
          {content.docsUrl && (
            <a
              href={content.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
            >
              <ExternalLink size={14} />
              Vollständige Dokumentation öffnen
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">
            Weitere Fragen?{" "}
            <a
              href="mailto:info@forest-inventory.eu"
              className="text-emerald-700 hover:underline"
            >
              info@forest-inventory.eu
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
