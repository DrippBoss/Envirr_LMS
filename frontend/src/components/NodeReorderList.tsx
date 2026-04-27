import { useState, type DragEvent } from 'react';

export interface NodeItem {
    id?: number;
    title: string;
    type: string;
    order: number;
    template_id?: number | null;
    youtube_url?: string;
    selectedQuestions?: any[];
    // LESSON fields
    starting_lives?: number;
    practice_question_count?: number;
    xp_reward?: number;
    is_bonus?: boolean;
    // CHAPTER_TEST fields
    test_question_count?: number;
    test_pass_percentage?: number;
    // REVISION fields
    side?: 'left' | 'right';
    appears_after_node_key?: string;
}

interface NodeReorderListProps {
    nodes: NodeItem[];
    onReorder: (newNodes: NodeItem[]) => void;
    onRename?: (idx: number, title: string) => void;
    onDelete?: (idx: number) => void;
    getAnnotation?: (node: NodeItem, idx: number) => string | null;
}

const TYPE_COLORS: Record<string, string> = {
    LESSON: 'bg-primary/10 text-primary border-primary/20',
    CHAPTER_TEST: 'bg-error-container/10 text-error border-error-container/20',
    REVISION: 'bg-tertiary/10 text-tertiary border-tertiary/20',
};

export default function NodeReorderList({ nodes, onReorder, onRename, onDelete, getAnnotation }: NodeReorderListProps) {
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const handleDragStart = (e: DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedIdx === null || draggedIdx === index) return;

        const newNodes = [...nodes];
        const draggedItem = newNodes[draggedIdx];
        newNodes.splice(draggedIdx, 1);
        newNodes.splice(index, 0, draggedItem);

        setDraggedIdx(index);
        onReorder(newNodes.map((n, i) => ({ ...n, order: i + 1 })));
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-outline-variant/15 rounded-xl text-slate-500 text-sm">
                <span className="material-symbols-outlined text-3xl text-outline-variant/40">add_box</span>
                No modules added yet. Select a template above to add content.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {nodes.map((node, i) => {
                const typeCls = TYPE_COLORS[node.type] ?? 'bg-surface-container text-slate-400 border-outline-variant/15';
                return (
                    <div
                        key={node.id || `temp-${i}`}
                        draggable={!onRename}
                        onDragStart={(e) => !onRename && handleDragStart(e, i)}
                        onDragOver={(e) => !onRename && handleDragOver(e, i)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/10 bg-surface-container transition-all select-none ${
                            draggedIdx === i ? 'opacity-40 scale-95' : 'opacity-100 hover:border-outline-variant/25'
                        } ${!onRename ? 'cursor-grab' : ''}`}
                    >
                        <span className="material-symbols-outlined text-slate-600 text-base cursor-grab shrink-0"
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e as any, i); }}
                            onDragOver={(e) => handleDragOver(e as any, i)}
                        >drag_indicator</span>

                        <span className="text-xs font-black text-primary w-5 text-center shrink-0">{i + 1}</span>

                        <div className="flex-1 min-w-0">
                            {onRename ? (
                                <input
                                    className="w-full bg-transparent border-none outline-none text-sm text-on-surface font-medium placeholder:text-outline/40"
                                    value={node.title}
                                    onChange={e => onRename(i, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="Node title..."
                                />
                            ) : (
                                <span className="text-sm text-on-surface font-medium truncate block">{node.title}</span>
                            )}
                            {getAnnotation && (() => {
                                const ann = getAnnotation(node, i);
                                return ann ? (
                                    <span className="text-[10px] text-tertiary/70 font-medium truncate block leading-none mt-0.5">{ann}</span>
                                ) : null;
                            })()}
                        </div>

                        {node.is_bonus && (
                            <span className="material-symbols-outlined text-xs text-yellow-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        )}

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${typeCls}`}>
                            {node.type === 'CHAPTER_TEST' ? 'TEST' : node.type === 'REVISION' ? 'REV' : node.type}
                        </span>

                        {onDelete && (
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onDelete(i); }}
                                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-outline/40 hover:text-error hover:bg-error/10 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
