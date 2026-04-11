import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import NodeCard from '../components/NodeCard';
import RevisionNodeCard from '../components/RevisionNodeCard';
import FlashcardModal from '../components/FlashcardModal';

export default function LearningMap() {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const [pathData, setPathData] = useState<any>(null);
    const [unitPrereqs, setUnitPrereqs] = useState<any[]>([]);
    const [showPrereqModal, setShowPrereqModal] = useState(false);
    
    // Revision modal state
    const [showRevModal, setShowRevModal] = useState(false);
    const [currentRevNode, setCurrentRevNode] = useState<any>(null);
    const [currentRevCards, setCurrentRevCards] = useState<any[]>([]);

    useEffect(() => {
        loadMap();
    }, [pathId]);

    const loadMap = async () => {
        try {
            const res = await api.get(`student/paths/${pathId}/map/`);
            setPathData(res.data);
            
            // Also fetch the unit's prerequisites for the "Review" button
            // Since we know pathData.id, we can usually deduce unit. 
            // Better to get it from the map response if possible, or another call.
            // For now, we'll fetch them on-demand when clicking "Review".
        } catch (err: any) {
            if (err.response?.status === 403) {
                // If blocked by prerequisites, go back to dashboard
                alert("Please complete the unit enrollment first!");
                navigate('/');
            } else {
                console.error(err);
            }
        }
    };

    const handleReviewFoundations = async () => {
        try {
            // Finding the unit ID from pathData... 
            // Usually we'd include this in the API response or use pathId.
            // For this implementation, we'll hit the unit prerequisites endpoint directly.
            // If the map loaded, we already have access!
            const unitId = pathData.unit_id || 1; // Fallback or assume 1 for Chapter 1
            const res = await api.get(`student/units/${unitId}/prerequisites/`);
            if (res.data.deck?.cards) {
                setUnitPrereqs(res.data.deck.cards);
                setShowPrereqModal(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRevisionClick = async (rnode: any) => {
        const res = await api.get(`student/revision-nodes/${rnode.id}/`);
        setCurrentRevCards(res.data);
        setCurrentRevNode(rnode);
        setShowRevModal(true);
    };

    const handleRevisionComplete = async () => {
        if (currentRevNode) {
            await api.post(`student/revision-nodes/${currentRevNode.id}/`);
            setShowRevModal(false);
            loadMap(); // refresh progress
        }
    };

    if (!pathData) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading path...</div>;

    const nodes = pathData.nodes || [];
    const rnodes = pathData.revision_nodes || [];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '6rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{pathData.title}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>{pathData.description}</p>
                
                <button 
                    className="btn-premium-large" 
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '12px 24px' }}
                    onClick={handleReviewFoundations}
                >
                    📚 Review Foundations
                </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '50px', alignItems: 'center' }}>
                {nodes.map((node: any, idx: number) => {
                    const revNode = rnodes.find((r: any) => r.appears_after_node === node.id);
                    
                    return (
                        <div key={node.id} style={{ display: 'flex', position: 'relative', width: '100%', justifyContent: 'center' }}>
                            <NodeCard node={node} />
                            
                            {revNode && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '50%', transform: 'translateY(-50%)',
                                    [revNode.side === 'left' ? 'right' : 'left']: 'calc(50% + 140px)', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    flexDirection: revNode.side === 'left' ? 'row-reverse' : 'row',
                                    zIndex: 1
                                }}>
                                    <div style={{ 
                                        width: '40px', 
                                        borderBottom: '2px dashed rgba(255,255,255,0.2)',
                                    }}></div>
                                    <RevisionNodeCard node={revNode} onClick={() => handleRevisionClick(revNode)} />
                                </div>
                            )}

                            {idx < nodes.length - 1 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-50px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    height: '50px',
                                    width: '6px',
                                    background: node.status === 'COMPLETED' ? 'var(--secondary-accent)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '3px',
                                    zIndex: 1
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Revision Modal */}
            {showRevModal && currentRevCards && (
                <FlashcardModal 
                    title={currentRevNode?.title || "Revision"}
                    subtitle="Tailored practice based on your weak spots"
                    cards={currentRevCards}
                    onComplete={handleRevisionComplete}
                    finalButtonText="Claim XP"
                />
            )}

            {/* Foundations Review Modal */}
            {showPrereqModal && (
                <FlashcardModal 
                    title={`Foundations: ${pathData.title}`}
                    subtitle="Refreshing your core knowledge"
                    cards={unitPrereqs}
                    onComplete={() => setShowPrereqModal(false)}
                    finalButtonText="Got it, back to Map"
                />
            )}
        </div>
    );
}
