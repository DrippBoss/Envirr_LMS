import FlashcardModal, { type Flashcard } from './FlashcardModal';

interface PrerequisiteModalProps {
    unitName: string;
    cards: Flashcard[];
    onComplete: () => void;
}

export default function PrerequisiteModal({ unitName, cards, onComplete }: PrerequisiteModalProps) {
    return (
        <FlashcardModal
            title={`Foundations for ${unitName}`}
            subtitle="Let's quickly review what you'll need for this course:"
            cards={cards}
            onComplete={onComplete}
            onSkip={onComplete}
            finalButtonText="Complete Enrollment & Start Learning"
        />
    );
}
