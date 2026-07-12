#!/usr/bin/env python3
"""Reference-analysis extractor: animation screenplay PDF -> DERIVED functional
annotations. Stores structural/functional features only — NEVER verbatim lines,
character names, or locations (rights_tier: reference_only). See ../README.md.

Uses per-script adaptive INDENTATION geometry to separate action / dialogue /
character-cue (the reliable structural signal). Deep functional labels
(mechanism, hidden intent, state deltas) need the deferred LLM-assisted stage."""
import csv, json, re, statistics, subprocess, sys
from collections import Counter
from pathlib import Path

CORPUS = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else ".")
SLUG = re.compile(r'^\s*(INT\.?/EXT\.?|EXT\.?/INT\.?|I/E|INT\.?|EXT\.?|EST\.?)\s', re.I)
TIME = re.compile(r'\b(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER|SAME)\b', re.I)
TRANS = re.compile(r'^\s*(CUT TO:|FADE (IN|OUT)|DISSOLVE TO:|SMASH CUT|MATCH CUT|BACK TO)', re.I)
CAPS_SHORT = re.compile(r'^[A-Z][A-Z0-9 .\'\-]{0,30}$')

def studio(p):
    s = str(p).lower()
    return "Pixar-Disney" if "pixar-disney" in s else "DreamWorks" if "dreamworks" in s else "Other-Studios"

def pdftext(pdf):
    try:
        return subprocess.run(["pdftotext","-q","-layout",str(pdf),"-"],capture_output=True,text=True,timeout=90).stdout
    except Exception:
        return ""

def indent(ln): 
    m=re.match(r'^( *)',ln); return len(m.group(1))

def scene_function(ordinal, total, dlg, act):
    pct=ordinal/max(total,1); ratio=dlg/max(dlg+act,1)
    if pct<0.10: return "setup"
    if pct>0.90: return "aftermath"
    if pct>0.78: return "payoff"
    if ratio>0.55: return "pressure"      # dialogue-driven negotiation
    if ratio<0.20: return "escalation"    # action-driven
    if pct>0.55:   return "reversal"
    return "discovery"

def annotate(pdf, sid):
    text=pdftext(pdf)
    if not text.strip(): return None,0
    raw=[l.rstrip() for l in text.splitlines()]
    # adaptive cue indent = mode indent of all-caps-short lines sitting right of action
    cue_indents=[indent(l) for l in raw if l.strip() and indent(l)>=10 and CAPS_SHORT.match(l.strip()) and len(l.strip().split())<=4 and not SLUG.match(l) and not TRANS.match(l)]
    if len(cue_indents)<8: return None,0                 # not a text screenplay (image/scan)
    cue_indent=Counter(cue_indents).most_common(1)[0][0]
    dlg_hi=cue_indent-2; dlg_lo=max(4, cue_indent//3)    # dialogue band sits left of cues
    scenes,cur=[],None
    for l in raw:
        s=l.strip()
        if not s: continue
        if SLUG.match(l) and not TRANS.match(l):
            if cur: scenes.append(cur)
            t=TIME.search(l); ie=s.split()[0].upper().rstrip('.')
            cur={"int_ext": ie if ie in ("INT","EXT","I/E","EST") else "UNKNOWN",
                 "time_of_day": (t.group(1).upper() if t else None), "dlg":0,"act":0,"cues":set()}
            continue
        if cur is None: continue
        ind=indent(l)
        if ind>=dlg_hi and CAPS_SHORT.match(s) and len(s.split())<=4 and not TRANS.match(l):
            cur["cues"].add(s)                            # character cue
        elif dlg_lo<=ind<=dlg_hi:
            cur["dlg"]+=1                                 # dialogue
        else:
            cur["act"]+=1                                 # action
    if cur: scenes.append(cur)
    recs=[]
    for i,sc in enumerate(scenes):
        recs.append({"source_id":sid,"rights_tier":"reference_only","level":"scene","scene":{
            "scene_id":f"{sid}#s{i+1}","ordinal":i+1,"int_ext":sc["int_ext"],"time_of_day":sc["time_of_day"],
            "scene_function":scene_function(i+1,len(scenes),sc["dlg"],sc["act"]),"active_mechanism":None,
            "participant_count":len(sc["cues"]),"dialogue_line_count":sc["dlg"],"action_line_count":sc["act"],
            "state_change_signals":[],"reveal_mode":None,
            "note":"derived features only — no verbatim screenplay text stored"}})
    return recs,len(scenes)

def main():
    pdfs=sorted(CORPUS.rglob("*.pdf"))
    (OUT/"annotations").mkdir(parents=True,exist_ok=True); (OUT/"sources").mkdir(parents=True,exist_ok=True)
    reg=csv.writer(open(OUT/"sources"/"source-register.csv","w",newline="",encoding="utf-8"))
    reg.writerow(["sourceId","title","studio","rightsStatus","allowedUses","exactTextMayBeStored","exactTextMayEnterModelContext","exactTextMayEnterModelWeights","sourceLocation","annotated"])
    total=0; ok=0; failed=[]
    with open(OUT/"annotations"/"scenes.jsonl","w",encoding="utf-8") as sf:
        for pdf in pdfs:
            title=pdf.stem; sid=re.sub(r'[^a-z0-9]+','_',title.lower()).strip('_')[:60]
            recs,n=annotate(pdf,sid); done=bool(recs)
            if done: ok+=1; total+=n; [sf.write(json.dumps(r)+"\n") for r in recs]
            else: failed.append(title)
            reg.writerow([sid,title,studio(pdf),"reference_only","human_analysis|automatic_annotation|retrieval|evaluation","false","false","false",f"2-Screenplays/{studio(pdf)}/{pdf.name}", "yes" if done else "no_OCR_needed"])
    print(f"registered: {len(pdfs)} | annotated: {ok} | derived scenes: {total} | needs-OCR: {len(failed)}")

if __name__=="__main__": main()
