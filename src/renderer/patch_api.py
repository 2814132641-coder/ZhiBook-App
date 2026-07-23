import os

files = [
    'src/components/EditRecordModal.tsx',
    'src/pages/History.tsx',
    'src/pages/Home.tsx',
    'src/pages/Report.tsx',
    'src/pages/Settings.tsx',
    'src/store/categories.ts'
]

for f in files:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()

    content = content.replace('window.api.records', 'api.records')
    content = content.replace('window.api.categories', 'api.categories')
    content = content.replace('window.api.stats', 'api.stats')
    content = content.replace('window.api.settings', 'api.settings')

    rel_map = {
        'src/components/': '../lib/api',
        'src/pages/': '../lib/api',
        'src/store/': '../lib/api',
    }
    rel = [v for k, v in rel_map.items() if f.startswith(k)][0]

    if f"from '{rel}'" not in content:
        lines = content.split('\n')
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                insert_idx = i + 1
        lines.insert(insert_idx, f"import {{ api }} from '{rel}';")
        content = '\n'.join(lines)

    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print(f'patched: {f}')
