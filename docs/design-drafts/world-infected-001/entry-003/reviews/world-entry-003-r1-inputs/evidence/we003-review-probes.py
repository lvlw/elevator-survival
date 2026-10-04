"""Mainline finite-model probes. No production imports or rule substitutes.
Run from outside the repository. The bundled base is the semantic `base` excerpt
of f93e17a validation/fixtures.json, not a copy of its complete 106-case suite.
Exit 1 means a contract mismatch; unexpected model exceptions are classified
as crashes, never as successful expected rejection.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any, Callable

BASE_SHA = 'f93e17ac7b47af39833f2ecf05681fea03dbf689'
MODEL_PATH = 'docs/design-drafts/world-infected-001/entry-003/validation/check.py'
EXPECTED_BLOBS = {
    MODEL_PATH: 'e4219d0acc20608df8b889859830d6b1c7adae25',
    'docs/design-drafts/world-infected-001/entry-003/config-candidate.json': 'f0a5b2190feea4ca541e68fc0ea0e11ec53244b3',
    'docs/content/infected-residence-core-test-config-v0.1.json': 'db6959ac02bf1e3bf8e816fe2b0d148ced9ca273',
}

def fingerprint(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'gitBlob': hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--phase', choices=['baseline','fixed'], default='baseline')
    parser.add_argument('--group', choices=['all','controls','findings'], default='all')
    parser.add_argument('--negative-control', choices=['duplicate-settlement','death-recall','old-ready','reopen'])
    args = parser.parse_args()
    source = {p: fingerprint(args.repo / p) for p in EXPECTED_BLOBS}
    for path, expected in EXPECTED_BLOBS.items():
        if args.phase == 'fixed' and path == MODEL_PATH:
            continue
        if source[path]['gitBlob'] != expected:
            raise RuntimeError(f'Wrong input bytes: {path}')
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('we003_review_model', args.repo / MODEL_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError('Unable to load model')
    model = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(model)
    model.NEGATIVE = args.negative_control
    base_path = Path(__file__).with_name('base-fixture.json')
    base = json.loads(base_path.read_text(encoding='utf-8'))
    # On a complete repository also independently compare the selected excerpt.
    full_fixture = args.repo / Path(MODEL_PATH).with_name('fixtures.json')
    fixture_compared = False
    if full_fixture.is_file():
        assert json.loads(full_fixture.read_text(encoding='utf-8'))['base'] == base
        fixture_compared = True
    model.validate(base)
    rows: list[dict[str, Any]] = []

    def state(patches: dict[str, Any] | None = None) -> dict[str, Any]:
        s = model.clone(base)
        for path, value in (patches or {}).items():
            model.set_path(s, path, value)
        return s

    def add(identifier: str, group: str, expected: Any, run: Callable[[], Any]) -> None:
        if args.group != 'all' and args.group != group:
            return
        row: dict[str, Any] = {'id': identifier, 'group': group, 'expected': expected}
        try:
            row['observed'] = run()
            row['matches'] = row['observed'] == expected
            row['crash'] = False
        except Exception as error:
            row.update(observed={'exception':type(error).__name__, 'message':str(error)}, matches=False, crash=True)
        rows.append(row)

    def terminal(intent: str, patches: dict[str, Any] | None = None) -> dict[str, Any]:
        s = state(patches); before = model.clone(s); owner = model.Session(s)
        out, steps = owner.dispatch(model.request(s,intent),model.producer)
        assert s == before
        assert owner.counts == {'plans':1,'commits':1,'writes':1,'notices':1}
        assert out['instances'] == s['instances'] and out['itemStates'] == s['itemStates']
        for key in ('installed','consumed','destroyed'):
            assert out['containers'][key] == s['containers'][key]
        return {'phase':out['phase'], 'hp':out['body']['hp'], 'balance':out['wallet']['balance'],
                'D':out['D'],'T':out['T'], 'clock':out['clock']['kind'], 'steps':steps}

    def expected(phase='living-hub',hp=12,balance=160,D=3,T=3,clock='return-due',steps=None):
        return dict(phase=phase,hp=hp,balance=balance,D=D,T=T,clock=clock,steps=steps or [])

    add('C01-success','controls',expected(),lambda:terminal('handover'))
    for points in [0,19,20,47]:
        add(f'C02-failure-{points}','controls',expected(balance=max(0,points-20)),
            lambda points=points:terminal('withdraw',{'wallet.balance':points,'site.facts.transfer':False}))
    add('C03-normal-Day7-no-extra-night','controls',expected(hp=1,D=7,T=7),
        lambda:terminal('handover',{'D':7,'T':7,'body.hp':1,'body.bleeding':True,'body.infection':120,'body.food':0}))
    add('C04-deadline-alive','controls',expected(balance=20,D=8,T=7,clock='deadline-ready',steps=['blood','infection','hunger','reset']),
        lambda:terminal('deadline',{'D':7,'T':7,'site.node':'H8'}))
    deaths = [('blood',{'body.hp':2,'body.bleeding':True},['blood']),
              ('infection',{'body.hp':1,'body.infection':60},['blood','infection']),
              ('hunger',{'body.hp':1,'body.food':1},['blood','infection','hunger'])]
    for cause, patch, steps in deaths:
        add(f'C05-deadline-death-{cause}','controls',expected(phase='dead',hp=0,balance=0,D=7,T=7,clock='active',steps=steps),
            lambda patch=patch:terminal('deadline',{'D':7,'T':7,'site.node':'H8',**patch}))
    add('C06-rest-alive','controls',expected(phase='active-world',balance=40,D=4,T=4,clock='active',steps=['blood','infection','hunger','reset']),
        lambda:terminal('rest'))
    add('C07-real-action-death','controls',expected(phase='dead',hp=0,balance=0,clock='active',steps=['primary','action-blood']),
        lambda:terminal('resolved-action',{'body.hp':1,'body.bleeding':True}))

    reject_expected = {'result':'rejected','currentUnchanged':True,'diskUnchanged':True,'counts':{'plans':0,'commits':0,'writes':0,'notices':0}}
    def proposal_probe(patch: dict[str, Any]) -> dict[str, Any]:
        s = state({'body.hp':1,'body.bleeding':True}); owner=model.Session(s)
        before=model.clone(owner.current); disk=model.clone(owner.disk)
        def producer(value):
            proposed=model.producer(value)
            for path, val in patch.items(): model.set_path(proposed,path,val)
            return proposed
        try:
            owner.dispatch(model.request(s,'resolved-action'),producer)
            result='accepted'
        except model.Reject:
            result='rejected'
        # Any other exception escapes to `add` and is reported as a crash.
        return {'result':result,'currentUnchanged':owner.current==before,'diskUnchanged':owner.disk==disk,'counts':model.clone(owner.counts)}
    for name, patch in [
        ('C08-base-mismatch',{'base.revision':3}),
        ('C09-proposal-invalid-wallet',{'snapshot.wallet.balance':-1}),
        ('C10-proposal-invalid-energy',{'snapshot.body.energy':-1})]:
        add(name,'controls',reject_expected,lambda patch=patch:proposal_probe(patch))

    for intent, patch in [('handover',{}),('withdraw',{'site.facts.transfer':False}),
                          ('deadline',{'D':7,'T':7,'site.node':'H8'}),
                          ('resolved-action',{'body.hp':1,'body.bleeding':True})]:
        def roundtrip(intent=intent,patch=patch):
            s=state(patch); out,_=model.plan(s,model.request(s,intent),model.producer)
            restored=model.restore(json.loads(json.dumps({'format':'WE003-finite-model-v2','state':out})))
            return restored==out
        add('C11-roundtrip-'+intent,'controls',True,roundtrip)

    def no_repeat():
        s=state(); owner=model.Session(s); req=model.request(s,'handover'); owner.dispatch(req)
        before=model.clone(owner.current)
        try: owner.dispatch(req)
        except model.Reject: pass
        return owner.current==before
    add('C12-duplicate-settlement-control','controls',True,no_repeat)
    def no_reopen():
        s=state(); owner=model.Session(s); owner.dispatch(model.request(s,'handover'))
        before=model.clone(owner.current)
        try: owner.bootstrap(state())
        except model.Reject: pass
        return owner.current==before
    add('C13-reopen-control','controls',True,no_reopen)
    def bridge():
        s=state({'D':7,'T':7,'site.node':'H8'}); out,_=model.plan(s,model.request(s,'deadline'))
        after=model.bridge_probe(out); return {'D':after['D'],'food':after['body']['food']}
    add('C14-old-ready-control','controls',{'D':9,'food':0},bridge)
    for intent in ['combat','medical','second-real-mission','browser-release']:
        def unsupported(intent=intent):
            s=state(); owner=model.Session(s)
            try: owner.dispatch(model.request(s,intent))
            except model.Unsupported:
                assert owner.current==s and all(v==0 for v in owner.counts.values())
                return 'unsupported-not-implemented'
            return 'unexpected-accepted'
        add('C15-unsupported-'+intent,'controls','unsupported-not-implemented',unsupported)

    invalid_revisions = [('negative',-1),('false',False),('true',True),('fraction',1.5),
                         ('unsafe',9007199254740992),('nan',float('nan')),('infinity',float('inf'))]
    for name,value in invalid_revisions:
        add('F01-revision-'+name,'findings',reject_expected,
            lambda value=value:proposal_probe({'snapshot.revision':value}))
    for name,patch in [('F01-execution',{'snapshot.missions.M.execution':'OTHER'}),
                       ('F01-phase',{'snapshot.phase':'not-a-phase'}),
                       ('F01-deathPoint',{'snapshot.deathPoint':{'bad':True}}),
                       ('F01-empty-steps',{'steps':[]})]:
        add(name,'findings',reject_expected,lambda patch=patch:proposal_probe(patch))

    failed=[r['id'] for r in rows if not r['matches']]
    result = {'reviewSha':BASE_SHA,'phase':args.phase,'group':args.group,'negativeControl':args.negative_control,
              'evidence':'UNMODIFIED_FINITE_MODEL_FUNCTION_EXECUTION_NOT_PRODUCTION_OR_FULL_AUTHOR_SUITE',
              'sourceFiles':source,'baseFixture':fingerprint(base_path),'baseEqualsRepositoryExcerpt':fixture_compared,
              'counts':{'cases':len(rows),'matched':sum(r['matches'] for r in rows),'failed':len(failed),
                        'modelCrashes':sum(r['crash'] for r in rows),'unsupportedNotImplementationPass':sum(r['id'].startswith('C15-') for r in rows)},
              'failedIds':failed,'rows':rows}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps(result['counts'])); print(json.dumps(failed))
    return 1 if failed else 0

if __name__ == '__main__':
    raise SystemExit(main())
