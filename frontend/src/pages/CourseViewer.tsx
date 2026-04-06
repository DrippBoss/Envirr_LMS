import { useParams } from 'react-router-dom';

export default function CourseViewer() {
    const { id } = useParams();
    
    return (
        <div className="animate-fade-in glass-panel" style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <h2>Course Content Mapping Engine</h2>
            <p style={{ color: 'var(--text-muted)' }}>The visual interlocking map for Course #{id} will render here.</p>
            <button className="btn-primary" style={{ marginTop: '2rem' }}>Simulate Pre-requisite Pass</button>
        </div>
    );
}
