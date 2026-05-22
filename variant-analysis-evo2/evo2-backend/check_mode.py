"""Quick script to check if EVO2 is installed and what mode backend will use"""
try:
    from evo2 import Evo2
    print("✅ EVO2 model: INSTALLED")
    print("   Backend will use: PRODUCTION MODE (Real EVO2 predictions)")
except ImportError as e:
    print("⚠️  EVO2 model: NOT INSTALLED")
    print("   Backend will use: DEVELOPMENT MODE (Mock scores)")
    print(f"   Error: {e}")
