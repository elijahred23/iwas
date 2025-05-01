import os

def generate_tree(path, prefix=""):
    tree_lines = []
    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return tree_lines  # Skip directories without permission

    for index, item in enumerate(items):
        if item == ".git":
            continue  # Skip .git folder

        item_path = os.path.join(path, item)
        is_last = index == len(items) - 1
        connector = "└── " if is_last else "├── "
        tree_lines.append(f"{prefix}{connector}{item}")

        if os.path.isdir(item_path):
            extension = "    " if is_last else "│   "
            tree_lines.extend(generate_tree(item_path, prefix + extension))

    return tree_lines

def write_tree_to_file(start_path, output_file="tree_output.txt"):
    with open(output_file, "w", encoding="utf-8") as file:
        file.write(f"{start_path}\n")
        tree = generate_tree(start_path)
        for line in tree:
            file.write(f"{line}\n")
    print(f"Tree structure written to {output_file}")

if __name__ == "__main__":
    root_path = "."  # You can change this to your target directory
    write_tree_to_file(root_path)
