# index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from api.discovery_engine import search_civic_network, generate_civic_insight
# Import get_connection to prevent blank database generation
from api.db_manager import initialize_database, get_connection
from typing import Optional

app = FastAPI()

# This allows your React frontend (running on a different port) to talk to this Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you'd restrict this to your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize your DB just like before
initialize_database()

# We define the shape of the data we expect from React
class ChatRequest(BaseModel):
    prompt: str

@app.post("/api/copilot")
def ask_copilot(request: ChatRequest):
    """
    Takes a natural language prompt, uses the AI to find specific
    collaborators, and generates a civic insight based on those matches.
    """
    try:
        # UPGRADED: Use the safe connection
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        # 2. Extract structured filters and matches using Gemini
        matches, filters = search_civic_network(request.prompt, df)

        # 3. Generate the insight based on the specific results found
        insight = generate_civic_insight(request.prompt, matches if not matches.empty else df)

        # 4. Convert matches to a list of dicts for React
        results_data = matches.fillna("").to_dict(orient="records") if not matches.empty else []

        return {
            "status": "success",
            "insight": insight,
            "matches": results_data,
            "match_count": len(results_data)
        }

    except Exception as e:
        print(f"ERROR in /api/copilot: {e}")
        return {"status": "error", "message": "The Copilot encountered an issue analyzing the network."}


@app.get("/api/contacts")
def get_all_contacts():
    """
    Simply grabs all contacts from the database and sends them to React.
    No AI, no prompts, just raw data.
    """
    try:
        # UPGRADED: Use the safe connection
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        # Convert the dataframe to a list of dictionaries for React
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/graph")
def get_network_graph():
    """
    Generates data for the React Network Map.
    Creates 'Hubs' for Campuses, and links people to their Campus.
    """
    try:
        # UPGRADED: Use the safe connection
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        nodes = []
        links = []

        # 1. Create the giant "Hub" nodes for the Campuses
        campuses = df['Campus'].dropna().unique()
        for campus in campuses:
            if campus.strip():
                # 'val' makes the campus nodes much larger on the map
                nodes.append({"id": campus, "name": campus, "group": "campus", "val": 8})

        # 2. Create the "Spoke" nodes for the People and draw the lines
        for _, row in df.iterrows():
            person_id = row['ID']
            campus = row['Campus']
            name = row['Contact Name']

            if person_id and name:
                nodes.append({
                    "id": person_id,
                    "name": name,
                    "group": "person",
                    "val": 2,
                    "title": row.get('Role/Title', '')
                })
                # Draw a line connecting the person to their campus
                if campus and campus.strip():
                    links.append({"source": person_id, "target": campus})

        return {"status": "success", "graph": {"nodes": nodes, "links": links}}
    except Exception as e:
        print(f"Graph Error: {e}")
        return {"status": "error", "message": str(e)}


# --- NEW: PROFILE & SAVED CONTACTS SCHEMAS ---

class ProfileData(BaseModel):
    contact_name: str
    campus: str
    capabilities: Optional[str] = ""
    category: Optional[str] = "User Generated"
    civic_domains: Optional[str] = ""
    communities_served: Optional[str] = ""
    email: Optional[str] = ""
    ini_alignments: Optional[str] = ""
    needs_challenges: Optional[str] = ""
    notes: Optional[str] = ""
    opportunity_ideas: Optional[str] = ""
    affiliation: Optional[str] = ""
    role_title: Optional[str] = ""
    url: Optional[str] = ""


class SaveContactRequest(BaseModel):
    contact_id: str


# --- NEW: PROFILE ENDPOINTS ---

@app.post("/api/save_contact")
def save_contact(request: SaveContactRequest):
    """Saves a contact to the current user's profile."""
    # Note: In a real app with auth, you'd get the user_id from the session.
    # For the demo, we'll hardcode user_id 1 (The Demo User)
    user_id = 1
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Ensure the user exists
        cursor.execute("INSERT OR IGNORE INTO Users (user_id, name) VALUES (?, ?)", (user_id, "Demo User"))

        cursor.execute("SELECT id FROM Saved_Collaborations WHERE user_id = ? AND contact_id = ?",
                       (user_id, request.contact_id))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO Saved_Collaborations (user_id, contact_id) VALUES (?, ?)",
                           (user_id, request.contact_id))
            conn.commit()
        conn.close()
        return {"status": "success", "message": "Contact saved!"}
    except Exception as e:
        print(f"Error saving contact: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/saved_contacts")
def get_saved_contacts():
    """Retrieves the saved contacts for the profile page."""
    user_id = 1
    try:
        conn = get_connection()
        query = """
                SELECT nc.* \
                FROM Saved_Collaborations sc \
                         JOIN Network_Contacts nc ON sc.contact_id = nc.ID
                WHERE sc.user_id = ?
                ORDER BY sc.saved_at DESC \
                """
        df = pd.read_sql_query(query, conn, params=(user_id,))
        conn.close()
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/publish_profile")
def publish_profile(profile: ProfileData):
    """Takes the user's form data and injects it into the public Network_Contacts table."""
    try:
        import uuid
        conn = get_connection()
        cursor = conn.cursor()

        # Generate a unique ID for the new user
        new_id = f"USER_{uuid.uuid4().hex[:8]}"

        # Mapped perfectly to the provided SQLite schema
        insert_query = """
                       INSERT INTO Network_Contacts ("Contact Name", Campus, "Capabilities / Expertise", Category, \
                                                     "Civic Domains", "Communities Served", "Email/Phone/LinkedIn", \
                                                     ID, "INI Alignments", "Needs / Challenges", "Notes / Insights", \
                                                     "Opportunity Ideas", "Program/Org Affiliation", "Role/Title", \
                                                     "URL (Overview Page)") \
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
                       """

        # The tuple order MUST match the insert_query order exactly
        data = (
            profile.contact_name,
            profile.campus,
            profile.capabilities,
            profile.category,
            profile.civic_domains,
            profile.communities_served,
            profile.email,
            new_id,  # Maps to ID
            profile.ini_alignments,
            profile.needs_challenges,  # Warning: This is going into a REAL column
            profile.notes,
            profile.opportunity_ideas,  # Maps to Oppurtunity Ideas
            profile.affiliation,
            profile.role_title,
            profile.url
        )

        cursor.execute(insert_query, data)
        conn.commit()
        conn.close()

        return {"status": "success", "message": "Profile published to public directory!"}
    except Exception as e:
        print(f"Error publishing profile: {e}")
        return {"status": "error", "message": str(e)}