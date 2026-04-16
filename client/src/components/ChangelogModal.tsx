import { X, Sparkles } from "lucide-react";
import { APP_VERSION, CHANGELOG } from "../data/changelog";
import { Badge } from "./ui/badge";

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                Novedades
              </h2>
              <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-2 py-0 mt-0.5">
                v{APP_VERSION}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Changelog list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: i === 0 ? "#607562" : "#f0f4f0",
                    color: i === 0 ? "#fff" : "#607562",
                  }}
                >
                  v{entry.version}
                </span>
                <span className="text-xs text-gray-400">{entry.date}</span>
                {i === 0 && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Actual
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {entry.changes.map((change, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                    {change}
                  </li>
                ))}
              </ul>
              {i < CHANGELOG.length - 1 && (
                <div className="mt-6 border-t border-gray-100" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">Inteira v{APP_VERSION}</span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-primary hover:underline"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
