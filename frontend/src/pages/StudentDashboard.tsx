import { useEffect, useState } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PrerequisiteModal from '../components/PrerequisiteModal';
import StatsBar from '../components/StatsBar';

type CourseUnit = { 
    id: number; 
    title: string; 
    description: string; 
    progress_percentage: number;
    subject: string;
    class_grade: string;
    board: string;
};

export default function StudentDashboard() {
    const [units, setUnits] = useState<CourseUnit[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
    const [showPrereqModal, setShowPrereqModal] = useState(false);
    const [prereqCards, setPrereqCards] = useState<any[]>([]);

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('gamification/stats/').then(res => setStats(res.data)).catch(console.error);
        api.get('student/dashboard/').then(res => setUnits(res.data)).catch(console.error);
    }, []);

    // A better approach is to navigate to the unit's path directly, but for UI we assume
    // the unit map handles paths. But our UI spec says "navigates to /map/:pathId"
    const handleUnitSelect = async (unitId: number, firstPathId: number) => {
        try {
            const { data } = await api.get(`student/units/${unitId}/prerequisites/`);
            if (data.status === 'already_seen' || data.status === 'no_prerequisites') {
                navigate(`map/${firstPathId}`);
            } else {
                setSelectedUnitId(unitId);
                setPrereqCards(data.deck.cards);
                setShowPrereqModal(true);
            }
        } catch (e) {
            navigate(`map/${firstPathId}`);
        }
    };

    const handlePrereqComplete = async () => {
        if (!selectedUnitId) return;
        await api.post(`student/units/${selectedUnitId}/prerequisites/`);
        setShowPrereqModal(false);
        // Find the pathId from units state
        const unit = units.find(u => u.id === selectedUnitId);
        if (unit) {
            const uiUnit = unit as any;
            if (uiUnit.paths && uiUnit.paths.length > 0) {
                navigate(`map/${uiUnit.paths[0].id}`);
            }
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
            {stats && <StatsBar stats={stats} />}

            <h2 style={{ marginTop: '4rem', marginBottom: '2rem', fontWeight: 600, fontSize: '2rem' }}>
                Your Academic Path — Class {user?.profile?.class_grade} {user?.profile?.board ? `· ${user.profile.board}` : ''}
            </h2>
            
            <div className="grid-dashboard" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2.5rem' }}>
                {units.map((unit: any) => (
                    <div key={unit.id} className="glass-panel" style={{ gap: '1.5rem', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{unit.icon || '📚'}</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary-accent)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                {unit.subject}
                            </span>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 }}>{unit.title}</h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>{unit.description || 'Master the concepts and level up your skills.'}</p>
                        </div>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                                        <span>Progress</span>
                                        <span>{unit.progress_percentage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${unit.progress_percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-accent), #818cf8)', borderRadius: '4px', boxShadow: '0 0 10px var(--primary-glow)', transition: 'width 1s ease-out' }}></div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                className="btn-premium-large" 
                                style={{ width: '100%' }}
                                onClick={() => handleUnitSelect(unit.id, unit.paths?.[0]?.id)}
                            >
                                {unit.progress_percentage === 0 ? 'Enroll Now' : 'Continue Learning'}
                            </button>
                        </div>
                    </div>
                ))}
                {units.length === 0 && (
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>No courses available for your class yet. Stay tuned!</p>
                    </div>
                )}
            </div>

            {showPrereqModal && (
                <PrerequisiteModal 
                    cards={prereqCards}
                    unitName={units.find(u => u.id === selectedUnitId)?.title || ''}
                    onComplete={handlePrereqComplete}
                />
            )}
        </div>
    );
}
