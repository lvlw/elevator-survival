#!/usr/bin/env python3
"""Check the task's proposed dimension arithmetic, not browser layout or gameplay."""
from __future__ import annotations
import json
import math
import sys
from pathlib import Path


def verify(data: dict) -> dict:
    checks: list[dict] = []
    def check(name: str, condition: bool, detail: object = None) -> None:
        checks.append({'name': name, 'pass': bool(condition), 'detail': detail})
    check('explicit proposed-budget status', data.get('status') == 'PROPOSED_DESIGN_STARTING_BUDGET_NOT_EXISTING_RUNTIME_MEASUREMENTS')
    ps = data.get('profiles', [])
    check('five desktop profiles', len(ps) == 5)
    check('unique viewport presets', len({tuple(p['viewport_css']) for p in ps}) == len(ps))
    for p in ps:
        tag = p['id']; W,H = p['viewport_css']; M,G = p['margin'],p['gutter']
        L,R,C,B = p['left_width'],p['right_width'],p['center_width'],p['body_height']
        check(tag+' horizontal sum', 2*M+L+2*G+C+R == W)
        check(tag+' vertical sum', 2*M+p['hud_height']+p['feedback_height']+2*G+B == H)
        check(tag+' central minimum', C >= 768 and B >= 584, [C,B])
        grid = p['grid']; c,g = grid['cell'],grid['gap']
        room = R-2*p['sidebar_padding']-2*p['border']
        check(tag+' true grid', grid['columns']==6 and grid['rows']==4)
        check(tag+' cell formula', c==math.floor((room-5*g)/6))
        check(tag+' grid extents', grid['width']==6*c+5*g and grid['height']==4*c+3*g)
        check(tag+' grid fits', 0 <= room-grid['width'] < 6 and c>=37)
        check(tag+' multi-cell item fits', 2*c+g<=grid['width'] and 2*c+g<=grid['height'])
        panel=p['stage_panel']; i=panel['inset']
        check(tag+' bounded normal panel', panel['normal']==[min(1080,C-2*i),min(780,B-2*i)])
        check(tag+' center-only maximum', panel['maximized']==[C,B])
        expected_mode='maximized' if C<840 or B<700 else 'normal'
        check(tag+' small-frame mode', panel['default']==expected_mode)
        b=p['battle_budget']; pw,ph=b['panel']
        check(tag+' battle chosen panel', [pw,ph]==panel[expected_mode])
        fixed=2*b['padding']+b['title']+b['timeline']+b['actions']+b['feed']+4*b['vertical_gap']
        check(tag+' battle vertical sum', b['arena_height']+fixed==ph)
        check(tag+' battle min arena', b['arena_height']>=320)
        crop=p['background_crop']; sw,sh=crop['source']
        scale=max(C/sw,B/sh); visible=[C/scale,B/scale]
        check(tag+' crop derivation', all(abs(a-bb)<0.001 for a,bb in zip(visible,crop['visible_source'])))
        check(tag+' crop within source', 0<visible[0]<=sw+0.001 and 0<visible[1]<=sh+0.001)
        check(tag+' central 60% width safe at centered cover', visible[0]/sw>=0.60)
        check(tag+' source supports DPR2 after cover', scale*2<=1)
    for a in data.get('source_assets',[]):
        if 'max_display_css' in a:
            check(a['kind']+' 2x pixel budget', all(src>=2*display for src,display in zip(a['source_pixels'],a['max_display_css'])))
        if a['kind']=='panel-nine-slice':
            check('nine-slice corner conversion', all(x/a['export_scale']==a['css_corner'] for x in a['source_slice_insets']))
    failed=[x for x in checks if not x['pass']]
    return {'kind':'DESIGN_BUDGET_ARITHMETIC_ONLY','pass':not failed,'checks':len(checks),'failed':failed,'results':checks,
            'not_run':['browser rendering','final art','actual responsive readability','game rules','Owner experience']}


def main() -> int:
    try:
        path=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).with_name('尺寸耦合合同-v1.0.json')
        result=verify(json.loads(path.read_text(encoding='utf-8')))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({'pass':False,'error':str(exc)},ensure_ascii=False,indent=2))
        return 2
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['pass'] else 1

if __name__=='__main__':
    raise SystemExit(main())
