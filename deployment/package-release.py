"""Package source and static frontend, excluding secrets and local runtime data."""
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / '.local' / 'releases'
output.mkdir(parents=True, exist_ok=True)
files = subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root,
).decode().split('\0')
with zipfile.ZipFile(output / 'estateflow-crm-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(set(filter(None, files))):
        path = root / name
        if any(part in {'.git', '.local', 'node_modules', 'dist', 'uploads'} for part in path.relative_to(root).parts):
            continue
        if path.name.startswith('.env') and path.name != '.env.example':
            continue
        if path.is_file() and not path.is_symlink():
            archive.write(path, name)
build = root / 'frontend' / 'dist'
if not (build / 'index.html').exists():
    raise SystemExit('Frontend build is missing; run npm run build in frontend first.')
with zipfile.ZipFile(output / 'estateflow-frontend.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(build.rglob('*')):
        if path.is_file():
            archive.write(path, str(path.relative_to(build)))
print('Release packages saved in .local/releases/ (frontend uses its build-time API URL).')
