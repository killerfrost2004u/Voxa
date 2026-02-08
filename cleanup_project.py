import os
import shutil

# List of files and folders to DELETE (Node.js / Next.js specific)
items_to_remove = [
    "node_modules",          # Node dependencies
    "src",                   # Next.js source folder
    "public",                # Next.js assets (your assets are in frontend/images)
    ".next",                 # Next.js build folder
    "package.json",          # Node config
    "package-lock.json",     # Node lock file
    "tsconfig.json",         # TypeScript config
    "next.config.ts",        # Next.js config
    "next.config.js",        # Alternative Next.js config
    "postcss.config.mjs",    # CSS tools for Next.js
    "eslint.config.mjs",     # Linting for JS
    ".eslintrc.json",        # Linting config
    "tailwind.config.ts",    # Tailwind config
    "tailwind.config.js"     # Tailwind config
]

def cleanup():
    current_dir = os.getcwd()
    print(f"🧹 Cleaning up project in: {current_dir}")
    print("-" * 40)

    removed_count = 0

    for item in items_to_remove:
        path = os.path.join(current_dir, item)
        
        if os.path.exists(path):
            try:
                if os.path.isdir(path):
                    shutil.rmtree(path)
                    print(f"✅ Removed Folder: {item}")
                else:
                    os.remove(path)
                    print(f"✅ Removed File:   {item}")
                removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove {item}: {e}")
        else:
            pass # Item doesn't exist, skip it

    print("-" * 40)
    if removed_count == 0:
        print("✨ Project is already clean! No Node.js files found.")
    else:
        print(f"🎉 Cleanup Complete! Removed {removed_count} items.")
        print("🚀 Your project is now a pure Python/Flask app.")

if __name__ == "__main__":
    # Safety confirmation
    confirm = input("⚠️  Are you sure you want to delete all Node.js/Next.js files? (yes/no): ")
    if confirm.lower() == "yes":
        cleanup()
    else:
        print("❌ Operation cancelled.")