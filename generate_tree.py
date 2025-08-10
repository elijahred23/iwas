import os
import fnmatch

# Exact names to ignore (dirs or files)
IGNORE_NAMES = {
    ".git",
    ".gitignore",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".vscode",
    ".idea",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".vite",
    "coverage",
    "htmlcov",
    "logs",
    ".cache",
}

# Glob patterns to ignore
IGNORE_GLOBS = [
    "*.pyc", "*.pyo", "*.pyd",
    "*.log", "*.out", "*.err", "*.pid",
    "*.sqlite3", "*.db",
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    "*.env", ".env*", "*.secret",
    "dump.rdb",
]

def should_ignore(name: str, fullpath: str) -> bool:
    if name in IGNORE_NAMES:
        return True
    # Check name and (lightly) path against glob patterns
    for pat in IGNORE_GLOBS:
        if fnmatch.fnmatch(name, pat) or fnmatch.fnmatch(fullpath, pat):
            return True
    return False

def generate_tree(path, prefix=""):
    tree_lines = []
    try:
        items = os.listdir(path)
    except PermissionError:
        return tree_lines  # Skip directories without permission
    except OSError:
        return tree_lines  # Skip unreadable paths

    # Filter & sort after applying ignores
    visible_items = sorted(
        [it for it in items if not should_ignore(it, os.path.join(path, it))]
    )

    for index, item in enumerate(visible_items):
        item_path = os.path.join(path, item)
        is_last = index == len(visible_items) - 1
        connector = "└── " if is_last else "├── "
        tree_lines.append(f"{prefix}{connector}{item}")

        if os.path.isdir(item_path) and not os.path.islink(item_path):
            extension = "    " if is_last else "│   "
            tree_lines.extend(generate_tree(item_path, prefix + extension))

    return tree_lines

def write_tree_to_file(start_path, output_file="tree_output.txt"):
    with open(output_file, "w", encoding="utf-8") as file:
        file.write(f"{os.path.abspath(start_path)}\n")
        tree = generate_tree(start_path)
        for line in tree:
            file.write(f"{line}\n")
    print(f"Tree structure written to {output_file}")

if __name__ == "__main__":
    root_path = "."  # You can change this to your target directory
    write_tree_to_file(root_path)
