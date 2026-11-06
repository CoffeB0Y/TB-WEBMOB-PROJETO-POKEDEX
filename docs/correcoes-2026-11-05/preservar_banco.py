import hashlib
import json
import sqlite3
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
backend = root / 'app/app-backend/projeto pokedex'
out = Path(__file__).parent
database_path = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else backend / 'dev.db'
db = sqlite3.connect(database_path.as_uri() + '?mode=ro', uri=True)
baseline = out / 'banco-antes.json'
if sys.argv[1] == 'antes':
    backup = backend / '.verification/pre-correcoes-20261105.db'
    backup.parent.mkdir(exist_ok=True)
    if backup.exists() or baseline.exists():
        raise RuntimeError('Backup/baseline já existem; não sobrescrever')
    with sqlite3.connect(backup) as target:
        db.backup(target)
    columns = {name: [row[1] for row in db.execute(f'PRAGMA table_info("{name}")')]
               for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
else:
    columns = json.loads(baseline.read_text(encoding='utf8'))['columns']
tables = {}
for name, fields in columns.items():
    names = ','.join(f'"{field}"' for field in fields)
    rows = db.execute(f'SELECT {names} FROM "{name}" ORDER BY rowid').fetchall()
    # Novas migrations são esperadas; comparar somente o histórico anterior.
    if name == '_prisma_migrations' and sys.argv[1] != 'antes':
        old_count = json.loads(baseline.read_text(encoding='utf8'))['tables'][name]['count']
        rows = rows[:old_count]
    tables[name] = {'count': len(rows), 'sha256': hashlib.sha256(json.dumps(rows, ensure_ascii=False, default=str).encode()).hexdigest()}
result = {'columns': columns, 'tables': tables, 'foreignKeyViolations': len(db.execute('PRAGMA foreign_key_check').fetchall())}
if sys.argv[1] != 'antes':
    result['previousRecordsPreserved'] = tables == json.loads(baseline.read_text(encoding='utf8'))['tables']
    assert result['previousRecordsPreserved'], 'Registros anteriores divergiram'
(out / f'banco-{sys.argv[1]}.json').write_text(json.dumps(result, indent=2), encoding='utf8')
print(json.dumps({'tables': len(tables), 'foreignKeyViolations': result['foreignKeyViolations'], 'previousRecordsPreserved': result.get('previousRecordsPreserved')}, indent=2))
db.close()
