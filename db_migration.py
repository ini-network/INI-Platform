import pandas as pd
import sqlite3
import os

print("🚀 Starting CUNY Network Data Migration...")

# 1. LOAD THE DATA
df_contacts = pd.read_csv('All Network Contact Data.csv')
df_nlp = pd.read_csv('INI_System_Map_Data_Standardized.csv')

# 2. CLEAN & DEDUPLICATE (The "Fuzzy" Match)
# We create a temporary lowercase, space-free column to act as the perfect match key
df_contacts['match_key'] = df_contacts['Contact Name'].astype(str).str.strip().str.lower()
df_nlp['match_key'] = df_nlp['Contact Name'].astype(str).str.strip().str.lower()

# Drop duplicates that confuse the merge (keeping the first instance)
df_contacts = df_contacts.drop_duplicates(subset=['match_key'], keep='first').copy()
df_nlp = df_nlp.drop_duplicates(subset=['match_key'], keep='first').copy()

print(f"✅ Cleaned data: {len(df_contacts)} unique contacts found.")

# Set the index to our clean match key
df_contacts.set_index('match_key', inplace=True)
df_nlp.set_index('match_key', inplace=True)

# 3. MERGE THE NLP TAGS INTO THE CONTACT DATA
nlp_cols = ['Civic Domains', 'Capabilities / Expertise', 'Communities Served', 'INI Alignments', 'Needs / Challenges']

for col in nlp_cols:
    if col in df_nlp.columns:
        # If the column doesn't exist in Contacts yet, create it
        if col not in df_contacts.columns:
            df_contacts[col] = None

        # Update the Contact row ONLY if the NLP row has actual data for it
        df_contacts[col].update(df_nlp[col].dropna())

# Cleanup: If there is a weird 'Notes/Insights' column from the raw export, merge it into the main one
if 'Notes/Insights' in df_contacts.columns and 'Notes / Insights' in df_contacts.columns:
    df_contacts['Notes / Insights'] = df_contacts['Notes / Insights'].fillna(df_contacts['Notes/Insights'])
    df_contacts.drop(columns=['Notes/Insights'], inplace=True)

# Drop columns that are not needed for the web app
df_contacts.drop(columns=['edited_by', 'v1_ready'], inplace=True, errors='ignore')

# 4. EXPORT THE MASTER CSV (Just in case you need to look at it in Excel)
df_contacts.reset_index(drop=True, inplace=True)
df_contacts.to_csv('Master_Civic_Network.csv', index=False)
print("✅ Saved 'Master_Civic_Network.csv'")

# 5. UPLOAD TO SQLITE DATABASE
db_file = 'api/cuny_civic_network.db'

if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)

    # Pandas has a magical 'to_sql' function that creates the table for you instantly!
    # if_exists='replace' means you can run this script multiple times without errors
    df_contacts.to_sql('Network_Contacts', conn, if_exists='replace', index=False)

    conn.commit()
    conn.close()
    print(f"✅ Database Updated! The 'Network_Contacts' table is now live in {db_file}")
else:
    print(f"⚠️ Warning: {db_file} not found. Did you run db_manager.py first?")