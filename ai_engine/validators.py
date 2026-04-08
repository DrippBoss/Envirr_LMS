from pydantic import BaseModel, Field, model_validator, AliasChoices
from typing import Literal, Optional, List

class MCQOptionSchema(BaseModel):
    option_label: str = Field(validation_alias=AliasChoices('option_label', 'label'))
    option_text: str = Field(validation_alias=AliasChoices('option_text', 'text'))
    is_correct: bool
    order: Optional[int] = 0

class CaseStudyPartSchema(BaseModel):
    part_number: int
    part_text: str
    part_answer: str
    question_type: str = "SHORT"
    marks: int

class ExtractedQuestion(BaseModel):
    subject: str
    chapter: str
    question_type: Literal["MCQ", "SHORT", "LONG", "VERY_SHORT", "ASSERTION_REASON", "CASE"]
    difficulty: Literal["easy", "medium", "hard"]
    marks: int = Field(ge=1, le=20)
    question_text: str = Field(min_length=10)
    answer_text: str = Field(min_length=1)
    options: Optional[List[MCQOptionSchema]] = None
    parts: Optional[List[CaseStudyPartSchema]] = Field(None, validation_alias=AliasChoices('parts', 'case_parts'))

    @model_validator(mode='after')
    def mcq_must_have_options(self):
        v = self.options
        if self.question_type == 'MCQ' and (not v or len(v) != 4):
            raise ValueError('MCQ must have exactly 4 options')
        if v:
            correct = [o for o in v if o.is_correct]
            if len(correct) != 1:
                raise ValueError('MCQ must have exactly 1 correct option')
        return self
