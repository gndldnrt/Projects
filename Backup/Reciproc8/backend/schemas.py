from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SkillType = Literal["teach", "learn"]
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
SwapStatus = Literal["pending", "accepted", "declined", "completed"]


class SkillMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skill_id: int = Field(gt=0)
    skill_type: SkillType
    experience_level: ExperienceLevel


class ProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    auth_id: Optional[str] = None
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    bio: str = Field(default="", max_length=500)
    zip_code: str = Field(pattern=r"^\d{4}$")
    user_skills: List[SkillMapping] = Field(default_factory=list)


class SwapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^SW-\d{8}-\d{3}$")
    sender_id: str = Field(pattern=r"^P-\d{8}-\d{3}$")
    receiver_id: str = Field(pattern=r"^P-\d{8}-\d{3}$")
    status: SwapStatus = "pending"
    created_at: Optional[datetime] = None

    @field_validator("receiver_id")
    @classmethod
    def sender_cannot_match_receiver(cls, value: str, info):
        if value == info.data.get("sender_id"):
            raise ValueError("a profile cannot request a swap with itself")
        return value
