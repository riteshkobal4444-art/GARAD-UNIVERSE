import { ArrowLeft, ArrowRight, Image as ImageIcon, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  DESTINATIONS_BY_ID,
  getAdjacentDestination,
  VILLAGE_DESTINATIONS,
} from '../../data/destinations';
import { PROGRAMME_CONTENT } from '../../data/programmes';
import type { DestinationId } from '../../types/universe';

interface ProgrammeInfoPanelProps {
  destinationId: DestinationId;
  onClose: () => void;
  onBackToVillage: () => void;
  onSwitchDestination: (id: DestinationId) => void;
}

/**
 * Screen 6 — Programme Information Panel
 * Storybook modal sheet displaying strictly separated Stage 1 placeholder content
 * from `src/data/programmes.ts`. Zero fabricated statistics or achievements.
 */
export function ProgrammeInfoPanel({
  destinationId,
  onClose,
  onBackToVillage,
  onSwitchDestination,
}: ProgrammeInfoPanelProps) {
  const programme = PROGRAMME_CONTENT[destinationId];
  const destination = DESTINATIONS_BY_ID[destinationId];
  const nextDestination = getAdjacentDestination(destinationId, 'next');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="programme-panel-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#1f1b16]/32 p-3 md:items-center md:p-6"
      onClick={onClose}
    >
      <article
        className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/90 bg-gradient-to-b from-[#fffbf7]/96 to-[#f7ede5]/96 shadow-[0_22px_56px_-14px_rgba(31,27,22,0.3)] md:rounded-[2.25rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <header className="flex items-start justify-between gap-4 border-b border-[#e0c0b6]/50 px-5 pb-4 pt-5 md:px-8 md:pt-6">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-[#006783]">
              {programme.locationName} · {programme.pillarLabel}
            </p>
            <h2
              id="programme-panel-title"
              className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-[#1f1b16] md:text-[28px]"
            >
              {programme.programmeName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close programme information panel"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#2b2621] shadow-sm transition-colors hover:bg-[#ffdbcf] hover:text-[#390c00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Storybook Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
          {/* Transparent Placeholder Notice */}
          <div className="rounded-[1rem] border border-[#e0c0b6]/60 bg-[#fff8f4]/90 px-3.5 py-2.5 text-xs leading-relaxed text-[#58423a]">
            <span className="font-bold text-[#a53604]">Content Placeholder:</span>{' '}
            {programme.stageNotice}
          </div>

          {/* Lead Paragraph */}
          <p className="text-[15px] leading-relaxed text-[#2b2621] md:text-base">
            {programme.leadPlaceholder}
          </p>

          {/* Editorial Sections */}
          <div className="grid gap-5 md:grid-cols-2">
            {programme.sections.map((section) => (
              <div key={section.heading} className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#a53604]">{section.heading}</h3>
                <p className="text-[13px] leading-relaxed text-[#2b2621]/90">
                  {section.placeholderBody}
                </p>
              </div>
            ))}
          </div>

          {/* Structured Focus Areas */}
          <div className="border-t border-[#e0c0b6]/45 pt-4">
            <h3 className="text-sm font-bold text-[#1f1b16]">
              Planned Programme Highlights
            </h3>
            <ul className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-[#2b2621]">
              {programme.focusPlaceholders.map((item, idx) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: destination.accentHex }}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="tabular-nums font-semibold text-[#8c7169]">
                      0{idx + 1}.
                    </span>{' '}
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reserved Visual Media Slot (no fabricated photographs) */}
          <div className="rounded-[1.25rem] border border-dashed border-[#c9b39a] bg-[#fcf2ea]/85 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8c7169]">
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1f1b16]">
                  Future Garad Foundation Media & Stories Slot
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#58423a]">
                  {programme.mediaSlotNote}
                </p>
                <p className="mt-1.5 text-xs font-medium text-[#006783]">
                  {programme.collaborationNote}
                </p>
              </div>
            </div>
          </div>

          {/* Switcher across all 5 village programmes inside the connected world */}
          <div className="border-t border-[#e0c0b6]/45 pt-4">
            <p className="text-[11px] font-semibold text-[#58423a]">
              Explore other places in Garad Village
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VILLAGE_DESTINATIONS.map((item) => {
                const isCurrent = item.id === destinationId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSwitchDestination(item.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-[#d85a2a] text-white'
                        : 'bg-white/90 text-[#2b2621] hover:bg-[#ffdbcf]'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#e0c0b6]/50 bg-[#fff8f4]/90 px-5 py-3.5 md:px-8">
          <button
            type="button"
            onClick={onBackToVillage}
            className="garad-pill-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Village</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-[#58423a] hover:text-[#1f1b16]"
            >
              Return to {destination.name}
            </button>
            <button
              type="button"
              onClick={() => onSwitchDestination(nextDestination.id)}
              className="garad-pill-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
            >
              <span>Next: {nextDestination.name}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
