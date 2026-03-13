'use client';

import { X, Edit3, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ShellProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  headerColor: string;
  headerStyle?: React.CSSProperties;

  // Edit Mode Props
  isEditing: boolean;
  onToggleEdit: () => void;
  editNameValue?: string;
  onEditNameChange?: (val: string) => void;

  // Permissions / Actions
  canEdit: boolean;
  canDelete: boolean;
  onDelete: () => void;

  children: React.ReactNode;
}

export function DetailPanelShell({
  isVisible, onClose, title, icon, headerColor, headerStyle,
  isEditing, onToggleEdit, editNameValue, onEditNameChange,
  canEdit, canDelete, onDelete,
  children
}: ShellProps) {
  
  return (
    <div 
      className={cn(
        "absolute top-4 bottom-4 right-4 w-96",
        "bg-[#151515]/95 backdrop-blur-xl border border-white/10",
        "rounded-xl shadow-2xl z-[1000] overflow-hidden flex flex-col font-sans",
        "transition-transform duration-300 ease-out",
        isVisible ? 'translate-x-0' : 'translate-x-[110%]'
      )}
    >
      {/* HEADER */}
      <div className={cn("p-4 border-b border-white/10 shrink-0", headerColor)} style={headerStyle}>
        <div className="flex items-start justify-between">
            {/* Title & Icon Area */}
            <div className="flex items-center gap-3 text-white font-bold text-sm w-full overflow-hidden mr-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-black/20 border border-white/10">
                    {icon}
                </div>
                
                {isEditing && onEditNameChange ? (
                    <Input 
                        value={editNameValue}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        className="h-8 bg-black/50 border-white/20 text-white font-bold focus-visible:ring-white/50 min-w-0"
                    />
                ) : (
                    <span className="truncate text-lg">{title}</span>
                )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
                {!isEditing && canEdit && (
                    <button onClick={onToggleEdit} className="p-2 hover:bg-black/20 rounded-full text-white/80 hover:text-white transition">
                        <Edit3 className="w-4 h-4" />
                    </button>
                )}
                
                {canDelete && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-black/20 rounded-full text-white/80 hover:text-white transition">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-gray-200">
                            <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-400 cursor-pointer focus:bg-red-900/20">
                                <Trash2 className="w-4 h-4 mr-2" /> Löschen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-full text-white/80 hover:text-white transition">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 text-gray-300">
        {children}
      </div>
    </div>
  );
}