import { useState, type DragEvent } from 'react';

export interface NodeItem {
    id?: number;
    title: string;
    type: string;
    order: number;
    template_id?: number | null;
}

interface NodeReorderListProps {
    nodes: NodeItem[];
    onReorder: (newNodes: NodeItem[]) => void;
}

export default function NodeReorderList({ nodes, onReorder }: NodeReorderListProps) {
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const handleDragStart = (e: DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        // Need to set data to make drag work in Firefox
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
        onReorder(newNodes.map((n, i) => ({...n, order: i + 1})));
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {nodes.map((node, i) => (
                <div 
                    key={node.id || `temp-${i}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        cursor: 'grab',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: draggedIdx === i ? 0.5 : 1,
                        transition: 'opacity 0.2s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)', cursor: 'grab' }}>⠿</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{i + 1}.</span>
                        <span>{node.title}</span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {node.type}
                        </span>
                    </div>
                </div>
            ))}
            {nodes.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                    No modules added yet. Select a template above to add content.
                </div>
            )}
        </div>
    );
}
