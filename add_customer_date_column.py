
"""
Add 'date' column to 'customer' table if missing.
Run once: python add_customer_date_column.py
"""
import os
import sqlite3
from datetime import datetime

def main():
    db_path = os.path.join('instance', 'finance.db')
    if not os.path.exists(db_path):
        print('Database not found at', db_path)
        return
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(customer)")
        cols = [row[1] for row in cur.fetchall()]
        if 'date' not in cols:
            cur.execute("ALTER TABLE customer ADD COLUMN date DATETIME")
            conn.commit()
            print('Column added successfully.')
        
        cur.execute("UPDATE customer SET date = ? WHERE date IS NULL", (datetime.now().strftime('%Y-%m-%d %H:%M:%S'),))
        conn.commit()
        print('Backfilled null dates.')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
