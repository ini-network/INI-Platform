# index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import sqlite3

# Import your existing, untouched logic!
from discovery_engine import search_civic_network, generate_civic_insight
from db_manager import initialize_database

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
    # 1. Load the database
    conn = sqlite3.connect('cuny_civic_network.db')
    df = pd.read_sql_query("SELECT * FROM Network_Contacts", conn)
    conn.close()

    try:
        # 2. Extract structured filters and matches using Gemini
        matches, filters = search_civic_network(request.prompt, df)

        # 3. Generate the insight based on the specific results found
        # If matches is empty, the insight function handles the 'vague query' response
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
        # Log the error for the developer and tell the user something went wrong
        print(f"ERROR in /api/copilot: {e}")
        return {"status": "error", "message": "The Copilot encountered an issue analyzing the network."}


# --- NEW: The Dedicated Database Endpoint ---
@app.get("/api/contacts")
def get_all_contacts():
    """
    Simply grabs all contacts from the database and sends them to React.
    No AI, no prompts, just raw data.
    """
    try:
        conn = sqlite3.connect('cuny_civic_network.db')
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
        conn = sqlite3.connect('cuny_civic_network.db')
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