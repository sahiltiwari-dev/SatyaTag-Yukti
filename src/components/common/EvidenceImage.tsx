import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { EvidenceAsset } from '../../types';

/**
 * Displays an evidence asset surface: shows the actual uploaded photograph
 * when available, otherwise a neutral placeholder tile with the surface label.
 */
export const EvidenceImage: React.FC<{
  evidence?: EvidenceAsset;
  surface: string;
  className?: string;
  icon?: React.ReactNode;
}> = ({ evidence, surface, className = '', icon }) => {
  const hasImage = evidence && evidence.imageUrl && !evidence.isPlaceholder;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-card border border-slate-200 bg-slate-100 ${className}`}
    >
      {hasImage ? (
        <img
          src={evidence.imageUrl}
          alt={surface}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 p-3 text-center">
          {icon || <ImageIcon className="h-8 w-8 text-slate-300" />}
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{surface}</span>
          <span className="text-[9px] text-slate-400">No image uploaded</span>
        </div>
      )}
    </div>
  );
};
