"""Actual narrowly weakened validators. A program/import error never kills a mutant."""
import json, sys
from pathlib import Path
from checks import zip_cases
import delivery

source=Path(delivery.__file__).read_text('utf-8')
results=[]
mutations=[
    ('zip-duplicates', ["theme_check.need(len(names)==len(set(names)),'ZIP_DUPLICATE_ENTRY')"], ['duplicate-same','duplicate-different']),
    ('manifest-duplicates', ["closure(m['files'],[],False)","theme_check.need(len(expected)==len(set(expected)),'DUPLICATE_PATH')"], ['duplicate-manifest']),
]
for name,needles,cases in mutations:
    weakened=source
    for needle in needles:
        assert weakened.count(needle)==1,needle
        weakened=weakened.replace(needle,'None')
    scope={'__file__':delivery.__file__,'__name__':'r1_semantic_mutant'}
    exec(compile(weakened,name,'exec'),scope)
    rows=zip_cases(scope['verify'])
    detected=all(next(r for r in rows if r['case']==case)['actual']=='ACCEPT' for case in cases)
    results.append({'mutation':name,'expectedDetectionCases':cases,'rows':rows,'detected':detected,'noProgramErrors':all(r['error'] is None for r in rows)})

# Native-browser control uses the identical page/corpus, removing only the content gate.
root=Path(__file__).resolve().parent
js=(root.parent/'theme-lab.js').read_text('utf-8')
assert js.count('await svgContent(bytes,r,b);')==1
js=js.replace('await svgContent(bytes,r,b);','/* semantic mutant: content gate removed */')
js=js.replace("new URL('../',document.currentScript.src)","new URL('../../../',document.currentScript.src)")
out=root/'negative-control';out.mkdir(exist_ok=True)
(out/'theme-lab.js').write_text(js,encoding='utf-8')
page=(root/'browser-theme.html').read_text('utf-8').replace('../readiness-001/theme-lab.js','../readiness-001/r1/negative-control/theme-lab.js')
(root/'browser-theme-negative.html').write_text(page,encoding='utf-8')
report={'kind':'SEMANTIC_MUTANTS','zip':results,'browserControlPrepared':'browser-theme-negative.html','pass':all(r['detected'] and r['noProgramErrors'] for r in results)}
print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if report['pass'] else 1)
