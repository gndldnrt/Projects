from __future__ import annotations

from typing import Any, TypedDict

from fastapi import APIRouter, HTTPException, Query

from .config import get_supabase
from .schemas import ProfileCreate, SkillMapping

router = APIRouter(prefix="/api")


class NestedSkill(TypedDict):
    id: str
    profile_id: str
    skill_id: int
    skill_type: str
    experience_level: str
    skill: dict[str, Any] | None


def _error_detail(error: Any) -> str:
    return str(getattr(error, "message", error))


@router.post("/profiles/register", status_code=201)
async def register_profile(payload: ProfileCreate):
    try:
        supabase = get_supabase()
        profile_insert = {
            "auth_id": payload.auth_id,
            "full_name": payload.full_name,
            "email": payload.email,
            "bio": payload.bio,
            "zip_code": payload.zip_code,
        }
        profile_result = (
            supabase.table("profiles")
            .insert(profile_insert)
            .execute()
        )
        if not profile_result.data:
            raise HTTPException(status_code=502, detail="Supabase did not return the created profile")

        profile = profile_result.data[0]
        profile_id = profile["id"]
        skill_rows = [
            {
                "profile_id": profile_id,
                "skill_id": mapping.skill_id,
                "skill_type": mapping.skill_type,
                "experience_level": mapping.experience_level,
            }
            for mapping in payload.user_skills
        ]
        if skill_rows:
            supabase.table("user_skills").insert(skill_rows).execute()
        return {**profile, "user_skills": skill_rows}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Supabase profile registration failed: {_error_detail(error)}") from error


@router.get("/profiles/local")
async def get_local_profiles(
    zip_code: str = Query(pattern=r"^\d{4}$"),
    radius: int = Query(default=25, gt=0, le=100),
):
    # ZIP ranges provide a deterministic first-pass locality filter. For exact
    # geographic distance, expose a Postgres RPC backed by ZIP centroids.
    lower_zip = str(max(0, int(zip_code) - radius * 10)).zfill(4)
    upper_zip = str(min(9999, int(zip_code) + radius * 10)).zfill(4)
    nested_select = (
        "id,auth_id,full_name,email,bio,zip_code,created_at,"
        "user_skills!inner(id,profile_id,skill_id,skill_type,experience_level,"
        "skills!inner(id,name,category))"
    )
    try:
        supabase = get_supabase()
        result = (
            supabase.table("profiles")
            .select(nested_select)
            .gte("zip_code", lower_zip)
            .lte("zip_code", upper_zip)
            .neq("zip_code", zip_code)
            .execute()
        )
        profiles = []
        for profile in result.data or []:
            mappings = profile.pop("user_skills", [])
            profile["user_skills"] = [
                {
                    **{key: value for key, value in mapping.items() if key != "skills"},
                    "skill": mapping.get("skills"),
                }
                for mapping in mappings
            ]
            profiles.append(profile)
        return {"profiles": profiles, "count": len(profiles), "radius_miles": radius}
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Supabase local search failed: {_error_detail(error)}") from error
