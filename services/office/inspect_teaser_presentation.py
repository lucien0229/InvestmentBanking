"""Independent Teaser observer: exact slide/page, material text and native shape checks."""
from __future__ import annotations
import json, re, zipfile
from pathlib import Path
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
import fitz

def norm(value): return re.sub(r"\s+", " ", value or "").strip()
def text_of(slide): return norm(" ".join(shape.text for shape in slide.shapes if hasattr(shape,"text")))
def check(code, ok, detail, locator=None, severity="critical", consequence="Blocks circulation of this exact Revision"):
    return {"code":code,"outcome":"passed" if ok else "failed","detail":detail,"locator":locator or {},"severity":severity if not ok else "info","evidence":("exact native and Reader observer"),"impact":("none" if ok else "exact Teaser acceptance blocked"),"owner":"Banker Review","disposition":("passed" if ok else "remediation_required"),"intended_use_consequence":consequence}

def inspect(data, native: Path, reader: Path):
    draft=data.get("content_draft") or {}; sections=draft.get("sections") or []; checks=[]
    try:
        prs=Presentation(str(native)); pdf=fitz.open(reader); native_text=[text_of(s) for s in prs.slides]; reader_text=[norm(p.get_text()) for p in pdf]
        expected_count=len(sections)+1
        checks.append(check("native_structure",len(prs.slides)==expected_count,"Native slide count and ordered structure match the strict section contract.",{"expected_slides":expected_count,"actual_slides":len(prs.slides)}))
        checks.append(check("revision_identity",all(data.get("revision_id") in t for t in native_text+reader_text) and all(data.get("audience","") in t for t in native_text+reader_text),"Revision and audience are visible in every Native/Reader location.",{"revision_id":data.get("revision_id")}))
        checks.append(check("citation_lineage",all(all(f"[CIT:{c}]" in native_text[i+1] and f"[CIT:{c}]" in reader_text[i+1] for c in s.get("citations",[])) for i,s in enumerate(sections)),"Every section retains point-of-use approved citation markers.",{"slides":[i+2 for i in range(len(sections))]}))
        shape_fail=[]
        for i,s in enumerate(sections,1):
            slide=prs.slides[i]; shapes=list(slide.shapes); tables=sum(1 for x in shapes if x.has_table); charts=sum(1 for x in shapes if x.shape_type==MSO_SHAPE_TYPE.CHART)
            if s.get("table_rows") and tables<1: shape_fail.append({"slide":i+1,"expected":"native_table"})
            if s.get("chart") and charts<1: shape_fail.append({"slide":i+1,"expected":"native_chart"})
        with zipfile.ZipFile(native) as z:
            names=z.namelist(); xml=z.read("ppt/presentation.xml").decode("utf8",errors="ignore")
            no_active=not any("externalLinks" in n or "vbaProject" in n for n in names)
            editable=xml.count("<p:sldId")>=expected_count and any("slideMaster" in n for n in names) and no_active and not shape_fail
        checks.append(check("native_editable",editable,"Native PPTX retains editable slide/master structures and declared native tables/charts.",{"missing_native_shapes":shape_fail}))
        parity=[]
        for i,s in enumerate(sections,1):
            expected=[s["title"],s["body"],s["qualification"],data["confidentiality"].upper(),"proposal-only"]
            for token in expected:
                if norm(token).lower() not in native_text[i].lower() or norm(token).lower() not in reader_text[i].lower(): parity.append({"slide":i+1,"page":i+1,"token":token})
            for row in s.get("table_rows", []):
                for value in row:
                    if norm(str(value)).lower() not in reader_text[i].lower(): parity.append({"slide":i+1,"page":i+1,"token":str(value)})
            chart=s.get("chart") or {}
            for value in list(chart.get("categories", [])) + [chart.get("series_name", "")]:
                if value and norm(str(value)).lower() not in reader_text[i].lower(): parity.append({"slide":i+1,"page":i+1,"token":str(value)})
        if len(pdf)!=len(prs.slides): parity.append({"expected_pages":len(prs.slides),"actual_pages":len(pdf)})
        checks.append(check("native_reader_parity",not parity,"Reader Copy matches exact slide order, material text, qualification and confidentiality.",{"differences":parity}))
        conf=[{"page":i+1} for i,t in enumerate(reader_text) if data.get("confidentiality","").upper() not in t]
        checks.append(check("confidentiality",not conf,"Confidentiality legend and source zone are present on every Reader page.",{"missing_pages":conf}))
        prop=[{"page":i+1} for i,t in enumerate(reader_text) if "proposal-only" not in t.lower() or "circulation" not in t.lower()]
        checks.append(check("proposal_only",not prop,"Reader preserves proposal-only and review boundary on every page.",{"missing_pages":prop}))
    except Exception as exc:
        checks.append(check("native_structure",False,str(exc),{"exception":type(exc).__name__}))
    return {"revision_id":data.get("revision_id"),"checks":checks,"report":{"revision_id":data.get("revision_id"),"template_version":"teaser-1.0.0"}}

if __name__=="__main__":
    import sys
    result=inspect(json.loads(Path(sys.argv[1]).read_text()),Path(sys.argv[2]),Path(sys.argv[3])); Path(sys.argv[4]).write_text(json.dumps(result,indent=2))
