# index.py
# This module implements a FastAPI-based REST API that serves as the backend for the INI Platform.
# It exposes endpoints for AI-driven copilot queries, directory access, network visualization, and user profile management.
import os
from dotenv import load_dotenv

# Resolve the absolute path to the project root directory and load environment variables from .env.local
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(base_dir, ".env.local")
load_dotenv(dotenv_path=dotenv_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from api.discovery_engine import search_civic_network, generate_civic_insight
# Import database operations and initialization helper functions
from api.db_manager import initialize_database, get_connection
from typing import Optional

# Initialize the FastAPI application instance
app = FastAPI()

# Configure Cross-Origin Resource Sharing (CORS) Middleware
# Essential for allowing the React/Next.js frontend (running on a different port/domain) to communicate with this FastAPI server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production environments, restrict this wildcard to specific trusted origins (e.g., frontend domain) for security.
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers (Authorization, Content-Type, etc.)
)

# Execute database setup routines, creating tables and running migration patches if necessary
initialize_database()

# Pydantic schema representing the expected request body for the Copilot AI search endpoint
class ChatRequest(BaseModel):
    prompt: str  # The natural language user query containing search intent

@app.post("/api/copilot")
def ask_copilot(request: ChatRequest):
    """
    POST /api/copilot
    Processes a natural language query from the user to search the civic network database.
    It performs a two-stage pipeline:
    1. Extracts structured query filters via LLM (Gemini) and applies them to the local SQLite database.
    2. Uses the query results as contextual grounding to generate a comprehensive LLM insight.
    """
    try:
        # Establish an active database connection and query the public network contacts
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        # Step 2: Use LLM parsing in the discovery engine to find structured query constraints and matching contacts
        matches, filters = search_civic_network(request.prompt, df)

        # Step 3: Ground the generator in the results found to produce a summarized civic insight narrative
        insight = generate_civic_insight(request.prompt, matches if not matches.empty else df)

        # Step 4: Format matches to a native JSON-compatible list of dictionaries, replacing NaN with empty strings for React
        results_data = matches.fillna("").to_dict(orient="records") if not matches.empty else []

        return {
            "status": "success",
            "insight": insight,
            "matches": results_data,
            "match_count": len(results_data)
        }

    except Exception as e:
        # Log stack trace / exception details for administrative observability
        print(f"ERROR in /api/copilot: {e}")
        return {"status": "error", "message": "The Copilot encountered an issue analyzing the network."}

# Note: Modern routes in app/ directory fetch data directly via Supabase,
# however these legacy endpoints are maintained for fallback support.
@app.get("/api/contacts")
def get_all_contacts():
    """
    GET /api/contacts
    Retrieves all records from the Network_Contacts database table.
    Returns raw rows serialized into a JSON list without any dynamic filtering or AI analysis.
    """
    try:
        # Establish connection, load whole table into memory using Pandas, and serialize to dictionaries
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        # Convert NaN values (which are invalid JSON) to empty strings before sending response
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/graph")
def get_network_graph():
    """
    GET /api/graph
    Generates a structured node-link JSON payload suitable for React Force Graph 2D rendering.
    Nodes are categorized into two types:
    1. Campus Hubs: Centroids representing academic campuses.
    2. Persons: Individual contacts associated with those campuses.
    Links establish the relationships connecting individual persons to their primary campus hub.
    """
    try:
        conn = get_connection()
        df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
        conn.close()

        nodes = []
        links = []

        # Step 1: Identify all unique campuses present in the database and create large 'Hub' nodes for them
        campuses = df['Campus'].dropna().unique()
        for campus in campuses:
            if campus.strip():
                # 'val' represents visual size/weight of the node in the interactive frontend map
                nodes.append({"id": campus, "name": campus, "group": "campus", "val": 8})

        # Step 2: Iterate over contacts to create individual person nodes and draw edges/links to their campuses
        for _, row in df.iterrows():
            person_id = row['ID']
            campus = row['Campus']
            name = row['Contact Name']

            if person_id and name:
                nodes.append({
                    "id": person_id,
                    "name": name,
                    "group": "person",
                    "val": 2,  # Individual nodes are rendered smaller than campus hubs
                    "title": row.get('Role/Title', '')
                })
                # Create connection edge connecting the person to their academic campus if valid
                if campus and campus.strip():
                    links.append({"source": person_id, "target": campus})

        return {"status": "success", "graph": {"nodes": nodes, "links": links}}
    except Exception as e:
        print(f"Graph Error: {e}")
        return {"status": "error", "message": str(e)}


# --- DTO SCHEMAS FOR USER PROFILES & SAVED CONTACTS ---

class ProfileData(BaseModel):
    """Pydantic model representing public directory publication schema."""
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
    """Pydantic schema for requesting a contact save operation."""
    contact_id: str


# --- PROFILE & VAULT CRUD ENDPOINTS ---

@app.post("/api/save_contact")
def save_contact(request: SaveContactRequest):
    """
    POST /api/save_contact
    Persists a contact-to-user association inside the SQLite relational mapping table.
    Enforces a unique constraint using INSERT OR IGNORE patterns.
    """
    # Hardcoded Session Context: User ID 1 represents the mock default user for local testing
    user_id = 1
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Enforce that the user profile entry exists before inserting foreign key mappings
        cursor.execute("INSERT OR IGNORE INTO Users (user_id, name) VALUES (?, ?)", (user_id, "Demo User"))

        # Check for duplication manually to maintain database transaction safety
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
    """
    GET /api/saved_contacts
    Retrieves the vault of saved contacts for the user profile dashboard page.
    Utilizes SQL JOIN to resolve relational mapping from contact_id to Network_Contacts detail columns.
    """
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
        # Execute query using pandas to easily output serialized dictionaries
        df = pd.read_sql_query(query, conn, params=(user_id,))
        conn.close()
        return df.fillna("").to_dict(orient="records")
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/publish_profile")
def publish_profile(profile: ProfileData):
    """
    POST /api/publish_profile
    Ingests a newly submitted user directory profile and writes it as a public contact.
    Uses UUID to guarantee uniqueness of IDs across the civic network.
    """
    try:
        import uuid
        conn = get_connection()
        cursor = conn.cursor()

        # Generate a unique prefix ID with high entropy for the new civic network member
        new_id = f"USER_{uuid.uuid4().hex[:8]}"

        # Insert query matching SQLite column names exactly
        insert_query = """
                       INSERT INTO Network_Contacts ("Contact Name", Campus, "Capabilities / Expertise", Category, \
                                                     "Civic Domains", "Communities Served", "Email/Phone/LinkedIn", \
                                                     ID, "INI Alignments", "Needs / Challenges", "Notes / Insights", \
                                                     "Opportunity Ideas", "Program/Org Affiliation", "Role/Title", \
                                                     "URL (Overview Page)") \
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
                       """

        # Bind parameters in strict positional order mapping to insert_query columns
        data = (
            profile.contact_name,
            profile.campus,
            profile.capabilities,
            profile.category,
            profile.civic_domains,
            profile.communities_served,
            profile.email,
            new_id,  # Map generated UUID to ID column
            profile.ini_alignments,
            profile.needs_challenges,
            profile.notes,
            profile.opportunity_ideas,
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