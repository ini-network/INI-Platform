import sqlite3
import pandas as pd
from datetime import datetime
import os

# Get the absolute path of the current directory (the /api folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Safely join it with the database name
DB_NAME = os.path.join(BASE_DIR, 'cuny_civic_network.db')

def get_connection():
    """Helper function to get a database connection."""
    return sqlite3.connect(DB_NAME)


def initialize_database():
    """Creates the necessary tables if they don't exist yet."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create the main Contacts table (imported from CSV)
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS Network_Contacts
                   (
                       ID
                       TEXT
                       PRIMARY
                       KEY,
                       "Contact Name"
                       TEXT,
                       "Email/Phone/LinkedIn"
                       TEXT,
                       "URL (Overview Page)"
                       TEXT,
                       "Role/Title"
                       TEXT,
                       Campus
                       TEXT,
                       "Program/Org Affiliation"
                       TEXT,
                       Category
                       TEXT,
                       "Civic Domains"
                       TEXT,
                       "Capabilities / Expertise"
                       TEXT,
                       "Communities Served"
                       TEXT,
                       "Needs / Challenges"
                       TEXT,
                       "Opportunity Ideas"
                       TEXT,
                       "INI Alignments"
                       TEXT,
                       "Notes / Insights"
                       TEXT,
                       "Outreach Status"
                       TEXT,
                       "Last Email Sent"
                       TEXT
                   )
                   ''')

    # Create the Users table
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS Users
                   (
                       user_id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       name
                       TEXT
                       UNIQUE,
                       campus
                       TEXT,
                       role
                       TEXT,
                       focus
                       TEXT,
                       email
                       TEXT,
                       projects
                       TEXT,
                       created_at
                       DATETIME
                       DEFAULT
                       CURRENT_TIMESTAMP,
                       linked_contact_id
                       TEXT
                   )
                   ''')

    # Create the Search Logs table
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS Search_Logs
                   (
                       log_id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       user_id
                       INTEGER,
                       search_query
                       TEXT,
                       search_time
                       DATETIME
                       DEFAULT
                       CURRENT_TIMESTAMP,
                       FOREIGN
                       KEY
                   (
                       user_id
                   ) REFERENCES Users
                   (
                       user_id
                   )
                       )
                   ''')

    # Create the Saved Collaborations table
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS Saved_Collaborations
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       user_id
                       INTEGER,
                       contact_id
                       TEXT,
                       saved_at
                       DATETIME
                       DEFAULT
                       CURRENT_TIMESTAMP,
                       FOREIGN
                       KEY
                   (
                       user_id
                   ) REFERENCES Users
                   (
                       user_id
                   ),
                       FOREIGN KEY
                   (
                       contact_id
                   ) REFERENCES Network_Contacts
                   (
                       ID
                   )
                       )
                   ''')

    # --- SAFEGUARD: Auto-patch older databases ---
    try:
        cursor.execute("ALTER TABLE Users ADD COLUMN email TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE Users ADD COLUMN projects TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE Users ADD COLUMN linked_contact_id TEXT")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()


def add_user(name, campus, role, focus):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Users (name, campus, role, focus) VALUES (?, ?, ?, ?)', (name, campus, role, focus))
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        cursor.execute('SELECT user_id FROM Users WHERE name = ?', (name,))
        user_id = cursor.fetchone()[0]
    conn.close()
    return user_id


def get_user_by_name(name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, campus, role, focus, email, projects, linked_contact_id FROM Users WHERE name = ?",
                   (name,))
    user = cursor.fetchone()
    conn.close()
    return user


def update_user_profile(user_id, email, campus, role, focus, projects):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
                   UPDATE Users
                   SET email    = ?,
                       campus   = ?,
                       role     = ?,
                       focus    = ?,
                       projects = ?
                   WHERE user_id = ?
                   """, (email, campus, role, focus, projects, user_id))
    conn.commit()
    conn.close()


def log_search(user_id, query):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO Search_Logs (user_id, search_query) VALUES (?, ?)', (user_id, query))
    conn.commit()
    conn.close()


def save_collaboration(user_id, contact_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Saved_Collaborations WHERE user_id = ? AND contact_id = ?", (user_id, contact_id))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO Saved_Collaborations (user_id, contact_id) VALUES (?, ?)", (user_id, contact_id))
        conn.commit()
    conn.close()


def get_saved_collaborations(user_id):
    conn = get_connection()
    query = """
            SELECT nc.* \
            FROM Saved_Collaborations sc \
                     JOIN Network_Contacts nc ON sc.contact_id = nc.ID
            WHERE sc.user_id = ? \
            ORDER BY sc.saved_at DESC
            """
    df = pd.read_sql_query(query, conn, params=(user_id,))
    conn.close()
    return df


def publish_user_to_directory(user_id, profile):
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT linked_contact_id FROM Users WHERE user_id = ?", (user_id,))
    linked_id = cursor.fetchone()[0]
    if not linked_id:
        linked_id = f"USER_{user_id}_{uuid.uuid4().hex[:8]}"
        cursor.execute("UPDATE Users SET linked_contact_id = ? WHERE user_id = ?", (linked_id, user_id))

    cursor.execute("SELECT ID FROM Network_Contacts WHERE ID = ?", (linked_id,))
    exists = cursor.fetchone()

    data = (profile.get('name', ''), profile.get('email', ''), profile.get('role', ''),
            profile.get('campus', ''), profile.get('focus', ''), profile.get('projects', ''), linked_id)

    if exists:
        cursor.execute(
            'UPDATE Network_Contacts SET "Contact Name"=?, "Email/Phone/LinkedIn"=?, "Role/Title"=?, Campus=?, "Civic Domains"=?, "Notes / Insights"=? WHERE ID=?',
            data)
    else:
        cursor.execute(
            'INSERT INTO Network_Contacts (ID, "Contact Name", "Email/Phone/LinkedIn", "Role/Title", Campus, "Civic Domains", "Notes / Insights") VALUES (?,?,?,?,?,?,?)',
            (linked_id, *data[:-1]))
    conn.commit()
    conn.close()
    return linked_id


# =====================================================================
# --- JOHNATHAN'S FORUM LOGIC (FIXED TO USE UNIFIED DB) ---
# =====================================================================

def initialize_forum_db():
    conn = get_connection()  # FIXED: Use get_connection for unified DB
    cursor = conn.cursor()
    cursor.execute('''
                   CREATE TABLE IF NOT EXISTS forum_posts
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       user_id
                       TEXT,
                       name
                       TEXT,
                       campus
                       TEXT,
                       project_title
                       TEXT,
                       description
                       TEXT,
                       timestamp
                       DATETIME
                       DEFAULT
                       CURRENT_TIMESTAMP
                   )
                   ''')
    conn.commit()
    conn.close()


def save_forum_post(user_id, name, campus, title, description):
    conn = get_connection()  # FIXED
    cursor = conn.cursor()
    cursor.execute('''
                   INSERT INTO forum_posts (user_id, name, campus, project_title, description)
                   VALUES (?, ?, ?, ?, ?)
                   ''', (user_id, name, campus, title, description))
    conn.commit()
    conn.close()


def get_all_posts():
    conn = get_connection()  # FIXED
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, name, campus, project_title, description, id FROM forum_posts ORDER BY id DESC")
    posts = cursor.fetchall()
    conn.close()
    return posts