import pandas as pd
import os

def analyze_excel(file_path):
    print(f"--- Analyzing {file_path} ---")
    try:
        df = pd.read_excel(file_path)
        print("Columns:")
        for col in df.columns:
            print(f"- {col}")
        
        print("\nFirst 3 rows:")
        print(df.head(3).to_string())
        
        print("\nPotential Categorical Fields (Unique values < 20):")
        for col in df.columns:
            if df[col].nunique() < 20:
                print(f"{col}: {df[col].unique()}")
                
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    print("\n")

if __name__ == "__main__":
    analyze_excel("客戶彙總表.xlsx")
    analyze_excel("訂單彙總表.xlsx")
