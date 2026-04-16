import pandas as pd
import sqlite3
import os

print("🚀 Starting CUNY Network Data Migration...")

# 1. LOAD THE STANDARDIZED DATA
# We only need the one file now!
df_contacts = pd.read_csv('CUNY INI NLP Data Transformed.csv')

print(f"✅ Loaded {len(df_contacts)} standardized contacts.")

# 2. ARCHITECTURAL ENFORCEMENT
# Drop the AI tracking metadata because it doesn't belong in the production database
df_contacts = df_contacts.drop(columns=['edited_by', 'v1_ready'], errors='ignore')

# Ensure missing schema columns exist so the database structure remains perfectly intact
expected_columns = [
    'ID', 'Contact Name', 'Email/Phone/LinkedIn', 'URL (Overview Page)',
    'Role/Title', 'Campus', 'Program/Org Affiliation', 'Category',
    'Civic Domains', 'Capabilities / Expertise', 'Communities Served',
    'Needs / Challenges', 'Opportunity Ideas', 'INI Alignments',
    'Notes / Insights', 'Outreach Status', 'Last Email Sent'
]

for col in expected_columns:
    if col not in df_contacts.columns:
        df_contacts[col] = None

# Force strictly TEXT type on problematic columns to prevent SQLite from guessing floats (REAL)
df_contacts['Needs / Challenges'] = df_contacts['Needs / Challenges'].astype(str)
df_contacts['Opportunity Ideas'] = df_contacts['Opportunity Ideas'].astype(str)

# Filter down to ONLY the expected columns to prevent junk from entering the DB
df_contacts = df_contacts[expected_columns]

# 3. UPLOAD TO SQLITE DATABASE
# Safely resolve the path to the api folder where Vercel expects the db
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api')
db_file = os.path.join(BASE_DIR, 'cuny_civic_network.db')

if not os.path.exists(BASE_DIR):
    os.makedirs(BASE_DIR)

conn = sqlite3.connect(db_file)

# Pandas 'to_sql' replaces the old table with our clean, strict schema
df_contacts.to_sql('Network_Contacts', conn, if_exists='replace', index=False)

conn.commit()
conn.close()

print(f"✅ Database Updated! The 'Network_Contacts' table is securely loaded in {db_file}")