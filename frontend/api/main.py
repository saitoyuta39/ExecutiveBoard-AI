import os
import json
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Path settings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_CONFIG_PATH = os.path.join(BASE_DIR, "profiles.json")
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts")
ERA_CONTEXT_PATH = os.path.join(BASE_DIR, "era_context.txt")
DISCUSSION_INSTRUCTION_PATH = os.path.join(PROMPTS_DIR, "discussion_instruction.txt")
SUMMARIZE_INSTRUCTION_PATH = os.path.join(PROMPTS_DIR, "summarize_instruction.txt")

# Load environment variables from the same directory as this script
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set Gemini API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=api_key)

# Model selection
MODEL_NAME = "gemini-2.5-flash"

def load_era_context() -> str:
    """Load the era context (2026 status) from file."""
    if os.path.exists(ERA_CONTEXT_PATH):
        with open(ERA_CONTEXT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return ""

def load_instruction(path: str) -> str:
    """Load instruction text from file."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return ""

def load_profiles() -> Dict:
    """Load profiles and their prompts from external files."""
    if not os.path.exists(PROFILES_CONFIG_PATH):
        print(f"Error: {PROFILES_CONFIG_PATH} not found.")
        return {}
    
    era_context = load_era_context()
    
    with open(PROFILES_CONFIG_PATH, "r", encoding="utf-8") as f:
        profiles_list = json.load(f)
    
    profiles_dict = {}
    for item in profiles_list:
        profile_id = item["id"]
        prompt_path = os.path.join(PROMPTS_DIR, item["prompt_file"])
        
        system_prompt = ""
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as pf:
                system_prompt = pf.read()
        else:
            print(f"Warning: Prompt file {prompt_path} not found for profile {profile_id}.")
        
        # Inject era context at the beginning
        full_prompt = f"{era_context}\n\n--- 経営者プロファイル ---\n{system_prompt}"
        
        profiles_dict[profile_id] = {
            "name": item["name"],
            "description": item["description"],
            "system_prompt": full_prompt
        }
    return profiles_dict

# Load profiles at startup
PROFILES = load_profiles()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    profile_id: str
    messages: List[ChatMessage]

class DiscussionMessage(BaseModel):
    speaker: str
    profile_id: str
    content: str

class DiscussionRequest(BaseModel):
    topic: str
    profile_id_a: str
    profile_id_b: str
    history: List[DiscussionMessage] = []

class SummarizeRequest(BaseModel):
    topic: str
    history: List[DiscussionMessage]

@app.get("/profiles")
async def get_profiles():
    # Reload profiles to reflect changes in text files without restarting (Optional, for development)
    global PROFILES
    PROFILES = load_profiles()
    return [{"id": k, "name": v["name"], "description": v["description"]} for k, v in PROFILES.items()]

@app.post("/chat")
async def chat(request: ChatRequest):
    if request.profile_id not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = PROFILES[request.profile_id]
    
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=profile["system_prompt"]
    )
    
    history = []
    for msg in request.messages[:-1]:
        role = "user" if msg.role == "user" else "model"
        history.append({"role": role, "parts": [msg.content]})
    
    try:
        chat_session = model.start_chat(history=history)
        last_message = request.messages[-1].content
        response = chat_session.send_message(last_message)
        return {"content": response.text}
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/discussion")
async def discussion(request: DiscussionRequest):
    # Reload prompts to ensure the latest versions are used
    global PROFILES
    PROFILES = load_profiles()

    if request.profile_id_a not in PROFILES or request.profile_id_b not in PROFILES:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Determine whose turn it is
    if not request.history:
        # First turn: Profile A
        current_profile_id = request.profile_id_a
        other_profile_id = request.profile_id_b
    else:
        last_speaker_id = request.history[-1].profile_id
        if last_speaker_id == request.profile_id_a:
            current_profile_id = request.profile_id_b
            other_profile_id = request.profile_id_a
        else:
            current_profile_id = request.profile_id_a
            other_profile_id = request.profile_id_b
    
    current_profile = PROFILES[current_profile_id]
    other_profile = PROFILES[other_profile_id]
    
    history_text = "\n".join([f"{m.speaker}: {m.content}" for m in request.history])
    
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=f"{current_profile['system_prompt']}\n現在は{other_profile['name']}との議論中です。相手の意見も踏まえつつ、自分の立場から発言してください。"
    )
    
    instruction = load_instruction(DISCUSSION_INSTRUCTION_PATH)
    prompt = instruction.format(
        topic=request.topic,
        history_text=history_text if history_text else '（まだ議論は始まっていません）'
    )
    
    try:
        response = model.generate_content(prompt)
        new_message = {
            "speaker": current_profile['name'],
            "profile_id": current_profile_id,
            "content": response.text
        }
        return new_message
    except Exception as e:
        print(f"Error in discussion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    if not request.history:
        raise HTTPException(status_code=400, detail="History is empty")
    
    history_text = "\n".join([f"{m.speaker}: {m.content}" for m in request.history])
    
    system_prompt = load_instruction(SUMMARIZE_INSTRUCTION_PATH)

    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=system_prompt
    )
    
    prompt = f"議論のテーマ: {request.topic}\nこれまでの議論の流れ:\n{history_text}\n\nこの内容に基づき、要約と分析をお願いします。"
    
    try:
        response = model.generate_content(prompt)
        return {"content": response.text}
    except Exception as e:
        print(f"Error in summarize: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
